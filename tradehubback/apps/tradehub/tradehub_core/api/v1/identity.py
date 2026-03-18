import frappe
from frappe import _
import random
import string


def _generate_otp(length=6):
    """Generate a numeric OTP code."""
    return "".join(random.choices(string.digits, k=length))


@frappe.whitelist(allow_guest=True)
def send_registration_otp(email):
    """Send OTP code to the given email for registration verification."""
    if not email:
        frappe.throw(_("Email is required"), frappe.ValidationError)

    # Check if user already exists
    if frappe.db.exists("User", {"email": email, "enabled": 1}):
        frappe.throw(_("This email is already registered"), frappe.ValidationError)

    otp = _generate_otp()

    # Store OTP in cache with 10 minute expiry
    cache_key = f"registration_otp:{email}"
    frappe.cache.set_value(cache_key, otp, expires_in_sec=600)

    # Send OTP via email
    frappe.sendmail(
        recipients=[email],
        subject=_("TradeHub - Registration Verification Code"),
        message=_(
            "<h3>Your Verification Code</h3>"
            "<p>Your registration verification code is: <strong>{0}</strong></p>"
            "<p>This code will expire in 10 minutes.</p>"
        ).format(otp),
        now=True,
    )

    return {"message": _("Verification code sent to {0}").format(email)}


@frappe.whitelist(allow_guest=True)
def verify_registration_otp(email, otp):
    """Verify the OTP code sent during registration."""
    if not email or not otp:
        frappe.throw(_("Email and OTP are required"), frappe.ValidationError)

    cache_key = f"registration_otp:{email}"
    stored_otp = frappe.cache.get_value(cache_key)

    if not stored_otp:
        frappe.throw(_("Verification code has expired. Please request a new one."), frappe.ValidationError)

    if str(stored_otp) != str(otp):
        frappe.throw(_("Invalid verification code"), frappe.ValidationError)

    # Mark email as verified in cache
    frappe.cache.set_value(f"email_verified:{email}", True, expires_in_sec=1800)
    frappe.cache.delete_value(cache_key)

    return {"message": _("Email verified successfully"), "verified": True}


@frappe.whitelist(allow_guest=True)
def register_user(email, full_name, password, account_type="Buyer"):
    """Register a new user after email verification."""
    if not email or not full_name or not password:
        frappe.throw(_("Email, full name, and password are required"), frappe.ValidationError)

    # Check email was verified
    verified = frappe.cache.get_value(f"email_verified:{email}")
    if not verified:
        frappe.throw(_("Please verify your email first"), frappe.ValidationError)

    # Check if user already exists
    if frappe.db.exists("User", {"email": email}):
        frappe.throw(_("This email is already registered"), frappe.ValidationError)

    # Create user
    user = frappe.get_doc({
        "doctype": "User",
        "email": email,
        "first_name": full_name.split()[0] if full_name else full_name,
        "last_name": " ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else "",
        "enabled": 1,
        "new_password": password,
        "send_welcome_email": 0,
    })
    user.insert(ignore_permissions=True)

    # Clean up verification cache
    frappe.cache.delete_value(f"email_verified:{email}")

    frappe.db.commit()

    return {
        "message": _("Registration successful"),
        "user": email,
    }


@frappe.whitelist(allow_guest=True)
def complete_registration_application(email, company_name=None, phone=None, account_type="Buyer"):
    """Complete registration with additional business information."""
    if not email:
        frappe.throw(_("Email is required"), frappe.ValidationError)

    if not frappe.db.exists("User", {"email": email}):
        frappe.throw(_("User not found"), frappe.DoesNotExistError)

    # Update user with additional info
    user = frappe.get_doc("User", email)
    if phone:
        user.phone = phone
    user.save(ignore_permissions=True)

    # Create Supplier Profile if selling
    if account_type == "Seller" and company_name:
        if not frappe.db.exists("Supplier Profile", {"user": email}):
            profile = frappe.get_doc({
                "doctype": "Supplier Profile",
                "user": email,
                "company_name": company_name,
                "status": "Pending",
            })
            profile.insert(ignore_permissions=True)

    frappe.db.commit()

    return {"message": _("Registration application completed")}


@frappe.whitelist(allow_guest=True)
def forgot_password(email):
    """Send password reset link to the given email."""
    if not email:
        frappe.throw(_("Email is required"), frappe.ValidationError)

    if not frappe.db.exists("User", {"email": email, "enabled": 1}):
        # Don't reveal whether email exists
        return {"message": _("If the email exists, a reset link has been sent")}

    # Use Frappe's built-in reset password
    frappe.sendmail(
        recipients=[email],
        subject=_("TradeHub - Password Reset"),
        message=_("Please use the link below to reset your password."),
        now=True,
    )

    otp = _generate_otp()
    frappe.cache.set_value(f"password_reset_otp:{email}", otp, expires_in_sec=600)

    frappe.sendmail(
        recipients=[email],
        subject=_("TradeHub - Password Reset Code"),
        message=_(
            "<h3>Password Reset</h3>"
            "<p>Your password reset code is: <strong>{0}</strong></p>"
            "<p>This code will expire in 10 minutes.</p>"
        ).format(otp),
        now=True,
    )

    return {"message": _("If the email exists, a reset code has been sent")}


@frappe.whitelist(allow_guest=True)
def reset_password(email, otp, new_password):
    """Reset password using OTP code."""
    if not email or not otp or not new_password:
        frappe.throw(_("Email, OTP, and new password are required"), frappe.ValidationError)

    cache_key = f"password_reset_otp:{email}"
    stored_otp = frappe.cache.get_value(cache_key)

    if not stored_otp or str(stored_otp) != str(otp):
        frappe.throw(_("Invalid or expired reset code"), frappe.ValidationError)

    if not frappe.db.exists("User", {"email": email, "enabled": 1}):
        frappe.throw(_("User not found"), frappe.DoesNotExistError)

    user = frappe.get_doc("User", email)
    user.new_password = new_password
    user.save(ignore_permissions=True)

    frappe.cache.delete_value(cache_key)
    frappe.db.commit()

    return {"message": _("Password reset successful")}
