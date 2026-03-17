● Tüm dosyaları taradım, mevcut durumu ve tasarım dokümanını tam olarak anladım. Önemli bir bulgu: SupplierSetupForm.ts dosyası henüz        
  oluşturulmamış — analiz dokümanında bahsedilse de kodda yok. Şimdi plan dosyasına değişiklik planını yazıyorum.                            
                                                                                                                                             
● Updated plan                                                                                                                               
  ⎿  /plan to preview                                                                                                                        
                                                                                                                                             
● Plan dosyasını oluşturdum. Tasarım dokümanına dayalı kapsamlı bir değişiklik planı hazırladım. Özetle:                                     
                                                                                                                                           
  4 Yeni Dosya:                                                                                                                              
  - src/utils/password-validation.ts — Merkezi şifre doğrulama                                                                               
  - src/components/auth/ResetPasswordPage.ts — Yeni şifre formu                                                                              
  - src/pages/reset-password.ts — Entry point                                                                                                
  - pages/auth/reset-password.html — HTML entry         

  9 Güncellenecek Dosya:
  - src/utils/auth.ts — Mock → gerçek Frappe API
  - src/alpine/auth.ts — OTP/kayıt/forgot password backend bağlantıları
  - src/components/auth/ForgotPasswordPage.ts — 3 adım OTP → 2 adım link akışı
  - src/components/auth/EmailVerification.ts — Async onVerify callback
  - src/components/auth/AccountSetupForm.ts — Şifre validasyonu merkeze taşınır
  - src/components/auth/LoginPage.ts — Gerçek login API
  - src/components/auth/index.ts — Yeni export'lar
  - src/components/settings/SettingsChangePassword.ts — Merkezi şifre validasyonu
  - src/utils/api.ts — Cookie auth (credentials: include)

  Kritik bulgu: SupplierSetupForm.ts dosyası kodda mevcut değil — ayrı iş olarak ele alınmalı.

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?                                                                           

 Here is Claude's plan:                                                                                                                      
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Auth Sistemi Tamamlama Planı                                                                                                                
                                                        
 Context

 Storefront auth sistemi şu anda büyük ölçüde mock/placeholder durumda. utils/auth.ts tamamen localStorage tabanlı sahte auth kullanıyor,
 kayıt OTP doğrulaması backend'e bağlı değil, şifre sıfırlama tamamen sahte (API çağrısı yok), login gerçek Frappe API'sine bağlanmıyor. Bu
 plan, yeni-auth-sistemi.md tasarım dokümanına uygun şekilde tüm auth akışlarını gerçek backend endpoint'lerine bağlamayı hedefliyor.

 Not: SupplierSetupForm.ts dosyası kodda mevcut DEĞİL — analiz dokümanında bahsedilse de henüz oluşturulmamış. Supplier kayıt akışı bu
 plandan bağımsız olarak ele alınmalı.

 ---
 YENİ OLUŞTURULACAK DOSYALAR

 1. src/utils/password-validation.ts

 - Amaç: Merkezi şifre doğrulama fonksiyonları — tüm ekranlarda tutarlı kurallar
 - Pattern referansı: AccountSetupForm.ts:336-353 (mevcut validatePassword ve isPasswordValid fonksiyonları buradan taşınacak)
 - Endpoint: Yok (client-side doğrulama)
 - Export edecekleri:
   - PasswordValidation interface: { minLength, hasUppercase, hasLowercase, hasNumber }
   - validatePassword(password: string): PasswordValidation
   - isPasswordValid(password: string): boolean
 - Kurallar: 8+ karakter, 1+ büyük harf (/[A-Z]/), 1+ küçük harf (/[a-z]/), 1+ rakam (/[0-9]/)

 2. src/components/auth/ResetPasswordPage.ts

 - Amaç: Email'deki şifre sıfırlama linkine tıklandığında açılan yeni şifre formu
 - Pattern referansı: ForgotPasswordPage.ts (header + centered card layout'u)
 - Endpoint: POST /api/method/tr_tradehub.api.v1.identity.reset_password (key, new_password)
 - UI: Başlık ("Yeni Şifre Belirleyin"), şifre input (toggle), canlı şifre kuralları göstergesi (password-validation.ts'den), "Şifreyi
 Sıfırla" butonu, hata/başarı mesajları
 - Export: ResetPasswordPage(key: string): string + initResetPasswordPage(): void
 - Alpine data: resetPasswordPage — key state'i, şifre doğrulama, submit, başarı/hata durumları

 3. src/pages/reset-password.ts

 - Amaç: Reset password sayfası entry point
 - Pattern referansı: src/pages/forgot-password.ts (aynı yapı)
 - Endpoint: Yok (bileşene delege)
 - İş mantığı: URL'den key parametresini URLSearchParams ile okur. Key yoksa hata gösterir, forgot-password.html'e yönlendirir. Key varsa
 ResetPasswordPage(key) render eder.

 4. pages/auth/reset-password.html

 - Amaç: HTML entry point
 - Pattern referansı: pages/auth/login.html (aynı minimal yapı)
 - Endpoint: Yok
 - Not: Vite config fast-glob ile **/*.html otomatik keşfediyor, ek config gerekmez.

 ---
 GÜNCELLENECEK MEVCUT DOSYALAR

 1. src/utils/auth.ts

 - Şu an ne yapıyor: Tamamen mock — localStorage tabanlı sahte login/logout/isLoggedIn/getUser fonksiyonları. Gerçek API çağrısı yok.
 - Ne değişecek:
   - Tüm mock fonksiyonlar gerçek Frappe API çağrılarıyla değiştirilecek
   - api() wrapper kullanılacak (utils/api.ts'den import)
   - Mevcut export isimleri (login, logout, isLoggedIn, getUser) KORUNACAK (dışarıdan import eden dosyalar bozulmayacak)
   - AuthUser interface genişletilecek: email, full_name, roles, is_admin, is_seller, is_buyer, has_seller_profile,
 pending_seller_application, seller_profile
   - login(email, password) → POST /api/method/login + response handling (requires_2fa → console.warn, requires_consent_renewal →
 console.warn)
   - logout() → POST /api/method/logout
   - register(...) → POST /api/method/tr_tradehub.api.v1.identity.register_user + registration_token parametresi eklenir
   - getSessionUser() → GET /api/method/tr_tradehub.api.v1.auth.get_session_user
   - getRedirectUrl(user) → Rol bazlı yönlendirme (admin → Frappe desk, seller profilli → seller panel, pending seller →
 application-pending, buyer → /)
   - Yeni fonksiyonlar eklenir:
       - checkEmailExists(email) → POST /api/method/tr_tradehub.api.v1.auth.check_email_exists
     - sendRegistrationOtp(email) → POST /api/method/tr_tradehub.api.v1.identity.send_registration_otp
     - verifyRegistrationOtp(email, code) → POST /api/method/tr_tradehub.api.v1.identity.verify_registration_otp
     - forgotPassword(email) → POST /api/method/tr_tradehub.api.v1.identity.forgot_password
     - resetPassword(key, newPassword) → POST /api/method/tr_tradehub.api.v1.identity.reset_password
 - Ne kesinlikle değişmeyecek: Export isimleri korunacak, dosya yolu aynı kalacak

 2. src/alpine/auth.ts

 - Şu an ne yapıyor: registerPage Alpine data'sı: submitEmail'de sadece client-side regex → goToStep('otp'), OTP onComplete'de backend
 çağrısı yok → direkt goToStep('setup'), onResend boş placeholder. forgotPasswordPage: 3 adımlı (find-account → verify-code →
 reset-password), submitFindAccount'ta API çağrısı yok, submitReset'te API çağrısı yok.
 - Ne değişecek:
   - registerPage:
       - registration_token: string reactive state eklenir
     - loading: boolean state eklenir
     - emailExistsError: boolean state eklenir
     - submitEmail(): (1) regex doğrulama (mevcut), (2) loading=true, (3) checkEmailExists(email) çağır → exists=true ise hata + dur, (4)
 sendRegistrationOtp(email) çağır → başarıysa goToStep('otp'), (5) hata/rate-limit → toast göster, (6) loading=false
     - OTP onComplete callback: verifyRegistrationOtp(email, code) çağır → başarılıysa registration_token kaydet → goToStep('setup').
 Başarısızsa → OTP inputları temizle + hata göster
     - OTP onResend callback: sendRegistrationOtp(email) çağır
     - Buyer setup onSubmit: register() çağrısına registration_token eklenir, sonra login() ve getSessionUser() ile auto-login + yönlendirme
   - forgotPasswordPage:
       - 3 adım → 2 adım: 'find-account' | 'link-sent'
     - loading: boolean state eklenir
     - Kaldırılacak state/method'lar: otp[], countdown, otpError, showPassword, passwordValid, reqLength, reqChars, reqEmoji,
 _timerInterval, handleOtpInput, handleOtpPaste, handleOtpKeydown, resendCode, startCountdown, stopCountdown, validatePassword, reqStyle,
 submitReset
     - submitFindAccount(): (1) email trim + doğrulama, (2) loading=true, (3) forgotPassword(email) çağır, (4) her zaman step='link-sent'
 (enumeration koruması), (5) rate-limit hatası → toast
     - Yeni method: resendLink(): forgotPassword(email) tekrar çağır, toast göster
   - Yeni Alpine data: resetPasswordPage eklenir (veya reset-password.ts entry point'inde) — key, password, loading, success, error
 state'leri
 - Ne kesinlikle değişmeyecek: registerPage adım sırası (account-type → email → otp → setup), accountType state yapısı, goToStep()
 navigasyon paterni

 3. src/components/auth/ForgotPasswordPage.ts

 - Şu an ne yapıyor: 3 adımlı UI: StepFindAccount (email) → StepVerifyCode (6-digit OTP) → StepResetPassword (yeni şifre).
 ForgotPasswordStep type: 'find-account' | 'verify-code' | 'reset-password'
 - Ne değişecek:
   - ForgotPasswordStep type: 'find-account' | 'link-sent' olarak güncellenir
   - ForgotPasswordState interface'den OTP state'leri kaldırılır
   - StepVerifyCode() fonksiyonu tamamen SİLİNİR
   - StepResetPassword() fonksiyonu tamamen SİLİNİR
   - Yeni: StepLinkSent() fonksiyonu eklenir:
       - Başlık: "Email Gönderildi"
     - Açıklama: "Şifre sıfırlama linki {maskelenmiş email} adresine gönderildi."
     - "Giriş sayfasına dön" butonu → /pages/auth/login.html
     - "Email gelmediyse tekrar gönderin" linki → resendLink() çağırır
   - ForgotPasswordPage() fonksiyonu: StepVerifyCode + StepResetPassword yerine StepLinkSent render eder
 - Ne kesinlikle değişmeyecek: ForgotPasswordHeader(), ForgotPasswordCard(), StepFindAccount() UI yapısı, maskEmail() helper, genel
 layout/stil

 4. src/components/auth/EmailVerification.ts

 - Şu an ne yapıyor: 6-digit OTP UI. onComplete callback 6 hane girilince hemen tetikleniyor (backend çağrısı yok). onResend callback
 placeholder.
 - Ne değişecek:
   - EmailVerificationOptions interface'e eklenir: onVerify?: (otp: string) => Promise<void> (async callback)
   - onComplete tetiklendiğinde: loading state göster (input'ları disable et), eğer onVerify sağlandıysa onu çağır, hata alırsa OTP
 input'ları temizle + hata mesajı göster + loading kapat
   - Loading sırasında: OTP input'ları disabled, "Doğrulanıyor..." metni göster
   - Hata durumunda: showOTPError() ile hata mesajı göster
 - Ne kesinlikle değişmeyecek: HTML yapısı, OTP input sayısı (6), auto-focus davranışı, paste desteği, ok tuşu navigasyonu, countdown timer
 mekanizması, genel görünüm

 5. src/components/auth/AccountSetupForm.ts

 - Şu an ne yapıyor: Kendi içinde validatePassword() ve isPasswordValid() fonksiyonları tanımlı (satır 336-353). PasswordRequirements
 interface tanımlı.
 - Ne değişecek:
   - validatePassword(), isPasswordValid(), PasswordRequirements tanımları SİLİNİR
   - Bunlar ../utils/password-validation.ts'den import edilir (path: ../../utils/password-validation.ts)
   - Tüm iç kullanımlar aynı kalır — sadece kaynak değişir
 - Ne kesinlikle değişmeyecek: HTML template, country dropdown, form validasyon mantığı, UI/UX, tüm diğer fonksiyonlar

 6. src/components/auth/LoginPage.ts

 - Şu an ne yapıyor: Form submit'te mock login(email) çağırıp anasayfaya yönlendiriyor (satır 127-132). Gerçek API çağrısı yok.
 - Ne değişecek:
   - login import'u utils/auth.ts'den (aynı kalır — ama artık gerçek API çağırır)
   - Form submit handler: login(email, password) → başarılıysa getSessionUser() → getRedirectUrl(user) ile yönlendirme
   - Hata handling: yanlış email/şifre → form üstünde hata mesajı, rate limit → toast
   - Loading state: submit butonuna loading göstergesi
 - Ne kesinlikle değişmeyecek: HTML template yapısı, input field'lar, forgot password linki, create account linki, genel görünüm

 7. src/components/auth/index.ts

 - Şu an ne yapıyor: Barrel export — tüm auth bileşenlerini tek noktadan export ediyor.
 - Ne değişecek:
   - ResetPasswordPage export'u eklenir
   - password-validation.ts export'ları eklenir (validatePassword, isPasswordValid, PasswordValidation)
 - Ne kesinlikle değişmeyecek: Mevcut export'ların hiçbiri kaldırılmaz veya ismi değişmez

 8. src/components/settings/SettingsChangePassword.ts

 - Şu an ne yapıyor: Kendi Alpine data'sı (settingsChangePassword) ile 3 adımlı mock şifre değiştirme akışı. Doğrulama kodu ve şifre
 değiştirme backend'e bağlı değil.
 - Ne değişecek:
   - Şifre doğrulama kuralları password-validation.ts'den import edilir
   - Mevcut inline şifre kontrolleri varsa merkezi fonksiyona bağlanır
 - Ne kesinlikle değişmeyecek: UI/UX, stepper yapısı, genel görünüm

 9. src/utils/api.ts

 - Şu an ne yapıyor: Generic API wrapper — Bearer token + 401 redirect.
 - Ne değişecek:
   - credentials: 'include' eklenir (Frappe cookie-based auth için gerekli, özellikle cross-origin production ortamında)
   - Bearer token mekanizması kaldırılır (Frappe cookie kullanır)
 - Ne kesinlikle değişmeyecek: Genel yapı, api<T>() fonksiyon imzası, 401 redirect davranışı, error handling

 ---
 DEĞİŞMEYECEK DOSYALAR

 ┌────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
 │                   Dosya                    │                                   Neden Dokunulmayacak                                   │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/auth/AccountTypeSelector.ts │ Buyer/Supplier seçim kartları değişmiyor. Mevcut değerler backend ile uyumlu.            │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/auth/AuthLayout.ts          │ Ortak layout (split-screen desktop, mobile card) değişmiyor. Yeni ResetPasswordPage de   │
 │                                            │ bu layout'u kullanacak.                                                                  │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/auth/RegisterPage.ts        │ Multi-step HTML iskelet yapısı değişmiyor. Adımlar aynı (account-type → email → otp →    │
 │                                            │ setup). İş mantığı alpine/auth.ts'de.                                                    │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/auth/SocialLoginButtons.ts  │ SSO/sosyal giriş bu fazın kapsamı dışında.                                               │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/utils/auth-guard.ts                    │ Mevcut guard'lar (requireAuth, requireSeller, blockAdmin) yeterli.                       │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/pages/login.ts                         │ Entry point değişmiyor. LoginPage bileşeni içten güncellenecek.                          │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/pages/register.ts                      │ Entry point değişmiyor. Alpine data'sı içten güncellenecek.                              │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/pages/forgot-password.ts               │ Entry point değişmiyor. ForgotPasswordPage bileşeni içten değişecek.                     │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ pages/auth/login.html                      │ HTML entry point aynı kalıyor.                                                           │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ pages/auth/register.html                   │ HTML entry point aynı kalıyor.                                                           │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ pages/auth/forgot-password.html            │ HTML entry point aynı kalıyor.                                                           │
 ├────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ vite.config.ts                             │ Otomatik HTML keşfi mevcut — ek config gerekmez.                                         │
 └────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

 ---
 KAPSAM DIŞI (Bu fazda yapılmayacak)

 ┌────────────────────────────────────┬──────────────────────────────────────────────────────────────────┐
 │                Konu                │                              Neden                               │
 ├────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 │ SSO/Keycloak entegrasyonu          │ Tasarım dokümanında bu faz kapsamına alınmamış                   │
 ├────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 │ 2FA kurulumu/doğrulama ekranı      │ Login'de requires_2fa console.warn olarak loglanacak, UI ileride │
 ├────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 │ Email doğrulama hatırlatma sayfası │ Arka plan akışı olarak korunacak                                 │
 ├────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 │ Telefon doğrulama                  │ Backend mevcut ama UI kapsam dışı                                │
 ├────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 │ Organizasyon kaydı                 │ Backend mevcut ama UI kapsam dışı                                │
 ├────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 │ Consent yönetim UI'ı               │ Login'de requires_consent_renewal loglanacak, UI ileride         │
 ├────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
 │ SupplierSetupForm.ts oluşturulması │ Dosya henüz mevcut değil, ayrı iş olarak ele alınmalı            │
 └────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘

 ---
 ÖNEMLİ NOT: SupplierSetupForm.ts

 Analiz dokümanında (auth-sistemi-var-olanlar.md) bahsedilen SupplierSetupForm.ts dosyası kodda MEVCUT DEĞİL. Şu anda alpine/auth.ts'deki
 registerPage sadece buyer akışını destekliyor (goToStep('setup') → AccountSetupForm render ediyor). Supplier kayıt formu henüz
 oluşturulmamış. Bu, auth tamamlama görevinden bağımsız bir iş olarak ele alınmalı.

 ---
 UYGULAMA SIRASI

 ┌──────┬─────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────┬────────────┐
 │ Sıra │                            Görev                            │                    Dosya(lar)                     │ Bağımlılık │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 1    │ password-validation.ts oluştur                              │ src/utils/password-validation.ts (yeni)           │ Yok        │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 2    │ utils/auth.ts yeniden yaz (mock → gerçek API)               │ src/utils/auth.ts                                 │ Yok        │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 3    │ utils/api.ts cookie auth güncellemesi                       │ src/utils/api.ts                                  │ Yok        │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 4    │ AccountSetupForm.ts — şifre validasyonu import et           │ src/components/auth/AccountSetupForm.ts           │ 1          │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 5    │ ForgotPasswordPage.ts — 3 adım → 2 adım                     │ src/components/auth/ForgotPasswordPage.ts         │ Yok        │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 6    │ ResetPasswordPage.ts oluştur                                │ src/components/auth/ResetPasswordPage.ts (yeni)   │ 1, 2       │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 7    │ reset-password.ts entry point oluştur                       │ src/pages/reset-password.ts (yeni)                │ 6          │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 8    │ reset-password.html oluştur                                 │ pages/auth/reset-password.html (yeni)             │ 7          │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 9    │ EmailVerification.ts — onVerify callback                    │ src/components/auth/EmailVerification.ts          │ Yok        │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 10   │ alpine/auth.ts — registerPage + forgotPasswordPage güncelle │ src/alpine/auth.ts                                │ 2, 5, 9    │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 11   │ LoginPage.ts — gerçek login API                             │ src/components/auth/LoginPage.ts                  │ 2          │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 12   │ index.ts — yeni export'lar                                  │ src/components/auth/index.ts                      │ 6          │
 ├──────┼─────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┼────────────┤
 │ 13   │ SettingsChangePassword.ts — şifre validasyonu import        │ src/components/settings/SettingsChangePassword.ts │ 1          │
 └──────┴─────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────┴────────────┘

 ---
 DOĞRULAMA

 1. Build testi: npm run build — TypeScript derleme hataları ve Vite build başarılı olmalı
 2. Dev server: npm run dev — tüm auth sayfaları açılmalı
 3. Kayıt akışı: Account type seç → email gir → check_email_exists çağrılmalı → OTP gönderilmeli → OTP doğrulanmalı → registration_token
 alınmalı → form doldur → register_user çağrılmalı → auto-login → yönlendirme
 4. Login akışı: Email + şifre → POST /api/method/login → get_session_user → rol bazlı yönlendirme
 5. Şifre sıfırlama: Email gir → forgot_password çağrılmalı → "link gönderildi" ekranı → reset-password.html?key=... → yeni şifre →
 reset_password çağrılmalı → başarı → login'e yönlendirme
 6. Şifre kuralları tutarlılığı: Kayıt, reset password ve settings sayfalarında aynı kurallar (8+, upper, lower, digit)