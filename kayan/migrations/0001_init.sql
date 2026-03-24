-- ============================================================
-- Gallery Management System — D1 Schema Migration
-- 4 modules · 14 tables · 15 enum types (CHECK constraints)
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- MODULE 1: Inventory & Shipments
-- ============================================================

CREATE TABLE IF NOT EXISTS location (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('gallery', 'warehouse'))
);

CREATE TABLE IF NOT EXISTS supplier (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    phone   TEXT,
    address TEXT,
    notes   TEXT,
    status  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS shipment (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id      INTEGER NOT NULL REFERENCES supplier(id),
    date_received    TEXT NOT NULL,
    declared_value   REAL NOT NULL DEFAULT 0,
    payment_status   TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'settled')),
    partial_delivery INTEGER NOT NULL DEFAULT 0,
    notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_shipment_supplier ON shipment(supplier_id);

CREATE TABLE IF NOT EXISTS shipment_installment (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL REFERENCES shipment(id),
    amount      REAL NOT NULL,
    due_date    TEXT NOT NULL,
    is_paid     INTEGER NOT NULL DEFAULT 0,
    paid_date   TEXT
);
CREATE INDEX IF NOT EXISTS idx_shipment_installment_shipment ON shipment_installment(shipment_id);

CREATE TABLE IF NOT EXISTS item (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id    INTEGER NOT NULL REFERENCES shipment(id),
    location_id    INTEGER NOT NULL REFERENCES location(id),
    name           TEXT NOT NULL,
    category       TEXT,
    description    TEXT,
    purchase_value REAL NOT NULL DEFAULT 0,
    sale_price     REAL NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'in_storage' CHECK (status IN ('on_display', 'in_storage', 'reserved', 'sold', 'in_transit'))
);
CREATE INDEX IF NOT EXISTS idx_item_shipment  ON item(shipment_id);
CREATE INDEX IF NOT EXISTS idx_item_location  ON item(location_id);
CREATE INDEX IF NOT EXISTS idx_item_status    ON item(status);

CREATE TABLE IF NOT EXISTS item_part (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_item_id INTEGER NOT NULL REFERENCES item(id),
    part_item_id   INTEGER NOT NULL REFERENCES item(id)
);
CREATE INDEX IF NOT EXISTS idx_item_part_parent ON item_part(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_item_part_part   ON item_part(part_item_id);

CREATE TABLE IF NOT EXISTS item_transfer (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id          INTEGER NOT NULL REFERENCES item(id),
    from_location_id INTEGER NOT NULL REFERENCES location(id),
    to_location_id   INTEGER NOT NULL REFERENCES location(id),
    transfer_date    TEXT NOT NULL,
    transport_cost   REAL NOT NULL DEFAULT 0,
    vehicle          TEXT,
    transporter_id   INTEGER REFERENCES person(id),
    notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_item_transfer_item ON item_transfer(item_id);
CREATE INDEX IF NOT EXISTS idx_item_transfer_from ON item_transfer(from_location_id);
CREATE INDEX IF NOT EXISTS idx_item_transfer_to   ON item_transfer(to_location_id);
CREATE INDEX IF NOT EXISTS idx_item_transfer_transporter ON item_transfer(transporter_id);

-- ============================================================
-- MODULE 2: Customer Sales
-- ============================================================

CREATE TABLE IF NOT EXISTS customer (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    phone TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS sales_order (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id           INTEGER NOT NULL REFERENCES customer(id),
    item_id               INTEGER REFERENCES item(id),
    location_id           INTEGER NOT NULL REFERENCES location(id),
    agreed_price          REAL NOT NULL DEFAULT 0,
    status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'backorder', 'fulfilled', 'cancelled')),
    is_backorder          INTEGER NOT NULL DEFAULT 0,
    backorder_description TEXT,
    expected_arrival      TEXT,
    fulfillment_trigger   TEXT CHECK (fulfillment_trigger IN ('specific_order', 'assigned_on_arrival', 'customer_waiting')),
    order_date            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_order_customer ON sales_order(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_item     ON sales_order(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_location ON sales_order(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_status   ON sales_order(status);

CREATE TABLE IF NOT EXISTS order_payment (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES sales_order(id),
    amount       REAL NOT NULL,
    payment_date TEXT NOT NULL,
    notes        TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_payment_order ON order_payment(order_id);

-- ============================================================
-- MODULE 3: People & Payroll
-- ============================================================

CREATE TABLE IF NOT EXISTS person (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('accountant', 'sales', 'transporter', 'cleaner', 'worker', 'other')),
    phone           TEXT,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('permanent', 'temporary', 'daily_hire')),
    payment_type    TEXT NOT NULL CHECK (payment_type IN ('monthly_salary', 'daily_wage', 'per_task', 'mixed')),
    rate            REAL NOT NULL DEFAULT 0,
    contract_start  TEXT,
    contract_end    TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'contract_ended'))
);

CREATE TABLE IF NOT EXISTS person_location (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id   INTEGER NOT NULL REFERENCES person(id),
    location_id INTEGER NOT NULL REFERENCES location(id)
);
CREATE INDEX IF NOT EXISTS idx_person_location_person   ON person_location(person_id);
CREATE INDEX IF NOT EXISTS idx_person_location_location ON person_location(location_id);

CREATE TABLE IF NOT EXISTS work_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id     INTEGER NOT NULL REFERENCES person(id),
    location_id   INTEGER NOT NULL REFERENCES location(id),
    log_date      TEXT NOT NULL,
    log_type      TEXT NOT NULL CHECK (log_type IN ('day_worked', 'task', 'trip', 'month_confirmed')),
    quantity      REAL NOT NULL DEFAULT 1,
    amount_earned REAL NOT NULL DEFAULT 0,
    transfer_id   INTEGER REFERENCES item_transfer(id),
    notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_work_log_person   ON work_log(person_id);
CREATE INDEX IF NOT EXISTS idx_work_log_location ON work_log(location_id);
CREATE INDEX IF NOT EXISTS idx_work_log_date     ON work_log(log_date);
CREATE INDEX IF NOT EXISTS idx_work_log_transfer ON work_log(transfer_id);

CREATE TABLE IF NOT EXISTS person_payment (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id    INTEGER NOT NULL REFERENCES person(id),
    amount       REAL NOT NULL,
    payment_date TEXT NOT NULL,
    method       TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer')),
    notes        TEXT
);
CREATE INDEX IF NOT EXISTS idx_person_payment_person ON person_payment(person_id);

-- ============================================================
-- MODULE 4: Expenses & Finance
-- ============================================================

CREATE TABLE IF NOT EXISTS expense (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    description       TEXT NOT NULL,
    amount            REAL NOT NULL,
    expense_date      TEXT NOT NULL,
    category          TEXT NOT NULL CHECK (category IN ('packaging', 'cleaning', 'tools', 'repair', 'other')),
    location_id       INTEGER REFERENCES location(id),
    paid_by_person_id INTEGER REFERENCES person(id),
    is_reimbursement  INTEGER NOT NULL DEFAULT 0,
    notes             TEXT
);
CREATE INDEX IF NOT EXISTS idx_expense_location ON expense(location_id);
CREATE INDEX IF NOT EXISTS idx_expense_person   ON expense(paid_by_person_id);
CREATE INDEX IF NOT EXISTS idx_expense_date     ON expense(expense_date);

CREATE TABLE IF NOT EXISTS transaction_log (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date TEXT NOT NULL,
    type             TEXT NOT NULL CHECK (type IN ('supplier', 'customer', 'payroll', 'transport', 'expense')),
    direction        TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow')),
    amount           REAL NOT NULL,
    location_id      INTEGER REFERENCES location(id),
    source_table     TEXT,
    source_id        INTEGER,
    notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_transaction_log_date      ON transaction_log(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_log_type      ON transaction_log(type);
CREATE INDEX IF NOT EXISTS idx_transaction_log_direction ON transaction_log(direction);
CREATE INDEX IF NOT EXISTS idx_transaction_log_location  ON transaction_log(location_id);
CREATE INDEX IF NOT EXISTS idx_transaction_log_source    ON transaction_log(source_table, source_id);
