# TradeHub — Mevcut Durum Raporu

**Tarih:** 2026-03-17
**Analiz Kapsamı:** Frontend, Backend, Docker/Deployment, Auth Sistemi

---

## 1. PROJE GENEL BAKIŞ

### Hedef
TradeHub, İstanbul İstoc toptan pazarını dijitale taşıyan bir **B2B e-ticaret platformu**dur. Alıcılar (buyer) ürün arayıp sipariş verebilir, tedarikçiler (supplier/seller) mağaza açıp ürün satabilir. Mevcut odak: **kimlik doğrulama (auth) sistemi ve kayıt akışlarının tamamlanması**.

### Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Frontend | Vite + Alpine.js + Tailwind CSS | Vite 7.3.1, Alpine 3.15.8, Tailwind 4.1.18 |
| i18n | i18next | 25.8.14 |
| UI Kütüphaneleri | Flowbite, Swiper, DOMPurify | 4.0.1, 12.1.0, 3.3.2 |
| Backend Framework | Frappe Framework | v15.102.1 |
| ERP | ERPNext | v15.101.0 |
| Özel Backend | tradehub_core (Frappe app) | 0.0.1 |
| Veritabanı | MariaDB | 10.6 |
| Önbellek/Kuyruk | Redis | 7-alpine |
| WebSocket | Frappe Socket.IO | — |
| Container | Docker Compose | — |
| Prod Web Sunucu | Nginx (frontend container) | — |

### Mevcut Mimari

```
┌─────────────┐     ┌──────────────────────────────────────────────────────┐
│  Frontend    │     │  Backend (Docker)                                    │
│  (Vite SPA)  │────▶│  ┌─────────┐  ┌─────────┐  ┌────────┐  ┌────────┐ │
│  port:5500   │     │  │Gunicorn │  │Socket.IO│  │Worker  │  │Sched.  │ │
│  Nginx proxy │     │  │:8000    │  │:9000    │  │(bench) │  │(bench) │ │
└─────────────┘     │  └────┬────┘  └────┬────┘  └───┬────┘  └───┬────┘ │
                     │       │            │            │            │      │
                     │  ┌────▼────────────▼────────────▼────────────▼────┐ │
                     │  │           MariaDB (:3306)                      │ │
                     │  │     Redis Cache (:6379)  Redis Queue (:6379)   │ │
                     │  └───────────────────────────────────────────────┘ │
                     └──────────────────────────────────────────────────────┘
```

- Frontend → Nginx `/api/` proxy → Backend Gunicorn
- Session: Frappe cookie-based (credentials: 'include')
- OTP/Token: Redis cache (TTL ile otomatik expiry)
- Dosya yükleme: Frappe `/method/upload_file`

---

## 2. ÇALIŞAN ÖZELLİKLER ✅

### 2.1 Alıcı (Buyer) Kayıt Akışı
- **Ne çalışıyor:** 5 adımlı kayıt: hesap tipi seçimi → email girişi → OTP doğrulama → hesap bilgileri → otomatik login
- **Backend:** `send_registration_otp` → `verify_registration_otp` → `register_user` zinciri tam çalışıyor
- **Test:** OTP kodu Redis'e yazılıyor ve `frappe.logger()` ile loglanıyor (SMTP olmadığı için email gitmiyor, Redis CLI ile okunabilir)
- **Nasıl test edilir:**
  1. `http://localhost:5500/pages/auth/register.html` adresine git
  2. "Buyer" seç, email gir
  3. OTP kodu backend loglarından oku: `docker logs <backend-container> | grep OTP`
  4. OTP'yi gir, hesap bilgilerini doldur, kayıt tamamla

### 2.2 Login / Logout
- **Ne çalışıyor:** Email + şifre ile Frappe API login, cookie-based session, logout
- **Backend:** Frappe built-in `/api/method/login` ve `/api/method/logout`
- **Frontend:** `LoginPage.ts` → `login()` → `getSessionUser()` → rol bazlı yönlendirme
- **Nasıl test edilir:**
  1. `http://localhost:5500/pages/auth/login.html`
  2. Kayıtlı email/şifre gir → dashboard'a yönlendirilir
  3. Logout buton → login sayfasına döner

### 2.3 Şifre Sıfırlama (Forgot/Reset Password)
- **Ne çalışıyor:** forgot_password → reset key oluştur → reset_password (key ile şifre değiştir)
- **Frontend:** 2 ayrı sayfa: ForgotPasswordPage (email gir) + ResetPasswordPage (?key= ile şifre değiştir)
- **Backend:** `forgot_password` endpoint key üretir, `reset_password` key ile şifreyi günceller
- **NOT:** Email gönderimi yok (SMTP yok), reset link loglanıyor
- **Nasıl test edilir:**
  1. `http://localhost:5500/pages/auth/forgot-password.html`
  2. Email gir → backend loglarından reset key'i al
  3. `http://localhost:5500/pages/auth/reset-password.html?key=<KEY>` adresine git
  4. Yeni şifre gir → başarı mesajı gösterilir

### 2.4 Session Kontrolü ve Rol Bazlı Yönlendirme
- **Ne çalışıyor:** `get_session_user` endpoint'i kullanıcı bilgileri + roller + seller durumu döndürüyor
- **Frontend auth-guard:**
  - `requireAuth()`: Oturum yoksa login'e yönlendir
  - `requireSeller()`: Seller değilse başvuru durumuna göre yönlendir
  - `blockAdmin()`: Admin ise Frappe Desk'e yönlendir
- **Nasıl test edilir:** Login olduktan sonra `/pages/dashboard/buyer-dashboard.html`'e git

### 2.5 Backend DocType'lar ve Roller
- **Buyer Profile:** user, buyer_name, country, phone, status, email_verified
- **Seller Application:** 5 aşamalı workflow (Draft → Submitted → Under Review → Approved → Rejected)
- **Seller Profile:** Onay sonrası otomatik oluşturulur
- **Roller:** Buyer (desk_access: 0), Seller (desk_access: 0), Marketplace Admin (desk_access: 1)
- **Onay akışı:** Seller Application "Approved" olunca → Seller Profile oluşur + Seller rolü atanır
- **Nasıl test edilir:** Frappe Desk (`http://localhost:8001`) → Seller Application listesi → durumu Approved yap

### 2.6 Tedarikçi Başvuru Formu (SupplierSetupForm)
- **Ne çalışıyor:** 4 adımlı form: iş bilgileri → vergi/adres → banka → kimlik belgeleri + sözleşmeler
- **Backend:** `complete_registration_application` tüm alanları kabul ediyor
- **Dosya yükleme:** Frappe `/method/upload_file` ile kimlik belgesi yükleme
- **Nasıl test edilir:** Kayıt akışında "Supplier" seç → hesap kurulumu sonrası tedarikçi formu görünür

### 2.7 Şifre Kuralları Tutarlılığı
- **Ne çalışıyor:** Frontend ve backend aynı kuralları kullanıyor:
  - Minimum 8 karakter
  - En az 1 büyük harf
  - En az 1 küçük harf
  - En az 1 rakam
- **Frontend:** `password-validation.ts` merkezi modül, tüm formlar bunu kullanıyor
- **Backend:** `_validate_password()` aynı kuralları uygular

### 2.8 i18n (Çoklu Dil Desteği)
- **Ne çalışıyor:** Türkçe (tr) ve İngilizce (en) çeviriler
- **Kapsam:** 60K+ İngilizce, 86K+ Türkçe satır çeviri dosyası
- **Nasıl test edilir:** Dil seçici header'da mevcut

### 2.9 Docker Compose Ortamı
- **Ne çalışıyor:** 7 servis (frontend, backend, websocket, worker, scheduler, db, redis-cache, redis-queue)
- **Volume mount'lar:** tradehub_core kodu hot-reload için mount edilmiş
- **Nasıl test edilir:** `docker compose up -d` → tüm servisler ayağa kalkar

---

## 3. KISMI ÇALIŞAN / SORUNLU ÖZELLİKLER ⚠️

### 3.1 Email Gönderimi (SMTP)
- **Ne yapılmaya çalışıldı:** Kayıt OTP'si, şifre sıfırlama linki ve email doğrulama linki gönderimi
- **Mevcut durum:** Email gönderilmiyor. Tüm email gerektiren yerlerde `frappe.logger().info(f"[TEST] Email gönderilmedi (SMTP yok): ...")` yazılıyor
- **Sorunun sebebi:** SMTP yapılandırması yok. `site_config.json`'da mail ayarları mevcut değil. Test modunda çalışılıyor.
- **Dosyalar:** `identity.py` (send_registration_otp, forgot_password, _create_email_verification)

### 3.2 Email Doğrulama (Post-Registration)
- **Ne yapılmaya çalışıldı:** Kayıt sonrası email doğrulama linki gönderip, `verify_email` endpoint'i ile doğrulama
- **Mevcut durum:** `_create_email_verification()` key oluşturup Redis'e yazıyor, `verify_email` endpoint'i çalışıyor, ama email gönderilemiyor
- **Sorunun sebebi:** SMTP yok + `_create_email_verification` fonksiyonunda `frappe.sendmail()` çağrısı yok (sadece log)
- **Etki:** Buyer Profile'daki `email_verified` alanı her zaman 0 kalıyor

### 3.3 Settings Sayfaları (Hesap Yönetimi)
- **Ne yapılmaya çalışıldı:** Email değiştirme, şifre değiştirme, telefon değiştirme, hesap silme
- **Mevcut durum:** Frontend formları tam (settings.ts - 4 ayrı flow), ama yalnızca `change_password` endpoint'i backendde var
- **Sorunun sebebi:**
  - Email değiştirme → Backend endpoint yok
  - Telefon değiştirme → Backend endpoint yok
  - Hesap silme → Backend endpoint yok
  - Şifre değiştirme → Backend `change_password` var ama frontend henüz buna bağlanmıyor (localStorage ile mock)
- **Dosyalar:** `tradehubfront/src/alpine/settings.ts`, `tradehubback/.../identity.py`

### 3.4 check_email_exists Kullanımı
- **Ne yapılmaya çalışıldı:** Kayıt sırasında email'in zaten kayıtlı olup olmadığını kontrol etme
- **Mevcut durum:** Backend endpoint çalışıyor (`check_email_exists`), ama frontend kayıt akışında `sendRegistrationOtp` zaten 409 döndürüyor (duplicate kontrolü yapıyor). `check_email_exists` ayrıca çağrılmıyor.
- **Sorunun sebebi:** Frontend `sendRegistrationOtp`'yi tercih ediyor, ayrı bir kontrol gereksiz görülmüş

### 3.5 common_site_config Tutarsızlığı (Docker vs Local)
- **Ne yapılmaya çalışıldı:** Docker ve local geliştirme ortamları için ayrı config
- **Mevcut durum:** `common_site_config.json` local Redis port'ları (13000, 11000) kullanıyor, ama Docker Compose'da `common_site_config.docker.json` mount ediliyor
- **Sorunun sebebi:** Docker ortamında `redis-cache:6379` ve `redis-queue:6379` kullanılması gerekiyor. Docker config dosyası var ama içeriği doğrulanmadı.

---

## 4. EKSİK ÖZELLİKLER ❌

### 4.1 SMTP / Email Altyapısı
- **Ne olması gerekiyor:** Gerçek email gönderimi (OTP, şifre sıfırlama, email doğrulama)
- **Hangi dosyalar:** `site_config.json` (SMTP ayarları), `identity.py` (`frappe.sendmail()` çağrıları eklenmeli)
- **İş yükü:** Küçük — SMTP ayarları + 3 yerde sendmail çağrısı

### 4.2 SSO / Keycloak Entegrasyonu
- **Ne olması gerekiyor:** Google, Facebook, LinkedIn ile sosyal giriş
- **Hangi dosyalar:** Frontend `SocialLoginButtons.ts` (UI var ama fonksiyonel değil), Backend'de OAuth provider yapılandırması
- **İş yükü:** Büyük — Keycloak kurulumu, OAuth flow, frontend entegrasyonu

### 4.3 2FA (İki Faktörlü Doğrulama)
- **Ne olması gerekiyor:** Login sonrası isteğe bağlı 2FA (TOTP veya SMS)
- **Hangi dosyalar:** Yeni endpoint'ler (enable_2fa, verify_2fa), frontend 2FA kurulum ve doğrulama UI
- **İş yükü:** Büyük — Backend flow + frontend UI + QR kod üretimi

### 4.4 Telefon Doğrulama
- **Ne olması gerekiyor:** SMS ile telefon numarası doğrulama
- **Hangi dosyalar:** Yeni endpoint (send_phone_otp, verify_phone), SMS provider entegrasyonu
- **İş yükü:** Orta — SMS gateway (Twilio/Netgsm) + endpoint'ler + frontend

### 4.5 Profil Yönetimi API
- **Ne olması gerekiyor:** Kullanıcı profili görüntüleme/güncelleme (isim, adres, telefon)
- **Hangi dosyalar:** Yeni endpoint'ler (get_profile, update_profile), frontend profil sayfası
- **İş yükü:** Orta — Backend CRUD + frontend form

### 4.6 Hesap Yönetimi Backend Endpoint'leri
- **Ne olması gerekiyor:** Email değiştirme, telefon değiştirme, hesap silme
- **Hangi dosyalar:** `identity.py` (yeni endpoint'ler), `settings.ts` (API bağlantıları)
- **İş yükü:** Orta — 3 endpoint + frontend entegrasyonu

### 4.7 Admin Paneli (Özel)
- **Ne olması gerekiyor:** Frappe Desk yerine, tradehub'a özel admin arayüzü (başvuru yönetimi, kullanıcı yönetimi, raporlar)
- **Hangi dosyalar:** Tamamen yeni frontend sayfaları + backend API'ler
- **İş yükü:** Büyük — Tam bir admin SPA

### 4.8 KVKK / Rıza Yönetimi
- **Ne olması gerekiyor:** Kullanıcı rıza kayıtları, rıza yenileme, rıza geçmişi
- **Hangi dosyalar:** Yeni DocType (Consent Record), endpoint'ler, frontend rıza UI
- **İş yükü:** Orta — DocType + API + frontend

### 4.9 Ürün Kataloğu / Sipariş Sistemi
- **Ne olması gerekiyor:** Ürün listeleme, arama, sepet, sipariş, ödeme
- **Hangi dosyalar:** Tamamen yeni modüller (frontend sayfaları mevcut ama boş/statik)
- **İş yükü:** Büyük — E-ticaretin çekirdek fonksiyonalitesi
- **Not:** Frontend'te product, cart, checkout, order sayfaları HTML olarak var ama backend entegrasyonu yok

### 4.10 Mesajlaşma Sistemi
- **Ne olması gerekiyor:** Alıcı-tedarikçi mesajlaşma
- **Hangi dosyalar:** WebSocket altyapısı mevcut (Socket.IO servisi var), yeni DocType + API + frontend
- **İş yükü:** Büyük

### 4.11 RFQ (Teklif İsteme) Sistemi
- **Ne olması gerekiyor:** Alıcının tedarikçilere toplu teklif göndermesi
- **Hangi dosyalar:** Frontend sayfası (`rfq.html`) mevcut, backend modülü yok
- **İş yükü:** Büyük

---

## 5. BACKEND API DURUMU

| # | Endpoint | Metot | Dosya | Durum | Auth | Rate Limit | Test Edildi mi? | Notlar |
|---|----------|-------|-------|-------|------|------------|-----------------|--------|
| 1 | `tradehub_core.api.v1.identity.send_registration_otp` | POST | identity.py | ✅ Çalışıyor | Guest | 5/5dk | Evet (log ile) | OTP Redis'e yazılıyor, email gönderilmiyor |
| 2 | `tradehub_core.api.v1.identity.verify_registration_otp` | POST | identity.py | ✅ Çalışıyor | Guest | 5/5dk | Evet | 5 hatalı deneme sonrası kilitlenir |
| 3 | `tradehub_core.api.v1.identity.register_user` | POST | identity.py | ✅ Çalışıyor | Guest | 5/saat | Evet | Token zorunlu, Buyer Profile + Seller App oluşturur |
| 4 | `tradehub_core.api.v1.identity.forgot_password` | POST | identity.py | ✅ Çalışıyor | Guest | 3/saat | Evet (log ile) | Email enumeration koruması var, link gönderilmiyor |
| 5 | `tradehub_core.api.v1.identity.reset_password` | POST | identity.py | ✅ Çalışıyor | Guest | 5/saat | Evet | 24 saat expiry, şifre kuralları uygulanıyor |
| 6 | `tradehub_core.api.v1.identity.verify_email` | GET | identity.py | ✅ Çalışıyor | Guest | — | Kısmen | Key ile Buyer Profile email_verified günceller |
| 7 | `tradehub_core.api.v1.identity.change_password` | POST | identity.py | ✅ Çalışıyor | Login | — | Hayır | Mevcut şifre doğrulaması var |
| 8 | `tradehub_core.api.v1.identity.complete_registration_application` | POST | identity.py | ✅ Çalışıyor | Login | — | Kısmen | Ownership kontrolü var, tüm seller form alanları |
| 9 | `tradehub_core.api.v1.auth.check_email_exists` | POST | auth.py | ✅ Çalışıyor | Guest | 5/5dk | Evet | Frontend'te kullanılmıyor |
| 10 | `tradehub_core.api.v1.auth.get_session_user` | GET | auth.py | ✅ Çalışıyor | Guest | — | Evet | Roller, seller durumu, başvuru durumu döndürür |
| 11 | Frappe built-in `login` | POST | Frappe | ✅ Çalışıyor | Guest | — | Evet | Cookie-based session |
| 12 | Frappe built-in `logout` | GET | Frappe | ✅ Çalışıyor | Login | — | Evet | Session temizler |

**Eksik Endpoint'ler:**

| # | İhtiyaç | Öncelik | Notlar |
|---|---------|---------|--------|
| 1 | `change_email` | Orta | Settings sayfası bekliyor |
| 2 | `change_phone` | Orta | Settings sayfası bekliyor |
| 3 | `delete_account` | Düşük | Settings sayfası bekliyor |
| 4 | `get_profile` / `update_profile` | Orta | Profil sayfası için |
| 5 | `send_phone_otp` / `verify_phone` | Düşük | SMS gateway gerekli |
| 6 | `enable_2fa` / `verify_2fa` | Düşük | MVP sonrası |

---

## 6. FRONTEND SAYFA DURUMU

### Auth Sayfaları

| Sayfa/Component | Dosya | Durum | Sorun |
|----------------|-------|-------|-------|
| LoginPage | `components/auth/LoginPage.ts` | ✅ Tam çalışıyor | — |
| RegisterPage | `components/auth/RegisterPage.ts` | ✅ Tam çalışıyor | OTP email ile gelmiyor (SMTP) |
| AccountTypeSelector | `components/auth/AccountTypeSelector.ts` | ✅ Tam çalışıyor | — |
| EmailVerification (OTP) | `components/auth/EmailVerification.ts` | ✅ Tam çalışıyor | — |
| AccountSetupForm | `components/auth/AccountSetupForm.ts` | ✅ Tam çalışıyor | — |
| SupplierSetupForm | `components/auth/SupplierSetupForm.ts` | ✅ Tam çalışıyor | Backend entegrasyonu var |
| ForgotPasswordPage | `components/auth/ForgotPasswordPage.ts` | ✅ Tam çalışıyor | Email link gitmiyor (SMTP) |
| ResetPasswordPage | `components/auth/ResetPasswordPage.ts` | ✅ Tam çalışıyor | ?key= parametresi gerekli |
| AuthLayout | `components/auth/AuthLayout.ts` | ✅ Tam çalışıyor | — |
| SocialLoginButtons | `components/auth/SocialLoginButtons.ts` | ⚠️ UI var, fonksiyon yok | SSO/OAuth entegrasyonu yok |

### Dashboard Sayfaları

| Sayfa | Dosya | Durum | Sorun |
|-------|-------|-------|-------|
| Buyer Dashboard | `pages/dashboard/buyer-dashboard.html` | ⚠️ Statik/template | Backend verisi yok |
| Orders | `pages/dashboard/orders.html` | ⚠️ Statik/template | Sipariş sistemi yok |
| Messages | `pages/dashboard/messages.html` | ⚠️ Statik/template | Mesajlaşma yok |
| RFQ | `pages/dashboard/rfq.html` | ⚠️ Statik/template | RFQ sistemi yok |
| Favorites | `pages/dashboard/favorites.html` | ⚠️ Statik/template | Favori sistemi yok |
| Settings | `pages/dashboard/settings.html` | ⚠️ Kısmi | change_password hariç backend yok |
| Profile | `pages/dashboard/profile.html` | ⚠️ Statik/template | Profil API yok |

### E-ticaret Sayfaları

| Sayfa | Dosya | Durum | Sorun |
|-------|-------|-------|-------|
| Products | `pages/products.html` | ⚠️ Statik/template | Ürün kataloğu yok |
| Product Detail | `pages/product-detail.html` | ⚠️ Statik/template | Backend yok |
| Categories | `pages/categories.html` | ⚠️ Statik/template | Kategori API yok |
| Manufacturers | `pages/manufacturers.html` | ⚠️ Kısmi | ManufacturersHero UI var, veri statik |
| Cart | `pages/cart.html` | ⚠️ Statik/template | Sepet sistemi yok |
| Checkout | `pages/order/checkout.html` | ⚠️ Statik/template | Ödeme sistemi yok |

### Diğer Sayfalar

| Sayfa | Dosya | Durum | Sorun |
|-------|-------|-------|-------|
| Seller Storefront | `pages/seller/sell.html` | ⚠️ Statik | — |
| Help Center | `pages/help/help-center.html` | ⚠️ Statik | — |
| Legal (terms, privacy) | `pages/legal/*.html` | ⚠️ Statik | İçerik eklenmeli |

### Utility Dosyaları

| Dosya | Durum | Sorun |
|-------|-------|-------|
| `utils/auth.ts` | ✅ Tam çalışıyor | Tüm API çağrıları gerçek |
| `utils/api.ts` | ✅ Tam çalışıyor | credentials: 'include', 401 redirect |
| `utils/auth-guard.ts` | ✅ Tam çalışıyor | Async session kontrolü |
| `utils/password-validation.ts` | ✅ Tam çalışıyor | Backend ile tutarlı kurallar |
| `alpine/auth.ts` | ✅ Tam çalışıyor | Register, forgot, reset flows |
| `alpine/settings.ts` | ⚠️ Kısmi | Backend endpoint'leri eksik |

---

## 7. DOCKER / DEPLOYMENT DURUMU

### Çalışan Servisler

| Servis | Image/Build | Port (host:container) | Durum | Notlar |
|--------|-------------|----------------------|-------|--------|
| frontend | Vite build + Nginx | 5500:80 | ✅ Çalışıyor | SPA routing, API proxy |
| backend | frappe/erpnext:v15.101.0 + Gunicorn | 8001:8000 | ✅ Çalışıyor | 4 worker |
| websocket | frappe + Socket.IO | 9001:9000 | ✅ Çalışıyor | Frappe realtime |
| worker | frappe + bench worker | — | ✅ Çalışıyor | Background jobs |
| scheduler | frappe + bench schedule | — | ✅ Çalışıyor | Günlük cleanup_expired_tokens |
| db | mariadb:10.6 | 3308:3306 | ✅ Çalışıyor | utf8mb4, healthcheck |
| redis-cache | redis:7-alpine | 13002:6379 | ✅ Çalışıyor | Session + OTP cache |
| redis-queue | redis:7-alpine | 11002:6379 | ✅ Çalışıyor | Background job queue |

### Volume Mount'lar

| Mount | Doğru mu? | Notlar |
|-------|-----------|--------|
| `./tradehubback/sites:/home/frappe/frappe-bench/sites` | ✅ | Site config, DB config |
| `common_site_config.docker.json → common_site_config.json` | ✅ | Docker-specific Redis URL'leri |
| `./tradehubback/frappe_wsgi.py → /home/frappe/frappe-bench/frappe_wsgi.py` | ✅ | WSGI giriş noktası |
| `./tradehubback/apps/tradehub_core → apps/tradehub_core` | ✅ | Hot-reload için |
| `backend-logs (named volume)` | ✅ | Log persistence |
| `db-data (named volume)` | ✅ | DB persistence |

### Prod İçin Eksikler

| Eksik | Öncelik | Açıklama |
|-------|---------|----------|
| SMTP yapılandırması | **Kritik** | `site_config.json`'a mail_server, mail_port, mail_login, mail_password eklenmeli |
| SSL/TLS (HTTPS) | **Kritik** | Nginx'te SSL sertifikası + 443 port |
| CORS ayarları | **Yüksek** | `allow_cors` şu an `http://localhost:5500` — prod domain eklenmeli |
| `.env` dosyası | **Yüksek** | DB şifreleri, Redis port'ları vb. environment variable'a taşınmalı |
| Nginx prod config | **Yüksek** | Gzip, cache headers, security headers eksik |
| Domain yapılandırma | **Yüksek** | `FRAPPE_SITE_NAME`, `VITE_API_URL` prod değerleri |
| Health check endpoint | Orta | Backend sağlık kontrolü |
| Log rotation | Orta | Backend logları için rotation |
| Backup stratejisi | Orta | DB + Redis yedekleme |
| Rate limiting (Nginx) | Orta | DDoS koruması |

---

## 8. MVP İÇİN YAPILMASI GEREKENLER (Öncelik sırasıyla)

### Öncelik 1: Auth Sistemi Tamamen Çalışmalı ⭐

#### 1.1 SMTP Yapılandırması
- **Ne yapılacak:** Site config'e SMTP ayarları ekle, `identity.py`'deki 3 email noktasına `frappe.sendmail()` ekle
- **Dosyalar:**
  - `tradehubback/sites/tradehub.localhost/site_config.json` (SMTP ayarları)
  - `tradehubback/apps/tradehub_core/tradehub_core/api/v1/identity.py` (sendmail çağrıları)
- **Tahmini iş:** Küçük (1-2 saat)

#### 1.2 Email Template'leri
- **Ne yapılacak:** OTP, şifre sıfırlama, email doğrulama için HTML email template'leri oluştur
- **Dosyalar:**
  - `tradehub_core/templates/emails/registration_otp.html` (yeni)
  - `tradehub_core/templates/emails/password_reset.html` (yeni)
  - `tradehub_core/templates/emails/email_verification.html` (yeni)
- **Tahmini iş:** Küçük (2-3 saat)

#### 1.3 Login Sonrası Eksik İşlemler
- **Ne yapılacak:** Login response'unda `get_session_user` tam kullanılıyor ama frontend'te `device_id`, `remember_me` gibi parametreler eksik (düşük öncelik)
- **Dosyalar:** `tradehubfront/src/utils/auth.ts`
- **Tahmini iş:** Küçük (1 saat)

### Öncelik 2: Alıcı ve Tedarikçi Kayıt Akışları Eksiksiz Olmalı ⭐

#### 2.1 Tedarikçi Kayıt Akışı End-to-End Test
- **Ne yapılacak:** Tedarikçi kayıt → OTP → hesap kurulumu → tedarikçi formu → başvuru gönderimi → admin onayı → seller rolü akışının uçtan uca testi
- **Dosyalar:** Mevcut dosyalar (test senaryosu)
- **Tahmini iş:** Küçük (2-3 saat)

#### 2.2 Seller Application Sonrası Yönlendirme
- **Ne yapılacak:** Başvuru gönderildikten sonra "application-pending" sayfası oluşturulmalı
- **Dosyalar:**
  - `tradehubfront/pages/seller/application-pending.html` (yeni veya mevcut)
  - İlgili component/page dosyası
- **Tahmini iş:** Küçük (1-2 saat)

#### 2.3 Email Doğrulama Akışı Tamamlama
- **Ne yapılacak:** Kayıt sonrası email doğrulama linkinin gerçekten gönderilmesi + doğrulama sonrası UI feedback
- **Dosyalar:** `identity.py` (_create_email_verification), yeni frontend doğrulama sayfası
- **Tahmini iş:** Orta (3-4 saat)

### Öncelik 3: Admin Paneli Altyapısı ⭐

#### 3.1 Admin Dashboard Sayfası
- **Ne yapılacak:** Temel istatistikler (toplam kullanıcı, bekleyen başvurular, aktif seller'lar)
- **Dosyalar:** Yeni admin sayfaları + backend API endpoint'leri
- **Tahmini iş:** Büyük (1-2 gün)

#### 3.2 Seller Application Yönetimi
- **Ne yapılacak:** Başvuru listele, detay görüntüle, onayla/reddet
- **Dosyalar:** Yeni admin sayfaları + backend API'ler (veya mevcut Frappe Desk kullanılabilir)
- **Tahmini iş:** Orta-Büyük (geçici olarak Frappe Desk kullanılabilir)

#### 3.3 Kullanıcı Yönetimi
- **Ne yapılacak:** Kullanıcı listele, deaktive et, rol değiştir
- **Dosyalar:** Yeni admin sayfaları + backend API'ler
- **Tahmini iş:** Büyük (1-2 gün)

### Öncelik 4: Prod Ortama Hazırlık ⭐

#### 4.1 SSL/HTTPS Kurulumu
- **Ne yapılacak:** Let's Encrypt veya manual SSL, Nginx HTTPS yapılandırması
- **Dosyalar:** `tradehubfront/nginx.conf`, `docker-compose.yml` (certbot servisi)
- **Tahmini iş:** Orta (3-4 saat)

#### 4.2 CORS ve Güvenlik Ayarları
- **Ne yapılacak:** Prod domain için CORS, security headers (CSP, HSTS, X-Frame-Options)
- **Dosyalar:** `site_config.json`, `nginx.conf`
- **Tahmini iş:** Küçük (1-2 saat)

#### 4.3 Environment Variables
- **Ne yapılacak:** Tüm credential'ları `.env` dosyasına taşı, docker-compose.yml'de variable kullan
- **Dosyalar:** `.env` (yeni), `docker-compose.yml`, `site_config.json`
- **Tahmini iş:** Küçük (1-2 saat)

#### 4.4 Nginx Prod Optimizasyonu
- **Ne yapılacak:** Gzip, static asset caching, security headers, rate limiting
- **Dosyalar:** `tradehubfront/nginx.conf`
- **Tahmini iş:** Küçük (1-2 saat)

---

## 9. TEKNİK BORÇ VE RİSKLER

### Test Edilmemiş Senaryolar
1. **Eşzamanlı kayıt:** Aynı email ile aynı anda 2 kayıt denemesi (race condition)
2. **Token replay:** Kullanılmış registration_token ile tekrar kayıt denemesi (siliniyor ama zamanlaması test edilmeli)
3. **Session hijacking:** Cookie'nin farklı IP/device'dan kullanılması
4. **Rate limit bypass:** Farklı IP'lerden rate limit aşımı (Nginx seviyesinde kontrol yok)
5. **Seller Application workflow:** Status geçişleri arası validasyon (Draft → Approved direkt geçiş mümkün mü?)
6. **Frontend error handling:** Ağ hataları, timeout, 500 hataları için kullanıcı deneyimi
7. **File upload güvenliği:** SupplierSetupForm'daki dosya yükleme boyut/tip kontrolü
8. **Büyük translation dosyaları:** en.ts (61K satır), tr.ts (87K satır) — bundle boyutu etkisi

### Güvenlik Açıkları / Riskleri
1. **DB credential'ları açık:** `docker-compose.yml` ve `site_config.json`'da şifreler plaintext (`.env` dosyasına taşınmalı)
2. **CORS wildcard riski:** Şu an `http://localhost:5500` — prod'da yanlışlıkla wildcard yapılmamalı
3. **Password reset key expiry:** 24 saat — güvenlik için 1-2 saate indirilmeli
4. **OTP brute force:** 5 deneme limiti var ama aynı email için yeni OTP istenebilir (rate limit 5/5dk)
5. **Email enumeration:** `send_registration_otp` 409 döndürüyor (email var) — bu email enumeration'a açık. `forgot_password` ise korumalı. Tutarsız.
6. **XSS koruması:** DOMPurify kullanılıyor (✅), ama tüm kullanıcı girdileri sanitize ediliyor mu kontrol edilmeli
7. **CSRF koruması:** Frappe built-in CSRF token kullanıyor (✅) ama custom endpoint'lerde header kontrolü yapılmıyor
8. **Dosya yükleme:** Upload edilen dosyaların türü/boyutu backend'de kontrol edilmiyor

### Performans Sorunları
1. **Translation dosya boyutu:** en.ts + tr.ts toplam ~150K satır. Vite chunk splitting ile ayrılmış ama yine de büyük. Lazy loading veya namespace bazlı bölünme düşünülmeli.
2. **Session kontrolü:** Her sayfa yüklemesinde `get_session_user` API çağrısı yapılıyor. Cache veya session storage kullanılabilir.
3. **Redis bağımlılığı:** Tüm OTP/token'lar Redis'te. Redis restart olursa tüm aktif kayıtlar/resetler kaybolur.
4. **Gunicorn worker sayısı:** Docker'da 4 worker, `common_site_config`'de 25 yazıyor (tutarsız). Prod için optimize edilmeli.

### Mimari Borçlar
1. **Frontend routing:** Multi-page SPA (her sayfa ayrı HTML), SPA router yok. Sayfa geçişlerinde tam reload.
2. **State management:** Alpine.js x-data ile component-local state. Sayfalar arası paylaşımlı state yok.
3. **API error handling:** `api.ts`'de genel 401 yakalama var ama diğer HTTP hataları (429, 500) için standart bir pattern yok.
4. **Test altyapısı:** Frontend ve backend için otomatik test yok. Manuel test senaryoları belgelenmemiş.
5. **CI/CD pipeline:** Yok — build, test, deploy otomasyonu kurulmalı.

---

## ÖZET

| Alan | Durum | Tamamlanma |
|------|-------|------------|
| Auth - Login/Logout | ✅ Tam | %100 |
| Auth - Buyer Kayıt | ✅ Tam (SMTP hariç) | %90 |
| Auth - Supplier Kayıt | ✅ Tam (SMTP hariç) | %85 |
| Auth - Şifre Sıfırlama | ✅ Tam (SMTP hariç) | %90 |
| Auth - Şifre Kuralları | ✅ Tutarlı | %100 |
| Backend API | ✅ Temel endpoint'ler tamam | %80 |
| DocType'lar | ✅ 3 DocType + workflow | %100 |
| Frontend Auth UI | ✅ Tüm sayfalar tam | %95 |
| Email Gönderimi | ❌ SMTP yok | %10 |
| Settings Backend | ⚠️ Sadece change_password | %20 |
| Admin Paneli | ❌ Yok (Frappe Desk geçici çözüm) | %0 |
| E-ticaret (ürün, sipariş) | ❌ Frontend template var, backend yok | %5 |
| Prod Hazırlığı | ⚠️ Docker çalışıyor, güvenlik eksik | %40 |
| Test Otomasyonu | ❌ Yok | %0 |
