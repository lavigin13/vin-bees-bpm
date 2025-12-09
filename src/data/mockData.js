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
    birthday: "1995-05-20"
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
    { id: 101, name: "Bumble Bee (QA Lead)", role: "QA Lead", avatar: "🐝", managerId: 100 },
    { id: 102, name: "Killer Bee (CTO)", role: "CTO", avatar: "🕶️", managerId: 100 },
    { id: 103, name: "Worker Bee (Dev)", role: "Developer", avatar: "👷", managerId: 102 },
    { id: 104, name: "Busy Bee (HR)", role: "HR Manager", avatar: "📋", managerId: 100 },
    { id: 105, name: "Junior Bee (Intern)", role: "Intern", avatar: "👶", managerId: 103 },
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
    "Public Holiday"
];

export const REQUEST_CATEGORIES = [
    "Hardware",
    "Software License",
    "Office Supplies",
    "Furniture",
    "Access/Permissions",
    "Other"
];

export const MOCK_REQUESTS = [
    {
        id: 'req_1',
        status: 'approved',
        date: '2023-11-10',
        category: 'Hardware',
        shortDesc: 'Need new mouse',
        fullDesc: 'My current mouse is double-clicking unexpectedly. Need a replacement.',
        createdBy: 999 // Current user
    },
    {
        id: 'req_2',
        status: 'pending',
        date: '2023-11-15',
        category: 'Software License',
        shortDesc: 'WebStorm License',
        fullDesc: 'Renewal for annual WebStorm license.',
        createdBy: 999
    },
    {
        id: 'req_3',
        status: 'new',
        date: '2023-11-12',
        category: 'Office Supplies',
        shortDesc: 'Notebooks for team',
        fullDesc: '5 notebooks for new interns.',
        createdBy: 103 // Subordinate (Worker Bee)
    }
];