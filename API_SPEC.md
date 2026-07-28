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

### Get Car Usage Reports List
**GET** `/CarUsageReports?StartDate=DD.MM.YYYY&EndDate=DD.MM.YYYY`
Fetches the current user's car usage reports for the given period.

`Files` is an array of base64-encoded attachments (empty array if none). A single `File` string is also accepted.

The driven distance is computed on the client as `OdometerEnd - OdometerStart`. `FuelLiters` is `0` when `Refueled` is `false`.

**Response:**
```json
[
  {
    "UUID": "2e8f4287-136b-22f2-a54c-1307486770e2",
    "Date": "2026-01-30T00:00:00",
    "DeletionMark": false,
    "Posted": true,
    "OdometerStart": 152340,
    "OdometerEnd": 152852,
    "Refueled": true,
    "FuelLiters": 45.5,
    "Files": []
  }
]
```

### Create Car Usage Report
**POST** `/CarUsageReports`
Creates a new car usage report. `Date` uses `YYYY-MM-DD` (same as `date` in `POST /timesheet/day`). `FuelLiters` is `0` when `Refueled` is `false`. `Files[].data` is base64 without the `data:` prefix; `Files` is `[]` when no attachments.

**Body:**
```json
{
  "Date": "2026-01-28",
  "OdometerStart": 152340,
  "OdometerEnd": 152852,
  "Refueled": true,
  "FuelLiters": 45.5,
  "Files": [
    { "name": "check.pdf", "type": "application/pdf", "size": 14230, "data": "JVBERi0x..." }
  ]
}
```
**Response:**
```json
{ "success": true }
```
