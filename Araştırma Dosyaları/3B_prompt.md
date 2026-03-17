Planı onayladım. Şimdi uygula.

## UYGULAMA KURALLARI
- Dosyaları tek tek yaz/güncelle. Her dosyayı tamamladıktan sonra dur ve
  "X dosyası tamamlandı, devam edeyim mi?" diye sor. Onayım olmadan bir sonrakine geçme.
- Bir dosyada hata çıkarsa sadece o dosyayı düzelt, diğerlerine dokunma.
- TypeScript kullan. `any` tip kullanımından kaçın, interface tanımla.
- Mevcut Alpine.js pattern'i koru: `document.addEventListener('alpine:init', () => { Alpine.data(...) })`.
- Mevcut `utils/api.ts`'deki wrapper fonksiyonunu kullan — doğrudan `fetch()` çağırma.
- Her API çağrısı için: loading state aç → try/catch → loading state kapat.
- Hata mesajlarını mevcut toast/notification sistemi ile göster (nasıl kullanıldığına bak, aynısını uygula).
- Yeni HTML sayfaları için: `pages/auth/login.html` dosyasını yapı referansı olarak kullan.
- Yeni TypeScript entry point'leri için: `src/pages/login.ts` dosyasını pattern referansı olarak kullan.

## ÖZEL KURALLAR

### utils/auth.ts için:
- Bu dosyayı sıfırdan yeniden YAZMA.
- Önce mevcut dosyanın içeriğini bana göster.
- Sonra hangi satırları/bloğu değiştireceğini söyle, onayımı al, sonra güncelle.
- Şu export isimleri HİÇBİR KOŞULDA değişmeyecek:
  login, logout, register, isLoggedIn, getUser, getSessionUser, getRedirectUrl
- Bunlara ek olarak yeni fonksiyonlar eklenir:
  checkEmailExists, sendRegistrationOtp, verifyRegistrationOtp, forgotPassword, resetPassword

### SettingsChangePassword.ts için:
- SADECE şifre validasyon fonksiyonlarını password-validation.ts'den import et.
- change_password() API entegrasyonu bu fazın KAPSAMI DIŞINDA — o kısma kesinlikle dokunma.

## UYGULAMA SIRASI
Plândaki sırayı takip et:

Adım 1 → src/utils/password-validation.ts (YENİ)
Adım 2 → src/utils/auth.ts (GÜNCELLE — önce göster, sonra değiştir)
Adım 3 → src/utils/api.ts (credentials: include ekle)
Adım 4 → src/components/auth/AccountSetupForm.ts (import güncelle)
Adım 5 → src/components/auth/ForgotPasswordPage.ts (3 adım → 2 adım)
Adım 6 → src/components/auth/ResetPasswordPage.ts (YENİ)
Adım 7 → src/pages/reset-password.ts (YENİ)
Adım 8 → pages/auth/reset-password.html (YENİ)
Adım 9 → src/components/auth/EmailVerification.ts (onVerify callback)
Adım 10 → src/alpine/auth.ts (registerPage + forgotPasswordPage)
Adım 11 → src/components/auth/LoginPage.ts (gerçek login API)
Adım 12 → src/components/auth/index.ts (yeni export'lar)
Adım 13 → src/components/settings/SettingsChangePassword.ts (sadece validasyon import)

Her adımdan önce: "Adım X'e başlıyorum: [dosya adı]" de.
Her adımdan sonra: "Adım X tamamlandı. Devam edeyim mi?" diye sor.