● Plan hazir. Ozet:

  - App adi: tradehub_core (frontend'deki 7 API yolu tr_tradehub → tradehub_core olarak guncellenecek)
  - 10 endpoint: identity.py (8) + auth.py (2) — OTP, kayit, sifre sifirlama, session, email kontrol
  - 3 DocType: Buyer Profile, Seller Application, Seller Profile
  - 3 Email template: OTP, email dogrulama, sifre sifirlama
  - 3 Custom rol: Buyer, Seller, Marketplace Admin
  - 7 fazda uygulanacak (scaffold → setup → doctype → template → endpoint → frontend → test)

● User approved Claude's plan          
  ⎿  Plan saved to: ~/.claude/plans/giggly-leaping-mochi.md · /plan to edit               
     Plan: tradehub_core Frappe App
                                                                                                                                             
     Context
                                                                                                                                             
     Frontend auth sistemi (Faz 3) tamamlandi. Storefront su anda tr_tradehub.api.v1.* yollarinda endpoint'ler cagiriyor ancak backend'de  
     hicbir custom app yok. Bu plan, tradehub_core adinda yeni bir Frappe app olusturacak ve frontend'deki API yollarini buna uygun        
     guncelleyecek.

     Karar: App Adi = tradehub_core

     Frontend'deki 7 API yolu tr_tradehub.api.v1.* → tradehub_core.api.v1.* olarak guncellenecek.
     Degisecek dosya: tradehubfront/src/utils/auth.ts (7 endpoint yolu)

     ---
     1. Dosya Yapisi

     apps/tradehub_core/
     ├── tradehub_core/
     │   ├── __init__.py
     │   ├── hooks.py
     │   ├── modules.txt                    # "Tradehub Core"
     │   ├── patches.txt
     │   ├── api/
     │   │   ├── __init__.py
     │   │   └── v1/
     │   │       ├── __init__.py
     │   │       ├── identity.py            # 8 endpoint (OTP, kayit, sifre, dogrulama)
     │   │       └── auth.py                # 2 endpoint (session, email kontrol)
     │   ├── tradehub_core/                 # Modul dizini (DocType'lar)
     │   │   ├── __init__.py
     │   │   └── doctype/
     │   │       ├── __init__.py
     │   │       ├── buyer_profile/
     │   │       │   ├── __init__.py
     │   │       │   ├── buyer_profile.json
     │   │       │   └── buyer_profile.py
     │   │       ├── seller_application/
     │   │       │   ├── __init__.py
     │   │       │   ├── seller_application.json
     │   │       │   └── seller_application.py
     │   │       └── seller_profile/
     │   │           ├── __init__.py
     │   │           ├── seller_profile.json
     │   │           └── seller_profile.py
     │   ├── setup/
     │   │   ├── __init__.py
     │   │   └── install.py                 # after_install: rol olusturma
     │   └── templates/
     │       ├── __init__.py
     │       └── emails/
     │           ├── registration_otp.html
     │           ├── tradehub_email_verification.html
     │           └── tradehub_password_reset.html
     ├── pyproject.toml
     └── ...

     ---
     2. Endpoint Plani

     identity.py (8 endpoint)

     2.1 send_registration_otp(email) — YENI

     - @frappe.whitelist(allow_guest=True, methods=["POST"])
     - @rate_limit(limit=5, seconds=300)
     - Frappe API: frappe.db.exists, frappe.cache.set_value, frappe.sendmail
     - Is mantigi: email format dogrulama → frappe.db.exists("User", email) → 6 haneli OTP uret (secrets.randbelow) → Redis cache
     registration_otp:{email} = {code, attempts:0} TTL 600sn → frappe.sendmail(template="registration_otp")
     - Basari: { success: true, expires_in_minutes: 10 }
     - Hatalar: 400 (gecersiz email), 409 (email mevcut), 429 (rate limit)

     2.2 verify_registration_otp(email, code) — YENI

     - @frappe.whitelist(allow_guest=True, methods=["POST"])
     - @rate_limit(limit=5, seconds=300)
     - Frappe API: frappe.cache.get_value/set_value/delete_value, frappe.generate_hash
     - Is mantigi: cache'den OTP oku → attempts >= 5 ise sil + hata → kod eslesmiyorsa attempts++ → eslesiyorsa registration_token uret (32
     char hash) → cache registration_token:{token} = email TTL 1800sn → OTP key sil
     - Basari: { success: true, registration_token: "..." }
     - Hatalar: 404 (bulunamadi/suresi dolmus), 401 (yanlis kod), 429 (5+ deneme)

     2.3 register_user(...) — YENI (token dogrulamali)

     - @frappe.whitelist(allow_guest=True, methods=["POST"])
     - @rate_limit(limit=5, seconds=3600)
     - Frappe API: frappe.cache.get_value/delete_value, frappe.new_doc, frappe.db.exists, update_password
     - Parametreler: email, password, first_name, last_name, account_type, phone, country, accept_terms, accept_kvkk, registration_token
     - Is mantigi: token dogrula (cache'den, email eslesmesi) → sifre kurallari kontrol → User olustur (Website User, send_welcome_email=0) →
      update_password() → Buyer rolu ata → Buyer Profile olustur → supplier ise draft Seller Application olustur → email dogrulama linki
     gonder (arka plan) → token sil
     - Basari: { success: true, user: email, account_type: "buyer"|"supplier", seller_application?: "SA-00001" }

     2.4 forgot_password(email)

     - @frappe.whitelist(allow_guest=True, methods=["POST"])
     - @rate_limit(limit=3, seconds=3600)
     - Frappe API: frappe.db.exists, frappe.get_doc, frappe.generate_hash, frappe.sendmail, frappe.utils.get_url
     - Is mantigi: her zaman success don (enumeration korumasi) → email varsa: reset_key uret → User doc'a yaz → email gonder (link:
     /pages/auth/reset-password.html?key={key})
     - Basari: { success: true, message: "..." }

     2.5 reset_password(key, new_password)

     - @frappe.whitelist(allow_guest=True, methods=["POST"])
     - @rate_limit(limit=5, seconds=3600)
     - Frappe API: frappe.db.get_value, update_password, frappe.db.set_value
     - Is mantigi: key ile User bul (reset_password_key) → 24 saat suresi kontrol → sifre kurallari →
     update_password(logout_all_sessions=True) → key temizle
     - Basari: { success: true, message: "..." }

     2.6 verify_email(key)

     - @frappe.whitelist(allow_guest=True, methods=["GET"])
     - Frappe API: frappe.cache.get_value/delete_value, frappe.db.set_value
     - Is mantigi: cache'den email oku → Buyer Profile email_verified = 1 → cache key sil

     2.7 login(usr, pwd) — OPSIYONEL

     - Frontend /api/method/login (Frappe native) kullaniyor, bu endpoint opsiyonel wrapper

     2.8 change_password(current_password, new_password)

     - @frappe.whitelist(methods=["POST"]) (giris gerekli)
     - Frappe API: check_password, update_password
     - Is mantigi: check_password() → sifre kurallari → update_password()

     auth.py (2 endpoint)

     2.9 check_email_exists(email)

     - @frappe.whitelist(allow_guest=True, methods=["POST"])
     - @rate_limit(limit=5, seconds=300)
     - Frappe API: frappe.db.exists
     - Basari: { success: true, exists: boolean }

     2.10 get_session_user()

     - @frappe.whitelist(allow_guest=True, methods=["GET"])
     - Frappe API: frappe.session.user, frappe.db.get_value, frappe.get_roles, frappe.db.exists
     - Is mantigi: Guest ise { logged_in: false } → User bilgileri + roller → is_admin, is_buyer, is_seller, has_seller_profile,
     pending_seller_application, seller_profile bayraklari
     - Basari: { logged_in: true, user: { email, full_name, roles, is_admin, is_buyer, is_seller, has_seller_profile,
     pending_seller_application, seller_profile } }

     ---
     3. DocType Plani

     3.1 Buyer Profile

     - Naming: field:user
     - Alanlar: user (Link→User, reqd, unique), buyer_name (Data, reqd), country (Link→Country), phone (Data), status (Select:
     Active/Suspended/Deactivated, default: Active), email_verified (Check, read_only, default: 0)
     - Izinler: System Manager (full), Marketplace Admin (read/write/create), Buyer (read, if_owner)

     3.2 Seller Application

     - Naming: SA-.#####
     - Alanlar:
       - Temel: applicant_user (Link→User, reqd), contact_email, contact_phone
       - Isletme: business_name, seller_type (Select: Individual/Business/Enterprise)
       - Vergi: tax_id_type (Select: TCKN/VKN), tax_id, tax_office
       - Adres: address_line_1, city, country (Link→Country)
       - Banka: bank_name, iban, account_holder_name
       - Kimlik: identity_document_type (Select: National ID Card/Passport/Driver License), identity_document_number,
     identity_document_expiry (Date), identity_document (Attach)
       - Durum: status (Select: Draft/Submitted/Under Review/Approved/Rejected, default: Draft)
       - Onaylar: terms_accepted, privacy_accepted, kvkk_accepted, commission_accepted, return_policy_accepted (Check)
       - Inceleme: reviewed_by (Link→User), review_notes (Text), reviewed_on (Datetime)
     - Controller: on_update() — status "Approved" olunca Seller Profile olustur + Seller rolu ata
     - Izinler: System Manager (full), Marketplace Admin (read/write/create), Buyer (read if_owner, create)

     3.3 Seller Profile

     - Naming: field:user
     - Alanlar: user (Link→User, reqd, unique), seller_name (Data, reqd), seller_type (Select), status (Select: Active/Suspended/Deactivated,
      default: Active), application (Link→Seller Application, read_only), business_name, tax_id, contact_phone, country (Link→Country)
     - Izinler: System Manager (full), Marketplace Admin (read/write/create), Seller (read, if_owner)

     ---
     4. Email Template'leri

     ┌──────────────────────────────────┬──────────────────┬───────────────────────────────────────┐
     │         Template Dosyasi         │   Degiskenler    │                 Konu                  │
     ├──────────────────────────────────┼──────────────────┼───────────────────────────────────────┤
     │ registration_otp.html            │ code             │ "iSTOC - Kayit Dogrulama Kodu"        │
     ├──────────────────────────────────┼──────────────────┼───────────────────────────────────────┤
     │ tradehub_email_verification.html │ link, first_name │ "iSTOC - Email Adresinizi Dogrulayin" │
     ├──────────────────────────────────┼──────────────────┼───────────────────────────────────────┤
     │ tradehub_password_reset.html     │ link, first_name │ "iSTOC - Sifre Sifirlama"             │
     └──────────────────────────────────┴──────────────────┴───────────────────────────────────────┘

     Not: tradehub_ prefix'i Frappe core template isimleriyle catismayi onler.

     ---
     5. hooks.py

     app_name = "tradehub_core"
     app_title = "TradeHub Core"
     app_publisher = "TradeHub"
     app_description = "TradeHub B2B E-Commerce Backend"
     app_email = "dev@tradehub.com"
     app_license = "MIT"

     after_install = "tradehub_core.setup.install.after_install"
     after_migrate = "tradehub_core.setup.install.after_install"

     fixtures = [
         {"dt": "Role", "filters": [["name", "in", ["Buyer", "Seller", "Marketplace Admin"]]]}
     ]

     scheduler_events = {
         "daily": ["tradehub_core.setup.install.cleanup_expired_tokens"]
     }

     ---
     6. Custom Roller

     ┌───────────────────┬─────────────┬──────────────────────────────────┐
     │        Rol        │ Desk Access │             Aciklama             │
     ├───────────────────┼─────────────┼──────────────────────────────────┤
     │ Buyer             │ Hayir       │ Storefront alici                 │
     ├───────────────────┼─────────────┼──────────────────────────────────┤
     │ Seller            │ Hayir       │ Storefront satici (onay sonrasi) │
     ├───────────────────┼─────────────┼──────────────────────────────────┤
     │ Marketplace Admin │ Evet        │ Admin paneli erisimi             │
     └───────────────────┴─────────────┴──────────────────────────────────┘

     setup/install.py — idempotent after_install fonksiyonu ile olusturulur.

     ---
     7. Sifre Dogrulama (Backend Helper)

     _validate_password(password) — identity.py icinde private helper:
     - 8+ karakter, 1+ buyuk harf ([A-Z]), 1+ kucuk harf ([a-z]), 1+ rakam ([0-9])
     - Frontend password-validation.ts kurallari ile birebir uyumlu

     ---
     8. Frontend Guncelleme (API Yollari)

     Dosya: tradehubfront/src/utils/auth.ts

     7 endpoint yolunda tr_tradehub → tradehub_core degisikligi:

     ┌─────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
     │                      Eski Yol                       │                       Yeni Yol                        │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
     │ tr_tradehub.api.v1.auth.get_session_user            │ tradehub_core.api.v1.auth.get_session_user            │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
     │ tr_tradehub.api.v1.auth.check_email_exists          │ tradehub_core.api.v1.auth.check_email_exists          │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
     │ tr_tradehub.api.v1.identity.send_registration_otp   │ tradehub_core.api.v1.identity.send_registration_otp   │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
     │ tr_tradehub.api.v1.identity.verify_registration_otp │ tradehub_core.api.v1.identity.verify_registration_otp │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
     │ tr_tradehub.api.v1.identity.register_user           │ tradehub_core.api.v1.identity.register_user           │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
     │ tr_tradehub.api.v1.identity.forgot_password         │ tradehub_core.api.v1.identity.forgot_password         │
     ├─────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
     │ tr_tradehub.api.v1.identity.reset_password          │ tradehub_core.api.v1.identity.reset_password          │
     └─────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

     ---
     9. Kurulum Sirasi

     # 1. App olustur (interaktif)
     docker compose exec backend bench new-app tradehub_core
     # Title: TradeHub Core | Publisher: TradeHub | License: mit

     # 2. Dosyalari olustur (api/, doctype/, templates/, setup/)

     # 3. Site'a yukle
     docker compose exec backend bench --site tradehub.localhost install-app tradehub_core

     # 4. Migrate (DocType tabloları + roller)
     docker compose exec backend bench --site tradehub.localhost migrate

     # 5. Build
     docker compose exec backend bench build

     # 6. Servisleri yeniden baslat
     docker compose restart backend worker scheduler

     Not: Docker'da app dosyalarina erisim icin volume mount gerekebilir:
     # docker-compose.yml'e eklenecek
     volumes:
       - ./tradehubback/apps/tradehub_core:/home/frappe/frappe-bench/apps/tradehub_core

     ---
     10. Uygulama Faz Sirasi

     ┌─────┬───────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────┐
     │ Faz │           Gorev           │                                            Dosyalar                                             │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 0   │ App scaffold olustur      │ bench new-app + __init__.py, hooks.py, modules.txt                                              │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 1   │ Setup/install             │ setup/install.py (roller)                                                                       │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 2   │ DocType'lar olustur       │ buyer_profile/, seller_application/, seller_profile/ JSON + py                                  │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 3   │ Email template'leri       │ templates/emails/ (3 dosya)                                                                     │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 4   │ auth.py endpoint'leri     │ api/v1/auth.py (check_email_exists, get_session_user)                                           │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 5   │ identity.py endpoint'leri │ api/v1/identity.py (send_otp, verify_otp, register, forgot/reset pwd, verify_email, change_pwd) │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 6   │ Frontend yol guncelleme   │ tradehubfront/src/utils/auth.ts (7 yol degisikligi)                                             │
     ├─────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
     │ 7   │ Kurulum ve test           │ install-app, migrate, endpoint testleri                                                         │
     └─────┴───────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────┘

     ---
     11. Dogrulama / Test

     1. bench new-app + install-app basarili mi?
     2. bench migrate — DocType tablolari olusturuluyor mu?
     3. bench console: frappe.get_all("Role", filters={"name": ["in", ["Buyer","Seller","Marketplace Admin"]]}) → 3 rol
     4. curl -X POST .../api/method/tradehub_core.api.v1.auth.check_email_exists -d '{"email":"test@test.com"}' → { exists: false }
     5. OTP akisi: send_registration_otp → verify_registration_otp → register_user
     6. Sifre sifirlama: forgot_password → email linki → reset_password
     7. Session: login → get_session_user → rol bayraklari dogru mu?
     8. Frontend: tum auth akislari (kayit, login, forgot password) calisiyor mu?