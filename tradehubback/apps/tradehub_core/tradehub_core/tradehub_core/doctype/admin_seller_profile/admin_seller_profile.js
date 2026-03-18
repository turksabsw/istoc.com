frappe.listview_settings['Admin Seller Profile'] = {
    refresh: function(listview) {
        if (listview._redirected) return;

        const isAdmin = frappe.user.has_role('System Manager') || frappe.user.has_role('Marketplace Admin');
        if (!isAdmin && frappe.user.has_role('Seller') && listview.data && listview.data.length >= 1) {
            listview._redirected = true;
            frappe.set_route('Form', 'Admin Seller Profile', listview.data[0].name);
        }
    }
};
