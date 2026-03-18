FROM frappe/erpnext:v15.101.0
RUN mkdir -p /home/frappe/logs && chown -R frappe:frappe /home/frappe/logs
# Frappe assets/assets.json'u bench kökünde arar; sites/assets'e symlink
RUN ln -sf /home/frappe/frappe-bench/sites/assets /home/frappe/frappe-bench/assets
# tradehub_core app'ini kur
COPY --chown=frappe:frappe apps/tradehub /home/frappe/frappe-bench/apps/tradehub_core
RUN cd /home/frappe/frappe-bench && /home/frappe/frappe-bench/env/bin/pip install -e apps/tradehub_core
# Entrypoint: volume mount sonrası pip install
COPY --chown=frappe:frappe entrypoint.sh /home/frappe/entrypoint.sh
RUN chmod +x /home/frappe/entrypoint.sh
ENTRYPOINT ["/home/frappe/entrypoint.sh"]
