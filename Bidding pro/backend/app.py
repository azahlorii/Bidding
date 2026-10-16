"""
===============================================================================
ServiceBid – Online Service Bidding System
Backend REST API Server (Python Flask + SQLite3)
File: backend/app.py
===============================================================================
"""

import os
import sys
import json
import sqlite3
import hashlib
from urllib.parse import parse_qs

# Ensure database package can be imported
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from database.init_db import init_database, DB_PATH, hash_password


def get_db_connection():
    """Creates a connection to the SQLite database with Row factory enabled."""
    if not os.path.exists(DB_PATH):
        init_database()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def row_to_dict(row):
    """Converts a sqlite3.Row object to a plain Python dictionary."""
    return dict(row) if row is not None else None


# ============================================================================
# CORE CONTROLLER FUNCTIONS (Used by Flask routes & CLI bridge)
# ============================================================================

def api_register_user(data):
    """
    POST /api/register
    Registers a new Customer or Service Provider.
    """
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "customer").strip().lower()
    phone = (data.get("phone") or "").strip()
    specialty = (data.get("specialty") or "").strip()

    # Basic Form Validation
    if not name or len(name) < 2:
        return {"error": "Full name must be at least 2 characters long."}, 400
    if not email or "@" not in email or "." not in email:
        return {"error": "Please enter a valid email address."}, 400
    if not password or len(password) < 6:
        return {"error": "Password must be at least 6 characters long."}, 400
    if role not in ("customer", "provider"):
        return {"error": "Role must be either 'customer' or 'provider'."}, 400
    if role == "provider" and not specialty:
        return {"error": "Service providers must specify their primary skill/specialty."}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO users (name, email, password, role, phone, specialty)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (name, email, hash_password(password), role, phone, specialty),
        )
        conn.commit()
        user_id = cursor.lastrowid
        cursor.execute(
            "SELECT id, name, email, role, phone, specialty, created_at FROM users WHERE id = ?",
            (user_id,),
        )
        user = row_to_dict(cursor.fetchone())
        return {"message": "Registration successful!", "user": user}, 201
    except sqlite3.IntegrityError:
        return {"error": "An account with this email address already exists."}, 409
    finally:
        conn.close()


def api_login_user(data):
    """
    POST /api/login
    Authenticates Customer, Service Provider, or Admin.
    """
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    expected_role = (data.get("role") or "").strip().lower()

    if not email or not password:
        return {"error": "Both email and password are required."}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, password, role, phone, specialty, created_at FROM users WHERE lower(email) = ?",
        (email,),
    )
    user = row_to_dict(cursor.fetchone())
    conn.close()

    if not user or user["password"] != hash_password(password):
        return {"error": "Invalid email or password. Please check your credentials."}, 401

    if expected_role and expected_role != "any" and user["role"] != expected_role:
        return {
            "error": f"This account is registered as a '{user['role']}'. Please use the {user['role'].capitalize()} login tab."
        }, 403

    user.pop("password", None)
    return {"message": "Login successful!", "user": user}, 200


def api_get_services(query_params):
    """
    GET /api/services
    Returns all service requirements with customer details and bid counts.
    """
    category = query_params.get("category", "")
    status = query_params.get("status", "")
    customer_id = query_params.get("customer_id", "")
    search = query_params.get("search", "").strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """
        SELECT
            s.*,
            u.name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone,
            p.name AS selected_provider_name,
            p.specialty AS selected_provider_specialty,
            (SELECT COUNT(*) FROM bids b WHERE b.service_id = s.id) AS bid_count,
            (SELECT MIN(b.bid_amount) FROM bids b WHERE b.service_id = s.id) AS lowest_bid
        FROM services s
        JOIN users u ON s.customer_id = u.id
        LEFT JOIN users p ON s.selected_provider_id = p.id
        WHERE 1=1
    """
    params = []

    if category and category != "All":
        sql += " AND s.category = ?"
        params.append(category)
    if status and status != "All":
        sql += " AND s.status = ?"
        params.append(status)
    if customer_id:
        sql += " AND s.customer_id = ?"
        params.append(int(customer_id))
    if search:
        sql += " AND (s.title LIKE ? OR s.description LIKE ? OR s.category LIKE ?)"
        like_term = f"%{search}%"
        params.extend([like_term, like_term, like_term])

    sql += " ORDER BY s.id DESC"
    cursor.execute(sql, params)
    services = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"services": services}, 200


def api_get_service_detail(service_id):
    """
    GET /api/services/<id>
    Returns a single service post along with all bids submitted for it.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            s.*,
            u.name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone,
            p.name AS selected_provider_name,
            p.email AS selected_provider_email,
            p.phone AS selected_provider_phone,
            p.specialty AS selected_provider_specialty
        FROM services s
        JOIN users u ON s.customer_id = u.id
        LEFT JOIN users p ON s.selected_provider_id = p.id
        WHERE s.id = ?
        """,
        (service_id,),
    )
    service = row_to_dict(cursor.fetchone())
    if not service:
        conn.close()
        return {"error": "Service requirement not found."}, 404

    cursor.execute(
        """
        SELECT
            b.*,
            u.name AS provider_name,
            u.email AS provider_email,
            u.phone AS provider_phone,
            u.specialty AS provider_specialty
        FROM bids b
        JOIN users u ON b.provider_id = u.id
        WHERE b.service_id = ?
        ORDER BY b.bid_amount ASC, b.id DESC
        """,
        (service_id,),
    )
    bids = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    service["bids"] = bids
    return {"service": service}, 200


def api_create_service(data):
    """
    POST /api/services
    Allows a Customer to post a new service requirement.
    """
    customer_id = data.get("customer_id")
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "").strip()
    budget = data.get("budget")
    deadline = (data.get("deadline") or "").strip()

    if not customer_id:
        return {"error": "Customer authentication is required to post a service."}, 401
    if not title or len(title) < 5:
        return {"error": "Service title must be at least 5 characters long."}, 400
    if not description or len(description) < 15:
        return {"error": "Please provide a clear description (at least 15 characters)."}, 400
    if not category:
        return {"error": "Please select a service category."}, 400
    try:
        budget_val = float(budget)
        if budget_val <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return {"error": "Budget must be a positive number."}, 400
    if not deadline:
        return {"error": "Please specify a valid target deadline date."}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, role FROM users WHERE id = ?", (customer_id,))
    user = row_to_dict(cursor.fetchone())
    if not user or user["role"] not in ("customer", "admin"):
        conn.close()
        return {"error": "Only registered customers can post service requirements."}, 403

    cursor.execute(
        """
        INSERT INTO services (customer_id, title, description, category, budget, deadline, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Open')
        """,
        (customer_id, title, description, category, budget_val, deadline),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return api_get_service_detail(new_id)[0], 201


def api_update_service_status(service_id, data):
    """
    PUT /api/services/<id>/status
    Allows Customer or Admin to mark an assigned service as Completed or Cancelled.
    """
    new_status = (data.get("status") or "").strip()
    if new_status not in ("Open", "Assigned", "Completed", "Cancelled"):
        return {"error": "Invalid service status."}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE services SET status = ? WHERE id = ?", (new_status, service_id))
    if cursor.rowcount == 0:
        conn.close()
        return {"error": "Service not found."}, 404
    conn.commit()
    conn.close()
    return {"message": f"Service status updated to '{new_status}'."}, 200


def api_submit_bid(data):
    """
    POST /api/bids
    Allows a Service Provider to submit a bid on an Open service requirement.
    """
    service_id = data.get("service_id")
    provider_id = data.get("provider_id")
    bid_amount = data.get("bid_amount")
    delivery_days = data.get("delivery_days", 5)
    message = (data.get("message") or "").strip()

    if not service_id or not provider_id:
        return {"error": "Service ID and Provider ID are required."}, 400
    try:
        amount_val = float(bid_amount)
        if amount_val <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return {"error": "Bid amount must be a valid positive number."}, 400

    try:
        days_val = int(delivery_days)
        if days_val <= 0:
            days_val = 1
    except (TypeError, ValueError):
        days_val = 5

    if not message or len(message) < 10:
        return {"error": "Bid proposal message must be at least 10 characters long."}, 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check provider role
    cursor.execute("SELECT id, role FROM users WHERE id = ?", (provider_id,))
    provider = row_to_dict(cursor.fetchone())
    if not provider or provider["role"] != "provider":
        conn.close()
        return {"error": "Only registered Service Providers can submit bids."}, 403

    # Check service exists and is Open
    cursor.execute("SELECT id, status, customer_id FROM services WHERE id = ?", (service_id,))
    service = row_to_dict(cursor.fetchone())
    if not service:
        conn.close()
        return {"error": "Service requirement not found."}, 404
    if service["status"] != "Open":
        conn.close()
        return {"error": "Bidding is closed for this service requirement."}, 400

    # Check if provider already placed a bid on this service
    cursor.execute(
        "SELECT id FROM bids WHERE service_id = ? AND provider_id = ?",
        (service_id, provider_id),
    )
    existing = cursor.fetchone()
    if existing:
        # Update existing bid if still Pending
        cursor.execute(
            """
            UPDATE bids
            SET bid_amount = ?, delivery_days = ?, message = ?, created_at = datetime('now', 'localtime')
            WHERE id = ? AND status = 'Pending'
            """,
            (amount_val, days_val, message, existing["id"]),
        )
        conn.commit()
        conn.close()
        return {"message": "Your existing bid for this service has been updated!"}, 200

    cursor.execute(
        """
        INSERT INTO bids (service_id, provider_id, bid_amount, delivery_days, message, status)
        VALUES (?, ?, ?, ?, ?, 'Pending')
        """,
        (service_id, provider_id, amount_val, days_val, message),
    )
    conn.commit()
    conn.close()
    return {"message": "Bid submitted successfully!"}, 201


def api_select_bid(bid_id, data):
    """
    POST /api/bids/<id>/accept
    Allows a Customer to accept a bid and assign the service provider.
    Automatically marks the service as 'Assigned' and other bids for the same service as 'Rejected'.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT b.*, s.customer_id, s.status AS service_status
        FROM bids b
        JOIN services s ON b.service_id = s.id
        WHERE b.id = ?
        """,
        (bid_id,),
    )
    bid = row_to_dict(cursor.fetchone())
    if not bid:
        conn.close()
        return {"error": "Bid not found."}, 404

    service_id = bid["service_id"]
    provider_id = bid["provider_id"]

    # 1. Mark chosen bid as Accepted
    cursor.execute("UPDATE bids SET status = 'Accepted' WHERE id = ?", (bid_id,))
    # 2. Mark all other bids on this service as Rejected
    cursor.execute(
        "UPDATE bids SET status = 'Rejected' WHERE service_id = ? AND id != ?",
        (service_id, bid_id),
    )
    # 3. Update service status to Assigned and record selected_provider_id
    cursor.execute(
        "UPDATE services SET status = 'Assigned', selected_provider_id = ? WHERE id = ?",
        (provider_id, service_id),
    )

    conn.commit()
    conn.close()
    return {
        "message": "Bid accepted! The service provider has been assigned to your service requirement."
    }, 200


def api_reject_bid(bid_id):
    """
    POST /api/bids/<id>/reject
    Allows a Customer to reject an individual pending bid.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE bids SET status = 'Rejected' WHERE id = ? AND status = 'Pending'", (bid_id,))
    if cursor.rowcount == 0:
        conn.close()
        return {"error": "Bid not found or cannot be rejected."}, 400
    conn.commit()
    conn.close()
    return {"message": "Bid marked as rejected."}, 200


def api_get_provider_bids(provider_id):
    """
    GET /api/provider/<id>/bids
    Returns all bids submitted by a specific Service Provider along with service & customer details.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            b.*,
            s.title AS service_title,
            s.category AS service_category,
            s.budget AS service_budget,
            s.deadline AS service_deadline,
            s.status AS service_status,
            u.name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone
        FROM bids b
        JOIN services s ON b.service_id = s.id
        JOIN users u ON s.customer_id = u.id
        WHERE b.provider_id = ?
        ORDER BY b.id DESC
        """,
        (provider_id,),
    )
    bids = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"bids": bids}, 200


def api_get_admin_overview():
    """
    GET /api/admin/overview
    Returns platform statistics, all users, all services, and all bids for the Admin panel.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, name, email, role, phone, specialty, created_at FROM users ORDER BY id DESC"
    )
    users = [row_to_dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT
            s.*,
            u.name AS customer_name,
            p.name AS selected_provider_name,
            (SELECT COUNT(*) FROM bids b WHERE b.service_id = s.id) AS bid_count
        FROM services s
        JOIN users u ON s.customer_id = u.id
        LEFT JOIN users p ON s.selected_provider_id = p.id
        ORDER BY s.id DESC
        """
    )
    services = [row_to_dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT
            b.*,
            s.title AS service_title,
            u.name AS provider_name,
            u.specialty AS provider_specialty,
            c.name AS customer_name
        FROM bids b
        JOIN services s ON b.service_id = s.id
        JOIN users u ON b.provider_id = u.id
        JOIN users c ON s.customer_id = c.id
        ORDER BY b.id DESC
        """
    )
    bids = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    stats = {
        "total_users": len(users),
        "total_customers": sum(1 for u in users if u["role"] == "customer"),
        "total_providers": sum(1 for u in users if u["role"] == "provider"),
        "total_services": len(services),
        "open_services": sum(1 for s in services if s["status"] == "Open"),
        "assigned_services": sum(1 for s in services if s["status"] in ("Assigned", "Completed")),
        "total_bids": len(bids),
        "accepted_bids": sum(1 for b in bids if b["status"] == "Accepted"),
    }

    return {
        "stats": stats,
        "users": users,
        "services": services,
        "bids": bids,
    }, 200


def api_admin_delete_user(user_id):
    """DELETE /api/admin/users/<id>"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = row_to_dict(cursor.fetchone())
    if not row:
        conn.close()
        return {"error": "User not found."}, 404
    if row["role"] == "admin":
        conn.close()
        return {"error": "Cannot delete the primary system administrator account."}, 403

    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User and associated records removed successfully."}, 200


def api_admin_delete_service(service_id):
    """DELETE /api/admin/services/<id>"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM services WHERE id = ?", (service_id,))
    if cursor.rowcount == 0:
        conn.close()
        return {"error": "Service requirement not found."}, 404
    conn.commit()
    conn.close()
    return {"message": "Service requirement and its bids deleted successfully."}, 200


def api_admin_delete_bid(bid_id):
    """DELETE /api/admin/bids/<id>"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bids WHERE id = ?", (bid_id,))
    if cursor.rowcount == 0:
        conn.close()
        return {"error": "Bid not found."}, 404
    conn.commit()
    conn.close()
    return {"message": "Bid removed successfully."}, 200


def api_reset_demo_data():
    """POST /api/admin/reset-demo"""
    init_database(force_reset=True)
    return {"message": "Database reset to default college viva sample data."}, 200


# ============================================================================
# UNIFIED REQUEST DISPATCHER (Used by both Flask & CLI Bridge)
# ============================================================================

def dispatch_request(method, path, query_params=None, body=None):
    """Routes an HTTP-like request to the appropriate SQLite controller function."""
    query_params = query_params or {}
    body = body or {}
    clean_path = path.rstrip("/") or "/"

    if clean_path == "/api/register" and method == "POST":
        return api_register_user(body)
    if clean_path == "/api/login" and method == "POST":
        return api_login_user(body)
    if clean_path == "/api/services" and method == "GET":
        return api_get_services(query_params)
    if clean_path == "/api/services" and method == "POST":
        return api_create_service(body)

    if clean_path.startswith("/api/services/"):
        parts = clean_path.split("/")
        # /api/services/<id>
        if len(parts) == 4 and parts[3].isdigit():
            service_id = int(parts[3])
            if method == "GET":
                return api_get_service_detail(service_id)
            if method == "DELETE":
                return api_admin_delete_service(service_id)
        # /api/services/<id>/status
        if len(parts) == 5 and parts[3].isdigit() and parts[4] == "status" and method in ("PUT", "POST"):
            return api_update_service_status(int(parts[3]), body)

    if clean_path == "/api/bids" and method == "POST":
        return api_submit_bid(body)

    if clean_path.startswith("/api/bids/"):
        parts = clean_path.split("/")
        if len(parts) == 5 and parts[3].isdigit():
            bid_id = int(parts[3])
            action = parts[4]
            if action == "accept" and method == "POST":
                return api_select_bid(bid_id, body)
            if action == "reject" and method == "POST":
                return api_reject_bid(bid_id)

    if clean_path.startswith("/api/provider/"):
        parts = clean_path.split("/")
        if len(parts) == 5 and parts[3].isdigit() and parts[4] == "bids" and method == "GET":
            return api_get_provider_bids(int(parts[3]))

    if clean_path == "/api/admin/overview" and method == "GET":
        return api_get_admin_overview()

    if clean_path == "/api/admin/reset-demo" and method == "POST":
        return api_reset_demo_data()

    if clean_path.startswith("/api/admin/users/") and method == "DELETE":
        parts = clean_path.split("/")
        if len(parts) == 5 and parts[4].isdigit():
            return api_admin_delete_user(int(parts[4]))

    if clean_path.startswith("/api/admin/services/") and method == "DELETE":
        parts = clean_path.split("/")
        if len(parts) == 5 and parts[4].isdigit():
            return api_admin_delete_service(int(parts[4]))

    if clean_path.startswith("/api/admin/bids/") and method == "DELETE":
        parts = clean_path.split("/")
        if len(parts) == 5 and parts[4].isdigit():
            return api_admin_delete_bid(int(parts[4]))

    return {"error": f"Endpoint not found: {method} {clean_path}"}, 404


# ============================================================================
# FLASK SERVER APPLICATION (When run via `python backend/app.py`)
# ============================================================================

def create_flask_app():
    from flask import Flask, request, jsonify, send_from_directory

    frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
    app = Flask(__name__, static_folder=frontend_dir, static_url_path="")

    @app.route("/")
    def serve_index():
        return send_from_directory(frontend_dir, "index.html")

    @app.route("/api/<path:subpath>", methods=["GET", "POST", "PUT", "DELETE"])
    def handle_api(subpath):
        full_path = f"/api/{subpath}"
        query_params = {k: v for k, v in request.args.items()}
        body = request.get_json(silent=True) or {}
        response_data, status_code = dispatch_request(
            request.method, full_path, query_params, body
        )
        return jsonify(response_data), status_code

    return app


if __name__ == "__main__":
    # Mode 1: CLI JSON bridge for Node/Express proxy in cloud sandbox
    if len(sys.argv) > 1 and sys.argv[1] == "--cli-json":
        payload = json.loads(sys.stdin.read() or "{}")
        res_data, status = dispatch_request(
            payload.get("method", "GET"),
            payload.get("path", "/"),
            payload.get("query", {}),
            payload.get("body", {}),
        )
        sys.stdout.write(json.dumps({"status": status, "data": res_data}))
        sys.exit(0)

    # Mode 2: Standard Python Flask Development Server
    init_database()
    try:
        flask_app = create_flask_app()
        port = int(os.environ.get("PORT", 5000))
        print(f"Starting ServiceBid Flask Server on http://127.0.0.1:{port}")
        flask_app.run(host="0.0.0.0", port=port, debug=True)
    except ImportError:
        print("Flask is not installed. Run: pip install -r backend/requirements.txt")
