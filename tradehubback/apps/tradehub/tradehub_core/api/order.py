import frappe
from frappe import _
import json
from frappe.utils import now_datetime, getdate, cint


def _require_buyer():
    """Ensure user is logged in and return user email."""
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("You must be logged in"), frappe.AuthenticationError)
    return user


@frappe.whitelist()
def create_order(data):
    """
    Create a Buyer Order from checkout.

    POST /api/method/tradehub_core.api.order.create_order
    Body: { data: "{...}" }
    """
    buyer = _require_buyer()

    if isinstance(data, str):
        data = json.loads(data)

    order_number = data.get("orderNumber")
    if not order_number:
        order_number = "ORD-{}".format(frappe.generate_hash(length=8).upper())

    # Check for duplicate
    if frappe.db.exists("Buyer Order", {"order_number": order_number}):
        return {
            "success": True,
            "order_number": order_number,
            "message": _("Order already exists"),
        }

    items = []
    for p in data.get("products", []):
        items.append({
            "product_name": p.get("name", ""),
            "variation": p.get("variation", ""),
            "unit_price": p.get("unitPrice", 0),
            "quantity": cint(p.get("quantity", 1)),
            "total_price": p.get("totalPrice", 0),
            "image": p.get("image", ""),
        })

    if not items:
        frappe.throw(_("Order must have at least one item"))

    payment = data.get("payment", {})
    shipping = data.get("shipping", {})
    supplier = data.get("supplier", {})

    doc = frappe.get_doc({
        "doctype": "Buyer Order",
        "order_number": order_number,
        "order_date": now_datetime(),
        "buyer": buyer,
        "seller_name": data.get("seller", ""),
        "status": data.get("status", "Waiting for payment"),
        "status_color": data.get("statusColor", "text-amber-600"),
        "status_description": data.get("statusDescription", ""),
        "currency": data.get("currency", "USD"),
        "subtotal": payment.get("subtotal", 0),
        "shipping_fee": payment.get("shippingFee", 0),
        "grand_total": payment.get("grandTotal") or data.get("total", 0),
        "payment_method": data.get("paymentMethod", ""),
        "payment_status": payment.get("status", "Unpaid"),
        "shipping_status": shipping.get("trackingStatus", "Pending"),
        "shipping_address": shipping.get("address", ""),
        "ship_from": shipping.get("shipFrom", ""),
        "shipping_method": shipping.get("method", ""),
        "incoterms": shipping.get("incoterms", "DAP"),
        "supplier_name": supplier.get("name", ""),
        "supplier_contact": supplier.get("contact", ""),
        "supplier_phone": supplier.get("phone", ""),
        "supplier_email": supplier.get("email", ""),
        "items": items,
    })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "order_number": doc.order_number,
        "name": doc.name,
    }


@frappe.whitelist()
def get_my_orders(status=None, search=None, date_from=None, date_to=None, page=1, page_size=20):
    """
    List buyer's orders with filtering.

    GET /api/method/tradehub_core.api.order.get_my_orders
    """
    buyer = _require_buyer()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)

    filters = {"buyer": buyer}

    if status and status != "all":
        status_map = {
            "unpaid": ["Waiting for payment"],
            "confirming": ["Confirming"],
            "preparing": ["Preparing Shipment"],
            "delivering": ["Delivering"],
            "completed": ["Completed"],
            "cancelled": ["Cancelled"],
            "refunds-aftersales": ["Cancelled"],
            "closed": ["Cancelled"],
        }
        statuses = status_map.get(status, [status])
        if statuses:
            filters["status"] = ["in", statuses]

    if date_from and date_to:
        filters["order_date"] = ["between", [getdate(date_from), getdate(date_to)]]
    elif date_from:
        filters["order_date"] = [">=", getdate(date_from)]
    elif date_to:
        filters["order_date"] = ["<=", getdate(date_to)]

    total = frappe.db.count("Buyer Order", filters=filters)

    orders = frappe.get_list(
        "Buyer Order",
        filters=filters,
        fields=[
            "name", "order_number", "order_date", "seller_name",
            "status", "status_color", "status_description",
            "grand_total", "currency", "payment_method",
            "payment_status", "shipping_status",
            "subtotal", "shipping_fee",
            "supplier_name", "supplier_contact", "supplier_phone", "supplier_email",
            "shipping_address", "ship_from", "shipping_method", "incoterms",
            "cancel_reason",
        ],
        order_by="order_date desc",
        start=(page - 1) * page_size,
        page_length=page_size,
        ignore_permissions=True,
    )

    if search:
        q = search.lower()
        orders = [
            o for o in orders
            if q in (o.get("order_number") or "").lower()
            or q in (o.get("seller_name") or "").lower()
        ]

    for order in orders:
        order["items"] = frappe.get_all(
            "Buyer Order Item",
            filters={"parent": order["name"]},
            fields=["product_name", "variation", "unit_price", "quantity", "total_price", "image"],
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
    """
    Get single order detail.

    GET /api/method/tradehub_core.api.order.get_order_detail?order_number=ORD-XXX
    """
    buyer = _require_buyer()

    order = frappe.db.get_value(
        "Buyer Order",
        {"order_number": order_number, "buyer": buyer},
        "*",
        as_dict=True,
    )

    if not order:
        frappe.throw(_("Order not found"), frappe.DoesNotExistError)

    order["items"] = frappe.get_all(
        "Buyer Order Item",
        filters={"parent": order["name"]},
        fields=["product_name", "variation", "unit_price", "quantity", "total_price", "image"],
        order_by="idx asc",
    )

    return {"success": True, "order": order}


@frappe.whitelist()
def cancel_order(order_number, reason=None):
    """
    Cancel an order.

    POST /api/method/tradehub_core.api.order.cancel_order
    """
    buyer = _require_buyer()

    doc_name = frappe.db.get_value(
        "Buyer Order",
        {"order_number": order_number, "buyer": buyer},
        "name",
    )

    if not doc_name:
        frappe.throw(_("Order not found"), frappe.DoesNotExistError)

    order = frappe.get_doc("Buyer Order", doc_name)

    if order.status in ("Completed", "Cancelled"):
        frappe.throw(_("Cannot cancel an order with status: {0}").format(order.status))

    order.status = "Cancelled"
    order.status_color = "text-red-600"
    order.status_description = "Order cancelled by buyer."
    order.cancel_reason = reason or ""
    order.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "order_number": order.order_number,
        "status": order.status,
    }


@frappe.whitelist()
def get_order_counts():
    """
    Get order counts by status for tab badges.

    GET /api/method/tradehub_core.api.order.get_order_counts
    """
    buyer = _require_buyer()

    counts = frappe.db.sql("""
        SELECT status, COUNT(*) as count
        FROM `tabBuyer Order`
        WHERE buyer = %(buyer)s
        GROUP BY status
    """, {"buyer": buyer}, as_dict=True)

    result = {}
    total = 0
    for row in counts:
        result[row["status"]] = row["count"]
        total += row["count"]

    result["all"] = total

    return {"success": True, "counts": result}


@frappe.whitelist()
def get_payment_records(order_number):
    """
    Get payment records for an order (all types: payments, refunds, wire transfers).

    GET /api/method/tradehub_core.api.order.get_payment_records?order_number=ORD-XXX
    """
    buyer = _require_buyer()

    # Verify order belongs to buyer
    order_name = frappe.db.get_value(
        "Buyer Order",
        {"order_number": order_number, "buyer": buyer},
        "name",
    )
    if not order_name:
        frappe.throw(_("Order not found"), frappe.DoesNotExistError)

    records = frappe.get_list(
        "Buyer Payment",
        filters={"buyer_order": order_name, "buyer": buyer},
        fields=[
            "name", "payment_type", "payment_date", "method",
            "amount", "currency", "status", "reference", "reason",
        ],
        order_by="payment_date desc",
        ignore_permissions=True,
    )

    payments = [r for r in records if r["payment_type"] == "Payment"]
    refunds = [r for r in records if r["payment_type"] == "Refund"]
    wire_transfers = [r for r in records if r["payment_type"] == "Wire Transfer"]

    return {
        "success": True,
        "payments": payments,
        "refunds": refunds,
        "wire_transfers": wire_transfers,
    }
