frappe.ui.form.on('Listing', {
    onload: function(frm) {
        const isSeller = frappe.user.has_role('Seller');
        const isAdmin = frappe.user.has_role('System Manager') || frappe.user.has_role('Marketplace Admin');

        if (isSeller && !isAdmin) {
            if (frm.is_new()) {
                frappe.call({
                    method: 'tradehub_core.api.seller.get_my_admin_seller_profile',
                    callback: function(r) {
                        if (r.message) {
                            frm.set_value('seller_profile', r.message);
                        }
                    }
                });
            }
            frm.set_df_property('seller_profile', 'read_only', 1);
        }
    },

    refresh: function(frm) {
        if (frm.doc.has_variants && frm.fields_dict.variants_html) {
            frm.fields_dict.variants_html.$wrapper.html('');
        }
    }
});
