import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime
import hashlib
import time


class Listing(Document):
    def before_insert(self):
        if not self.listing_code:
            self.listing_code = self.generate_listing_code()

    def validate(self):
        self.calculate_available_qty()
        self.validate_pricing()
        self.validate_pricing_tiers()

    def on_update(self):
        if self.status == "Active" and not self.published_at:
            self.db_set("published_at", now_datetime())

    def generate_listing_code(self):
        hash_input = f"{self.title}-{time.time()}"
        return "LST-" + hashlib.md5(hash_input.encode()).hexdigest()[:8].upper()

    def calculate_available_qty(self):
        self.available_qty = max(0, (self.stock_qty or 0) - (self.reserved_qty or 0))

    def validate_pricing(self):
        if self.selling_price and self.base_price:
            if self.selling_price > self.base_price:
                frappe.throw("Selling price cannot be greater than base price")
        if self.compare_at_price and self.selling_price:
            if self.compare_at_price < self.selling_price:
                frappe.throw("Compare at price must be >= selling price")
        if self.discount_percentage and self.base_price and self.selling_price:
            pass  # Let user set manually or calculate
        elif self.compare_at_price and self.selling_price and self.compare_at_price > 0:
            self.discount_percentage = round(
                ((self.compare_at_price - self.selling_price) / self.compare_at_price) * 100, 2
            )

    def validate_pricing_tiers(self):
        if not self.b2b_enabled or not self.pricing_tiers:
            return
        prev_max = 0
        for tier in sorted(self.pricing_tiers, key=lambda t: t.min_qty):
            if tier.min_qty <= prev_max:
                frappe.throw(f"Pricing tier overlap: min_qty {tier.min_qty} overlaps with previous tier")
            if tier.max_qty and tier.max_qty < tier.min_qty:
                frappe.throw(f"Max quantity must be >= min quantity in pricing tier")
            prev_max = tier.max_qty or float('inf')

    def get_price_for_qty(self, qty=1):
        if self.b2b_enabled and self.pricing_tiers:
            for tier in sorted(self.pricing_tiers, key=lambda t: t.min_qty, reverse=True):
                if qty >= tier.min_qty:
                    return tier.price
        return self.selling_price

    def increment_view_count(self):
        frappe.db.set_value("Listing", self.name, "view_count", (self.view_count or 0) + 1)
