import frappe
from frappe import _
from frappe.utils import getdate, cint


# Türkçe (DB) → İngilizce (Frontend) status mapping
STATUS_TR_TO_EN = {
    "Ödeme Bekleniyor": "Waiting for payment",
    "Onaylanıyor": "Confirming",
    "Kargoda": "Delivering",
    "Tamamlandı": "Completed",
    "İptal Edildi": "Cancelled",
}

STATUS_COLORS = {
    "Waiting for payment": "text-amber-600",
    "Confirming": "text-blue-600",
    "Delivering": "text-green-600",
    "Completed": "text-gray-500",
    "Cancelled": "text-red-600",
}

STATUS_DESCRIPTIONS = {
    "Waiting for payment": "Please complete your payment.",
    "Confirming": "Your order is being confirmed.",
    "Delivering": "Your order is on its way.",
    "Completed": "Order completed.",
    "Cancelled": "Order cancelled.",
}

# Frontend status key → Türkçe DB değerleri
FILTER_STATUS_MAP = {
    "unpaid": ["Ödeme Bekleniyor"],
    "confirming": ["Onaylanıyor"],
    "preparing": ["Onaylanıyor"],
    "delivering": ["Kargoda"],
    "completed": ["Tamamlandı"],
    "cancelled": ["İptal Edildi"],
    "refunds-aftersales": ["İptal Edildi"],
    "closed": ["Tamamlandı", "İptal Edildi"],
}


def _require_buyer():
    """Ensure user is logged in and return user email."""
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("You must be logged in"), frappe.AuthenticationError)
    return user


def _translate_order(order):
    """Order dict'indeki Türkçe status'u İngilizce'ye çevir ve eksik alanları ekle."""
    tr_status = order.get("status", "")
    en_status = STATUS_TR_TO_EN.get(tr_status, tr_status)

    seller_name = ""
    seller_id = order.get("seller")
    if seller_id:
        seller_name = frappe.db.get_value("Admin Seller Profile", seller_id, "seller_name") or seller_id

    order["order_number"] = order.get("name", "")
    order["seller_name"] = seller_name
    order["status"] = en_status
    order["status_color"] = STATUS_COLORS.get(en_status, "text-gray-500")
    order["status_description"] = STATUS_DESCRIPTIONS.get(en_status, "")
    order["grand_total"] = float(order.get("total") or 0)
    order["payment_status"] = "Unpaid" if en_status == "Waiting for payment" else "Paid"
    order["shipping_status"] = "Pending" if en_status in ("Waiting for payment", "Confirming") else "In Transit"
    order["supplier_name"] = seller_name
    order["supplier_contact"] = ""
    order["supplier_phone"] = ""
    order["supplier_email"] = ""
    order["incoterms"] = "DAP"

    return order


@frappe.whitelist()
def get_my_orders(status=None, search=None, date_from=None, date_to=None, page=1, page_size=20):
    """
    List buyer's orders with filtering.
    Reads from Order doctype (Türkçe status), translates to English for frontend.
    """
    buyer = _require_buyer()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)

    filters = {"buyer": buyer}

    if status and status != "all":
        tr_statuses = FILTER_STATUS_MAP.get(status)
        if tr_statuses:
            filters["status"] = ["in", tr_statuses]

    if date_from and date_to:
        filters["order_date"] = ["between", [getdate(date_from), getdate(date_to)]]
    elif date_from:
        filters["order_date"] = [">=", getdate(date_from)]
    elif date_to:
        filters["order_date"] = ["<=", getdate(date_to)]

    total = frappe.db.count("Order", filters=filters)

    orders = frappe.get_list(
        "Order",
        filters=filters,
        fields=[
            "name", "order_date", "seller", "status",
            "currency", "payment_method",
            "subtotal", "shipping_fee", "total",
            "shipping_address", "ship_from", "shipping_method",
        ],
        order_by="order_date desc",
        start=(page - 1) * page_size,
        page_length=page_size,
        ignore_permissions=True,
    )

    if search:
        q = search.lower()
        filtered = []
        for o in orders:
            name_match = q in (o.get("name") or "").lower()
            seller_id = o.get("seller")
            seller_name = ""
            if seller_id:
                seller_name = frappe.db.get_value("Admin Seller Profile", seller_id, "seller_name") or ""
            seller_match = q in seller_name.lower()
            if name_match or seller_match:
                filtered.append(o)
        orders = filtered

    for order in orders:
        _translate_order(order)
        order["items"] = frappe.get_all(
            "Order Item",
            filters={"parent": order["name"]},
            fields=["listing_title as product_name", "variation", "unit_price", "quantity", "total_price", "image"],
            order_by="idx asc",
        )

    return {
        "success": True,
        "orders": orders,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@frappe.whitelist()
def get_order_detail(order_number):
    """Get single order detail."""
    buyer = _require_buyer()

    order = frappe.db.get_value(
        "Order",
        {"name": order_number, "buyer": buyer},
        "*",
        as_dict=True,
    )

    if not order:
        frappe.throw(_("Order not found"), frappe.DoesNotExistError)

    _translate_order(order)
    order["items"] = frappe.get_all(
        "Order Item",
        filters={"parent": order["name"]},
        fields=["listing_title as product_name", "variation", "unit_price", "quantity", "total_price", "image"],
        order_by="idx asc",
    )

    return {"success": True, "order": order}


@frappe.whitelist()
def cancel_order(order_number, reason=None):
    """Cancel an order."""
    buyer = _require_buyer()

    if not frappe.db.exists("Order", {"name": order_number, "buyer": buyer}):
        frappe.throw(_("Order not found"), frappe.DoesNotExistError)

    order = frappe.get_doc("Order", order_number)

    if order.status in ("Tamamlandı", "İptal Edildi"):
        en_status = STATUS_TR_TO_EN.get(order.status, order.status)
        frappe.throw(_("Cannot cancel an order with status: {0}").format(en_status))

    order.status = "İptal Edildi"
    order.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "order_number": order.name,
        "status": "Cancelled",
    }


@frappe.whitelist()
def get_order_counts():
    """Get order counts by status for tab badges."""
    buyer = _require_buyer()

    counts = frappe.db.sql("""
        SELECT status, COUNT(*) as count
        FROM `tabOrder`
        WHERE buyer = %(buyer)s
        GROUP BY status
    """, {"buyer": buyer}, as_dict=True)

    result = {}
    total = 0
    for row in counts:
        en_status = STATUS_TR_TO_EN.get(row["status"], row["status"])
        result[en_status] = row["count"]
        total += row["count"]

    result["all"] = total

    return {"success": True, "counts": result}


@frappe.whitelist()
def get_payment_records(order_number):
    """Get payment records for an order. Returns empty for now."""
    _require_buyer()
    return {
        "success": True,
        "payments": [],
        "refunds": [],
        "wire_transfers": [],
    }


@frappe.whitelist()
def submit_remittance(order_number, beneficiary_account, remittance_date,
                      currency="USD", amount=0, bank_name="", sender_name=""):
    """Submit wire transfer remittance — updates order status."""
    buyer = _require_buyer()

    if not frappe.db.exists("Order", {"name": order_number, "buyer": buyer}):
        frappe.throw(_("Order not found"), frappe.DoesNotExistError)

    order = frappe.get_doc("Order", order_number)
    if order.status == "Ödeme Bekleniyor":
        order.status = "Onaylanıyor"
        order.save(ignore_permissions=True)
        frappe.db.commit()

    return {
        "success": True,
        "order_number": order.name,
        "order_status": STATUS_TR_TO_EN.get(order.status, order.status),
    }
