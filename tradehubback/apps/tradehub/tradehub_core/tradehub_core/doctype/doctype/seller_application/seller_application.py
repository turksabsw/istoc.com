import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class SellerApplication(Document):
	def on_update(self):
		if self.has_value_changed("status") and self.status == "Approved":
			self._approve_application()

	def _approve_application(self):
		"""Create Seller Profile, Admin Seller Profile and assign Seller role on approval."""
		user = self.applicant_user
		seller_name = self.business_name or frappe.db.get_value("User", user, "full_name")

		# Create Seller Profile if not already exists
		if not frappe.db.exists("Seller Profile", {"user": user}):
			profile = frappe.new_doc("Seller Profile")
			profile.user = user
			profile.seller_name = seller_name
			profile.seller_type = self.seller_type
			profile.application = self.name
			profile.business_name = self.business_name
			profile.tax_id = self.tax_id
			profile.contact_phone = self.contact_phone
			profile.country = self.country
			profile.status = "Active"
			profile.insert(ignore_permissions=True)

		# Create Admin Seller Profile if not already exists
		if not frappe.db.exists("Admin Seller Profile", {"user": user}):
			count = (frappe.db.count("Admin Seller Profile") or 0) + 1
			seller_code = f"SEL-{count:05d}"

			admin_profile = frappe.new_doc("Admin Seller Profile")
			admin_profile.seller_code = seller_code
			admin_profile.user = user
			admin_profile.seller_name = seller_name
			admin_profile.company_name = self.business_name or seller_name
			admin_profile.email = frappe.db.get_value("User", user, "email") or self.contact_email or ""
			admin_profile.tax_id = self.tax_id or ""
			admin_profile.phone = self.contact_phone or ""
			admin_profile.country = self.country or "Turkey"
			admin_profile.status = "Active"
			admin_profile.flags.ignore_permissions = True
			admin_profile.owner = user
			admin_profile.insert(ignore_permissions=True)

			# Store seller_code back on Seller Profile
			frappe.db.set_value("Seller Profile", {"user": user}, "seller_code", seller_code)

		# Add Seller role
		if "Seller" not in frappe.get_roles(user):
			user_doc = frappe.get_doc("User", user)
			user_doc.add_roles("Seller")

		# Record review metadata
		self.db_set("reviewed_by", frappe.session.user)
		self.db_set("reviewed_on", now_datetime())
