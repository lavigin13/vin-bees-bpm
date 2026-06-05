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
