// ... (existing content for sections 1-7) ...

// ... (existing content for sections 1-7) ...

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
