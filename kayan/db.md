# Gallery Management System — Database Schema

**4 modules · 14 tables · 15 enum types · Cloudflare D1 (SQLite)**

---

## Module 1 — Inventory & Shipments

### LOCATION

| column | type   | key | notes                        |
|--------|--------|-----|------------------------------|
| id     | int    | PK  | Auto-increment               |
| name   | string |     | e.g. Gallery A, Warehouse B  |
| type   | enum   |     | `gallery` \| `warehouse`     |

### SUPPLIER

| column | type   | key | notes               |
|--------|--------|-----|----------------------|
| id     | int    | PK  | Auto-increment       |
| name   | string |     | Display name         |
| phone  | string |     | Contact phone        |
| address| string |     | Optional             |
| notes  | string |     | Freeform notes       |
| status | enum   |     | `active` \| `inactive` |

### SHIPMENT

| column           | type    | key | notes                              |
|------------------|---------|-----|------------------------------------|
| id               | int     | PK  | Auto-increment                     |
| supplier_id      | int     | FK  | → SUPPLIER.id                      |
| date_received    | date    |     | Date goods arrived                 |
| declared_value   | decimal |     | Total financial value              |
| payment_status   | enum    |     | `unpaid` \| `partial` \| `settled` |
| partial_delivery | bool    |     | True if more items expected        |
| notes            | string  |     | Optional                           |

### SHIPMENT_INSTALLMENT

| column      | type    | key | notes                        |
|-------------|---------|-----|------------------------------|
| id          | int     | PK  | Auto-increment               |
| shipment_id | int     | FK  | → SHIPMENT.id                |
| amount      | decimal |     | Amount due                   |
| due_date    | date    |     | Expected payment date        |
| is_paid     | bool    |     | Whether paid                 |
| paid_date   | date    |     | Actual payment date (nullable)|

### ITEM

| column         | type    | key | notes                                                        |
|----------------|---------|-----|--------------------------------------------------------------|
| id             | int     | PK  | Auto-increment                                               |
| shipment_id    | int     | FK  | → SHIPMENT.id                                                |
| location_id    | int     | FK  | → LOCATION.id — current location                             |
| name           | string  |     | Display name                                                 |
| category       | string  |     | e.g. sofa, table                                             |
| description    | string  |     | Optional                                                     |
| purchase_value | decimal |     | Cost from shipment                                           |
| sale_price     | decimal |     | Listed selling price                                         |
| status         | enum    |     | `on_display` \| `in_storage` \| `reserved` \| `sold` \| `in_transit` |

### ITEM_PART

| column         | type | key | notes                    |
|----------------|------|-----|--------------------------|
| id             | int  | PK  | Auto-increment           |
| parent_item_id | int  | FK  | → ITEM.id (composite)    |
| part_item_id   | int  | FK  | → ITEM.id (component)    |

### ITEM_TRANSFER

| column           | type    | key | notes                              |
|------------------|---------|-----|------------------------------------|
| id               | int     | PK  | Auto-increment                     |
| item_id          | int     | FK  | → ITEM.id                          |
| from_location_id | int     | FK  | → LOCATION.id                      |
| to_location_id   | int     | FK  | → LOCATION.id                      |
| transfer_date    | date    |     | Date of transfer                   |
| transport_cost   | decimal |     | Cost (0 if none)                   |
| vehicle          | string  |     | Optional vehicle description       |
| transporter_id   | int     | FK  | → PERSON.id (nullable)             |
| notes            | string  |     | Optional                           |

---

## Module 2 — Customer Sales

### CUSTOMER

| column | type   | key | notes          |
|--------|--------|-----|----------------|
| id     | int    | PK  | Auto-increment |
| name   | string |     | Display name   |
| phone  | string |     | Contact phone  |
| notes  | string |     | Optional       |

### SALES_ORDER

| column                | type    | key | notes                                                               |
|-----------------------|---------|-----|---------------------------------------------------------------------|
| id                    | int     | PK  | Auto-increment                                                      |
| customer_id           | int     | FK  | → CUSTOMER.id                                                       |
| item_id               | int     | FK  | → ITEM.id (nullable for backorders)                                 |
| location_id           | int     | FK  | → LOCATION.id — gallery                                             |
| agreed_price          | decimal |     | Final sale price                                                    |
| status                | enum    |     | `active` \| `backorder` \| `fulfilled` \| `cancelled`              |
| is_backorder          | bool    |     | True if item not in gallery                                         |
| backorder_description | string  |     | Description (backorders only)                                       |
| expected_arrival      | date    |     | Optional expected date                                              |
| fulfillment_trigger   | enum    |     | `specific_order` \| `assigned_on_arrival` \| `customer_waiting`     |
| order_date            | date    |     | Date placed                                                         |

### ORDER_PAYMENT

| column       | type    | key | notes          |
|--------------|---------|-----|----------------|
| id           | int     | PK  | Auto-increment |
| order_id     | int     | FK  | → SALES_ORDER.id |
| amount       | decimal |     | Amount received |
| payment_date | date    |     | Date received  |
| notes        | string  |     | Optional       |

---

## Module 3 — People & Payroll

### PERSON

| column          | type    | key | notes                                                                     |
|-----------------|---------|-----|---------------------------------------------------------------------------|
| id              | int     | PK  | Auto-increment                                                            |
| name            | string  |     | Full name                                                                 |
| role            | enum    |     | `accountant` \| `sales` \| `transporter` \| `cleaner` \| `worker` \| `other` |
| phone           | string  |     | Contact phone                                                             |
| employment_type | enum    |     | `permanent` \| `temporary` \| `daily_hire`                                |
| payment_type    | enum    |     | `monthly_salary` \| `daily_wage` \| `per_task` \| `mixed`                |
| rate            | decimal |     | Depends on payment_type                                                   |
| contract_start  | date    |     | Start date (temp only)                                                    |
| contract_end    | date    |     | End date (temp, nullable)                                                 |
| status          | enum    |     | `active` \| `inactive` \| `contract_ended`                               |

### PERSON_LOCATION

| column      | type | key | notes          |
|-------------|------|-----|----------------|
| id          | int  | PK  | Auto-increment |
| person_id   | int  | FK  | → PERSON.id    |
| location_id | int  | FK  | → LOCATION.id  |

### WORK_LOG

| column        | type    | key | notes                                                  |
|---------------|---------|-----|--------------------------------------------------------|
| id            | int     | PK  | Auto-increment                                         |
| person_id     | int     | FK  | → PERSON.id                                            |
| location_id   | int     | FK  | → LOCATION.id                                          |
| log_date      | date    |     | Date of work                                           |
| log_type      | enum    |     | `day_worked` \| `task` \| `trip` \| `month_confirmed`  |
| quantity      | decimal |     | Days, tasks, trips (1 for monthly)                     |
| amount_earned | decimal |     | rate × quantity                                        |
| transfer_id   | int     | FK  | → ITEM_TRANSFER.id (nullable)                          |
| notes         | string  |     | Optional                                               |

### PERSON_PAYMENT

| column       | type    | key | notes                          |
|--------------|---------|-----|--------------------------------|
| id           | int     | PK  | Auto-increment                 |
| person_id    | int     | FK  | → PERSON.id                    |
| amount       | decimal |     | Amount paid                    |
| payment_date | date    |     | Date paid                      |
| method       | enum    |     | `cash` \| `bank_transfer`      |
| notes        | string  |     | Optional                       |

---

## Module 4 — Expenses & Finance

### EXPENSE

| column            | type    | key | notes                                                       |
|-------------------|---------|-----|-------------------------------------------------------------|
| id                | int     | PK  | Auto-increment                                              |
| description       | string  |     | What was purchased                                          |
| amount            | decimal |     | Cost                                                        |
| expense_date      | date    |     | Date occurred                                               |
| category          | enum    |     | `packaging` \| `cleaning` \| `tools` \| `repair` \| `other`|
| location_id       | int     | FK  | → LOCATION.id (nullable)                                    |
| paid_by_person_id | int     | FK  | → PERSON.id (nullable)                                      |
| is_reimbursement  | bool    |     | True if money owed back                                     |
| notes             | string  |     | Optional                                                    |

### TRANSACTION_LOG

| column           | type    | key | notes                                                                |
|------------------|---------|-----|----------------------------------------------------------------------|
| id               | int     | PK  | Auto-increment                                                       |
| transaction_date | date    |     | Date occurred                                                        |
| type             | enum    |     | `supplier` \| `customer` \| `payroll` \| `transport` \| `expense`    |
| direction        | enum    |     | `inflow` \| `outflow`                                                |
| amount           | decimal |     | Payment amount                                                       |
| location_id      | int     | FK  | → LOCATION.id (nullable)                                             |
| source_table     | string  |     | Originating table name                                               |
| source_id        | int     |     | Originating record ID                                                |
| notes            | string  |     | Optional                                                             |

---

## Enum Reference

| field                             | values                                                                    |
|-----------------------------------|---------------------------------------------------------------------------|
| LOCATION.type                     | `gallery` · `warehouse`                                                   |
| SUPPLIER.status                   | `active` · `inactive`                                                     |
| SHIPMENT.payment_status           | `unpaid` · `partial` · `settled`                                          |
| ITEM.status                       | `on_display` · `in_storage` · `reserved` · `sold` · `in_transit`         |
| SALES_ORDER.status                | `active` · `backorder` · `fulfilled` · `cancelled`                       |
| SALES_ORDER.fulfillment_trigger   | `specific_order` · `assigned_on_arrival` · `customer_waiting`            |
| PERSON.role                       | `accountant` · `sales` · `transporter` · `cleaner` · `worker` · `other`  |
| PERSON.employment_type            | `permanent` · `temporary` · `daily_hire`                                  |
| PERSON.payment_type               | `monthly_salary` · `daily_wage` · `per_task` · `mixed`                   |
| PERSON.status                     | `active` · `inactive` · `contract_ended`                                  |
| WORK_LOG.log_type                 | `day_worked` · `task` · `trip` · `month_confirmed`                       |
| PERSON_PAYMENT.method             | `cash` · `bank_transfer`                                                  |
| EXPENSE.category                  | `packaging` · `cleaning` · `tools` · `repair` · `other`                  |
| TRANSACTION_LOG.type              | `supplier` · `customer` · `payroll` · `transport` · `expense`            |
| TRANSACTION_LOG.direction         | `inflow` · `outflow`                                                      |

---

## Cross-Module Foreign Keys

| field                          | references  | purpose                              |
|--------------------------------|-------------|--------------------------------------|
| ITEM.location_id               | LOCATION.id | Current item location                |
| ITEM_TRANSFER.transporter_id   | PERSON.id   | Transporter (optional)               |
| ITEM_TRANSFER.from/to_location | LOCATION.id | Transfer origin/destination          |
| SALES_ORDER.item_id            | ITEM.id     | Item being sold (null=backorder)     |
| SALES_ORDER.location_id        | LOCATION.id | Gallery attribution                  |
| WORK_LOG.transfer_id           | ITEM_TRANSFER.id | Links trip to transfer           |
| WORK_LOG.location_id           | LOCATION.id | Where work was performed             |
| EXPENSE.location_id            | LOCATION.id | Expense attribution                  |
| EXPENSE.paid_by_person_id      | PERSON.id   | Staff who paid out of pocket         |
| TRANSACTION_LOG.location_id    | LOCATION.id | Per-gallery finance reports          |
