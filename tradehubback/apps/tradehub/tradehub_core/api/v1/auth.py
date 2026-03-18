import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def get_csrf_token():
    """Return CSRF token for the current session."""
    return frappe.sessions.get_csrf_token()


@frappe.whitelist(allow_guest=True)
def get_session_user():
    """Return current session user info."""
    user = frappe.session.user

    if user == "Guest":
        return {"user": "Guest", "is_logged_in": False}

    user_doc = frappe.get_doc("User", user)
    return {
        "user": user,
        "full_name": user_doc.full_name,
        "email": user_doc.email,
        "is_logged_in": True,
    }


@frappe.whitelist(allow_guest=True)
def check_email_exists(email=None):
    """Check if an email address is already registered."""
    if not email:
        frappe.throw(_("Email is required"), frappe.ValidationError)

    exists = frappe.db.exists("User", {"email": email, "enabled": 1})
    disabled = frappe.db.exists("User", {"email": email, "enabled": 0})
    return {"exists": bool(exists), "disabled": bool(disabled)}
