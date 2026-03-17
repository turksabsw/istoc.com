import frappe
from frappe import _
import json


# ─── Yardımcı ────────────────────────────────────────────────────────────────

def _get_seller(user=None):
    user = user or frappe.session.user
    return frappe.db.get_value(
        "Seller Profile",
        {"user": user},
        ["name", "seller_name", "seller_code", "status", "health_score", "score_grade"],
        as_dict=True,
    )


def _require_seller():
    seller = _get_seller()
    if not seller:
        frappe.throw(_("Satıcı profili bulunamadı"), frappe.PermissionError)
    return seller


# ─── Endpoint'ler ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_my_profile():
    """
    Giriş yapmış satıcının tam profili + bakiye.

    GET /api/method/tradehub_core.api.seller.get_my_profile
    """
    seller = _require_seller()
    doc = frappe.get_doc("Seller Profile", seller.name)

    balance = frappe.db.get_value(
        "Seller Balance",
        {"seller": seller.name},
        ["available_balance", "pending_balance", "total_earned", "total_withdrawn"],
        as_dict=True,
    ) or {}

    return {
        "seller_code": doc.seller_code,
        "seller_name": doc.seller_name,
        "status": doc.status,
        "seller_type": doc.seller_type,
        "email": doc.email,
        "phone": doc.phone,
        "website": doc.website,
        "logo": doc.logo,
        "banner_image": doc.banner_image,
        "description": doc.description,
        "company_name": doc.company_name,
        "tax_id": doc.tax_id,
        "tax_office": doc.tax_office,
        "address_line1": doc.address_line1,
        "address_line2": doc.address_line2,
        "city": doc.city,
        "district": doc.district,
        "postal_code": doc.postal_code,
        "bank_name": doc.bank_name,
        "iban": doc.iban,
        "account_holder": doc.account_holder,
        "health_score": doc.health_score,
        "score_grade": doc.score_grade,
        "total_orders": doc.total_orders,
        "rating": doc.rating,
        "commission_rate": doc.commission_rate,
        "subscription_plan": doc.subscription_plan,
        "balance": {
            "available": balance.get("available_balance", 0),
            "pending": balance.get("pending_balance", 0),
            "total_earned": balance.get("total_earned", 0),
            "total_withdrawn": balance.get("total_withdrawn", 0),
        },
    }


@frappe.whitelist()
def update_profile(data):
    """
    Satıcı profilini güncelle.

    POST /api/method/tradehub_core.api.seller.update_profile
    Body: { data: "{...}" }
    """
    if isinstance(data, str):
        data = json.loads(data)

    seller = _require_seller()

    allowed_fields = [
        "seller_name", "phone", "website", "slogan",
        "address_line1", "address_line2", "city", "district", "postal_code",
        "description", "logo", "banner_image",
        "bank_name", "iban", "account_holder",
        "company_name", "tax_id", "tax_office",
        "founded_year", "staff_count", "annual_revenue", "factory_size",
        "business_type", "main_markets",
    ]

    doc = frappe.get_doc("Seller Profile", seller.name)
    for field in allowed_fields:
        if field in data:
            setattr(doc, field, data[field])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def get_dashboard_stats():
    """
    Satıcı dashboard istatistikleri.

    GET /api/method/tradehub_core.api.seller.get_dashboard_stats
    """
    seller = _require_seller()

    balance = frappe.db.get_value(
        "Seller Balance",
        {"seller": seller.name},
        ["available_balance", "pending_balance", "total_earned"],
        as_dict=True,
    ) or {"available_balance": 0, "pending_balance": 0, "total_earned": 0}

    # Sales Order istatistikleri (erpnext kuruluysa)
    orders_today = 0
    orders_pending = 0
    if frappe.db.table_exists("tabSales Order"):
        try:
            orders_today = frappe.db.count("Sales Order", {
                "custom_seller": seller.name,
                "transaction_date": frappe.utils.today(),
            })
            orders_pending = frappe.db.count("Sales Order", {
                "custom_seller": seller.name,
                "status": ["in", ["Draft", "To Deliver and Bill"]],
            })
        except Exception:
            pass

    return {
        "seller_name": seller.seller_name,
        "seller_code": seller.seller_code,
        "status": seller.status,
        "health_score": seller.health_score,
        "score_grade": seller.score_grade,
        "orders_today": orders_today,
        "orders_pending": orders_pending,
        "available_balance": balance["available_balance"],
        "pending_balance": balance["pending_balance"],
        "total_earned": balance["total_earned"],
    }


@frappe.whitelist()
def become_seller(seller_name=None, phone=None, seller_type="Individual",
                  company_name=None, tax_id=None, city=None):
    """
    Giriş yapmış kullanıcıyı satıcıya dönüştür.

    POST /api/method/tradehub_core.api.seller.become_seller
    Body: { seller_name?, phone?, seller_type?, company_name?, tax_id?, city? }
    """
    from tradehub_core.api.auth import _create_seller_profile

    user_email = frappe.session.user
    if user_email == "Guest":
        frappe.throw(_("Önce giriş yapmalısınız"), frappe.PermissionError)

    user = frappe.get_doc("User", user_email)
    result = _create_seller_profile(
        user_email=user_email,
        seller_name=seller_name or user.full_name,
        phone=phone,
        seller_type=seller_type,
        company_name=company_name,
        tax_id=tax_id,
        city=city,
    )
    frappe.db.commit()
    return result


@frappe.whitelist(allow_guest=True)
def list_sellers(page=1, page_size=12, search=None):
    """
    Tüm aktif satıcıları listeler.

    GET /api/method/tradehub_core.api.seller.list_sellers
    Query params: page, page_size, search
    """
    filters = {"status": "Active"}
    if search:
        filters["seller_name"] = ["like", f"%{search}%"]

    sellers = frappe.db.get_all(
        "Seller Profile",
        filters=filters,
        fields=[
            "name", "seller_name", "seller_code", "logo", "banner_image",
            "description", "city", "rating", "total_orders",
            "health_score", "score_grade", "seller_type",
            "website", "phone", "email",
        ],
        limit_page_length=int(page_size),
        limit_start=(int(page) - 1) * int(page_size),
        order_by="creation desc",
    )

    # Her satıcının ürün görsellerini ekle (max 5, görseli olan ürünler)
    for seller in sellers:
        products = frappe.db.get_all(
            "Seller Product",
            filters={"seller": seller["name"], "status": "Active", "image": ["!=", ""]},
            fields=["image"],
            order_by="is_featured desc, creation desc",
            limit_page_length=5,
        )
        seller["product_images"] = [p["image"] for p in products if p.get("image")]
        del seller["name"]  # name alanını response'dan çıkar

    total = frappe.db.count("Seller Profile", filters)
    return {"sellers": sellers, "total": total, "page": int(page), "page_size": int(page_size)}


@frappe.whitelist(allow_guest=True)
def get_public_profile(seller_code):
    """
    Genişletilmiş halka açık satıcı mağaza profili (ürün ve kategoriler dahil).

    GET /api/method/tradehub_core.api.seller.get_public_profile?seller_code=SLR-XXXX
    """
    seller = frappe.db.get_value(
        "Seller Profile",
        {"seller_code": seller_code, "status": "Active"},
        ["name", "seller_name", "seller_code", "logo", "banner_image",
         "description", "slogan", "city", "district", "country",
         "rating", "total_orders", "health_score", "score_grade",
         "seller_type", "website", "phone", "email",
         "company_name", "founded_year", "staff_count",
         "annual_revenue", "factory_size", "business_type", "main_markets",
         "tax_id", "tax_office", "address_line1", "address_line2", "postal_code"],
        as_dict=True,
    )
    if not seller:
        frappe.throw(_("Mağaza bulunamadı"), frappe.DoesNotExistError)

    # Kategoriler
    categories = frappe.db.get_all(
        "Seller Category",
        filters={"seller": seller.name},
        fields=["name", "category_name", "image", "sort_order"],
        order_by="sort_order asc, creation asc",
    )

    # Ürünler (kategori bilgisiyle birlikte)
    products = frappe.db.get_all(
        "Seller Product",
        filters={"seller": seller.name, "status": "Active"},
        fields=["name", "product_name", "description", "image",
                "price_min", "price_max", "moq", "moq_unit",
                "category", "is_featured"],
        order_by="is_featured desc, creation desc",
    )

    return {
        **seller,
        "categories": categories,
        "products": products,
    }


# ─── Ürün CRUD ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_products():
    """Satıcının ürünlerini listeler."""
    seller = _require_seller()
    products = frappe.db.get_all(
        "Seller Product",
        filters={"seller": seller.name},
        fields=["name", "product_name", "description", "image",
                "price_min", "price_max", "moq", "moq_unit",
                "category", "is_featured", "status"],
        order_by="is_featured desc, creation desc",
    )
    return products


@frappe.whitelist()
def create_product(data):
    """Yeni ürün oluşturur."""
    if isinstance(data, str):
        data = json.loads(data)

    seller = _require_seller()

    doc = frappe.new_doc("Seller Product")
    doc.seller = seller.name
    doc.product_name = data.get("product_name", "")
    doc.description = data.get("description", "")
    doc.image = data.get("image", "")
    doc.price_min = data.get("price_min") or 0
    doc.price_max = data.get("price_max") or 0
    doc.moq = data.get("moq") or 1
    doc.moq_unit = data.get("moq_unit") or "Adet"
    doc.category = data.get("category") or None
    doc.is_featured = data.get("is_featured") or 0
    doc.status = data.get("status") or "Active"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"name": doc.name, "product_name": doc.product_name}


@frappe.whitelist()
def update_product(product_id, data):
    """Ürün günceller."""
    if isinstance(data, str):
        data = json.loads(data)

    seller = _require_seller()
    doc = frappe.get_doc("Seller Product", product_id)

    if doc.seller != seller.name:
        frappe.throw(_("Bu ürün size ait değil"), frappe.PermissionError)

    for field in ["product_name", "description", "image", "price_min", "price_max",
                  "moq", "moq_unit", "category", "is_featured", "status"]:
        if field in data:
            setattr(doc, field, data[field])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def delete_product(product_id):
    """Ürün siler."""
    seller = _require_seller()
    doc = frappe.get_doc("Seller Product", product_id)

    if doc.seller != seller.name:
        frappe.throw(_("Bu ürün size ait değil"), frappe.PermissionError)

    doc.delete(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── Kategori CRUD ────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_categories():
    """Satıcının kategorilerini listeler."""
    seller = _require_seller()
    categories = frappe.db.get_all(
        "Seller Category",
        filters={"seller": seller.name},
        fields=["name", "category_name", "image", "sort_order"],
        order_by="sort_order asc, creation asc",
    )
    return categories


@frappe.whitelist()
def create_category(data):
    """Yeni kategori oluşturur."""
    if isinstance(data, str):
        data = json.loads(data)

    seller = _require_seller()

    doc = frappe.new_doc("Seller Category")
    doc.seller = seller.name
    doc.category_name = data.get("category_name", "")
    doc.image = data.get("image", "")
    doc.sort_order = data.get("sort_order") or 0
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"name": doc.name, "category_name": doc.category_name}


@frappe.whitelist()
def update_category(category_id, data):
    """Kategori günceller."""
    if isinstance(data, str):
        data = json.loads(data)

    seller = _require_seller()
    doc = frappe.get_doc("Seller Category", category_id)

    if doc.seller != seller.name:
        frappe.throw(_("Bu kategori size ait değil"), frappe.PermissionError)

    for field in ["category_name", "image", "sort_order"]:
        if field in data:
            setattr(doc, field, data[field])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def delete_category(category_id):
    """Kategori siler."""
    seller = _require_seller()
    doc = frappe.get_doc("Seller Category", category_id)

    if doc.seller != seller.name:
        frappe.throw(_("Bu kategori size ait değil"), frappe.PermissionError)

    doc.delete(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── Inquiry (Tedarikçiye Ulaş) ───────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def send_inquiry(seller_code, message, share_business_card=0):
    """
    Alıcının satıcıya mesaj göndermesi.

    POST /api/method/tradehub_core.api.seller.send_inquiry
    Body: { seller_code, message, share_business_card? }
    """
    if not message or len(message.strip()) < 5:
        frappe.throw(_("Mesaj en az 5 karakter olmalıdır"), frappe.ValidationError)

    seller = frappe.db.get_value(
        "Seller Profile",
        {"seller_code": seller_code, "status": "Active"},
        ["name", "seller_code"],
        as_dict=True,
    )
    if not seller:
        frappe.throw(_("Satıcı bulunamadı"), frappe.DoesNotExistError)

    # Giriş yapmış kullanıcı bilgileri
    sender_name = ""
    sender_email = ""
    if frappe.session.user and frappe.session.user != "Guest":
        user = frappe.db.get_value("User", frappe.session.user, ["full_name", "email"], as_dict=True)
        if user:
            sender_name = user.full_name or ""
            sender_email = user.email or ""

    doc = frappe.new_doc("Seller Inquiry")
    doc.seller = seller.name
    doc.seller_code = seller.seller_code
    doc.message = message.strip()
    doc.sender_name = sender_name
    doc.sender_email = sender_email
    doc.share_business_card = int(share_business_card)
    doc.status = "Yeni"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"success": True, "inquiry_id": doc.name}


@frappe.whitelist()
def get_inquiries(page=1, page_size=20):
    """Satıcının gelen mesajlarını listeler."""
    seller = _require_seller()

    inquiries = frappe.db.get_all(
        "Seller Inquiry",
        filters={"seller": seller.name},
        fields=["name", "sender_name", "sender_email", "message",
                "status", "is_read", "share_business_card", "creation"],
        order_by="creation desc",
        limit_page_length=int(page_size),
        limit_start=(int(page) - 1) * int(page_size),
    )

    total = frappe.db.count("Seller Inquiry", {"seller": seller.name})
    unread = frappe.db.count("Seller Inquiry", {"seller": seller.name, "is_read": 0})

    return {"inquiries": inquiries, "total": int(total), "unread": int(unread)}


@frappe.whitelist()
def mark_inquiry_read(inquiry_id):
    """Mesajı okundu olarak işaretle."""
    seller = _require_seller()
    doc = frappe.get_doc("Seller Inquiry", inquiry_id)
    if doc.seller != seller.name:
        frappe.throw(_("Bu mesaj size ait değil"), frappe.PermissionError)
    doc.is_read = 1
    doc.status = "Okundu"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


# ─── Review CRUD ──────────────────────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def get_reviews(seller_code, page=1, page_size=10):
    """Satıcının yorumlarını listeler."""
    seller = frappe.db.get_value("Seller Profile", {"seller_code": seller_code, "status": "Active"}, "name")
    if not seller:
        frappe.throw(_("Satıcı bulunamadı"), frappe.DoesNotExistError)

    filters = {"seller": seller, "status": "Published"}

    reviews = frappe.db.get_all(
        "Seller Review",
        filters=filters,
        fields=["name", "reviewer_name", "country", "country_flag", "comment",
                "rating", "is_featured", "date", "product_name", "product_image", "product_price"],
        order_by="is_featured desc, date desc",
        limit_page_length=int(page_size),
        limit_start=(int(page) - 1) * int(page_size),
    )

    total = frappe.db.count("Seller Review", filters)
    avg_rating = frappe.db.sql(
        "SELECT AVG(rating) FROM `tabSeller Review` WHERE seller=%s AND status='Published'",
        seller
    )[0][0] or 0

    return {
        "reviews": reviews,
        "total": int(total),
        "avg_rating": round(float(avg_rating), 1),
        "page": int(page),
        "page_size": int(page_size),
    }


@frappe.whitelist()
def delete_review(review_id):
    """Yorumu siler (sadece satıcı kendi yorumunu silebilir veya admin)."""
    seller = _get_seller()
    doc = frappe.get_doc("Seller Review", review_id)

    if seller and doc.seller != seller.name:
        frappe.throw(_("Bu yorum size ait değil"), frappe.PermissionError)

    doc.delete(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def toggle_feature_review(review_id):
    """Yorumu öne çıkar / geri al."""
    seller = _require_seller()
    doc = frappe.get_doc("Seller Review", review_id)

    if doc.seller != seller.name:
        frappe.throw(_("Bu yorum size ait değil"), frappe.PermissionError)

    doc.is_featured = 0 if doc.is_featured else 1
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "is_featured": doc.is_featured}
