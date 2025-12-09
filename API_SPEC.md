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
