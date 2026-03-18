frappe.ui.form.on('Listing', {
    refresh: function(frm) {
        // Show help text in variants tab
        if (frm.doc.has_variants && frm.fields_dict.variants_html) {
            frm.fields_dict.variants_html.$wrapper.html('');
        }
    }
});
