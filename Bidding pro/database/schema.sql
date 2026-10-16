-- ============================================================================
-- ServiceBid – Online Service Bidding System
-- Database Schema (SQLite3)
-- ============================================================================
-- Enable foreign key constraints in SQLite
PRAGMA foreign_keys = ON;

-- 1. USERS TABLE
-- Stores Customers, Service Providers, and Administrators
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('customer', 'provider', 'admin')),
    phone TEXT DEFAULT '',
    specialty TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 2. SERVICES TABLE
-- Stores service requirements posted by Customers
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    budget REAL NOT NULL CHECK(budget > 0),
    deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'Assigned', 'Completed', 'Cancelled')),
    selected_provider_id INTEGER DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_provider_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. BIDS TABLE
-- Stores bids submitted by Service Providers for specific Services
CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    bid_amount REAL NOT NULL CHECK(bid_amount > 0),
    delivery_days INTEGER NOT NULL DEFAULT 5,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Accepted', 'Rejected')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);
