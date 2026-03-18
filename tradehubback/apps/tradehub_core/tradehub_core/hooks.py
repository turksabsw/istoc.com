app_name = "tradehub_core"
app_title = "TradeHub Core"
app_publisher = "TradeHub Team"
app_description = "TradeHub B2B Marketplace Backend"
app_email = "dev@tradehub.local"
app_license = "MIT"
app_icon = "octicon octicon-organization"
app_color = "#0066CC"

required_apps = []

fixtures = [
	{
		"dt": "Role",
		"filters": [["name", "in", ["Marketplace Seller", "Marketplace Admin", "Marketplace Buyer"]]],
	},
	{
		"dt": "Workspace",
		"filters": [["module", "=", "Tradehub Core"]],
	},
]
