app_name = "tradehub_core"
app_title = "TradeHub"
app_publisher = "TradeHub"
app_description = "TradeHub B2B Marketplace"
app_email = "info@tradehub.com"
app_license = "MIT"
required_apps = ["frappe", "erpnext"]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/tradehub/css/tradehub.css"
# app_include_js = "/assets/tradehub/js/tradehub.js"

# include js, css files in header of web template
# web_include_css = "/assets/tradehub/css/tradehub.css"
# web_include_js = "/assets/tradehub/js/tradehub.js"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Fixtures
# --------
fixtures = []

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "tradehub.utils.jinja_methods",
# 	"filters": "tradehub.utils.jinja_filters"
# }

# DocType Class
# ---------------

# Override standard doctype classes
# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------

# Hook on document methods and events
# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"tradehub.tasks.all"
# 	],
# 	"daily": [
# 		"tradehub.tasks.daily"
# 	],
# }

# Testing
# -------

# before_tests = "tradehub.install.before_tests"

# Overriding Methods
# ------------------------------

# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "tradehub.event.get_events"
# }

# Each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "tradehub.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# ]
