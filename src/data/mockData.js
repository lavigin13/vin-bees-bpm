export const INITIAL_USER = {
    id: 999,
    name: "Алекс Бджіл",
    role: "Старший Дрон",
    level: 5,
    xp: 3500,
    nextLevelXp: 5000,
    honey: 1250,
    reputation: 850,
    avatar: "/bee-avatar.png",
    gender: "Male", // Keep internal gender English, UI will map it if needed
    children: 0,
    hobby: "Бджільництво",
    birthday: "1995-05-20",
    subordinates: [101, 102]
};

export const INVENTORY_ITEMS = [
    { id: 1, name: "MacBook Pro M1", rarity: "Legendary", icon: "laptop", type: "equipment", quantity: 1, auditRequired: true },
    { id: 2, name: "Корпоративна картка", rarity: "Epic", icon: "card", type: "equipment", quantity: 1 },
    { id: 3, name: "Офісне крісло", rarity: "Common", icon: "chair", type: "equipment", quantity: 1 },
    { id: 4, name: "iPhone 15", rarity: "Rare", icon: "phone", type: "equipment", quantity: 1, auditRequired: true },
    { id: 5, name: "Службове авто", rarity: "Legendary", icon: "car", type: "equipment", quantity: 1 },
    { id: 6, name: "Елемент живлення", rarity: "Common", icon: "battery", type: "resource", quantity: 12 },
    { id: 7, name: "Металобрухт", rarity: "Common", icon: "box", type: "resource", quantity: 45 },
    { id: 8, name: "Друкована плата", rarity: "Rare", icon: "cpu", type: "resource", quantity: 3 }
];

export const COLLEAGUES = [
    { id: 100, name: "Королева Бджіл (CEO)", role: "Генеральний директор", avatar: "👑", managerId: null },
    { id: 106, name: "Ведмідь (COO)", role: "Операційний директор", avatar: "🧸", managerId: null },
    { id: 101, name: "Джміль (QA Lead)", role: "Керівник QA", avatar: "🐝", managerId: 100 },
    { id: 102, name: "Бджола-вбивця (CTO)", role: "Технічний директор", avatar: "🕶️", managerId: 100 },
    { id: 103, name: "Робоча Бджола (Dev)", role: "Розробник", avatar: "👷", managerId: 102 },
    { id: 104, name: "Зайнята Бджола (HR)", role: "HR Менеджер", avatar: "📋", managerId: 100 },
    { id: 105, name: "Молодша Бджола (Intern)", role: "Інтерн", avatar: "👶", managerId: 103 },
    { id: 107, name: "Польова Бджола (Ops Lead)", role: "Керівник операцій", avatar: "🚚", managerId: 106 },
    { id: 999, name: "Алекс Бджіл (Ви)", role: "Старший Дрон", avatar: "👤", managerId: 102 }
];

export const MOCK_INCOMING_TRANSFERS = [
    {
        id: 't_1',
        fromUser: { name: "Королева Бджіл (PM)" },
        item: { name: "Специфікації проєкту", rarity: "Epic", icon: "file", type: "resource" },
        quantity: 1,
        timestamp: "2023-10-27T10:00:00Z"
    },
    {
        id: 't_2',
        fromUser: { name: "Робоча Бджола (Dev)" },
        item: { name: "Звіт про помилку", rarity: "Common", icon: "bug", type: "resource" },
        quantity: 5,
        timestamp: "2023-10-27T11:30:00Z"
    }
];

export const MARKETPLACE_ITEMS = [
    {
        id: 'm_1',
        seller: 'system',
        name: "Додатковий вихідний",
        price: 500,
        description: "Ваучер на один додатковий оплачуваний вихідний.",
        icon: "calendar",
        rarity: "Legendary",
        type: "perk"
    },
    {
        id: 'm_2',
        seller: 'system',
        name: "Преміум кава-пас",
        price: 150,
        description: "Безлімітна преміум кава на тиждень.",
        icon: "coffee",
        rarity: "Rare",
        type: "perk"
    },
    {
        id: 'm_3',
        seller: 'system',
        name: "Худі VinBees",
        price: 800,
        description: "Лімітована корпоративна худі.",
        icon: "shirt",
        rarity: "Epic",
        type: "merch"
    },
    {
        id: 'm_4',
        seller: 'Робоча Бджола (Dev)',
        sellerId: 103,
        name: "Механічна клавіатура",
        price: 300,
        description: "Сині свічі, майже не використовувалась.",
        icon: "keyboard",
        rarity: "Rare",
        type: "equipment"
    },
    {
        id: 'm_5',
        seller: 'Королева Бджіл (PM)',
        sellerId: 102,
        name: "Менторська сесія",
        price: 1000,
        description: "1 година кар'єрної консультації.",
        icon: "users",
        rarity: "Legendary",
        type: "service"
    }
];

export const RECIPES = [
    {
        id: 'power_pack',
        name: "Блок живлення",
        outputItem: { name: "Блок живлення", rarity: "Rare", icon: "battery", type: "equipment", quantity: 1 },
        ingredients: [
            { name: "Елемент живлення", quantity: 5 },
            { name: "Металобрухт", quantity: 2 }
        ]
    },
    {
        id: 'super_computer',
        name: "Суперкомп'ютер",
        outputItem: { name: "Суперкомп'ютер", rarity: "Legendary", icon: "cpu", type: "equipment", quantity: 1 },
        ingredients: [
            { name: "Друкована плата", quantity: 3 },
            { name: "Металобрухт", quantity: 10 }
        ]
    }
];

export const MOCK_TRIPS = [
    {
        id: 'trip_1',
        status: 'approved',
        dateFrom: '2023-11-01',
        dateTo: '2023-11-05',
        destination: 'Париж, Відділення',
        goal: 'Стратегічна нарада',
        expenses: [
            { id: 1, type: 'Flight', currency: 'EUR', amount: 450, fileName: 'ticket.pdf' },
            { id: 2, type: 'Hotel', currency: 'EUR', amount: 800, fileName: 'hotel_invoice.pdf' }
        ]
    },
    {
        id: 'trip_2',
        status: 'draft',
        dateFrom: '2023-12-10',
        dateTo: '2023-12-12',
        destination: 'Київ, Головний офіс',
        goal: 'Щорічний аудит',
        expenses: []
    }
];

export const MOCK_DAILY_REPORTS = {
    "2023-10-25": {
        type: "Work",
        tasks: [
            { id: 1, workType: "Development", comment: "Створено нову функцію", quantity: 1, hours: 6 },
            { id: 2, workType: "Meeting", comment: "Щоденний мітинг", quantity: 1, hours: 0.5 }
        ]
    },
    "2023-10-26": {
        type: "Work",
        tasks: [
            { id: 3, workType: "Bugfix", comment: "Виправлено критичний баг #123", quantity: 3, hours: 7 }
        ]
    },
    "2023-10-27": {
        type: "Work",
        tasks: []
    }
};

export const WORK_TYPES = [
    "Development",
    "Meeting",
    "Bugfix",
    "Testing",
    "Design",
    "Management",
    "Other"
];

export const DAY_TYPES = [
    "Work",
    "Vacation",
    "Sick Leave",
    "Day Off",
    "Business Trip"
];

export const REQUEST_CATEGORIES = [
    { id: 'cat_1', name: "Обладнання" },
    { id: 'cat_2', name: "Ліцензія на ПЗ" },
    { id: 'cat_3', name: "Канцелярія" },
    { id: 'cat_4', name: "Меблі" },
    { id: 'cat_5', name: "Доступи/Дозволи" },
    { id: 'cat_6', name: "Інше" }
];

export const MOCK_REQUESTS = [
    {
        id: 'req_1',
        status: 'approved',
        date: '2023-11-10',
        categoryId: 'cat_1',
        shortDesc: 'Потрібна нова мишка',
        fullDesc: 'Моя поточна мишка постійно робить подвійний клік. Потрібна заміна.',
        createdBy: 999 
    },
    {
        id: 'req_2',
        status: 'pending',
        date: '2023-11-15',
        categoryId: 'cat_2',
        shortDesc: 'Ліцензія WebStorm',
        fullDesc: 'Подовження щорічної ліцензії WebStorm.',
        createdBy: 999
    },
    {
        id: 'req_3',
        status: 'new',
        date: '2023-11-12',
        categoryId: 'cat_3',
        shortDesc: 'Блокноти для команди',
        fullDesc: '5 блокнотів для нових інтернів.',
        createdBy: 103
    }
];

export const MOCK_SUBORDINATE_DATA = {
    'sub1': {
        id: 'sub1',
        name: 'Олена Коваль',
        role: 'Молодший аналітик',
        reports: {
            '2026-02-02': { type: 'Work', regularHours: 8, overtimeHours: 1, status: 'approved' },
            '2026-02-03': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'approved' },
            '2026-02-06': { type: 'Work', regularHours: 8, overtimeHours: 1.5, status: 'approved' },
            '2026-02-10': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-11': { type: 'Business Trip', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-14': { type: 'Work', regularHours: 6, overtimeHours: 0, status: 'rejected' },
            '2026-02-17': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-18': { type: 'Work', regularHours: 8, overtimeHours: 2, status: 'pending' },
            '2026-02-19': { type: 'Sick Leave', regularHours: 0, overtimeHours: 0, status: 'approved' },
            '2026-02-21': { type: 'Work', regularHours: 8, overtimeHours: 0.5, status: 'pending' },
            '2026-02-24': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' }
        }
    },
    'sub2': {
        id: 'sub2',
        name: 'Андрій Мельник',
        role: 'Менеджер з продажу',
        reports: {
            '2026-02-03': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'approved' },
            '2026-02-04': { type: 'Work', regularHours: 8, overtimeHours: 1, status: 'approved' },
            '2026-02-07': { type: 'Day Off', regularHours: 0, overtimeHours: 0, status: 'approved' },
            '2026-02-10': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-12': { type: 'Work', regularHours: 7, overtimeHours: 0, status: 'pending' },
            '2026-02-17': { type: 'Business Trip', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-18': { type: 'Work', regularHours: 4, overtimeHours: 0, status: 'rejected' },
            '2026-02-20': { type: 'Work', regularHours: 8, overtimeHours: 1, status: 'pending' },
            '2026-02-26': { type: 'Vacation', regularHours: 0, overtimeHours: 0, status: 'approved' }
        }
    },
    'sub3': {
        id: 'sub3',
        name: 'Марія Іваненко',
        role: 'Дизайнер',
        reports: {
            '2026-02-01': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'approved' },
            '2026-02-05': { type: 'Work', regularHours: 8, overtimeHours: 2, status: 'approved' },
            '2026-02-09': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-16': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-17': { type: 'Vacation', regularHours: 0, overtimeHours: 0, status: 'approved' },
            '2026-02-18': { type: 'Work', regularHours: 8, overtimeHours: 1.5, status: 'pending' },
            '2026-02-22': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'rejected' },
            '2026-02-25': { type: 'Business Trip', regularHours: 8, overtimeHours: 0, status: 'pending' }
        }
    },
    'sub4': {
        id: 'sub4',
        name: 'Павло Дорош',
        role: 'Інженер підтримки',
        reports: {
            '2026-02-02': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'approved' },
            '2026-02-03': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'approved' },
            '2026-02-06': { type: 'Work', regularHours: 8, overtimeHours: 2, status: 'approved' },
            '2026-02-11': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-13': { type: 'Work', regularHours: 8, overtimeHours: 1, status: 'pending' },
            '2026-02-18': { type: 'Sick Leave', regularHours: 0, overtimeHours: 0, status: 'approved' },
            '2026-02-19': { type: 'Work', regularHours: 6, overtimeHours: 0, status: 'rejected' },
            '2026-02-27': { type: 'Work', regularHours: 8, overtimeHours: 0.5, status: 'pending' }
        }
    },
    'sub5': {
        id: 'sub5',
        name: 'Ірина Стецюк',
        role: 'Акаунт-менеджер',
        reports: {
            '2026-02-04': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'approved' },
            '2026-02-05': { type: 'Business Trip', regularHours: 8, overtimeHours: 0, status: 'approved' },
            '2026-02-10': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-12': { type: 'Work', regularHours: 8, overtimeHours: 1, status: 'pending' },
            '2026-02-14': { type: 'Day Off', regularHours: 0, overtimeHours: 0, status: 'approved' },
            '2026-02-17': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'pending' },
            '2026-02-20': { type: 'Work', regularHours: 8, overtimeHours: 0, status: 'rejected' },
            '2026-02-24': { type: 'Vacation', regularHours: 0, overtimeHours: 0, status: 'approved' },
            '2026-02-28': { type: 'Work', regularHours: 5, overtimeHours: 0, status: 'pending' }
        }
    }
};

export const MOCK_PERSONAL_SALARY = {
    totalAmount: 3500,
    totalEmployees: 1,
    columns: [
        { key: 'category', title: 'Категорія', width: '40%', type: 'text' },
        { key: 'description', title: 'Опис', width: '40%', type: 'text' },
        { key: 'amount', title: 'Сума', width: '20%', type: 'currency' }
    ],
    groups: [
        {
            id: 'income',
            title: 'Нарахування',
            items: [
                { id: 1, category: 'Ставка', description: 'Фіксована частина', amount: 2000 },
                { id: 2, category: 'KPI Бонус', description: 'Виконання плану на 110%', amount: 1000 },
                { id: 3, category: 'За вислугу років', description: '2 роки в компанії', amount: 500 }
            ]
        }
    ]
};

export const MOCK_TEAM_SALARY = {
    totalAmount: 24500,
    totalEmployees: 12,
    columns: [
        { key: 'name', title: 'Співробітник', width: '40%', type: 'text' },
        { key: 'role', title: 'Посада', width: '25%', type: 'text' },
        { key: 'kpi', title: 'KPI', width: '15%', type: 'text' },
        { key: 'amount', title: 'Сума', width: '20%', type: 'currency' }
    ],
    groups: [
        {
            id: 'mng',
            title: 'Керівництво',
            items: [
                { id: 1, name: 'Королева Бджіл', role: 'Генеральний директор', kpi: '100%', amount: 10000 },
                { id: 2, name: 'Олексій (Менеджер)', role: 'Менеджер', kpi: '95%', amount: 4500 }
            ]
        },
        {
            id: 'dev',
            title: 'Відділ розробки',
            items: [
                { id: 3, name: 'Джон Кодер', role: 'Senior Розробник', kpi: '110%', amount: 3000 },
                { id: 4, name: 'Джейн Фронтенд', role: 'Middle Розробник', kpi: '98%', amount: 2200 },
                { id: 5, name: 'Боб Тестер', role: 'QA', kpi: '100%', amount: 1800 }
            ]
        },
        {
            id: 'sales',
            title: 'Відділ продажів',
            items: [
                { id: 6, name: 'Аліса Продавець', role: 'Керівник продажів', kpi: '120%', amount: 2500 },
                { id: 7, name: 'Майк Дилер', role: 'Агент з продажів', kpi: '80%', amount: 500 }
            ]
        }
    ]
};