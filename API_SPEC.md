# VinBees API Specification

## 1. General
- **Base URL**: `https://bpm.bees.vin/VinBeesTelegram/hs/API`
- **Authorization**: Headers must include `Authorization: tma <initData>` (Telegram Mini App Init Data).
- **Content-Type**: `application/json`

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
  "birthday": "1995-05-20"
}
```

### Update Profile
**PUT** `/profile`
Updates editable fields.
**Body:**
```json
{
  "hobby": "Beekeeping",
  "birthday": "20.05.1995"
}
```

### Get Inventory
**GET** `/inventory`
**Response:**
```json
[
  { "id": 1, "name": "MacBook", "type": "equipment", "rarity": "Legendary", "quantity": 1 },
  { "id": 2, "name": "Scrap Metal", "type": "resource", "rarity": "Common", "quantity": 45 }
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

---

## 3. Economy (Honey)

### Transfer Honey
**POST** `/wallet/transfer`
Send internal currency to another user.
**Body:**
```json
{
  "recipientId": 102,
  "amount": 100,
  "message": "Thanks for help!" // Optional
}
```

---

## 4. Marketplace (Shop)

### Get Marketplace Items
**GET** `/marketplace`
Returns list of items for sale (both Company Store and P2P).
**Response:**
```json
[
  {
    "id": "m_1",
    "seller": "system", // or user name
    "sellerId": null, // null for system
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

### Create Listing (Sell Item)
**POST** `/marketplace/sell`
List an item for sale.
**Body:**
```json
{
  "name": "Old Laptop",
  "price": 300,
  "description": "Working condition",
  "rarity": "Common",
  "icon": "laptop",
  "type": "user_item"
}
```
