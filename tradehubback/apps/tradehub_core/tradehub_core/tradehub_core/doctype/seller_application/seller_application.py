import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class SellerApplication(Document):
	def on_update(self):
		if self.has_value_changed("status") and self.status == "Approved":
			self._approve_application()

	def _approve_application(self):
		"""Create Seller Profile and assign Seller role on approval."""
		user = self.applicant_user

		# Create Seller Profile if not already exists
		if not frappe.db.exists("Seller Profile", {"user": user}):
			profile = frappe.new_doc("Seller Profile")
			profile.user = user
			profile.seller_name = self.business_name or frappe.db.get_value(
				"User", user, "full_name"
			)
			profile.seller_type = self.seller_type
			profile.application = self.name
			profile.business_name = self.business_name
			profile.tax_id = self.tax_id
			profile.contact_phone = self.contact_phone
			profile.country = self.country
			profile.status = "Active"
			profile.insert(ignore_permissions=True)

		# Add Seller role
		user_doc = frappe.get_doc("User", user)
		if not user_doc.has_role("Seller"):
			user_doc.add_roles("Seller")

		# Record review metadata
		self.db_set("reviewed_by", frappe.session.user)
		self.db_set("reviewed_on", now_datetime())
