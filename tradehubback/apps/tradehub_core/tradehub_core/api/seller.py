import re
import frappe
from frappe import _


def _strip_html(text):
    """Strip HTML tags from text for plain-text display."""
    if not text:
        return ""
    return re.sub(r'<[^>]+>', '', text).strip()


@frappe.whitelist(allow_guest=True)
def get_sellers(search=None, page=1, page_size=20):
    filters = {"status": "Active"}
    if search:
        filters["seller_name"] = ["like", "%" + search + "%"]
    sellers = frappe.get_all(
        "Admin Seller Profile", filters=filters,
        fields=["name", "seller_code", "seller_name", "city", "country",
                "logo", "banner_image", "description", "slogan",
                "email", "website", "phone", "status",
                "rating", "total_orders", "health_score"],
        limit_start=(int(page)-1)*int(page_size), limit_page_length=int(page_size),
        order_by="seller_name asc"
    )
    for s in sellers:
        s["slug"] = s.get("seller_code") or s.get("name", "")
        s["rating"] = float(s.get("rating") or 0)
        s["review_count"] = int(s.get("total_orders") or 0)
        s["cover_image"] = s.get("banner_image", "")
        s["short_description"] = _strip_html(s.get("description", ""))
        s["verified"] = bool(s.get("health_score", 0) >= 80)
        try:
            seller_code = s.get("seller_code") or s.get("name", "")
            listings = frappe.get_all(
                "Listing",
                filters={"seller_profile": seller_code, "status": "Active"},
                fields=["name", "title", "primary_image", "selling_price", "base_price", "min_order_qty"],
                limit=4
            )
            products = [{"name": l.name, "product_name": l.title, "image": l.primary_image,
                         "price_min": l.selling_price or l.base_price, "price_max": l.base_price,
                         "moq": l.min_order_qty or 1, "moq_unit": "Adet"} for l in listings]
            s["products"] = products
            s["product_images"] = [p["image"] for p in products if p.get("image")]
        except Exception:
            s["products"] = []
            s["product_images"] = []
        try:
            gallery = frappe.get_all(
                "Seller Gallery Image",
                filters={"parent": s.get("name"), "parenttype": "Admin Seller Profile"},
                fields=["image"],
                order_by="idx asc",
                limit=20
            )
            s["gallery_images"] = [g["image"] for g in gallery if g.get("image")]
        except Exception:
            s["gallery_images"] = []
    total = frappe.db.count("Admin Seller Profile", filters=filters)
    return {"sellers": sellers, "total": total, "page": int(page), "page_size": int(page_size)}


@frappe.whitelist(allow_guest=True)
def get_seller(slug):
    seller = frappe.db.get_value(
        "Admin Seller Profile", {"seller_code": slug, "status": "Active"},
        ["name", "seller_code", "seller_name", "city", "country",
         "logo", "banner_image", "description", "slogan",
         "email", "phone", "website", "status",
         "rating", "total_orders", "health_score",
         "founded_year", "staff_count", "annual_revenue",
         "factory_size", "business_type", "main_markets"],
        as_dict=True
    )
    if not seller:
        frappe.throw(_("Satici bulunamadi"), frappe.DoesNotExistError)
    seller["slug"] = seller.get("seller_code", "")
    seller["rating"] = float(seller.get("rating") or 0)
    seller["review_count"] = int(seller.get("total_orders") or 0)
    seller["cover_image"] = seller.get("banner_image", "")
    seller["short_description"] = _strip_html(seller.get("description", ""))
    seller["verified"] = bool(seller.get("health_score", 0) >= 80)
    return seller


@frappe.whitelist()
def get_my_supplier_profile():
    """Returns the Admin Seller Profile name for the logged-in seller."""
    user = frappe.session.user
    if not user or user == "Guest":
        return None
    return frappe.db.get_value("Admin Seller Profile", {"user": user}, "name")


@frappe.whitelist()
def get_my_admin_seller_profile():
    """Returns the Admin Seller Profile name (seller_code) for the logged-in seller."""
    user = frappe.session.user
    if not user or user == "Guest":
        return None
    return frappe.db.get_value("Admin Seller Profile", {"user": user}, "name")


@frappe.whitelist(allow_guest=True)
def get_seller_categories(seller_code):
    # Admin Seller Profile'da name = seller_code (autoname: field:seller_code)
    if not frappe.db.exists("Admin Seller Profile", seller_code):
        return {"categories": []}
    cats = frappe.get_all(
        "Seller Category",
        filters={"seller": seller_code},
        fields=["name", "category_name", "image", "sort_order"],
        order_by="sort_order asc, category_name asc"
    )
    return {"categories": cats}


@frappe.whitelist(allow_guest=True)
def get_seller_products(seller_code, category=None, page=1, page_size=40):
    # seller_code = Admin Seller Profile name
    if not frappe.db.exists("Admin Seller Profile", seller_code):
        return {"products": [], "total": 0}
    filters = {"seller_profile": seller_code, "status": "Active"}
    if category:
        filters["category"] = category
    listings = frappe.get_all(
        "Listing",
        filters=filters,
        fields=["name", "title", "primary_image", "selling_price", "base_price",
                "min_order_qty", "category", "short_description"],
        limit_start=(int(page)-1)*int(page_size),
        limit_page_length=int(page_size),
        order_by="creation desc"
    )
    for l in listings:
        l["id"] = l.get("name", "")
        l["product_name"] = l.get("title", "")
        l["image"] = l.get("primary_image", "")
        l["price_min"] = l.get("selling_price") or l.get("base_price", 0)
        l["price_max"] = l.get("base_price", 0)
        l["moq"] = l.get("min_order_qty", 1)
        l["moq_unit"] = "Adet"
    total = frappe.db.count("Listing", filters=filters)
    return {"products": listings, "total": total}


@frappe.whitelist(allow_guest=True)
def get_reviews(seller_code, page=1, page_size=10):
    if not frappe.db.exists("Admin Seller Profile", seller_code):
        frappe.throw(_("Satici bulunamadi"), frappe.DoesNotExistError)
    filters = {"seller": seller_code}
    reviews = frappe.get_all(
        "Seller Review", filters=filters,
        fields=["name", "reviewer_name", "rating", "comment", "creation", "product_name"],
        limit_start=(int(page)-1)*int(page_size), limit_page_length=int(page_size),
        order_by="creation desc"
    )
    total = frappe.db.count("Seller Review", filters=filters)
    return {"reviews": reviews, "total": total}


@frappe.whitelist()
def get_gallery():
    """Oturumdaki satıcının galeri fotoğraflarını döndürür."""
    user = frappe.session.user
    profile_name = frappe.db.get_value("Admin Seller Profile", {"user": user}, "name")
    if not profile_name:
        frappe.throw(_("Profil bulunamadi"), frappe.DoesNotExistError)
    doc = frappe.get_doc("Admin Seller Profile", profile_name)
    return [{"name": r.name, "image": r.image, "caption": r.caption or ""} for r in doc.gallery_images]


@frappe.whitelist()
def add_gallery_image(image_url, caption=""):
    """Galerik listesine yeni fotoğraf ekler (max 20)."""
    user = frappe.session.user
    profile_name = frappe.db.get_value("Admin Seller Profile", {"user": user}, "name")
    if not profile_name:
        frappe.throw(_("Profil bulunamadi"))
    doc = frappe.get_doc("Admin Seller Profile", profile_name)
    if len(doc.gallery_images) >= 20:
        frappe.throw(_("Maksimum 20 fotograf yukleyebilirsiniz"))
    doc.append("gallery_images", {"image": image_url, "caption": caption})
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return [{"name": r.name, "image": r.image, "caption": r.caption or ""} for r in doc.gallery_images]


@frappe.whitelist()
def remove_gallery_image(row_name):
    """Galeriden bir fotoğrafı kaldırır."""
    user = frappe.session.user
    profile_name = frappe.db.get_value("Admin Seller Profile", {"user": user}, "name")
    if not profile_name:
        frappe.throw(_("Profil bulunamadi"))
    doc = frappe.get_doc("Admin Seller Profile", profile_name)
    doc.gallery_images = [r for r in doc.gallery_images if r.name != row_name]
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return True


@frappe.whitelist(allow_guest=True)
def send_inquiry(seller_code, message, share_business_card=0):
    # Admin Seller Profile'da name = seller_code
    if not frappe.db.exists("Admin Seller Profile", seller_code):
        frappe.throw(_("Satici bulunamadi"), frappe.DoesNotExistError)
    sender_name, sender_email = "", ""
    if frappe.session.user and frappe.session.user != "Guest":
        user = frappe.db.get_value("User", frappe.session.user, ["full_name", "email"], as_dict=True)
        if user:
            sender_name = user.full_name or ""
            sender_email = user.email or ""
    doc = frappe.new_doc("Seller Inquiry")
    doc.seller = seller_code
    doc.seller_code = seller_code
    doc.message = message.strip()
    doc.sender_name = sender_name
    doc.sender_email = sender_email
    doc.share_business_card = int(share_business_card)
    doc.status = "Yeni"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "inquiry_id": doc.name}
