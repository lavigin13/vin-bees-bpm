# VinBees API Specification

## 1. General
- **Base URL**: `/VinBeesERP/hs/API` (dev-proxy → `https://bpm.bees.vin`, див. `vite.config.js`)
- **Authorization**: Basic Auth — `Authorization: Basic base64(login:password)`; на 401 фронтенд чистить токен і повертає на сторінку входу.
- **Content-Type**: `application/json`
- ⚠️ **Продакшн reverse-proxy** мусить перейменовувати заголовок `WWW-Authenticate` (напр. у `X-WWW-Authenticate`) на відповідях 401 — інакше браузер показує нативний Basic-Auth попап поверх сторінки входу. У dev це робить проксі Vite.
- Дати: відповіді — `YYYY-MM-DDT00:00:00` або `DD.MM.YYYY`; тіла POST — `YYYY-MM-DD`; параметри періодів — `StartDate/EndDate=DD.MM.YYYY`.
- Файли скрізь передаються як `{ name, type, size, data }`, де `data` — base64 **без** префікса `data:*;base64,`. Ліміт на фронтенді — 10 МБ на файл.

---

## 2. Profile & Inventory

### Get User Profile
**GET** `/profile`
Returns user stats, level, honey balance.
**Response:**
```json
{
  "id": 101,
  "name": "Alex Bee",
  "role": "Senior Drone",
  "level": 5,
  "xp": 3500,
  "nextLevelXp": 5000,
  "honey": 1250,
  "reputation": 850,
  "avatar": "url_to_image",
  "gender": "Male",
  "children": 0,
  "hobby": "Beekeeping",
  "birthday": "1995-05-20"
}
```

### Update Profile
**PUT** `/profile`
Updates editable fields.
**Body:**
```json
{
  "gender": "Male",
  "children": 1,
  "hobby": "Beekeeping",
  "birthday": "1995-05-20" // ISO 8601 Format (YYYY-MM-DD)
}
```

### Get Inventory
**GET** `/inventory`
**Response:**
```json
[
  { 
    "id": 1, 
    "name": "MacBook Pro M1", 
    "rarity": "Legendary", 
    "icon": "laptop", 
    "type": "equipment", 
    "quantity": 1,
    "auditRequired": true
  },
  { 
    "id": 2, 
    "name": "Scrap Metal", 
    "rarity": "Common", 
    "icon": "box", 
    "type": "resource", 
    "quantity": 45 
  }
]
```

### Get Pending Transfers
**GET** `/inventory/transfer`
Returns list of incoming item transfers waiting for acceptance.
**Response:**
```json
[
  {
    "id": "t_1",
    "fromUser": { "name": "Queen Bee (PM)" },
    "item": { "name": "Project Specs", "rarity": "Epic", "icon": "file", "type": "resource" },
    "quantity": 1,
    "timestamp": "2023-10-27T10:00:00Z"
  }
]
```

### Audit Item (Inventory Check)
**POST** `/inventory/audit`
User confirms item possession or reports it missing.
**Body:**
```json
{
  "itemId": 1,
  "status": "present" // or "missing"
}
```
**Response:**
```json
{ "success": true, "message": "Audit recorded" }
```

### Transfer Item (P2P)
**POST** `/inventory/transfer`
Send an item from your inventory to another user.
**Body:**
```json
{
  "recipientId": 102,
  "itemId": 1,
  "quantity": 1
}
```
**Response:**
```json
{ "success": true, "message": "Item transferred" }
```

### Accept/Reject Transfer (Inbox)
**POST** `/inventory/transfer/respond`
Respond to an incoming item transfer request.
**Body:**
```json
{
  "transferId": "t_1",
  "action": "accept" // or "reject"
}
```
**Response:**
```json
{ "success": true, "message": "Transfer accepted" }
```

---

## 3. Colleagues (Org Chart & Selects)

### Get Colleagues
**GET** `/colleagues`
Returns list of all colleagues for selection lists and org chart.
**Response:**
```json
[
  { "id": "uuid-string-36-chars", "name": "Queen Bee (CEO)", "role": "CEO", "avatar": "👑", "managerId": null },
  { "id": "uuid-string-36-chars-2", "name": "Bumble Bee (QA Lead)", "role": "QA Lead", "avatar": "🐝", "managerId": "uuid-string-36-chars" }
]
```

---

## 4. Economy (Honey)

### Transfer Honey
**POST** `/wallet/transfer`
Send internal currency to another user.
**Body:**
```json
{
  "recipientId": 102,
  "amount": 100
}
```
**Response:**
```json
{ "success": true, "newBalance": 1150 }
```

---

## 5. Marketplace (Shop)

### Get Marketplace Items
**GET** `/marketplace`
Returns list of items for sale (both Company Store and P2P).
**Response:**
```json
[
  {
    "id": "m_1",
    "seller": "system", // or user name for P2P
    "sellerId": null, // ID or null for system
    "name": "Extra Day Off",
    "price": 500,
    "description": "Paid leave voucher",
    "icon": "calendar",
    "rarity": "Legendary",
    "type": "perk"
  }
]
```

### Buy Item
**POST** `/marketplace/buy`
Purchase an item. Honey is deducted, item added to inventory.
**Body:**
```json
{
  "listingId": "m_1"
}
```
**Response:**
```json
{ "success": true, "message": "Item purchased" }
```

### Create Listing (Sell Item)
**POST** `/marketplace/sell`
List an item for sale from user inventory.
**Body:**
```json
{
  "name": "Old Laptop",
  "price": 300,
  "description": "Working condition",
  "rarity": "Common",
  "icon": "box",
  "type": "user_item"
}
```
**Response:**
```json
{
  "id": "new_listing_id",
  "seller": "User Name",
  "name": "Old Laptop",
  "price": 300,
  ...
}
```

---

## 6. Requests (Заявки на потребу)

### Get Requests
Див. нижче «Get Requests» у блоці Request Attachments — **GET** `/requests?view=my|subordinates&StartDate=DD.MM.YYYY&EndDate=DD.MM.YYYY`.

### Get Request Categories
**GET** `/requests/categories`
**Response:** `[{ "id": "cat_1", "name": "Обладнання" }]`

### Create / Update Request
**POST** `/requests` — див. блок Request Attachments нижче.
**Response:** `{ "requestId": "req_1", "status": "draft" }`

### Submit Request
**POST** `/requests/submit`
**Body:** `{ "requestId": "req_1" }`
**Response:** `{ "success": true, "status": "new" }`

Статуси заявки: `draft` → `new`/`pending` (на погодженні) → `approved` | `rejected`.

---

## 7. Requests: Attachments & Respond


### Request Attachments (files)
Requests (`заявки на потребу`) support file attachments, transferred as **base64**.

**Create / Update Request** — **POST** `/requests`
The request body includes a `files` array. Each file's `data` is base64 **without** the `data:*;base64,` prefix:
```json
{
  "id": "req_1",
  "categoryId": "cat_1",
  "shortDesc": "Новий монітор",
  "fullDesc": "Деталі...",
  "files": [
    { "name": "invoice.pdf", "type": "application/pdf", "size": 10240, "data": "base64_encoded_content..." }
  ]
}
```

**Get Requests** — **GET** `/requests?view=my&StartDate=DD.MM.YYYY&EndDate=DD.MM.YYYY`
`view` is `my` or `subordinates`. `StartDate` / `EndDate` bound the list by request date (inclusive) — the backend holds a lot of requests, so the frontend **always** sends a period (default: current calendar month; the user can change it in the UI). Return only requests whose `date` falls inside the period.

Each returned request echoes its attachments in the same shape, with `data` as base64 so the client can preview/download them:
```json
{
  "id": "req_1",
  "files": [
    { "name": "invoice.pdf", "type": "application/pdf", "size": 10240, "data": "base64_encoded_content..." }
  ]
}
```

---

### Respond to Request (Approve/Reject)
**POST** `/requests/respond`
Manager approves or rejects a request.
**Body:**
```json
{
  "requestId": "req_1",
  "action": "approve" // or "reject"
}
```
**Response:**
```json
{ "success": true, "status": "approved" }
```

---

## 8. Timesheet (Табель)

Типи дня (`type`): `Work` (Робочий), `Vacation` (Відпустка), `Sick Leave` (Лікарняний), `Day Off` (Неоплачувана відпустка), `Business Trip` (Відрядження).

### Get Timesheet
**GET** `/timesheet?month=YYYY-MM`
**Response:**
```json
{
  "monthlyNorm": 168,
  "workingDays": 21,
  "calendar": {
    "2026-08-24": { "dayType": "holiday", "name": "День Незалежності" },
    "2026-08-30": { "dayType": "weekend" }
  },
  "reports": {
    "2026-08-03": { "type": "Work", "regularHours": 8, "overtimeHours": 1 },
    "2026-08-04": { "type": "Vacation", "regularHours": 8, "overtimeHours": 0 }
  }
}
```
Старий формат (плоский об'єкт `{"YYYY-MM-DD": {type, ...}}` без обгортки `reports`) також приймається фронтендом.

### Save Daily Report
**POST** `/timesheet/day`
**Body:** `{ "date": "2026-08-03", "type": "Work", "regularHours": 8, "overtimeHours": 1 }`
**Response:** `{ "success": true }` (порожнє тіло на 200 також приймається). Якщо період закрито — `{ "blocked": true, "message": "..." }`.

### Delete Daily Report
**POST** `/timesheet/delete`
**Body:** `{ "date": "2026-08-03" }`
**Response:** як у Save (підтримує `blocked`).

### Get Subordinate Timesheets (для погодження)
**GET** `/timesheet/subordinates?month=YYYY-MM`
**Response:**
```json
{
  "emp1": {
    "id": "emp1", "name": "Петренко І.В.", "role": "Оператор",
    "reports": {
      "2026-08-03": { "type": "Work", "regularHours": 8, "overtimeHours": 0, "status": "pending" }
    }
  }
}
```
`status`: `pending` | `approved` | `rejected` — обирати для погодження можна лише `pending`.

### Approve / Reject Reports
**POST** `/timesheet/approve` — **Body:** `{ "reports": [{ "employeeId": "emp1", "date": "2026-08-03" }] }` → `{ "success": true, "approved": 1 }`
**POST** `/timesheet/reject` — **Body:** `{ "reports": [...], "reason": "..." | null }` → `{ "success": true, "rejected": 1 }`

---


## 9. Warehouse Supplier Orders

⚠️ Розділи 9-11 (складські операції) поки НЕ увімкнені в UI — кнопку «Операції» приховано до готовності бекенда (див. ActionPanel.jsx). Мок-режим для розробки: localStorage-флаги `mockSupplierOrders` / `mockInternalOrders` / `mockShipmentDocuments` = "1" (за замовчуванням вимкнено).

### Get Supplier Orders List
**GET** `/SupplierOrders`
Fetches a list of supplier orders (incoming goods) and available statuses.

`Selectable: true` marks statuses the warehouse worker is allowed to pick when
saving a receiving. Statuses without the flag (or with `false`) are shown on
order cards but cannot be chosen in the save form. If **no** status in the
array carries the `Selectable` field, the frontend treats all of them as
selectable (backward compatibility).

**Response:**
```json
{
  "statuses": [
    { "Id": "new", "Name": "Новий", "Color": "#60a5fa", "Selectable": false },
    { "Id": "inroute", "Name": "В дорозі", "Color": "#fbbf24", "Selectable": false },
    { "Id": "received", "Name": "Прийнято", "Color": "#34d399", "Selectable": true }
  ],
  "orders": [
    {
      "Id": "ord-1001",
      "Number": "ЗП-0001",
      "Date": "2026-06-05",
      "Supplier": { "Id": "s1", "Name": "ТОВ \"Бджолопостач\"" },
      "Warehouse": { "Id": "w1", "Name": "Основний склад" },
      "Status": { "Id": "inroute", "Name": "В дорозі", "Color": "#fbbf24" },
      "Sum": 15400,
      "Currency": "грн",
      "NoDocuments": false,
      "Files": [
         { "Id": "f1", "Name": "Накладна.pdf", "Type": "application/pdf", "Size": 184320 }
      ],
      "Products": [
        { "Id": "p1", "Name": "Цукор", "Unit": "кг", "Count": 500, "Price": 22, "Sum": 11000 }
      ]
    }
  ]
}
```

### Save Supplier Order Receiving
**POST** `/SupplierOrders`
Saves the actual received quantities, files, and status of a supplier order.
**Body:**
```json
{
  "id": "ord-1001",
  "status": "received",
  "noDocuments": false,
  "files": [
    { "name": "scan.pdf", "type": "application/pdf", "size": 10240, "data": "base64_encoded_content..." }
  ],
  "products": [
    { "id": "p1", "count": 500, "received": 490 }
  ]
}
```
**Response:**
```json
{ "success": true }
```

---

## 10. Warehouse Internal Orders

### Get Internal Orders List
**GET** `/InternalOrders`
Fetches a list of internal requests for goods issuing.
**Response:**
```json
{
  "statuses": [
    { "Id": "new", "Name": "Нова", "Color": "#60a5fa" }
  ],
  "orders": [
    {
      "Id": "int-1001",
      "Number": "ВЗ-0001",
      "Date": "2026-06-08",
      "Requester": { "Id": "emp1", "Name": "Петренко І.В." },
      "Warehouse": { "Id": "w1", "Name": "Основний склад" },
      "Status": { "Id": "new", "Name": "Нова", "Color": "#60a5fa" },
      "ManagerApproved": true,
      "Products": [
        { "Id": "p3", "Name": "Банка скляна 0.5 л", "Unit": "шт", "CountRequested": 100, "CountIssued": 0 }
      ]
    }
  ]
}
```

### Save Internal Order Issuing
**POST** `/InternalOrders`
Saves the issued quantities for an internal order and updates its status.
**Body:**
```json
{
  "id": "int-1001",
  "status": "issued",
  "products": [
    { "id": "p3", "requested": 100, "issued": 100 }
  ]
}
```
**Response:**
```json
{ "success": true }
```

---

## 11. Warehouse Shipments (Відправка)

### Get Shipment Documents List
**GET** `/ShipmentDocuments?month=YYYY-MM`
Fetches shipment documents for the given month period (documents to be sent by the warehouse).

`status` is either `posted` (document is posted in 1C) or `draft`.

**Response:**
```json
{
  "documents": [
    {
      "Id": "ship-0001",
      "Date": "2026-07-03",
      "status": "posted",
      "departmentName": "Цех фасування",
      "destination": "НП №12, м. Вінниця",
      "workflow": "Відправка клієнту",
      "lines": [
        { "skuId": "sku1", "skuName": "Мед акацієвий 0.5 л", "quantity": 24 }
      ]
    }
  ]
}
```

### Mark Shipment as Sent
**POST** `/ShipmentDocuments`
Marks a shipment document as sent, optionally attaching files (e.g. photos of the package or the waybill). `data` is base64 without the `data:` prefix.

**Body:**
```json
{
  "id": "ship-0001",
  "files": [
    { "name": "ttn.pdf", "type": "application/pdf", "size": 14230, "data": "JVBERi0x..." }
  ]
}
```
**Response:**
```json
{ "success": true }
```

---

## 12. Individual Expense Reports (Звіт по витратам)

### Get Expense Reports List
**GET** `/IndividualExpenseReports?StartDate=DD.MM.YYYY&EndDate=DD.MM.YYYY`
Fetches the current user's expense reports for the given period.

`File` is a base64-encoded attachment (empty string if none).

**Response:**
```json
[
  {
    "UUID": "1d7e3176-025a-11f1-943b-0296375669d1",
    "Date": "2026-01-30T00:00:00",
    "DeletionMark": false,
    "Posted": true,
    "Amount": 12000,
    "Description": "Підготовка серв",
    "Article": "Аутсорс послуги",
    "File": ""
  }
]
```

### Get Expense Articles Catalog
**GET** `/ExpenseArticles`
Fetches the catalog of expense articles for the create form.

**Response:**
```json
[
  { "UUID": "a1b2c3d4-025a-11f1-943b-0296375669d1", "Name": "Аутсорс послуги" }
]
```

### Create Expense Report
**POST** `/IndividualExpenseReports`
Creates a new expense report. `Date` uses the same `YYYY-MM-DD` format as `date` in `POST /timesheet/day`. `ArticleUUID` is a UUID from `/ExpenseArticles`. `File.data` is base64 without the `data:` prefix; `File` is `null` when no attachment.

**Body:**
```json
{
  "Date": "2026-01-27",
  "ArticleUUID": "a1b2c3d4-025a-11f1-943b-0296375669d1",
  "Description": "Кудрявцев, пайка польотніків",
  "Amount": 20000,
  "File": { "name": "check.pdf", "type": "application/pdf", "size": 14230, "data": "JVBERi0x..." }
}
```
**Response:**
```json
{ "success": true }
```

---

## 13. Car Usage Reports (Звіт по використанню авто)

⚠️ Contract is assumed (mirrors Individual Expense Reports) — confirm with the 1C side.

### Get Cars Catalog
**GET** `/Cars`
Fetches the cars available for reporting. `FuelRemainder` is the **initial** fuel remainder recorded in the system (liters); `FuelConsumption` is the car's average consumption (liters per 100 km); `OdometerStart` is the car's current odometer reading (km) — it prefills the create form's start-odometer field, which is **read-only** for the driver.

The predicted remainder is computed **on the client**:
```
PredictedFuelRemainder = FuelRemainder - (OdometerEnd - OdometerStart) * FuelConsumption / 100 + FuelLiters (якщо заправлявся)
```
(clamped at 0; recalculated live while the driver fills the form).

**Response:**
```json
[
  { "UUID": "c1d2e3f4-025a-11f1-943b-0296375669d1", "Name": "Renault Trafic АВ1234СD", "FuelRemainder": 23.5, "FuelConsumption": 8.5, "OdometerStart": 152340 }
]
```

### Get Route Points Catalog
**GET** `/RoutePoints`
Fetches known route points used as typing suggestions for segment fields (the fields remain free text).

**Response:**
```json
[
  { "UUID": "d5e6f7a8-025a-11f1-943b-0296375669d1", "Name": "Вінниця, офіс" }
]
```

### Get Car Usage Reports List
**GET** `/CarUsageReports?StartDate=DD.MM.YYYY&EndDate=DD.MM.YYYY`
Fetches car usage reports for the given period across **all cars available to the user** (not only the user's own reports). `Driver` is the display name of the person who filed the report.

`Files` uses the **same shape as request attachments** (§7) — `{ name, type, size, data }`, where `data` is base64 **without** the `data:*;base64,` prefix. Empty array when there are no attachments.

The driven distance is computed on the client as `OdometerEnd - OdometerStart`. `FuelLiters` is `0` when `Refueled` is `false`.

**Response:**
```json
[
  {
    "UUID": "2e8f4287-136b-22f2-a54c-1307486770e2",
    "Date": "2026-01-30T00:00:00",
    "DeletionMark": false,
    "Posted": true,
    "Car": { "UUID": "c1d2e3f4-025a-11f1-943b-0296375669d1", "Name": "Renault Trafic АВ1234СD" },
    "Driver": "Петренко І.В.",
    "OdometerStart": 152340,
    "OdometerEnd": 152852,
    "Refueled": true,
    "FuelLiters": 45.5,
    "Segments": [
      { "PointA": "Вінниця, офіс", "PointB": "Київ, склад" },
      { "PointA": "Київ, склад", "PointB": "Вінниця, офіс" }
    ],
    "Comment": "Доставка обладнання",
    "Files": [
      { "name": "ttn.pdf", "type": "application/pdf", "size": 14230, "data": "JVBERi0x..." }
    ]
  }
]
```

### Create Car Usage Report
**POST** `/CarUsageReports`
Creates a new car usage report. `Date` uses `YYYY-MM-DD` (same as `date` in `POST /timesheet/day`). `CarUUID` is a UUID from `/Cars`. `FuelLiters` is `0` when `Refueled` is `false`. `PredictedFuelRemainder` is the client-computed value the driver saw (formula above, rounded to 2 decimals). When the driver confirms it, `FuelRemainderMismatch` is `false` and `ActualFuelRemainder` is `null`; otherwise the driver's own value (liters) is sent. Segment points are free text (suggestions come from `/RoutePoints`). `Files[].data` is base64 without the `data:` prefix; `Files` is `[]` when no attachments.

**Body:**
```json
{
  "Date": "2026-01-28",
  "CarUUID": "c1d2e3f4-025a-11f1-943b-0296375669d1",
  "OdometerStart": 152340,
  "OdometerEnd": 152852,
  "Refueled": true,
  "FuelLiters": 45.5,
  "PredictedFuelRemainder": 25.48,
  "FuelRemainderMismatch": true,
  "ActualFuelRemainder": 18,
  "Segments": [
    { "PointA": "Вінниця, офіс", "PointB": "Київ, склад" },
    { "PointA": "Київ, склад", "PointB": "Вінниця, офіс" }
  ],
  "Comment": "Доставка обладнання",
  "Files": [
    { "name": "check.pdf", "type": "application/pdf", "size": 14230, "data": "JVBERi0x..." }
  ]
}
```
**Response:**
```json
{ "success": true }
```

---

## 14. Profile Sections (доступність секцій)

**GET** `/profile`
The profile response is extended with an optional `Sections` object — a map of section key → availability flag. It controls which worker-panel sections the current user sees.

Frontend rules (backward compatible):
- no `Sections` object at all → every section is visible;
- a key missing from `Sections` → that section is visible;
- only an explicit `false` hides a section.

Currently the frontend checks `CarUsage` (кнопка «Авто») and `ProductionPlan` (кнопка «План виробництва»). Other keys are reserved for the future — the same mechanism will work for any section without frontend rework: `Timesheet`, `Approval`, `Requests`, `ExpenseReports`, `WarehouseOps`, `StockReport`, `Inventory`, etc.

**Response (fragment):**
```json
{
  "name": "Петренко І.В.",
  "...": "...",
  "Sections": {
    "CarUsage": false
  }
}
```

---

## 15. Production Plan (План виробництва)

### Get Production Plan
**GET** `/ProductionPlan?StartDate=DD.MM.YYYY&EndDate=DD.MM.YYYY`
Fetches production plan positions for the given period. The frontend always requests one calendar week (Monday..Sunday) and lets the user switch weeks back and forth; positions are grouped by `Date` on the client and can be filtered with a client-side full-text search (product, workflow number, comment, info, status).

Fields:
- `Date` — planned day (`YYYY-MM-DDT00:00:00`); positions are grouped by it.
- `WorkFlow` — production order number (shown as `#758`, leading zeros trimmed).
- `Product` — product name (string; a `{ UUID, Name }` object is also accepted).
- `Quantity` / `QuantityDone` — planned vs. produced quantity (card shows `done / plan` with a progress bar).
- `Unit` — optional unit shown next to the quantity.
- `Status` — status id: `""` or `new` (Новий), `confirmed` (Підтверджено), `inwork` (В роботі), `done` (Виконано), `cancelled` (Скасовано); unknown ids are shown as-is.
- `Info` — additional production info (free text, may contain line breaks).
- `Comment` — production comment (free text, highlighted on the card).

**Response:**
```json
[
  {
    "Date": "2026-08-11T00:00:00",
    "WorkFlow": "00000758",
    "Product": "VB140 Камікадзе \"Блискавка\" (ніч)",
    "Quantity": 20,
    "QuantityDone": 20,
    "Unit": "",
    "Status": "confirmed",
    "Info": "",
    "Comment": ""
  }
]
```

---

## 16. Salary / Reward Report (Звіт по винагороді)

### Get Report
**GET** `/reports/salary?month=MM&year=YYYY&view=personal|team`
**Response:**
```json
{
  "totalAmount": 45000,
  "totalEmployees": 5,
  "columns": [
    { "key": "name", "title": "Ім'я", "type": "text" },
    { "key": "bonus", "title": "Бонус", "type": "currency" }
  ],
  "groups": [
    { "id": "g1", "title": "Відділ продажів", "items": [ { "id": "r1", "name": "Петренко І.В.", "bonus": 1200 } ] }
  ]
}
```
`columns` і `groups` обов'язкові — без них фронтенд трактує відповідь як помилку. `totalEmployees` — лише для `view=team`.

### Send Question
**POST** `/reports/salary/question`
**Body:** `{ "question": "...", "month": "08", "year": "2026" }`
**Response:** `{ "success": true }`

---

## 17. Warehouse Inventory Audit (Інвентаризація складу)

### Get Open Inventory Documents
**GET** `/inventory/documents`
**Response:**
```json
[
  { "id": "inv-1", "number": "ІНВ-0001", "warehouseName": "Основний склад", "date": "2026-08-30",
    "items": [ { "id": "p1", "name": "Цукор", "barcode": "4820000000001", "quantity": 0 } ] }
]
```
`items` — опційний передзаповнений список.

### Get Product by Barcode
**GET** `/inventory/product?barcode=<code>`
**Response:** `{ "id": "p1", "name": "Цукор", "barcode": "4820000000001", "unit": "кг" }`; **404** — товар не знайдено.

### Save Inventory
**POST** `/inventory/warehouse-audit`
**Body:**
```json
{
  "documentId": "inv-1",
  "warehouseName": "Основний склад",
  "items": [ { "id": "p1", "name": "Цукор", "barcode": "4820000000001", "scannedQty": 12 } ],
  "date": "2026-08-31T10:00:00.000Z",
  "isDraft": false
}
```
**Response:** `{ "success": true }`

---

## 18. Remaining Items Report (Залишки)

### Get Report
**POST** `/RemainingItems`
**Body:** `{ "warehouses": ["guid"], "folders": ["guid"], "categories": ["guid"] }` (порожні масиви = без фільтра; перший виклик з порожніми фільтрами повертає і довідники для фільтрів).
**Response:**
```json
{
  "warehouses": [ { "GUID": "w1", "Name": "Основний склад" } ],
  "folders":    [ { "GUID": "f1", "Name": "Сировина" } ],
  "categories": [ { "GUID": "c1", "Name": "Мед" } ],
  "products":   [ { "GUID": "p1", "Name": "Мед акацієвий 0.5 л", "Count": 120, "Unit": "шт", "Warehouse": "w1" } ]
}
```

---

## 19. Games (Ігри)

### Bee Invaders
**GET** `/games/bee-invaders/leaderboard` → `[{ "name": "Петренко І.В.", "score": 12500 }]`
**POST** `/games/bee-invaders/score` — **Body:** `{ "score": 12500, ... }` → `{ "success": true }` (порожнє тіло приймається). Скор передається з клієнта — сервер має вважати його недовіреним (клієнтський "токен" тривіально підробний).

### Drone Flight (Політ БПЛА)
**GET** `/games/drone-flight/leaderboard` → той самий формат.
**POST** `/games/drone-flight/score` — той самий формат.
