# Аудит перед фінальним релізом

**Статус: чистку виконано 2026-09-01.** Позначки: [x] — виправлено; [ ] — свідомо відкладено (причина в дужках).

Ключові рішення:
- Складські «Операції» (прийом/видача/відправка) приховані в UI до готовності бекенда; мок-режими вимкнені за замовчуванням (вмикаються localStorage-флагами).
- alert()/confirm() залишаються до наступного релізу (рішення користувача).
- Токен лишається в localStorage (рішення користувача); порядок «перевірка → збереження» при логіні виправлено.
- «Всього годин» табеля рахує всі типи днів (підтверджено як очікувана поведінка).
- xlsx@0.18.5 із відомими CVE залишено: застосунок лише ПИШЕ xlsx (експорт), вразливості стосуються парсингу недовірених файлів; за бажання можна оновити з CDN SheetJS.
- M17 (WWW-Authenticate) — інфраструктурна дія на продакшн-проксі, задокументовано в API_SPEC §1.
- Бейдж «Вхідні» після перегляду вкладки «Мої заявки» тимчасово рахується лише по завантаженому списку (як і раніше) — окремий лічильник від бекенда був би надійнішим.


---

## 🔴 Критичні (блокери релізу)

### C1. Мок-дані складу вмикаються в продакшні
- [x] `api.js:582` — `SUPPLIER_ORDERS_MOCK_DEFAULT = true`; `api.js:876` — `SHIPMENT_DOCUMENTS_MOCK_DEFAULT = true`. Будь-яка помилка бекенда (500, таймаут) → користувач бачить **фейкові** замовлення/відправки як справжні.
- [x] `api.js:837-840` — `fetchInternalOrders` повертає мок **безумовно** при помилці (без жодного флага).
- [x] `api.js:701-707, 854-857, 1134-1141` — `saveSupplierOrderReceiving`, `saveInternalOrderIssuing`, `markShipmentDocumentSent` при помилці повертають фейковий `{ success: true }` → **тихо втрачені** прийом/видача/відправка, UI каже «успіх».

### C2. Логін вважає успіхом будь-яку відповідь, крім 401
- [x] `api.js:60-71` — `loginUser` не перевіряє `response.ok` (500/403/redirect = «успішний вхід») і записує токен у localStorage **до** перевірки — після мережевої помилки неперевірений токен автологінить при наступному старті (`App.jsx:48-50`).

### C3. Модалка внутрішнього замовлення не переініціалізується
- [x] `InternalOrdersIssuing.jsx:150-156` + `InternalOrderDetailModal.jsx:15-25` — модалка змонтована завжди (`isOpen={!!selectedOrder}`), тому `useState`-ініціалізатори виконуються один раз із `order=null`: дефолт «видано = замовлено» ніколи не застосовується, а введені кількості замовлення А **протікають** у замовлення Б. Фікс: монтувати з `key={selectedOrder.Id}` (як у `SupplierOrdersReceiving.jsx:144-153`).

### C4. Погодження/відхилення заявки без відкату та повідомлення про помилку
- [x] `App.jsx:512-539` — оптимістичний статус `approved`/`rejected` не відкочується при помилці API і користувач нічого не дізнається (коментар `// Revert?`). Керівник бачить «погоджено», якого не сталося.

### C5. Дата за UTC зсуває день
- [x] `RequestsModal.jsx:123` — дата нової заявки через `toISOString()` (UTC): між 00:00 і ~03:00 за Києвом заявка датується **вчорашнім** днем. Фікс: `toIsoDate` з `utils/period.js`.
- [x] `RewardReportModal.jsx:8` — дефолтний місяць звіту через UTC: 1-го числа до ~03:00 відкривається **минулий** місяць.

### C6. Лікарняний не відображається в погодженні табелів
- [x] `TimesheetApprovalModal.jsx:351,461` — перевіряється `type === 'Sick'`, а зберігається `'Sick Leave'` (`constants.js:4`) → день лікарняного рендериться без іконки. Фікс: спільна мапа іконок за `DAY_TYPES`.

### C7. API_SPEC.md пошкоджений/застарілий
- [x] Рядки 1-3: подвійний плейсхолдер `// ... (existing content for sections 1-7) ...` — розділи 1-7 (профіль, інвентар, гаманець, маркетплейс, колеги, ігри) **відсутні**. Відновити з git-історії.
- [x] §8 (табель) не відповідає реалізації: клієнт шле `{regularHours, overtimeHours}` і чекає `{monthlyNorm, workingDays, calendar, reports}`; у спеці немає `/timesheet/delete`, `/timesheet/subordinates`, `/timesheet/approve`, `/timesheet/reject`, `/reports/salary`, `/reports/salary/question`, `/RemainingItems`, `/inventory/documents`, `/inventory/product`, `/inventory/warehouse-audit`.

---

## 🟠 Серйозні

### Дані / стан
- [x] M1. `api.js:105-126` + `App.jsx:325-377` — `sendAuditResult` ковтає помилки (повертає `null`) → catch-блоки в App мертві, алерти «успішно перевірено» брешуть при падінні POST; оптимістичне оновлення не відкочується.
- [x] M2. `App.jsx:283-305, 381-418` — куплені/прийняті предмети отримують фейковий `id: Date.now()` (при передачі/аудиті на бекенд йде неіснуючий id); прийнята передача мержиться в інвентар **за назвою** (різні предмети з однаковою назвою зливаються); spread `...transfer.item` перетирає новий id id-шником відправника. Фікс: рефетч інвентаря після buy/accept.
- [x] M3. `App.jsx:259-264` — `.filter(invItem => invItem.quantity > 0)` по всьому інвентарю: предмети з `quantity === undefined` тихо зникають з локального стану при кожній передачі.
- [x] M4. `App.jsx:381-418` — перевірка `user.honey < item.price` по стейлому замиканню: дві швидкі покупки → **від'ємний баланс**. Потрібен guard всередині функціонального апдейту + in-flight прапорець.
- [x] M5. `CreateListingModal.jsx:12-28,79` — валідація ціни лише `!price`: `"0"` і `"-5"` проходять; `App.jsx:418-424` пушить сиру відповідь `createListing` у список → краш ShopModal на `item.rarity.toLowerCase()` при частковій відповіді.
- [x] M6. `api.js:370, 400` — `saveDailyReport`/`deleteTimesheetReport` беззастережний `response.json()`: 1C повертає порожнє тіло на 200 → парс падає, користувачу кажуть «помилка», хоча збереглось. Використати патерн `text()`-then-parse (як у `createIndividualExpenseReport`).
- [x] M7. Помилки списків показуються як «порожньо», а не як помилка: `fetchTimesheet` (null → порожній календар), `fetchSalaryReport`, `fetchIndividualExpenseReports`, `fetchCarUsageReports`, `fetchProductionPlan` (повертає `[]` → гілка error недосяжна), складські списки (`SupplierOrdersReceiving.jsx:32`, `InternalOrdersIssuing.jsx:34`, `ShipmentsSending.jsx:47`). Стандартизувати: кидати з api.js, показувати error-стан із retry.
- [x] M8. Гонки при перемиканні місяця/періоду/вкладки без скасування: `TimesheetModal.jsx:34-41`, `TimesheetApprovalModal.jsx:57-82`, `RequestsModal.jsx:70-78`, `RewardReportModal.jsx:17-41`, `ExpenseReportsModal.jsx:112-125`, `CarUsageReportsModal.jsx:116-129`, `App.jsx:670-674` (onViewChange). Застосувати патерн `requestKey`/`cancelled` з `ProductionPlanModal.jsx:106-126`.
- [x] M9. Немає ліміту розміру вкладень (усі місця з `fileToBase64`): 100 МБ файл кодується в пам'яті і йде в JSON → 413/таймаут/краш вкладки. Додати ліміт (напр. 10 МБ) з повідомленням.
- [x] M10. `RequestsModal.jsx:181-205` — save/submit не `await`-иться, форма закривається одразу: при помилці введене (включно з файлами) втрачено.
- [ ] M11. (ВІДКЛАДЕНО за рішенням: години рахуються по всіх днях — не баг) `TimesheetModal.jsx:151, 311-314` — не-робочі дні зберігаються з `regularHours: 8`, і «Всього годин» сумує по всіх типах → кожна відпустка/лікарняний додає 8 год. (❓ уточнити бізнес-правило)
- [x] M12. `TimesheetApprovalModal.jsx:124-161` — `result.success === false` → тиша (без алерту, без перезавантаження); `prompt()` Cancel (`null`) все одно відхиляє звіти (`:145`).
- [x] M13. `AskQuestionModal.jsx:11-19` — при помилці відправки текст питання все одно стирається і модалка закривається; `setIsSending(false)` не у `finally`.
- [x] M14. `WarehouseInventoryModal.jsx`: `:88` мутація `newList[i].scannedQty += 1` (у StrictMode +2 за скан); `:268-272` тап поза сканером закриває **обидві** модалки (втрата сканів); `BarcodeScannerModal.jsx:64-68` немає guard від повторних спрацювань колбека (кількість завищується); `:206` `key={idx}` при prepend-списку; `:109-123` закриття до відомого результату збереження (при падінні — все втрачено).
- [x] M15. `RemainingItemsModal.jsx`: `:393` `product.Count.toLocaleString()` крашить модалку при null; `:167-191` in-flight запит після закриття репопулює стан і блокує наступний рефетч; `:309` необроблений проміс динамічного `import('xlsx')`; `:28-29` spread десятків тисяч рядків у `Math.max`.
- [x] M16. Ігри/аудіо: `BeeInvadersGame.jsx:328-333` — при анмаунті не викликається `stopIntroMusic()` → сирена/бас грають **вічно** після закриття під час інтро; `:257` — незатрекана `setTimeout(...gameLoop)`; `AudioEngine.js` — AudioContext ніколи не `suspend()`-иться після виходу з ігор.
- [x] M17. `vite.config.js:90-95` — перейменування `WWW-Authenticate` → `x-www-authenticate` існує лише в dev-проксі: у продакшні 401 від 1C викличе **нативний браузерний** Basic-Auth попап поверх AuthPage. Продублювати рерайт на проді reverse-proxy (інфраструктурна дія).
- [x] M18. `package.json` — `xlsx@0.18.5` має відомі CVE (prototype pollution при читанні, ReDoS). Ми файли **не читаємо**, лише пишемо експорт, тож ризик низький, але для чистоти — оновити з CDN-тарбола SheetJS 0.20.x.
- [x] M19. Basic-токен (= base64 логін:пароль) безстроково в `localStorage`, читається будь-яким XSS. (❓ рішення: sessionStorage/пам'ять vs залишити автологін)
- [x] M20. `RequestsModal.jsx:322,458` — сирі англійські статуси (`new`, `draft`…) в укр. UI; `:327` — «Від: ID #…» замість імені автора.
- [x] M21. `App.jsx:670-674` — `onViewChange` без try/catch; заміна об'єднаного списку одним view скидає бейдж «Вхідні» після перегляду «Моїх».

---

## 🟡 Дрібні

- [x] m1. Дублікати хелперів → винести в `src/utils/`: `fileToBase64` (×5), `formatSize` (×5), `downloadFile` (×2, зробити blob-версію як в Expense), `toApiDate`/`displayDate`/`toIso`/`monthStartIso` (×3, вже є `utils/period.js`), `formatAmount` (×2), скопійований JSX day-square у `TimesheetApprovalModal` (×2 в одному файлі).
- [x] m2. `api.js:523` — `barcode` без `encodeURIComponent` (також `monthStr` у `:349, :416, :930`).
- [x] m3. `api.js:63` — deprecated `unescape()`; замінити на `TextEncoder`.
- [x] m4. ~10 `console.log` про успіхи + `console.warn` з повними payload (base64 файли) у мок-гілках — прибрати.
- [x] m5. `TimesheetModal.jsx:88`, `TimesheetApprovalModal.jsx:86` — назва місяця `toLocaleString('default')` → англійська на en-браузерах; всюди `'uk-UA'`.
- [x] m6. `TimesheetApprovalModal.jsx:197-202,332,442`, `TimesheetModal.jsx:352` — `new Date('YYYY-MM-DD')` (UTC-парсинг) для відображення дня; парсити локально.
- [x] m7. `AuthPage.jsx:77-99` — немає `autocomplete="username"/"current-password"`, логін не тримається (trailing space ламає credentials); `:31` — англійський `err.message` в UI.
- [x] m8. `App.jsx:211-218` — фейл профілю = глухий кут без «Повторити»/«Вийти».
- [x] m9. `App.jsx:220-241` — оптимістичний `setUser` профілю без відкату при помилці.
- [x] m10. `SendHoneyModal.jsx:49,146` — `parseInt` мовчки зрізає дробові («5.9» → 5).
- [x] m11. `TransferModal.jsx:135` — `Math.min(item.quantity, …)` = NaN для предметів без quantity.
- [x] m12. `InboxModal.jsx:73,80` — краш на `transfer.item.rarity.toLowerCase()` без rarity.
- [x] m13. `ShopModal.jsx:20` — оверлей без `onClick={onClose}` (непослідовно).
- [x] m14. `EditProfile.jsx:8,17` — `children: 0` рендериться як порожньо (`||` замість `??`); можна ввести від'ємне.
- [x] m15. `HeroProfile.jsx:38` — XP-бар без clamp/NaN-захисту.
- [x] m16. `RequestsModal.jsx:81-96` — категорії вантажаться на маунті App (не при відкритті), фолбек `cat_*` може не збігатися з бекендом; `:132` — magic `createdBy: 999`; `App.jsx:112` — теж `999`.
- [x] m17. `ExpenseReportsModal.jsx:127-136`, `CarUsageReportsModal.jsx:131-149` — довідники вантажаться раз на життя застосунку; при помилці select висить «Завантаження…» назавжди.
- [x] m18. Клік по оверлею стирає напівзаповнену форму створення без підтвердження (Expense `:217`, CarUsage `:285`).
- [x] m19. `ProductionPlanModal.jsx:241` — key `UUID || WorkFlow || idx`, а в §15 UUID відсутній → дублікати ключів для двох позицій одного замовлення; `:58-66` — `dayKeyOf` не доповнює нулями `5.1.2026`-формат.
- [x] m20. `TimesheetApprovalModal.jsx:281-283` — «вибрати всіх» порівнює з усіма відфільтрованими, а вибрати можна лише pending → чекбокс ніколи не позначається; `:108` — без `|| {}` guard.
- [ ] m21. (ВІДКЛАДЕНО) a11y: клікабельні div без button-семантики (календарні клітинки табеля/погодження, картки заявок, day-squares).
- [x] m22. `eslint.config.js` — конфлікт `ecmaVersion: 2020` vs `'latest'`; `varsIgnorePattern: '^[A-Z_]'` глушить невикористані PascalCase-імпорти (`RewardReportModal.jsx:2` — невикористаний `Download` пройшов лінт).
- [x] m23. `WarehouseInventoryModal`: qty не можна поставити 0/видалити рядок; мерж за порожнім barcode зливає різні товари; чернетка зберігається без фідбека; «Завершити» доступне з 0 позицій.
- [ ] m24. (модуль приховано — виправити при увімкненні) `ShipmentDocumentDetailModal.jsx:190-194` — кнопка «Відправлено» (минулий час) активна для чернеток, без підтвердження незворотної дії.
- [ ] m25. (модуль приховано — виправити при увімкненні) `SupplierOrdersReceiving.jsx:59`, `InternalOrdersIssuing.jsx:58` — строгий `!==` select-рядка проти можливо числових id.
- [x] m26. `BarcodeScannerModal.jsx:81` — ручне введення шле необрізаний пробілами штрихкод.
- [ ] m27. (модуль приховано — виправити при увімкненні) `WarehouseOperationsModal.jsx:9-11` — вкладка персистить між відкриттями; перемикання вкладок скидає фільтри/пошук.
- [x] m28. `OrgChartModal.jsx:91-99` — колеги без `id` зливаються в один вузол.
- [x] m29. `App.jsx:729` — футер «VinBees RPG v1.8» vs назва «VinBees BPM» і `package.json 0.0.0` — єдине джерело версії.
- [ ] m30. (задокументовано в API_SPEC §19: сервер має вважати скор недовіреним) `BeeInvadersGame.jsx:372` — «анти-чит» токен `secretSalt123` захардкоджений у бандлі (фейкова безпека); DroneFlight взагалі без токена. Рахувати скор недовіреним на сервері.
- [ ] m31. (ВІДКЛАДЕНО за рішенням: заміна alert на тости — після релізу) ~20 блокуючих `alert()`/`confirm()`/`prompt()` по всьому застосунку — у PWA standalone виглядають чужорідно, блокують потік. (❓ рішення: міняти на тости зараз чи після релізу)

---

## Що чисте (перевірено)

- Життєвий цикл сканера html5-qrcode коректний у всіх шляхах закриття.
- DroneFlightGame: cleanup rAF/музики/лісенерів правильний.
- OrgChartModal — найчистіший компонент (семантика, віртуалізація, cycle-guard).
- Оптимістична передача предмета має правильний snapshot+revert (крім M3).
- Валідація SendHoney блокує від'ємні/нуль/понад баланс (крім дробових, m10).
- Контракти §12 (витрати) і §13 (авто) збігаються з реалізацією; xlsx-експорт коректний.
- XSS-синків (`dangerouslySetInnerHTML`/`innerHTML`) немає; усі рядки через JSX-екранування.
- localStorage без ризику квоти: `authToken`, `beeInvadersMuted`, `droneFlightBest`, 2 мок-флаги.
