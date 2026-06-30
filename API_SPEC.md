// ... (existing content for sections 1-7) ...

// ... (existing content for sections 1-7) ...

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

**Get Requests** — **GET** `/requests?view=my`
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

## 8. Timesheet (New)

### Get Timesheet
**GET** `/timesheet`
Returns daily reports for a specific month.
**Query Params:**
- `month`: `YYYY-MM` (e.g. `2023-11`)
**Response:**
```json
{
  "2023-11-01": {
    "type": "Work",
    "tasks": [
      { "id": 1, "workType": "Development", "comment": "Feature A", "quantity": 1, "hours": 8 }
    ]
  },
  "2023-11-02": {
    "type": "Vacation",
    "tasks": []
  }
}
```

### Save Daily Report
**POST** `/timesheet/day`
Create or update a report for a specific day.
**Body:**
```json
{
  "date": "2023-11-01",
  "type": "Work",
  "tasks": [
    { "workType": "Development", "comment": "Feature A", "quantity": 1, "hours": 8 }
  ]
}
```

---

## 9. Warehouse Supplier Orders

### Get Supplier Orders List
**GET** `/SupplierOrders`
Fetches a list of supplier orders (incoming goods) and available statuses.
**Response:**
```json
{
  "statuses": [
    { "Id": "new", "Name": "Новий", "Color": "#60a5fa" },
    { "Id": "inroute", "Name": "В дорозі", "Color": "#fbbf24" }
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
