import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, flt


class BuyerOrder(Document):
	def validate(self):
		if not self.order_date:
			self.order_date = now_datetime()

	def before_save(self):
		if self.items:
			self.subtotal = sum(flt(row.total_price) for row in self.items)
			self.grand_total = flt(self.subtotal) + flt(self.shipping_fee)
