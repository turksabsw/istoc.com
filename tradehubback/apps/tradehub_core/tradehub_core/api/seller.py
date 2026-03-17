import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_sellers(search=None, page=1, page_size=20):
    filters = {"status": "Active"}
    if search:
        filters["seller_name"] = ["like", "%" + search + "%"]
    sellers = frappe.get_all(
        "Seller Profile", filters=filters,
        fields=["name", "seller_code", "seller_name", "city", "country",
                "logo", "banner_image", "description",
                "is_featured", "average_rating", "total_reviews",
                "joined_at", "status", "verification_status",
                "is_top_seller", "is_premium_seller", "email", "website"],
        limit_start=(int(page)-1)*int(page_size), limit_page_length=int(page_size),
        order_by="seller_name asc"
    )
    for s in sellers:
        s["slug"] = s.get("seller_code", "")
        s["rating"] = s.get("average_rating", 0)
        s["review_count"] = s.get("total_reviews", 0)
        s["member_since"] = s.get("joined_at", "")
        s["cover_image"] = s.get("banner_image", "")
        s["short_description"] = s.get("description", "")
        s["verified"] = s.get("verification_status") in ["Verified", "Onaylı"]
        try:
            products = frappe.get_all(
                "Seller Product",
                filters={"seller": s.name, "status": "Active"},
                fields=["name", "product_name", "image", "price_min", "price_max", "moq", "moq_unit"],
                limit=4
            )
            s["products"] = products
            s["product_images"] = [p.image for p in products if p.image]
        except Exception:
            s["products"] = []
            s["product_images"] = []
    total = frappe.db.count("Seller Profile", filters=filters)
    return {"sellers": sellers, "total": total, "page": int(page), "page_size": int(page_size)}

@frappe.whitelist(allow_guest=True)
def get_seller(slug):
    seller = frappe.db.get_value(
        "Seller Profile", {"seller_code": slug, "status": "Active"},
        ["name", "seller_code", "seller_name", "city", "country",
         "logo", "banner_image", "description",
         "average_rating", "total_reviews", "joined_at",
         "email", "phone", "website", "status", "verification_status",
         "is_featured", "is_top_seller"],
        as_dict=True
    )
    if not seller:
        frappe.throw(_("Satici bulunamadi"), frappe.DoesNotExistError)
    seller["slug"] = seller.get("seller_code", "")
    seller["rating"] = seller.get("average_rating", 0)
    seller["review_count"] = seller.get("total_reviews", 0)
    seller["member_since"] = seller.get("joined_at", "")
    seller["cover_image"] = seller.get("banner_image", "")
    seller["short_description"] = seller.get("description", "")
    seller["verified"] = seller.get("verification_status") in ["Verified", "Onaylı"]
    return seller

@frappe.whitelist(allow_guest=True)
def get_seller_categories(seller_code):
    seller = frappe.db.get_value("Seller Profile", {"seller_code": seller_code}, "name")
    if not seller:
        return {"categories": []}
    cats = frappe.get_all(
        "Seller Category",
        filters={"seller": seller},
        fields=["name", "category_name", "image", "sort_order"],
        order_by="sort_order asc, category_name asc"
    )
    return {"categories": cats}

@frappe.whitelist(allow_guest=True)
def get_seller_products(seller_code, category=None, page=1, page_size=40):
    seller = frappe.db.get_value("Seller Profile", {"seller_code": seller_code}, "name")
    if not seller:
        return {"products": [], "total": 0}
    filters = {"seller": seller, "status": "Active"}
    if category:
        filters["category"] = category
    products = frappe.get_all(
        "Seller Product",
        filters=filters,
        fields=["name", "product_name", "image", "price_min", "price_max",
                "moq", "moq_unit", "is_featured", "category", "description"],
        limit_start=(int(page)-1)*int(page_size),
        limit_page_length=int(page_size),
        order_by="is_featured desc, creation desc"
    )
    total = frappe.db.count("Seller Product", filters=filters)
    return {"products": products, "total": total}

@frappe.whitelist(allow_guest=True)
def get_reviews(seller_code, page=1, page_size=10):
    seller = frappe.db.get_value("Seller Profile", {"seller_code": seller_code, "status": "Active"}, "name")
    if not seller:
        frappe.throw(_("Satici bulunamadi"), frappe.DoesNotExistError)
    filters = {"seller": seller}
    reviews = frappe.get_all(
        "Seller Review", filters=filters,
        fields=["name", "reviewer_name", "rating", "comment", "creation", "product_name"],
        limit_start=(int(page)-1)*int(page_size), limit_page_length=int(page_size),
        order_by="creation desc"
    )
    total = frappe.db.count("Seller Review", filters=filters)
    return {"reviews": reviews, "total": total}

@frappe.whitelist(allow_guest=True)
def send_inquiry(seller_code, message, share_business_card=0):
    seller = frappe.db.get_value(
        "Seller Profile", {"seller_code": seller_code, "status": "Active"},
        ["name", "seller_code"], as_dict=True
    )
    if not seller:
        frappe.throw(_("Satici bulunamadi"), frappe.DoesNotExistError)
    sender_name, sender_email = "", ""
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
