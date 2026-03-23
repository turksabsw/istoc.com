# PROMPT — Aşama 5.2: Uygula

Planı onayladım. Şimdi uygula.

## UYGULAMA KURALLARI

1. Dosyaları tek tek yaz. Her dosyadan sonra dur:
   "Adım X tamamlandı: [dosya adı] — devam edeyim mi?"

2. frappe-backend.md'deki kod örneklerini referans al.
   Emin olmadığın bir şeyi tahmin etme, dosyayı tekrar oku.

3. import sırası her .py dosyasında:
   - Önce standart kütüphaneler (import secrets, json vb.)
   - Sonra frappe imports (import frappe, from frappe import _)
   - En son uygulama içi imports

4. DocType JSON'da her field için "fieldname", "fieldtype", "label"
   zorunlu. frappe-backend.md Bölüm 11'deki formatı kullan.

5. Email template'leri Jinja2 formatında yaz.

Her adımdan önce: "Adım X başlıyor: [açıklama]" de.
Her adımdan sonra: "Adım X tamamlandı, devam edeyim mi?" diye sor.