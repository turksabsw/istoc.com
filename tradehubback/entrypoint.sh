#!/bin/bash
set -e

# Volume mount ile gelen tradehub_core app'ini editable olarak kur
if [ -d "/home/frappe/frappe-bench/apps/tradehub_core/tradehub_core" ]; then
    /home/frappe/frappe-bench/env/bin/pip install -q -e /home/frappe/frappe-bench/apps/tradehub_core 2>/dev/null || true
fi

# Orjinal komutu çalıştır
exec "$@"
