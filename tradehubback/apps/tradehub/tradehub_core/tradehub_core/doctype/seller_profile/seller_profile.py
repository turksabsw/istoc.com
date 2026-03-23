import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, random_string


class SellerProfile(Document):

    def before_insert(self):
        if not self.seller_code:
            self.seller_code = f"SLR-{random_string(8).upper()}"

    def before_save(self):
        if self.status == "Active" and not self.approved_by:
            self.approved_by = frappe.session.user
            self.approved_on = now_datetime()

    def after_insert(self):
        self._assign_seller_role()
        self._create_balance_record()

    def _assign_seller_role(self):
        user = frappe.get_doc("User", self.user)
        if "Marketplace Seller" not in [r.role for r in user.roles]:
            user.append("roles", {"role": "Marketplace Seller"})
            user.save(ignore_permissions=True)

    def _create_balance_record(self):
        if not frappe.db.exists("Seller Balance", {"seller": self.name}):
            frappe.get_doc({
                "doctype": "Seller Balance",
                "seller": self.name,
                "available_balance": 0,
                "pending_balance": 0,
                "total_earned": 0,
                "total_withdrawn": 0,
                "currency": "TRY",
            }).insert(ignore_permissions=True)
