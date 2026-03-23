# Frontend Auth Sistemi — Faz 3 Değişiklik Dokümantasyonu
_Tarih: 2026-03-16_
_Çalışma dizini: /home/ali/Masaüstü/istoc.com/_

## 1. Özet

4 yeni dosya oluşturuldu, 11 mevcut dosya güncellendi. Storefront auth sistemi tamamen mock/placeholder durumdan gerçek Frappe backend API entegrasyonuna geçirildi. Kayıt akışı email OTP doğrulama + registration_token mekanizmasına bağlandı, şifre sıfırlama OTP tabanlı 3 adımdan email link tabanlı 2 adıma dönüştürüldü, login gerçek Frappe API'sine bağlandı, ve şifre doğrulama kuralları merkezi bir modülde birleştirildi.

## 2. Yeni Oluşturulan Dosyalar

### `tradehubfront/src/utils/password-validation.ts`
- **Amaç:** Tüm auth ekranlarında tutarlı şifre doğrulama kuralları sağlayan merkezi modül.
- **İçerik:**
  - `PasswordValidation` interface (minLength, hasUppercase, hasLowercase, hasNumber)
  - `validatePassword(password: string): PasswordValidation` — şifre kurallarını kontrol eder
  - `isPasswordValid(password: string): boolean` — tüm kurallar sağlanıyor mu kısayolu
- **Bağlantılar:** `AccountSetupForm.ts`, `alpine/auth.ts` (resetPasswordPage), `alpine/settings.ts` tarafından import ediliyor.
- **Backend Endpoint:** Yok (client-side doğrulama). Kurallar backend `identity.py` ile uyumlu: 8+ karakter, büyük harf, küçük harf, rakam.

### `tradehubfront/src/components/auth/ResetPasswordPage.ts`
- **Amaç:** Kullanıcı email'deki şifre sıfırlama linkine tıkladığında açılan yeni şifre formu bileşeni.
- **İçerik:**
  - `ResetPasswordPage(): string` — HTML template (header + card + 3 step: form, success, error)
  - `ResetPasswordStep` type: `'form' | 'success' | 'error'`
  - `initResetPasswordPage(): void` — no-op (Alpine handles interactivity)
  - Şifre kuralları canlı göstergesi, loading/hata/başarı durumları
- **Bağlantılar:** `src/pages/reset-password.ts` tarafından render ediliyor. `src/components/auth/index.ts`'den export ediliyor.
- **Backend Endpoint:** `POST /api/method/tr_tradehub.api.v1.identity.reset_password` (alpine/auth.ts'deki resetPasswordPage Alpine data üzerinden çağrılır)

### `tradehubfront/src/pages/reset-password.ts`
- **Amaç:** Reset password sayfası entry point. URL'den `?key=` parametresini Alpine init'e bırakır.
- **İçerik:** `ResetPasswordPage()` render + `startAlpine()` çağrısı (forgot-password.ts ile aynı pattern)
- **Bağlantılar:** `pages/auth/reset-password.html` tarafından yüklenir.
- **Backend Endpoint:** Yok (bileşene delege).

### `tradehubfront/pages/auth/reset-password.html`
- **Amaç:** HTML entry point. `login.html` ile aynı minimal yapı.
- **İçerik:** `<div id="app"></div>` + `<script type="module" src="/src/pages/reset-password.ts">`
- **Bağlantılar:** Vite build tarafından `fast-glob` ile otomatik keşfedilir. Ek config gerekmez.
- **Backend Endpoint:** Yok.

## 3. Güncellenen Dosyalar

### `tradehubfront/src/utils/auth.ts`
- **Önceki Davranış:** Tamamen mock — `localStorage` tabanlı sahte `login(email)`, `logout()`, `isLoggedIn()`, `getUser()`. Gerçek API çağrısı yok.
- **Yapılan Değişiklikler:**
  - Tüm mock fonksiyonlar gerçek Frappe API çağrılarıyla değiştirildi
  - `api()` wrapper kullanılarak `credentials: 'include'` ile cookie-based auth
  - `AuthUser` interface genişletildi: email, full_name, roles, is_admin, is_seller, is_buyer, has_seller_profile, pending_seller_application, seller_profile
  - `login(email, password)` — `POST /api/method/login` + `requires_2fa` ve `requires_consent_renewal` kontrolü (console.warn)
  - `logout()` — `POST /api/method/logout`
  - `register(params)` — `POST register_user` + `registration_token` parametresi
  - `getSessionUser()` — `GET get_session_user`, session cache mekanizması
  - `getRedirectUrl(user)` — admin/seller/buyer rol bazlı yönlendirme
  - 5 yeni fonksiyon: `checkEmailExists`, `sendRegistrationOtp`, `verifyRegistrationOtp`, `forgotPassword`, `resetPassword`
- **Değişmeyenler:** Export isimleri (`login`, `logout`, `isLoggedIn`, `getUser`) korundu. Dosya yolu aynı.
- **Neden Değiştirildi:** Mock auth → gerçek Frappe backend entegrasyonu. Tüm auth akışlarının backend'e bağlanması için gerekli.

### `tradehubfront/src/utils/api.ts`
- **Önceki Davranış:** Bearer token (localStorage'dan) + 401 redirect.
- **Yapılan Değişiklikler:**
  - `credentials: 'include'` eklendi (Frappe cookie-based auth için)
  - Bearer token / localStorage referansı tamamen kaldırıldı
- **Değişmeyenler:** Genel yapı, `api<T>()` fonksiyon imzası, 401 redirect, error handling.
- **Neden Değiştirildi:** Frappe session cookie'leri ile çalışabilmesi için.

### `tradehubfront/src/utils/auth-guard.ts`
- **Önceki Davranış:** `localStorage.getItem('tradehub_auth')` ile senkron kontrol. Sadece `requireAuth()` fonksiyonu vardı.
- **Yapılan Değişiklikler:**
  - localStorage tabanlı kontrol → async `getSessionUser()` tabanlı kontrol
  - `requireSeller()` guard eklendi (seller durumuna göre yönlendirme)
  - `blockAdmin()` guard eklendi (admin → Frappe Desk yönlendirmesi)
- **Değişmeyenler:** `requireAuth()` davranışı (oturum yoksa login'e yönlendir).
- **Neden Değiştirildi:** Mock localStorage kaldırıldığı için guard'lar da gerçek session kontrolüne geçirildi.

### `tradehubfront/src/alpine/auth.ts`
- **Önceki Davranış:**
  - `registerPage`: submitEmail sadece client-side regex → goToStep('otp'), OTP onComplete backend çağrısı yok → direkt goToStep('setup'), onResend boş placeholder
  - `forgotPasswordPage`: 3 adımlı (find-account → verify-code → reset-password), submitFindAccount API çağrısı yok, submitReset API çağrısı yok
- **Yapılan Değişiklikler:**
  - **registerPage:** `registration_token`, `loading`, `emailExistsError` state eklendi. `submitEmail()` artık `checkEmailExists()` + `sendRegistrationOtp()` çağırıyor. OTP `onVerify` callback `verifyRegistrationOtp()` çağırıyor ve `registration_token` kaydediyor. OTP `onResend` callback `sendRegistrationOtp()` çağırıyor. `register()` çağrısına `registration_token` eklendi. Kayıt sonrası auto-login + `getSessionUser()` + `getRedirectUrl()` ile yönlendirme.
  - **forgotPasswordPage:** 3 adım → 2 adım (`'find-account' | 'link-sent'`). OTP state'leri tamamen kaldırıldı. `submitFindAccount()` → `forgotPassword()` çağırıyor. `resendLink()` metodu eklendi. `submitReset()`, `validatePassword()`, `handleOtpInput/Paste/Keydown`, `resendCode`, `startCountdown`, `stopCountdown` tamamen kaldırıldı.
  - **resetPasswordPage:** Yeni Alpine data eklendi — URL'den key okuma, şifre doğrulama, `resetPassword()` API çağrısı, form/success/error step yönetimi.
- **Değişmeyenler:** `registerPage` adım sırası (account-type → email → otp → setup), `accountType` state yapısı, `goToStep()` navigasyon paterni.
- **Neden Değiştirildi:** Tüm auth akışlarının gerçek backend API'lerine bağlanması.

### `tradehubfront/src/components/auth/ForgotPasswordPage.ts`
- **Önceki Davranış:** 3 adımlı UI: StepFindAccount (email) → StepVerifyCode (6-digit OTP) → StepResetPassword (yeni şifre). ForgotPasswordStep: 'find-account' | 'verify-code' | 'reset-password'.
- **Yapılan Değişiklikler:**
  - `ForgotPasswordStep` type: `'find-account' | 'link-sent'`
  - `ForgotPasswordState` interface sadeleştirildi (OTP state'leri kaldırıldı)
  - `StepVerifyCode()` fonksiyonu tamamen silindi
  - `StepResetPassword()` fonksiyonu tamamen silindi
  - `StepLinkSent()` fonksiyonu eklendi: email gönderildi bilgi ekranı, login'e dönüş butonu, "tekrar gönder" linki
  - Submit butonuna loading state eklendi
- **Değişmeyenler:** `ForgotPasswordHeader()`, `ForgotPasswordCard()`, `StepFindAccount()` UI yapısı, `maskEmail()` helper, genel layout/stil.
- **Neden Değiştirildi:** Backend'in email link tabanlı şifre sıfırlama mekanizmasına uyum. OTP tabanlı akış backend'de mevcut değildi.

### `tradehubfront/src/components/auth/EmailVerification.ts`
- **Önceki Davranış:** `onComplete` callback 6 hane girilince hemen tetikleniyor (backend çağrısı yok). `onResend` callback placeholder.
- **Yapılan Değişiklikler:**
  - `EmailVerificationOptions` interface'e `onVerify?: (otp: string) => Promise<void>` async callback eklendi
  - OTP tamamlandığında: `onVerify` sağlandıysa loading state göster (input'lar disable), async çağrı yap, hata alırsa OTP temizle + hata mesajı göster
  - `handleOTPSubmit()` helper fonksiyonu eklendi (sync onComplete vs async onVerify yönetimi)
  - `setInputsDisabled()` helper fonksiyonu eklendi
- **Değişmeyenler:** HTML yapısı, OTP input sayısı, auto-focus, paste desteği, ok tuşu navigasyonu, countdown timer, genel görünüm.
- **Neden Değiştirildi:** Kayıt akışında OTP'nin backend'de doğrulanabilmesi için async callback desteği gerekiyordu.

### `tradehubfront/src/components/auth/LoginPage.ts`
- **Önceki Davranış:** Form submit'te mock `login(email)` çağırıp anasayfaya yönlendiriyordu.
- **Yapılan Değişiklikler:**
  - `login(email, password)` + `getSessionUser()` + `getRedirectUrl()` akışı
  - `showToast` import eklendi (hata bildirimleri için)
  - Hata mesajı alanı eklendi (form üstünde `#login-error`)
  - Loading state eklendi (submit butonu disable + spinner)
  - Şifre görünürlük toggle eklendi
  - 2FA_REQUIRED hatası için bilgi toast'ı
- **Değişmeyenler:** HTML template yapısı, input field'lar, forgot password linki, create account linki, genel görünüm.
- **Neden Değiştirildi:** Mock login → gerçek Frappe API.

### `tradehubfront/src/components/auth/AccountSetupForm.ts`
- **Önceki Davranış:** Kendi içinde `validatePassword()`, `isPasswordValid()`, `PasswordRequirements` interface tanımlıydı.
- **Yapılan Değişiklikler:**
  - Inline `validatePassword()`, `isPasswordValid()`, `PasswordRequirements` tanımları silindi
  - `password-validation.ts`'den import edildi
  - Backward compat için re-export eklendi (`PasswordRequirements = PasswordValidation`)
  - `isPasswordValid()` çağrısı güncellendi: `isPasswordValid(state.passwordRequirements)` → `isPasswordValid(state.data.password)`
- **Değişmeyenler:** HTML template, country dropdown, form validasyon mantığı, UI/UX.
- **Neden Değiştirildi:** Şifre kurallarının merkezi bir kaynaktan yönetilmesi.

### `tradehubfront/src/components/auth/index.ts`
- **Önceki Davranış:** Tüm auth bileşenlerini barrel export ediyordu.
- **Yapılan Değişiklikler:** `ResetPasswordPage`, `initResetPasswordPage`, `ResetPasswordStep` export'ları eklendi.
- **Değişmeyenler:** Mevcut export'ların hiçbiri kaldırılmadı veya ismi değişmedi.
- **Neden Değiştirildi:** Yeni bileşenin projenin geri kalanından erişilebilir olması.

### `tradehubfront/src/alpine/settings.ts`
- **Önceki Davranış:** `settingsChangePassword` Alpine data'sında `newPw.length < 8` kontrolü yapıyordu.
- **Yapılan Değişiklikler:**
  - `isPasswordValid` import edildi (`password-validation.ts`'den)
  - `newPw.length < 8` → `!isPasswordValid(newPw)` olarak güncellendi
- **Değişmeyenler:** Tüm diğer fonksiyonlar, UI, stepper yapısı, countdown, mock davranış.
- **Neden Değiştirildi:** Şifre kurallarının tüm ekranlarda tutarlı olması (sadece min length yerine tam kural seti).

## 4. Kapsam Dışı Bırakılanlar

| Konu | Neden |
|---|---|
| SSO/Keycloak entegrasyonu | Mimari doküman bu fazda kapsamına almamış |
| 2FA kurulumu/doğrulama ekranı | Login'de `requires_2fa` console.warn olarak loglanıyor, UI ileride |
| Email doğrulama hatırlatma sayfası | Arka plan akışı olarak korunuyor, UI ileride |
| Telefon doğrulama | Backend mevcut ama UI kapsam dışı |
| Organizasyon/B2B kaydı | Backend `register_organization()` mevcut ama UI kapsam dışı |
| Consent yönetim UI'ı | Login'de `requires_consent_renewal` loglanıyor, UI ileride |
| SupplierSetupForm.ts oluşturulması | Dosya henüz mevcut değil, ayrı iş olarak ele alınmalı |
| `SettingsChangePassword` backend entegrasyonu | `change_password()` API bağlantısı bu fazın kapsamı dışında |

## 5. Backend Beklentileri

Storefront'un çağırdığı ancak henüz backend'de **YENİ YAZILMASI GEREKEN** endpoint'ler:

### 5.1 `send_registration_otp`
- **URL:** `POST /api/method/tr_tradehub.api.v1.identity.send_registration_otp`
- **Payload:** `{ email: string }`
- **Beklenen Response:** `{ success: true, expires_in_minutes: 10 }`
- **Hata Response'ları:** 400 (geçersiz email), 409 (email kayıtlı), 429 (rate limit)

### 5.2 `verify_registration_otp`
- **URL:** `POST /api/method/tr_tradehub.api.v1.identity.verify_registration_otp`
- **Payload:** `{ email: string, code: string }`
- **Beklenen Response:** `{ success: true, registration_token: "a1b2c3..." }`
- **Hata Response'ları:** 404 (OTP bulunamadı/süresi dolmuş), 401 (yanlış kod), 429 (5+ yanlış deneme veya rate limit)

### 5.3 `register_user` güncelleme
- **URL:** `POST /api/method/tr_tradehub.api.v1.identity.register_user`
- **Ek Payload:** `registration_token: string` (mevcut parametrelere ek olarak zorunlu)
- **Ek Doğrulama:** Cache'den `registration_token:{token}` okunmalı, email eşleşmesi kontrol edilmeli, başarı sonrası token silinmeli

Storefront'un çağırdığı ve backend'de **ZATEN MEVCUT** olan endpoint'ler:

### 5.4 `check_email_exists` (mevcut)
- **URL:** `POST /api/method/tr_tradehub.api.v1.auth.check_email_exists`
- **Payload:** `{ email: string }`
- **Beklenen Response:** `{ success: true, exists: boolean }`

### 5.5 `forgot_password` (mevcut)
- **URL:** `POST /api/method/tr_tradehub.api.v1.identity.forgot_password`
- **Payload:** `{ email: string }`
- **Beklenen Response:** `{ success: true, message: string }` (her zaman success — enumeration koruması)

### 5.6 `reset_password` (mevcut)
- **URL:** `POST /api/method/tr_tradehub.api.v1.identity.reset_password`
- **Payload:** `{ key: string, new_password: string }`
- **Beklenen Response:** `{ success: true, message: string }`

### 5.7 `login` (mevcut — Frappe built-in)
- **URL:** `POST /api/method/login`
- **Payload:** `{ usr: string, pwd: string }`
- **Beklenen Response:** `{ message: string, full_name?: string, requires_2fa?: boolean, requires_consent_renewal?: boolean }`

### 5.8 `get_session_user` (mevcut)
- **URL:** `GET /api/method/tr_tradehub.api.v1.auth.get_session_user`
- **Beklenen Response:** `{ logged_in: boolean, user: { email, full_name, roles, is_admin, is_seller, is_buyer, has_seller_profile, pending_seller_application, seller_profile } }`

### 5.9 `logout` (mevcut — Frappe built-in)
- **URL:** `POST /api/method/logout`

### 5.10 `forgot_password` email link URL'i
- **Not:** Backend'in gönderdiği şifre sıfırlama emailindeki link formatı: `{site_url}/pages/auth/reset-password.html?key={key}` olmalıdır. Bu URL'in backend `forgot_password()` fonksiyonunda doğru configure edilmesi gerekir.

## 6. Test Notları

### Kayıt Akışı (Buyer)
1. `/pages/auth/register.html` aç
2. "Buyer" seç → "Devam" tıkla
3. Email gir → "Devam" tıkla
4. **Beklenen:** Backend'e `check_email_exists` + `send_registration_otp` çağrısı yapılmalı
5. OTP gelen kodu gir (veya backend yanıtını bekle)
6. **Beklenen:** `verify_registration_otp` çağrılmalı, registration_token alınmalı
7. Formu doldur → "Hesap Oluştur" tıkla
8. **Beklenen:** `register_user` (registration_token ile) → `login` → `get_session_user` → anasayfaya yönlendirme

### Login Akışı
1. `/pages/auth/login.html` aç
2. Email + şifre gir → "Giriş" tıkla
3. **Beklenen:** `POST /api/method/login` → `get_session_user` → rol bazlı yönlendirme
4. Yanlış şifre girişinde hata mesajı görünmeli
5. 2FA aktif kullanıcıda console'da `[Auth] 2FA gerekli` uyarısı

### Şifre Sıfırlama Akışı
1. `/pages/auth/forgot-password.html` aç
2. Email gir → "Devam" tıkla
3. **Beklenen:** `forgot_password` çağrılmalı → "Email gönderildi" ekranı
4. "Tekrar gönder" tıkla → `forgotPassword` tekrar çağrılmalı, toast gösterilmeli
5. `/pages/auth/reset-password.html?key=test123` aç
6. **Beklenen:** Şifre formu görünmeli, kurallar canlı güncellenmeli
7. Şifre gir + "Şifreyi Sıfırla" tıkla → `reset_password` çağrılmalı
8. `/pages/auth/reset-password.html` (key olmadan) aç → hata ekranı görünmeli

### Şifre Kuralları Tutarlılığı
- Kayıt formu, reset password formu ve settings şifre değiştirme formunda aynı kurallar (8+ karakter, büyük harf, küçük harf, rakam) uygulanmalı
