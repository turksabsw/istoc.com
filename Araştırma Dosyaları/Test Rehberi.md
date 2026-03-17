# Test Rehberi — Tam Adım Listesi

---

## AŞAMA 0 — Sistem Ayakta mı?

```bash
cd /home/ali/Masaüstü/istoc.com
docker compose ps
```

**Beklenen:** backend, frontend, db, redis-cache, redis-queue, websocket, worker, scheduler → hepsi Up

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

## AŞAMA 1 — Backend Kurulumu

```bash
# 1. tradehub_core app'ini yükle
docker compose exec backend bench --site tradehub.localhost install-app tradehub_core
```

**Çıktı:**
```
[BURAYA YAPISTIR]
```

```bash
# 2. DocType tablolarını oluştur + rolleri kur
docker compose exec backend bench --site tradehub.localhost migrate
```

**Çıktı:**
```
[BURAYA YAPISTIR]
```

```bash
# 3. Asset build
docker compose exec backend bench build
```

**Çıktı:**
```
[BURAYA YAPISTIR]
```

```bash
# 4. Servisleri yeniden başlat
docker compose restart backend worker scheduler
```

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

## AŞAMA 2 — Backend Temel Kontroller

```bash
docker compose exec backend bench --site tradehub.localhost console
```

Console açılınca şunları gir:

```python
# Roller var mı?
frappe.get_all("Role", filters={"name": ["in", ["Buyer", "Seller", "Marketplace Admin"]]}, fields=["name", "desk_access"])
```

**Beklenen:** 3 rol, Buyer ve Seller desk_access=0, Marketplace Admin=1

**Çıktı:**
```
[BURAYA YAPISTIR]
```

```python
# DocType'lar oluştu mu?
frappe.get_all("DocType", filters={"module": "Tradehub Core"}, fields=["name"])
```

**Beklenen:** Buyer Profile, Seller Application, Seller Profile

**Çıktı:**
```
[BURAYA YAPISTIR]
```

```python
exit()
```

---

## AŞAMA 3 — CORS Ayarı

```bash
docker compose exec backend bench --site tradehub.localhost set-config allow_cors "http://localhost:5500"
docker compose restart backend
```

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

## AŞAMA 4 — Email (SMTP) Ayarı

Frappe Desk'e gir:
```
http://localhost:8001/app
Kullanıcı: Administrator
Şifre: [docker-compose.yml'deki DB_ROOT_PASSWORD]
```

```
Settings → Email Account → New
    Outgoing Mail Server: smtp.gmail.com
    Port: 587
    Enable TLS: ✓
    Email: senin@email.com
    Şifre: uygulama şifresi
    Default Outgoing: ✓
    Save → Test
```

**Email testi sonucu:**
```
[BURAYA YAPISTIR]
```

> ⚠️ SMTP kurmak istemiyorsan bu aşamayı geç.
> OTP değerini Aşama 6 Test 3'te Redis'ten okuyacağız.

---

## AŞAMA 5 — getRedirectUrl() Düzeltmesi

`tradehubfront/src/utils/auth.ts` dosyasını aç ve şu satırı bul:

```typescript
// YANLIŞ:
return `${FRAPPE_BASE}/app/tradehub`;

// DOĞRU:
return `${FRAPPE_BASE}/app`;
```

Düzelttikten sonra frontend'i yeniden build al:

```bash
docker compose build frontend && docker compose up frontend
```

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

## AŞAMA 6 — API Endpoint Testleri

### Test 1 — check_email_exists

```bash
curl -X POST http://localhost:8001/api/method/tradehub_core.api.v1.auth.check_email_exists \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com"}'
```

**Beklenen:** `{"message": {"success": true, "exists": false}}`

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

### Test 2 — send_registration_otp

```bash
curl -X POST http://localhost:8001/api/method/tradehub_core.api.v1.identity.send_registration_otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com"}'
```

**Beklenen:** `{"message": {"success": true, "expires_in_minutes": 10}}`

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

### Test 3 — OTP'yi Redis'ten Oku (Email gelmiyorsa)

```bash
docker compose exec redis-cache redis-cli
```

Redis CLI'da:
```
KEYS *registration_otp*
GET <bulunan_key>
exit
```

**Beklenen:** `{"code": "123456", "attempts": 0}`

**OTP Kodu:**
```
[BURAYA YAPISTIR]
```

---

### Test 4 — verify_registration_otp

```bash
curl -X POST http://localhost:8001/api/method/tradehub_core.api.v1.identity.verify_registration_otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "code": "BURAYA_OTP_KOD"}'
```

**Beklenen:** `{"message": {"success": true, "registration_token": "..."}}`

**registration_token:**
```
[BURAYA YAPISTIR]
```

---

### Test 5 — register_user (Buyer)

```bash
curl -X POST http://localhost:8001/api/method/tradehub_core.api.v1.identity.register_user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test1234",
    "first_name": "Test",
    "last_name": "Kullanici",
    "account_type": "buyer",
    "phone": "",
    "country": "Turkey",
    "accept_terms": true,
    "accept_kvkk": true,
    "registration_token": "BURAYA_TEST4_TOKEN"
  }'
```

**Beklenen:** `{"message": {"success": true, "user": "test@test.com", "account_type": "buyer"}}`

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

### Test 6 — get_session_user (Giriş Öncesi)

```bash
curl http://localhost:8001/api/method/tradehub_core.api.v1.auth.get_session_user
```

**Beklenen:** `{"message": {"logged_in": false}}`

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

### Test 7 — Login

```bash
curl -c cookies.txt -X POST http://localhost:8001/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr": "test@test.com", "pwd": "Test1234"}'
```

**Beklenen:** HTTP 200, session cookie set edildi

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

### Test 8 — get_session_user (Giriş Sonrası)

```bash
curl -b cookies.txt http://localhost:8001/api/method/tradehub_core.api.v1.auth.get_session_user
```

**Beklenen:**
```json
{"message": {"logged_in": true, "user": {"is_buyer": true, "is_seller": false, ...}}}
```

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

### Test 9 — forgot_password

```bash
curl -X POST http://localhost:8001/api/method/tradehub_core.api.v1.identity.forgot_password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com"}'
```

**Beklenen:** `{"message": {"success": true, "message": "..."}}` (her zaman success döner)

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

### Test 10 — Reset Key'i Veritabanından Oku

```bash
docker compose exec backend bench --site tradehub.localhost console
```

```python
frappe.db.get_value("User", "test@test.com", ["reset_password_key", "last_reset_password_key_generated_on"])
exit()
```

**reset_password_key:**
```
[BURAYA YAPISTIR]
```

---

### Test 11 — reset_password

```bash
curl -X POST http://localhost:8001/api/method/tradehub_core.api.v1.identity.reset_password \
  -H "Content-Type: application/json" \
  -d '{"key": "BURAYA_TEST10_KEY", "new_password": "NewTest1234"}'
```

**Beklenen:** `{"message": {"success": true}}`

**Çıktı:**
```
[BURAYA YAPISTIR]
```

---

## AŞAMA 7 — Frontend Uçtan Uca Test

Tarayıcıda F12 → Network sekmesi → XHR/Fetch filtrele

### Test A — Kayıt Akışı (Buyer)

```
http://localhost:5500/pages/auth/register.html
→ Alıcı seç → Email gir → OTP gel → OTP gir → Form doldur → Kayıt ol
```

**Her API çağrısı 200 mi dönüyor?**
```
[BURAYA YAPISTIR]
```

---

### Test B — Login Akışı

```
http://localhost:5500/pages/auth/login.html
→ Email + şifre gir → Giriş yap
→ Doğru sayfaya yönlendiriliyor mu?
```

**Yönlendirilen sayfa:**
```
[BURAYA YAPISTIR]
```

---

### Test C — Şifre Sıfırlama Akışı

```
http://localhost:5500/pages/auth/forgot-password.html
→ Email gir → "Email gönderildi" ekranı çıkıyor mu?
```

```
http://localhost:5500/pages/auth/reset-password.html?key=<TEST10_KEY>
→ Yeni şifre gir → Başarı mesajı çıkıyor mu?
```

**Sonuç:**
```
[BURAYA YAPISTIR]
```

---

## AŞAMA 8 — Eksik Endpoint: complete_registration_application()

Bu endpoint Faz 5'te yazılmadı. Seller kayıt akışı için gerekli.

```
Durumu: [ ] Yazılmadı  [ ] Yazıldı  [ ] Test edildi
```

---

## AŞAMA 9 — Eksik: SupplierSetupForm.ts

Faz 3'te kapsam dışı bırakıldı. Ayrı geliştirme seansı gerekiyor.

```
Durumu: [ ] Başlanmadı  [ ] Devam ediyor  [ ] Tamamlandı
```

---

## Özet Tablosu

| # | Test | Beklenen | Sonuç |
|---|---|---|---|
| 0 | Servisler ayakta | Hepsi Up | [ ] |
| 1 | Backend kurulum | Hatasız | [ ] |
| 2 | Roller ve DocType'lar | 3 rol, 3 DocType | [ ] |
| 3 | CORS ayarı | 200 OK | [ ] |
| 4 | Email SMTP | Mail gönderiliyor | [ ] |
| 5 | getRedirectUrl düzeltmesi | /app | [ ] |
| 6-T1 | check_email_exists | exists: false | [ ] |
| 6-T2 | send_registration_otp | expires_in_minutes: 10 | [ ] |
| 6-T3 | OTP Redis'ten oku | code: 6 hane | [ ] |
| 6-T4 | verify_registration_otp | registration_token | [ ] |
| 6-T5 | register_user | success: true | [ ] |
| 6-T6 | get_session_user (öncesi) | logged_in: false | [ ] |
| 6-T7 | login | 200 OK | [ ] |
| 6-T8 | get_session_user (sonrası) | is_buyer: true | [ ] |
| 6-T9 | forgot_password | success: true | [ ] |
| 6-T10 | reset_password_key oku | key mevcut | [ ] |
| 6-T11 | reset_password | success: true | [ ] |
| 7-A | Frontend kayıt | 200 OK | [ ] |
| 7-B | Frontend login | Yönlendirme doğru | [ ] |
| 7-C | Frontend şifre sıfırlama | Başarı mesajı | [ ] |
| 8 | complete_registration_application | — | [ ] |
| 9 | SupplierSetupForm.ts | — | [ ] |