Sen bir Frappe framework uzmanısın. Kod yazmadan önce mevcut Frappe
kurulumunu inceleyerek geliştirme pattern'lerini tam olarak öğreneceksin.

## KESİN KURALLAR
- Bu aşamada HİÇBİR dosya oluşturma veya değiştirme.
- Sadece oku, analiz et ve raporla.
- Emin olmadığın şeyleri tahmin etme — dosyayı aç, oku, sonra yaz.
- Araştırma tamamlanınca öğrendiklerini frappe-backend.md dosyasına yaz.
  Bu tek istisna — sadece bu .md dosyasını oluşturabilirsin.

## ORTAM BİLGİSİ
- Frappe bench Docker container içinde çalışıyor
- Bench dizini: frappe-bench/
- Kurulu app'ler: frappe, erpnext (ve muhtemelen diğerleri)
- Yeni yazacağımız app adı: tradehub_core

## ARAŞTIRMA GÖREVLERİ

### Görev 1 — Mevcut App Yapısını Keşfet
frappe-bench/apps/ dizinini listele. Hangi app'ler kurulu?
frappe-bench/apps/frappe/ ve frappe-bench/apps/erpnext/ klasör yapısını
ağaç görünümünde göster (2 seviye derinlik yeterli).

### Görev 2 — hooks.py Pattern'ini Öğren
frappe-bench/apps/frappe/frappe/hooks.py dosyasını oku.
frappe-bench/apps/erpnext/erpnext/hooks.py dosyasını oku.
Şunları not et:
- En sık kullanılan hook tipleri neler?
- app_name, app_title, app_publisher, app_description alanları
- doc_events nasıl tanımlanıyor?
- scheduler_events nasıl tanımlanıyor?
- fixtures nasıl tanımlanıyor?

### Görev 3 — @frappe.whitelist() Endpoint Pattern'ini Öğren
frappe-bench/apps/frappe/frappe/auth.py dosyasını oku.
frappe-bench/apps/erpnext/erpnext/ altında api/ veya www/ klasörlerinde
@frappe.whitelist() kullanan 3-5 örnek fonksiyon bul ve oku.
Şunları not et:
- Fonksiyon imzası nasıl? (parametreler nasıl alınıyor)
- Response nasıl döndürülüyor? (return dict mi, frappe.response mi?)
- allow_guest=True ne zaman kullanılıyor?
- Hata nasıl fırlatılıyor? (frappe.throw vs raise)
- HTTP status kodu nasıl set ediliyor?

### Görev 4 — frappe.cache() Kullanımını Öğren
frappe-bench/apps/frappe/ altında cache kullanan dosyaları ara:
grep -r "frappe.cache()" frappe-bench/apps/frappe/frappe/ --include="*.py" -l
Bulunan dosyalardan 2-3 tanesini aç ve oku.
Şunları not et:
- set_value() nasıl çağrılıyor? TTL (expires_in_sec) parametresi var mı?
- get_value() nasıl çağrılıyor?
- delete_value() nasıl çağrılıyor?
- Cache key format'ı nasıl? (prefix kullanılıyor mu?)

### Görev 5 — frappe.sendmail() Kullanımını Öğren
frappe-bench/apps/frappe/ altında sendmail kullanan dosyaları ara:
grep -r "frappe.sendmail" frappe-bench/apps/frappe/frappe/ --include="*.py" -l
Bulunan dosyalardan 2-3 tanesini aç.
Şunları not et:
- Zorunlu parametreler neler? (recipients, subject, message)
- Email template nasıl kullanılıyor?
- now=True ne anlama geliyor?

### Görev 6 — Rate Limiting Mekanizmasını Öğren
frappe-bench/apps/frappe/ altında rate limit ara:
grep -r "rate_limit\|rate_limiter\|RateLimiter" frappe-bench/apps/frappe/frappe/ --include="*.py" -l
Bulunan dosyaları oku ve pattern'i anla.
Frappe'de built-in rate limiting mekanizması var mı?
Yoksa frappe.cache() ile nasıl manual yapılabilir?

### Görev 7 — frappe.db Kullanımını Öğren
frappe-bench/apps/frappe/ altında şu fonksiyonların kullanımına bak:
- frappe.db.exists()
- frappe.db.get_value()
- frappe.new_doc()
- frappe.get_doc()
- doc.insert()
- doc.save()
ERPNext'te bir kayıt oluşturan endpoint bul ve oku.

### Görev 8 — Şifre ve Hash Yardımcıları
frappe-bench/apps/frappe/frappe/utils/password.py dosyasını oku.
Şunları not et:
- check_password() nasıl kullanılıyor?
- update_password() nasıl kullanılıyor?
frappe.generate_hash() fonksiyonunu bul, nasıl kullanılıyor?
frappe.utils.password modülündeki diğer kullanışlı fonksiyonlar neler?

### Görev 9 — DocType JSON Yapısını Öğren
ERPNext'ten basit bir DocType'ın JSON dosyasını bul ve oku:
frappe-bench/apps/erpnext/erpnext/ altında bir .json dosyası
(örn: Customer, Address veya Contact DocType)
Şunları not et:
- Zorunlu alanlar neler? (name, module, fields vb.)
- Field tipi nasıl tanımlanıyor? (fieldtype: "Data", "Link", "Check" vb.)
- required, unique, in_list_view gibi özellikler nasıl yazılıyor?
- Link field'da options nasıl belirtiliyor?
- controller .py dosyası nasıl yazılıyor? (validate, before_insert, after_insert)

### Görev 10 — Yeni App Oluşturma
frappe-bench/apps/frappe/frappe/commands/ dizinini tara.
"bench new-app" komutunun ne yaptığını anla.
Yeni app oluşturulunca hangi dosyalar otomatik oluşturuluyor?
apps.txt veya installed_apps'e nasıl ekleniyor?
Docker ortamında bench komutları nasıl çalıştırılıyor?
(docker compose exec backend bench new-app ... gibi mi?)

## ÇIKTI

Araştırma tamamlandığında öğrendiklerini
/home/ali/Masaüstü/istoc.com/tradehubback/frappe-backend.md
dosyasına yaz.

Dosya yapısı:

---
# Frappe Framework — Geliştirme Rehberi
_Tarih: [tarih]_
_Kaynak: Mevcut frappe-bench kurulumu incelenerek oluşturulmuştur._

## 1. Kurulu App'ler
[Liste]

## 2. Yeni App Oluşturma
[bench new-app komutu, Docker ortamında nasıl çalıştırılır,
oluşan dosya yapısı]

## 3. App Klasör Yapısı
[Minimal app yapısı — hangi dosya zorunlu, hangi opsiyonel]

## 4. hooks.py Referansı
[Bizim için gerekli hook'lar + gerçek kod örnekleri]

## 5. @frappe.whitelist() Endpoint Yazımı
[Standart pattern + allow_guest + hata fırlatma + response formatı
— gerçek kod örnekleri]

## 6. frappe.cache() Kullanımı
[set_value/get_value/delete_value + TTL + key format
— gerçek kod örnekleri]

## 7. frappe.sendmail() Kullanımı
[Parametreler + template kullanımı — gerçek kod örneği]

## 8. Rate Limiting
[Frappe'nin built-in mekanizması veya cache tabanlı manual yöntem
— kod örneği]

## 9. frappe.db CRUD Operasyonları
[exists/get_value/new_doc/get_doc/insert/save
— gerçek kod örnekleri]

## 10. Şifre ve Hash Yardımcıları
[check_password/update_password/generate_hash
— kullanım örnekleri]

## 11. DocType JSON Yapısı
[Minimal DocType JSON örneği + controller .py örneği]

## 12. tradehub_core İçin Uygulama Planı
[Bu bilgilere dayanarak tradehub_core app'ini nasıl oluşturacağız
— adım adım plan]
---

Dosyayı oluşturduktan sonra:
- Kaç görev tamamlandı?
- Herhangi bir dosyaya erişilemeyen/bulunamayan alan var mı?
Bu iki soruyu yanıtla ve dur. Onayımı bekle.