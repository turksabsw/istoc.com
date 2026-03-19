# PROMPT — Aşama 5.1: Planla

Sen bir Frappe Framework v15 backend geliştiricisisin.
tradehub_core adında yeni bir Frappe app yazacaksın.

## MUTLAKA ÖNCE OKU — REFERANS BELGELER

Aşağıdaki dosyaları sırayla oku ve içselleştir.
Bu belgeler senin tek referansın — kod yazmadan önce hepsini anla.

1. /home/ali/Masaüstü/istoc.com/tradehubback/frappe-backend.md
   → Frappe v15 geliştirme rehberi.
   → Gerçek kurulumdan tarandı: hooks.py, @whitelist, cache,
     sendmail, rate_limit, db, password, DocType JSON, Docker komutları.

2. /home/ali/Masaüstü/istoc.com/frontend-eklenenler.md
   → Bölüm 5 "Backend Beklentileri" — storefront'un çağırdığı
     endpoint URL'leri, payload ve beklenen response formatları.

3. /home/ali/Masaüstü/istoc.com/yeni-auth-sistemi.md
   → Bölüm 4 "Yeni / Güncellenen Backend Endpoint'leri" —
     her endpoint'in iş mantığı ve güvenlik gereksinimleri.
   → Bölüm 8 "Güvenlik Notları" — OTP, token, rate limit değerleri.

## KESİN KURALLAR

1. frappe-backend.md'deki pattern'leri uygula, asla uydurma.
2. Frappe'nin built-in User, Role, Permission sistemini temel al.
3. frappe.utils.password modülünü kullan, kendi şifreleme yazma.
4. frappe.sendmail() kullan, kendi email sistemi yazma.
5. Tüm public endpoint'ler @frappe.whitelist(allow_guest=True) ile.
6. @frappe.whitelist her zaman üstte, @rate_limit her zaman altta.
7. BU AŞAMADA KOD YAZMA. Önce plan çıkar, onayımı al.

## TEMEL BİLGİLER

- App adı: tradehub_core
- Site adı: tradehub.localhost
- Frappe versiyonu: v15 (frappe-backend.md'den doğrula)
- Docker komut formatı: docker compose exec backend bench ...

## GÖREV

Üç referans belgeyi okuduktan sonra şunları belirle:

### 1. App Yapısı
tradehub_core için en uygun klasör yapısı nedir?
Hangi dosyalar zorunlu, hangileri opsiyonel?

### 2. Endpoint Planı
frontend-eklenenler.md Bölüm 5'teki tüm endpoint'ler için:
- Her endpoint'in imzası (parametreler, dönüş tipi)
- Hangi Frappe API'leri kullanılacak (cache, db, sendmail vb.)
- Rate limit değerleri (yeni-auth-sistemi.md Bölüm 8'den)
- Başarı ve hata response formatları

### 3. DocType Planı
Hangi DocType'lar gerekiyor?
Her DocType için field listesi ve permission yapısı.

### 4. Email Template'leri
Hangi şablonlar gerekiyor?
Her şablonda hangi değişkenler kullanılacak?

### 5. Kurulum Sırası
bench new-app → install-app → migrate adımları

---
Plan çıkardıktan sonra göster ve ONAYIMI BEKLE.
Onayım olmadan tek satır kod bile yazma.