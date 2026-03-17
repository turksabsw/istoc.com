Projenin güncel durumunu kapsamlı şekilde analiz et ve
mevcut-durum.md adında bir rapor oluştur.

## ÖNCE ŞU DOSYALARI OKU (referans belgeler):
- /home/ali/Masaüstü/istoc.com/yeni-auth-sistemi.md
- /home/ali/Masaüstü/istoc.com/frontend-eklenenler.md
- /home/ali/Masaüstü/istoc.com/frappe-backend.md
- /home/ali/Masaüstü/istoc.com/auth-sistemi-var-olanlar.md

## SONRA PROJE YAPISINI TARA:

Frontend:
- tradehubfront/src/utils/auth.ts
- tradehubfront/src/utils/api.ts
- tradehubfront/src/alpine/auth.ts
- tradehubfront/src/components/auth/ (tüm dosyalar)
- tradehubfront/src/pages/auth/ (tüm HTML dosyalar)
- tradehubfront/src/components/header/TopBar.ts
- tradehubfront/nginx.conf
- tradehubfront/.env.development
- tradehubfront/vite.config.ts (varsa)

Backend:
- tradehubback/apps/tradehub_core/tradehub_core/api/v1/identity.py
- tradehubback/apps/tradehub_core/tradehub_core/api/v1/auth.py
- tradehubback/apps/tradehub_core/tradehub_core/hooks.py
- tradehubback/apps/tradehub_core/tradehub_core/tradehub_core/doctype/ (tüm DocType JSON'lar)
- tradehubback/apps/tradehub_core/tradehub_core/workspace/
- tradehubback/Dockerfile
- docker-compose.yml

## RAPOR İÇERİĞİ:

mevcut-durum.md dosyasını şu başlıklar altında oluştur:

### 1. PROJE GENEL BAKIŞ
- Hedef nedir? (kısaca)
- Teknoloji yığını
- Mevcut mimari

### 2. ÇALIŞAN ÖZELLİKLER ✅
Her çalışan özellik için:
- Ne çalışıyor?
- Nasıl test edilebilir?

### 3. KISMI ÇALIŞAN / SORUNLU ÖZELLİKLER ⚠️
Her sorunlu alan için:
- Ne yapılmaya çalışıldı?
- Mevcut durum nedir?
- Sorunun sebebi ne?

### 4. EKSİK ÖZELLİKLER ❌
Her eksik özellik için:
- Ne olması gerekiyor?
- Hangi dosyalara dokunulacak?
- Tahmini iş yükü (küçük/orta/büyük)

### 5. BACKEND API DURUMU
Her endpoint için tablo:
| Endpoint | Durum | Test Edildi mi? | Notlar |

### 6. FRONTEND SAYFA DURUMU
Her sayfa/component için tablo:
| Sayfa/Component | Durum | Sorun | 

### 7. DOCKER / DEPLOYMENT DURUMU
- Hangi servisler çalışıyor?
- Volume mount'lar doğru mu?
- Prod için eksik neler var?

### 8. MVP İÇİN YAPILMASI GEREKENLER (Öncelik sırasıyla)
Şu kriterlere göre sırala:
1. Auth sistemi tamamen çalışmalı (kayıt, login, logout, şifre sıfırlama)
2. Alıcı ve tedarikçi kayıt akışları eksiksiz olmalı
3. Admin paneli (Frappe Desk değil, özel panel) için altyapı
4. Prod ortama hazır olma (SMTP, Nginx, SSL, CORS)

Her madde için: ne yapılacak + hangi dosyalar + tahmini süre

### 9. TEKNİK BORÇ VE RİSKLER
- Test edilmemiş senaryolar
- Güvenlik açıkları
- Performans sorunları

Raporu oluşturduktan sonra dosyayı
/home/ali/Masaüstü/istoc.com/mevcut-durum.md
olarak kaydet ve dur. Başka hiçbir dosyaya dokunma.