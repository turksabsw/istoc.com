import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class SellerApplication(Document):
	def on_update(self):
		if self.has_value_changed("status"):
			if self.status == "Approved":
				self._approve_application()
			elif self.status in ("Rejected", "Submitted", "Under Review", "Draft"):
				self._revoke_approval()

	def _approve_application(self):
		"""Create Seller Profile and assign Seller role on approval."""
		user = self.applicant_user

		# Fields to sync from application to profile
		profile_data = {
			"seller_name": self.business_name or frappe.db.get_value("User", user, "full_name"),
			"seller_type": self.seller_type,
			"application": self.name,
			"business_name": self.business_name,
			"tax_id": self.tax_id,
			"contact_phone": self.contact_phone,
			"country": self.country,
		}

		# Create or update Seller Profile
		existing = frappe.db.get_value("Seller Profile", {"user": user}, "name")
		if existing:
			# Update fields but do NOT touch status — admin manages it from Seller Profile
			for field, value in profile_data.items():
				frappe.db.set_value("Seller Profile", existing, field, value)
		else:
			# New profile starts as Active
			profile = frappe.new_doc("Seller Profile")
			profile.user = user
			profile.status = "Active"
			for field, value in profile_data.items():
				profile.set(field, value)
			profile.insert(ignore_permissions=True)

		# Add Seller role
		if "Seller" not in frappe.get_roles(user):
			user_doc = frappe.get_doc("User", user)
			user_doc.add_roles("Seller")

		# Record review metadata
		self.db_set("reviewed_by", frappe.session.user)
		self.db_set("reviewed_on", now_datetime())

	def _revoke_approval(self):
		"""Remove Seller role when application status changes from Approved.

		Does NOT change Seller Profile status — that is managed
		directly from the Seller Profile by the admin.
		"""
		user = self.applicant_user

		# Remove Seller role
		if "Seller" in frappe.get_roles(user):
			user_doc = frappe.get_doc("User", user)
			user_doc.remove_roles("Seller")

		# Update review metadata
		self.db_set("reviewed_by", frappe.session.user)
		self.db_set("reviewed_on", now_datetime())
