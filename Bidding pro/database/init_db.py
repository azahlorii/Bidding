"""
ServiceBid – Online Service Bidding System
Database Initialization & Sample Data Seeder (database/init_db.py)

Usage:
    python3 database/init_db.py
"""

import os
import sqlite3
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "servicebid.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")


def hash_password(password: str) -> str:
    """Simple SHA-256 password hashing for beginner-friendly demonstration."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def init_database(force_reset: bool = False):
    """Creates SQLite tables from schema.sql and inserts initial sample records if empty."""
    if force_reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
        cursor.executescript(schema_sql)

    # Check if users already exist
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]

    if user_count == 0:
        # 1. Seed Users (Admin, Customers, Service Providers)
        sample_users = [
            (
                "System Administrator",
                "admin@servicebid.com",
                hash_password("admin123"),
                "admin",
                "+91 98200 00001",
                "Platform Administration",
            ),
            (
                "Aarav Sharma",
                "aarav@customer.com",
                hash_password("customer123"),
                "customer",
                "+91 98201 11223",
                "",
            ),
            (
                "Priya Nair",
                "priya@customer.com",
                hash_password("customer123"),
                "customer",
                "+91 98202 33445",
                "",
            ),
            (
                "Rohan Verma",
                "rohan@provider.com",
                hash_password("provider123"),
                "provider",
                "+91 98203 44556",
                "Full-Stack Web & Mobile Development",
            ),
            (
                "Meera Joshi",
                "meera@provider.com",
                hash_password("provider123"),
                "provider",
                "+91 98204 55667",
                "Electrical & Home Automation",
            ),
            (
                "Vikram Kulkarni",
                "vikram@provider.com",
                hash_password("provider123"),
                "provider",
                "+91 98205 66778",
                "Interior Carpentry & Plumbing",
            ),
        ]

        cursor.executemany(
            """
            INSERT INTO users (name, email, password, role, phone, specialty)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            sample_users,
        )

        # 2. Seed Services (Posted by Customers id=2 and id=3)
        sample_services = [
            (
                2,
                "Complete 3BHK Apartment Electrical Rewiring & MCB Panel Upgrade",
                "Need a certified electrician to replace old wiring in a 1,450 sq.ft apartment, install a new 12-way distribution board with RCCB protection, and fit 28 modular switches.",
                "Electrical & Repairs",
                18500.00,
                "2026-10-25",
                "Open",
                None,
            ),
            (
                2,
                "E-Commerce Inventory & Billing Web Portal for Local Retail Shop",
                "Looking for a developer to build a responsive billing and stock management web application with barcode scanning support, GST invoice PDF printing, and daily sales reports.",
                "Web & Software",
                32000.00,
                "2026-11-05",
                "Open",
                None,
            ),
            (
                3,
                "Custom Modular Kitchen Cabinet Installation & Sink Plumbing",
                "Require an experienced carpenter and plumber team to assemble marine-ply overhead cabinets, install soft-close hinges, and connect a double-bowl quartz kitchen sink.",
                "Carpentry & Plumbing",
                26000.00,
                "2026-10-22",
                "Assigned",
                6,
            ),
            (
                3,
                "Annual Split AC Deep Cleaning & Gas Refill (3 Units)",
                "Three 1.5-ton inverter split air conditioners require foam jet cleaning of indoor coils, outdoor condenser pressure wash, and R32 refrigerant top-up.",
                "Appliance Servicing",
                4500.00,
                "2026-10-18",
                "Open",
                None,
            ),
        ]

        cursor.executemany(
            """
            INSERT INTO services (customer_id, title, description, category, budget, deadline, status, selected_provider_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            sample_services,
        )

        # 3. Seed Bids (Submitted by Providers id=4, 5, 6)
        sample_bids = [
            (
                1,
                5,
                16800.00,
                4,
                "Licensed electrical contractor with 8 years experience. Price includes Havells FR wiring labour, Legrand MCB box installation, and full earthing check within 4 days.",
                "Pending",
            ),
            (
                1,
                6,
                17900.00,
                5,
                "Our 3-member electrical team can complete the full rewiring and switchboard fitting cleanly with concealed conduit patching included.",
                "Pending",
            ),
            (
                2,
                4,
                28500.00,
                10,
                "I can build this using Python Flask, SQLite/PostgreSQL, and a clean responsive dashboard with instant PDF GST invoice generation and 3 months free support.",
                "Pending",
            ),
            (
                3,
                6,
                24500.00,
                6,
                "Specialised in modular kitchen carpentry and plumbing. Hettich soft-close hardware fitting and leak-proof drain trap installation guaranteed.",
                "Accepted",
            ),
            (
                3,
                5,
                27000.00,
                7,
                "Can handle the plumbing and electrical chimney point along with cabinet mounting.",
                "Rejected",
            ),
            (
                4,
                5,
                3900.00,
                1,
                "We use high-pressure jacket jet wash for all 3 split ACs and digital manifold gauge for accurate R32 gas pressure check. Same-day service.",
                "Pending",
            ),
        ]

        cursor.executemany(
            """
            INSERT INTO bids (service_id, provider_id, bid_amount, delivery_days, message, status)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            sample_bids,
        )

        conn.commit()
        print(f"Database initialized and seeded at: {DB_PATH}")
    else:
        print(f"Database already exists at: {DB_PATH} ({user_count} users found)")

    conn.close()


if __name__ == "__main__":
    init_database()
