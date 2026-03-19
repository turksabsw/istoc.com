# PROMPT — Aşama 5.3: Doğrulama

Tüm adımlar tamamlandı. Doğrulama kontrol listesini çalıştır:

1. Dosya yapısını göster:
   find frappe-bench/apps/tradehub_core -name "*.py" -o -name "*.json" -o -name "*.html" | sort

2. Python syntax kontrolü:
   docker compose exec backend python -c "
   import sys
   sys.path.insert(0, '/home/frappe/frappe-bench/apps/tradehub_core')
   import tradehub_core.api.auth as auth
   print('Import OK')
   print('Fonksiyonlar:', [f for f in dir(auth) if not f.startswith('_')])
   "

3. Tüm endpoint fonksiyonları var mı?
   grep -n "^def " frappe-bench/apps/tradehub_core/tradehub_core/api/auth.py

4. @frappe.whitelist ve @rate_limit dekoratör sırası doğru mu?
   grep -B1 "^def " frappe-bench/apps/tradehub_core/tradehub_core/api/auth.py | head -40

5. App kurulumu başarılı mı?
   docker compose exec backend bench --site tradehub.localhost list-apps

6. bench migrate hatasız tamamlandı mı?
   docker compose exec backend bench --site tradehub.localhost migrate

7. frontend-eklenenler.md Bölüm 5'teki her endpoint için
   auth.py'de karşılığı var mı? Eksik varsa listele ve ekle.

8. DocType JSON geçerli mi?
   docker compose exec backend python -c "
   import json, glob
   for f in glob.glob('/home/frappe/frappe-bench/apps/tradehub_core/**/*.json', recursive=True):
       try:
           json.load(open(f))
       except Exception as e:
           print(f'HATA: {f} — {e}')
   print('Tüm JSON dosyaları geçerli')
   "

Eksik veya hatalı her şeyi düzelt, her düzeltmeden önce bildir.
Tümü geçince şu 3 soruyu yanıtla ve dur:
- Toplam kaç endpoint yazıldı?
- Kaç DocType oluşturuldu?
- bench migrate başarılı mı?