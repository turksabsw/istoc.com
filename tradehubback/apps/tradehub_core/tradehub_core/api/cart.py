import json
import frappe
from frappe import _

CART_CACHE_TTL = 60  # saniye


def _invalidate_cart_cache(cart_name):
	"""Sepet cache'ini geçersiz kıl."""
	frappe.cache().delete_key(f"cart_response:{cart_name}")


def _build_cart_response_cached(cart_name):
	"""Cache'li cart response. Sepet değiştiğinde _invalidate_cart_cache çağrılmalı."""
	cache_key = f"cart_response:{cart_name}"
	cached = frappe.cache().get_value(cache_key)
	if cached:
		return cached
	result = _build_cart_response(cart_name)
	frappe.cache().set_value(cache_key, result, expires_in_sec=CART_CACHE_TTL)
	return result


# ──────────────────────────── helpers ────────────────────────────────────────

def _get_or_create_cart(user):
	"""Get or create the active Cart for a user. Returns cart name."""
	cart_name = frappe.db.get_value("Cart", {"buyer": user, "status": "Active"}, "name")
	if not cart_name:
		try:
			cart = frappe.new_doc("Cart")
			cart.buyer = user
			cart.status = "Active"
			cart.insert(ignore_permissions=True)
			frappe.db.commit()
			cart_name = cart.name
		except frappe.DuplicateEntryError:
			# Race condition: another request created the cart first
			frappe.db.rollback()
			cart_name = frappe.db.get_value("Cart", {"buyer": user, "status": "Active"}, "name")
	return cart_name


def _verify_cart_item_owner(cart_item_name, user):
	"""Raises PermissionError if cart_item doesn't belong to user. Returns cart name."""
	# Use filter syntax for child table lookup (safer than positional string arg)
	rows = frappe.get_all(
		"Cart Item",
		filters={"name": cart_item_name},
		fields=["parent"],
	)
	if not rows:
		frappe.throw(_("Sepet öğesi bulunamadı"), frappe.DoesNotExistError)

	parent_cart = rows[0]["parent"]
	cart_buyer = frappe.db.get_value("Cart", parent_cart, "buyer")
	if cart_buyer != user:
		frappe.throw(_("Yetkisiz işlem"), frappe.PermissionError)
	return parent_cart


def _find_existing_cart_item(cart_name, listing, listing_variant):
	"""
	Find an existing Cart Item for the given listing+variant combination.
	Handles NULL vs empty string safely by comparing in Python.
	"""
	all_rows = frappe.get_all(
		"Cart Item",
		filters={"parent": cart_name, "listing": listing},
		fields=["name", "listing_variant", "quantity"],
	)
	norm_variant = listing_variant or None
	for row in all_rows:
		row_variant = row.listing_variant or None
		if row_variant == norm_variant:
			return row
	return None


def _build_cart_response(cart_name):
	"""
	Build a CartSupplier[] response from a Cart document.
	Matches the frontend's CartSupplier / CartProduct / CartSku interfaces exactly.
	"""
	items = frappe.get_all(
		"Cart Item",
		filters={"parent": cart_name},
		fields=["name", "listing", "listing_variant", "quantity"],
		order_by="creation asc",
	)

	# seller_id → {supplier dict with products dict}
	sellers_map = {}

	for item in items:
		listing = frappe.db.get_value(
			"Listing",
			item.listing,
			["name", "title", "seller_profile", "primary_image",
			 "selling_price", "base_price", "min_order_qty", "currency", "status"],
			as_dict=True,
		)
		if not listing or listing.status != "Active":
			continue

		seller_id = listing.seller_profile
		if not seller_id:
			continue

		# Lazy-init seller bucket
		if seller_id not in sellers_map:
			seller = frappe.db.get_value(
				"Admin Seller Profile",
				seller_id,
				["seller_name", "seller_code", "logo"],
				as_dict=True,
			)
			if not seller:
				continue
			slug = seller.seller_code or seller_id
			sellers_map[seller_id] = {
				"id": seller_id,
				"name": seller.seller_name or seller_id,
				"href": f"/pages/seller.html?id={slug}",
				"selected": True,
				"products": {},  # listing_name → product dict
			}

		listing_name = listing.name

		# Lazy-init product bucket
		if listing_name not in sellers_map[seller_id]["products"]:
			tiers = frappe.get_all(
				"Listing Bulk Pricing Tier",
				filters={"parent": listing_name},
				fields=["min_qty", "max_qty", "price"],
				order_by="min_qty asc",
			)
			price_tiers = [
				{"minQty": t.min_qty, "maxQty": t.max_qty or None, "price": float(t.price)}
				for t in tiers
			]
			sellers_map[seller_id]["products"][listing_name] = {
				"id": listing_name,
				"title": listing.title or "",
				"href": f"/pages/product.html?id={listing_name}",
				"tags": [],
				"moqLabel": f"Min. {listing.min_order_qty or 1} Adet",
				"favoriteIcon": "♡",
				"deleteIcon": "🗑",
				"selected": True,
				"priceTiers": price_tiers,
				"baseCurrency": listing.currency or "USD",
				"skus": [],
			}

		# Resolve variant info
		base_price = float(listing.selling_price or listing.base_price or 0)
		sku_image = listing.primary_image or ""
		variant_text = ""
		base_price_addon = 0.0

		if item.listing_variant:
			variant = frappe.db.get_value(
				"Listing Variant",
				item.listing_variant,
				["variant_name", "price", "primary_image"],
				as_dict=True,
			)
			if variant:
				variant_text = variant.variant_name or ""
				if variant.primary_image:
					sku_image = variant.primary_image
				if variant.price:
					base_price_addon = float(variant.price) - base_price

		sellers_map[seller_id]["products"][listing_name]["skus"].append({
			"id": item.name,
			"skuImage": sku_image,
			"variantText": variant_text,
			"unitPrice": base_price + base_price_addon,
			"priceAddon": base_price_addon,
			"currency": listing.currency or "USD",
			"unit": "Adet",
			"quantity": item.quantity,
			"minQty": listing.min_order_qty or 1,
			"maxQty": 999999,
			"selected": True,
			"baseUnitPrice": base_price,
			"basePriceAddon": base_price_addon,
			"baseCurrency": listing.currency or "USD",
			"listingVariant": item.listing_variant or None,
		})

	suppliers = []
	for seller_data in sellers_map.values():
		suppliers.append({
			"id": seller_data["id"],
			"name": seller_data["name"],
			"href": seller_data["href"],
			"selected": seller_data["selected"],
			"products": list(seller_data["products"].values()),
		})

	return {"suppliers": suppliers}


# ──────────────────────────── endpoints ──────────────────────────────────────

@frappe.whitelist()
def get_cart():
	"""Return the current user's cart as CartSupplier[]."""
	user = frappe.session.user
	if not user or user == "Guest":
		return {"suppliers": []}

	cart_name = frappe.db.get_value("Cart", {"buyer": user, "status": "Active"}, "name")
	if not cart_name:
		return {"suppliers": []}

	return _build_cart_response_cached(cart_name)


@frappe.whitelist()
def add_to_cart(listing, quantity=1, listing_variant=None):
	"""
	Add a listing (optionally a specific variant) to cart.
	If already exists, increments quantity.
	Returns the full cart response.
	"""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Sepete eklemek için giriş yapmanız gerekiyor"), frappe.AuthenticationError)

	if not frappe.db.exists("Listing", listing):
		frappe.throw(_("Ürün bulunamadı"), frappe.DoesNotExistError)

	# Listing durumu ve stok/MOQ kontrolü
	listing_doc = frappe.db.get_value(
		"Listing",
		listing,
		["status", "min_order_qty", "stock_qty", "track_inventory", "allow_backorders"],
		as_dict=True,
	)
	if listing_doc.status != "Active":
		frappe.throw(_("Bu ürün şu an satışta değil"))

	qty = int(quantity)
	min_qty = int(listing_doc.min_order_qty or 1)
	if qty < min_qty:
		frappe.throw(_("Minimum sipariş miktarı: {0}").format(min_qty))

	if listing_doc.track_inventory and not listing_doc.allow_backorders:
		available = float(listing_doc.stock_qty or 0)
		if available <= 0:
			frappe.throw(_("Bu ürün stokta yok"))
		if qty > available:
			frappe.throw(_("Yeterli stok yok. Mevcut stok: {0}").format(int(available)))

	# Normalize variant: empty string → None
	listing_variant = listing_variant or None

	cart_name = _get_or_create_cart(user)

	existing_row = _find_existing_cart_item(cart_name, listing, listing_variant)

	if existing_row:
		frappe.db.set_value("Cart Item", existing_row.name, "quantity", existing_row.quantity + qty)
	else:
		cart_doc = frappe.get_doc("Cart", cart_name)
		cart_doc.append("items", {
			"listing": listing,
			"listing_variant": listing_variant,
			"quantity": qty,
		})
		cart_doc.save(ignore_permissions=True)

	frappe.db.commit()
	_invalidate_cart_cache(cart_name)
	return _build_cart_response_cached(cart_name)


@frappe.whitelist()
def update_cart_item(cart_item, quantity):
	"""Update the quantity of a cart item."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Giriş yapmanız gerekiyor"), frappe.AuthenticationError)

	_verify_cart_item_owner(cart_item, user)

	qty = int(quantity)
	if qty <= 0:
		frappe.throw(_("Miktar sıfırdan büyük olmalıdır"))

	# MOQ ve stok kontrolü
	listing_name = frappe.db.get_value("Cart Item", cart_item, "listing")
	if listing_name:
		listing_doc = frappe.db.get_value(
			"Listing",
			listing_name,
			["min_order_qty", "stock_qty", "track_inventory", "allow_backorders"],
			as_dict=True,
		)
		if listing_doc:
			min_qty = int(listing_doc.min_order_qty or 1)
			if qty < min_qty:
				frappe.throw(_("Minimum sipariş miktarı: {0}").format(min_qty))
			if listing_doc.track_inventory and not listing_doc.allow_backorders:
				available = float(listing_doc.stock_qty or 0)
				if qty > available:
					frappe.throw(_("Yeterli stok yok. Mevcut stok: {0}").format(int(available)))

	frappe.db.set_value("Cart Item", cart_item, "quantity", qty)
	frappe.db.commit()
	cart_name = frappe.db.get_value("Cart", {"buyer": user, "status": "Active"}, "name")
	if cart_name:
		_invalidate_cart_cache(cart_name)
	return {"success": True}


@frappe.whitelist()
def remove_cart_item(cart_item):
	"""Remove a single item from cart."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Giriş yapmanız gerekiyor"), frappe.AuthenticationError)

	cart_name = _verify_cart_item_owner(cart_item, user)
	frappe.delete_doc("Cart Item", cart_item, ignore_permissions=True)
	frappe.db.commit()
	_invalidate_cart_cache(cart_name)
	return {"success": True}


@frappe.whitelist()
def clear_cart():
	"""Remove all items from the active cart."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Giriş yapmanız gerekiyor"), frappe.AuthenticationError)

	cart_name = frappe.db.get_value("Cart", {"buyer": user, "status": "Active"}, "name")
	if not cart_name:
		return {"success": True}

	frappe.db.delete("Cart Item", {"parent": cart_name})
	frappe.db.commit()
	_invalidate_cart_cache(cart_name)
	return {"success": True}


@frappe.whitelist()
def merge_guest_cart(items):
	"""
	Merge guest localStorage items into the logged-in user's cart.
	items: JSON list of {listing, listing_variant?, quantity}
	Returns the full cart response after merge.
	"""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Giriş yapmanız gerekiyor"), frappe.AuthenticationError)

	if isinstance(items, str):
		try:
			items = json.loads(items)
		except (ValueError, TypeError):
			frappe.throw(_("Geçersiz sepet verisi"))

	if not isinstance(items, list):
		frappe.throw(_("Geçersiz sepet verisi"))

	cart_name = _get_or_create_cart(user)

	# Load cart doc once for appending new items
	cart_doc = frappe.get_doc("Cart", cart_name)
	needs_save = False

	for item in items:
		listing = item.get("listing")
		listing_variant = item.get("listing_variant") or None
		qty = int(item.get("quantity", 1))

		if not listing or qty <= 0:
			continue
		if not frappe.db.exists("Listing", listing):
			continue

		existing_row = _find_existing_cart_item(cart_name, listing, listing_variant)

		if existing_row:
			# Update in-memory cart_doc row so save() is consistent
			for row in cart_doc.items:
				if row.name == existing_row.name:
					row.quantity = existing_row.quantity + qty
					needs_save = True
					break
		else:
			cart_doc.append("items", {
				"listing": listing,
				"listing_variant": listing_variant,
				"quantity": qty,
			})
			needs_save = True

	if needs_save:
		cart_doc.save(ignore_permissions=True)

	frappe.db.commit()
	_invalidate_cart_cache(cart_name)
	return _build_cart_response_cached(cart_name)


@frappe.whitelist()
def create_order(orders_json, shipping_address=None, payment_method=None):
	"""
	Seçili sepet ürünlerinden sipariş(ler) oluşturur.
	orders_json: JSON list of {
	  seller_id, seller_name, shipping_fee, currency,
	  products: [{listing, listing_title, variation, unit_price, quantity, total_price, image}]
	}
	Returns: { orders: [{order_name, order_number, seller_name, total}] }
	"""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Sipariş vermek için giriş yapmanız gerekiyor"), frappe.AuthenticationError)

	if isinstance(orders_json, str):
		try:
			orders_data = json.loads(orders_json)
		except (ValueError, TypeError):
			frappe.throw(_("Geçersiz sipariş verisi"))
	else:
		orders_data = orders_json

	if not isinstance(orders_data, list) or len(orders_data) == 0:
		frappe.throw(_("Sipariş verisi boş olamaz"))

	created_orders = []

	for order_data in orders_data:
		seller_id = order_data.get("seller_id", "")
		products = order_data.get("products", [])
		shipping_fee = float(order_data.get("shipping_fee", 0))
		currency = order_data.get("currency", "USD")

		if not products:
			continue

		subtotal = sum(float(p.get("total_price", 0)) for p in products)
		total = subtotal + shipping_fee

		order_doc = frappe.new_doc("Order")
		order_doc.buyer = user
		order_doc.seller = seller_id if frappe.db.exists("Admin Seller Profile", seller_id) else None
		order_doc.status = "Ödeme Bekleniyor"
		order_doc.payment_method = payment_method or "bank_transfer"
		order_doc.currency = currency
		order_doc.subtotal = subtotal
		order_doc.shipping_fee = shipping_fee
		order_doc.total = total
		order_doc.shipping_address = shipping_address or ""
		order_doc.shipping_method = order_data.get("shipping_method", "")
		order_doc.ship_from = order_data.get("ship_from", "")

		for p in products:
			lv = p.get("listing_variant") or None
			# listing_variant geçerliliğini kontrol et
			if lv and not frappe.db.exists("Listing Variant", lv):
				lv = None
			order_doc.append("items", {
				"listing": p.get("listing") if p.get("listing") and frappe.db.exists("Listing", p.get("listing")) else None,
				"listing_title": p.get("listing_title", ""),
				"listing_variant": lv,
				"variation": p.get("variation", ""),
				"unit_price": float(p.get("unit_price", 0)),
				"quantity": int(p.get("quantity", 1)),
				"total_price": float(p.get("total_price", 0)),
				"image": p.get("image", ""),
			})

		order_doc.insert(ignore_permissions=True)
		created_orders.append({
			"order_name": order_doc.name,
			"order_number": order_doc.name,
			"seller_name": order_data.get("seller_name", ""),
			"total": total,
			"currency": currency,
		})

	if not created_orders:
		frappe.throw(_("Hiçbir sipariş oluşturulamadı"))

	# Sepeti temizle
	cart_name = frappe.db.get_value("Cart", {"buyer": user, "status": "Active"}, "name")
	if cart_name:
		frappe.db.delete("Cart Item", {"parent": cart_name})

	frappe.db.commit()
	return {"orders": created_orders}


@frappe.whitelist()
def get_orders(page=1, page_size=20):
	"""Oturumdaki kullanıcının siparişlerini döndürür."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Giriş yapmanız gerekiyor"), frappe.AuthenticationError)

	filters = {"buyer": user}
	orders = frappe.get_all(
		"Order",
		filters=filters,
		fields=["name", "status", "payment_method", "order_date",
		        "currency", "subtotal", "shipping_fee", "total", "seller"],
		limit_start=(int(page) - 1) * int(page_size),
		limit_page_length=int(page_size),
		order_by="order_date desc",
	)

	result = []
	for o in orders:
		items = frappe.get_all(
			"Order Item",
			filters={"parent": o.name},
			fields=["listing", "listing_title", "variation", "unit_price", "quantity", "total_price", "image"],
		)
		seller_name = ""
		if o.seller:
			seller_name = frappe.db.get_value("Admin Seller Profile", o.seller, "seller_name") or o.seller

		result.append({
			"id": o.name,
			"order_number": o.name,
			"order_date": str(o.order_date) if o.order_date else "",
			"status": o.status,
			"payment_method": o.payment_method,
			"currency": o.currency or "USD",
			"subtotal": float(o.subtotal or 0),
			"shipping_fee": float(o.shipping_fee or 0),
			"total": float(o.total or 0),
			"seller": o.seller or "",
			"seller_name": seller_name,
			"products": [
				{
					"name": i.listing_title or "",
					"variation": i.variation or "",
					"unit_price": str(float(i.unit_price or 0)),
					"quantity": i.quantity or 1,
					"total_price": str(float(i.total_price or 0)),
					"image": i.image or "",
				}
				for i in items
			],
		})

	total_count = frappe.db.count("Order", filters=filters)
	return {"orders": result, "total": total_count}


@frappe.whitelist(allow_guest=True)
def validate_coupon(code, order_total=0):
	"""
	Kupon kodunu doğrular ve indirim bilgisini döndürür.
	"""
	if not code:
		frappe.throw(_("Kupon kodu boş olamaz"))

	import datetime
	coupon = frappe.db.get_value(
		"Coupon",
		{"code": code.strip().upper(), "is_active": 1},
		["name", "code", "coupon_type", "value", "min_order", "max_uses", "used_count", "description", "expires_at"],
		as_dict=True,
	)

	if not coupon:
		frappe.throw(_("Geçersiz veya süresi dolmuş kupon kodu"))

	# Son geçerlilik tarihi kontrolü
	if coupon.expires_at:
		today = datetime.date.today()
		if coupon.expires_at < today:
			frappe.throw(_("Bu kuponun süresi dolmuş"))

	# Max kullanım kontrolü
	if coupon.max_uses and int(coupon.max_uses) > 0:
		if int(coupon.used_count or 0) >= int(coupon.max_uses):
			frappe.throw(_("Bu kupon maksimum kullanım sayısına ulaştı"))

	# Min sipariş tutarı kontrolü
	order_amount = float(order_total or 0)
	min_order = float(coupon.min_order or 0)
	if min_order > 0 and order_amount < min_order:
		frappe.throw(_("Bu kupon için minimum sipariş tutarı: {0}").format(min_order))

	return {
		"code": coupon.code,
		"type": coupon.coupon_type,
		"value": float(coupon.value or 0),
		"minOrder": float(coupon.min_order or 0),
		"description": coupon.description or "",
	}
