FROM frappe/erpnext:v15.101.0
RUN mkdir -p /home/frappe/logs && chown -R frappe:frappe /home/frappe/logs
# Frappe assets/assets.json'u bench kökünde arar; sites/assets'e symlink
RUN ln -sf /home/frappe/frappe-bench/sites/assets /home/frappe/frappe-bench/assets
