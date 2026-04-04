export const INITIAL_USER = {
    id: 999, // Main User ID
    name: "Alex Bee",
    role: "Senior Drone",
    level: 5,
    xp: 3500,
    nextLevelXp: 5000,
    honey: 1250,
    reputation: 850,
    avatar: "/bee-avatar.png",
    gender: "Male",
    children: 0,
    hobby: "Beekeeping",
    birthday: "1995-05-20",
    subordinates: [101, 102] // For testing approval mode
};

export const INVENTORY_ITEMS = [
    {
        id: 1,
        name: "MacBook Pro M1",
        rarity: "Legendary",
        icon: "laptop",
        type: "equipment",
        quantity: 1,
        auditRequired: true
    },
    { id: 2, name: "Corporate Card", rarity: "Epic", icon: "card", type: "equipment", quantity: 1 },
    { id: 3, name: "Office Chair", rarity: "Common", icon: "chair", type: "equipment", quantity: 1 },
    {
        id: 4,
        name: "iPhone 15",
        rarity: "Rare",
        icon: "phone",
        type: "equipment",
        quantity: 1,
        auditRequired: true
    },
    { id: 5, name: "Company Car", rarity: "Legendary", icon: "car", type: "equipment", quantity: 1 },
    // Resources
    { id: 6, name: "Battery Cell", rarity: "Common", icon: "battery", type: "resource", quantity: 12 },
    { id: 7, name: "Scrap Metal", rarity: "Common", icon: "box", type: "resource", quantity: 45 },
    { id: 8, name: "Circuit Board", rarity: "Rare", icon: "cpu", type: "resource", quantity: 3 }
];

export const COLLEAGUES = [
    { id: 100, name: "Queen Bee (CEO)", role: "CEO", avatar: "👑", managerId: null },
    { id: 106, name: "Honey Bear (COO)", role: "COO", avatar: "🧸", managerId: null },
    { id: 101, name: "Bumble Bee (QA Lead)", role: "QA Lead", avatar: "🐝", managerId: 100 },
    { id: 102, name: "Killer Bee (CTO)", role: "CTO", avatar: "🕶️", managerId: 100 },
    { id: 103, name: "Worker Bee (Dev)", role: "Developer", avatar: "👷", managerId: 102 },
    { id: 104, name: "Busy Bee (HR)", role: "HR Manager", avatar: "📋", managerId: 100 },
    { id: 105, name: "Junior Bee (Intern)", role: "Intern", avatar: "👶", managerId: 103 },
    { id: 107, name: "Field Bee (Ops Lead)", role: "Operations Lead", avatar: "🚚", managerId: 106 },
    { id: 999, name: "Alex Bee (You)", role: "Senior Drone", avatar: "👤", managerId: 102 } // You
];

export const MOCK_INCOMING_TRANSFERS = [
    {
        id: 't_1',
        fromUser: { name: "Queen Bee (PM)" },
        item: { name: "Project Specs", rarity: "Epic", icon: "file", type: "resource" },
        quantity: 1,
        timestamp: "2023-10-27T10:00:00Z"
    },
    {
        id: 't_2',
        fromUser: { name: "Worker Bee (Dev)" },
        item: { name: "Bug Report", rarity: "Common", icon: "bug", type: "resource" },
        quantity: 5,
        timestamp: "2023-10-27T11:30:00Z"
    }
];

export const MARKETPLACE_ITEMS = [
    // Company Store Items (System)
    {
        id: 'm_1',
        seller: 'system',
        name: "Extra Day Off",
        price: 500,
        description: "Voucher for one additional paid leave day.",
        icon: "calendar",
        rarity: "Legendary",
        type: "perk"
    },
    {
        id: 'm_2',
        seller: 'system',
        name: "Premium Coffee Pass",
        price: 150,
        description: "Unlimited premium coffee for a week.",
        icon: "coffee",
        rarity: "Rare",
        type: "perk"
    },
    {
        id: 'm_3',
        seller: 'system',
        name: "VinBees Hoodie",
        price: 800,
        description: "Limited edition corporate hoodie.",
        icon: "shirt",
        rarity: "Epic",
        type: "merch"
    },
    // P2P Items (Colleagues)
    {
        id: 'm_4',
        seller: 'Worker Bee (Dev)',
        sellerId: 103,
        name: "Mechanical Keyboard",
        price: 300,
        description: "Blue switches, barely used.",
        icon: "keyboard",
        rarity: "Rare",
        type: "equipment"
    },
    {
        id: 'm_5',
        seller: 'Queen Bee (PM)',
        sellerId: 102,
        name: "Mentorship Session",
        price: 1000,
        description: "1 hour career consultation.",
        icon: "users",
        rarity: "Legendary",
        type: "service"
    }
];


export const RECIPES = [
    {
        id: 'power_pack',
        name: "Power Pack",
        outputItem: { name: "Power Pack", rarity: "Rare", icon: "battery", type: "equipment", quantity: 1 },
        ingredients: [
            { name: "Battery Cell", quantity: 5 },
            { name: "Scrap Metal", quantity: 2 }
        ]
    },
    {
        id: 'super_computer',
        name: "Super Computer",
        outputItem: { name: "Super Computer", rarity: "Legendary", icon: "cpu", type: "equipment", quantity: 1 },
        ingredients: [
            { name: "Circuit Board", quantity: 3 },
            { name: "Scrap Metal", quantity: 10 }
        ]
    }
];

export const MOCK_TRIPS = [
    {
        id: 'trip_1',
        status: 'approved',
        dateFrom: '2023-11-01',
        dateTo: '2023-11-05',
        destination: 'Paris, Hive Branch',
        goal: 'Strategy Meeting',
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
        destination: 'Kyiv, HQ',
        goal: 'Annual Audit',
        expenses: []
    }
];

export const MOCK_DAILY_REPORTS = {
    // Format: "YYYY-MM-DD": { type: "Work", tasks: [...] }
    "2023-10-25": {
        type: "Work",
        tasks: [
            { id: 1, workType: "Development", comment: "Built new feature", quantity: 1, hours: 6 },
            { id: 2, workType: "Meeting", comment: "Daily standup", quantity: 1, hours: 0.5 }
        ]
    },
    "2023-10-26": {
        type: "Work",
        tasks: [
            { id: 3, workType: "Bugfix", comment: "Fixed critical bug #123", quantity: 3, hours: 7 }
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
    { id: 'cat_1', name: "Hardware" },
    { id: 'cat_2', name: "Software License" },
    { id: 'cat_3', name: "Office Supplies" },
    { id: 'cat_4', name: "Furniture" },
    { id: 'cat_5', name: "Access/Permissions" },
    { id: 'cat_6', name: "Other" }
];

export const MOCK_REQUESTS = [
    {
        id: 'req_1',
        status: 'approved',
        date: '2023-11-10',
        categoryId: 'cat_1',
        shortDesc: 'Need new mouse',
        fullDesc: 'My current mouse is double-clicking unexpectedly. Need a replacement.',
        createdBy: 999 // Current user
    },
    {
        id: 'req_2',
        status: 'pending',
        date: '2023-11-15',
        categoryId: 'cat_2',
        shortDesc: 'WebStorm License',
        fullDesc: 'Renewal for annual WebStorm license.',
        createdBy: 999
    },
    {
        id: 'req_3',
        status: 'new',
        date: '2023-11-12',
        categoryId: 'cat_3',
        shortDesc: 'Notebooks for team',
        fullDesc: '5 notebooks for new interns.',
        createdBy: 103 // Subordinate (Worker Bee)
    }
];

export const MOCK_SUBORDINATE_DATA = {
    'sub1': {
        id: 'sub1',
        name: 'Олена Коваль',
        role: 'Junior Analyst',
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
        role: 'Sales Manager',
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
        role: 'Designer',
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
        role: 'Support Engineer',
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
        role: 'Account Manager',
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
            title: 'Management (Керівництво)',
            items: [
                { id: 1, name: 'Queen Bee', role: 'CEO', kpi: '100%', amount: 10000 },
                { id: 2, name: 'Alex Supervisor', role: 'Manager', kpi: '95%', amount: 4500 }
            ]
        },
        {
            id: 'dev',
            title: 'IT Department (Розробка)',
            items: [
                { id: 3, name: 'John Coder', role: 'Senior Dev', kpi: '110%', amount: 3000 },
                { id: 4, name: 'Jane Frontend', role: 'Middle Dev', kpi: '98%', amount: 2200 },
                { id: 5, name: 'Bob Tester', role: 'QA', kpi: '100%', amount: 1800 }
            ]
        },
        {
            id: 'sales',
            title: 'Sales (Продажі)',
            items: [
                { id: 6, name: 'Alice Seller', role: 'Sales Lead', kpi: '120%', amount: 2500 },
                { id: 7, name: 'Mike Dealer', role: 'Sales Agent', kpi: '80%', amount: 500 }
            ]
        }
    ]
};