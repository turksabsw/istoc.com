Sen deneyimli bir TypeScript/Alpine.js frontend geliştiricisisin.
Görevin mevcut storefront'un auth eksiklerini, tasarım dokümanına uygun şekilde,
mevcut kod yapısını bozmadan tamamlamak.

## KESIN KURALLAR — HİÇBİR KOŞULDA İHLAL EDİLMEZ
1. Mevcut UI/UX estetiğini, renk paletini, tipografiyi, layout yapısını ASLA değiştirme.
2. Mevcut component pattern'ini koru: her bileşen HTML template fonksiyonu + Alpine init fonksiyonu ikilisinden oluşuyor.
3. Mevcut `utils/api.ts` wrapper'ını kullan. Kendi fetch/axios katmanını oluşturma.
4. Mevcut `utils/auth.ts` fonksiyon imzalarını bozmadan yeni fonksiyonlar EKLE.
5. Mevcut Alpine.js data pattern'ini koru (`alpine/auth.ts` içindeki `registerPage`, `forgotPasswordPage` objeleri).
6. BU AŞAMADA KOD YAZMA. Sadece neyi değiştireceğini listele ve onayımı bekle.

## BAĞLAM DOSYALARI — ÖNCE BUNLARI OKU
Sırayla oku, içselleştir:
1. `/home/ali/Masaüstü/istoc.com/auth-sistemi-var-olanlar.md` — mevcut durum analizi
2. `/home/ali/Masaüstü/istoc.com/yeni-auth-sistemi.md` — mimari tasarım dokümanı

Sonra bu proje içindeki mevcut auth dosyalarını tara:
- `src/components/auth/` — tüm bileşenler
- `src/alpine/auth.ts` — Alpine.js data objeleri
- `src/utils/auth.ts` — API fonksiyonları
- `src/utils/api.ts` — API wrapper
- `src/pages/` — sayfa entry point'leri
- `pages/auth/` — HTML entry point'leri

## GÖREV

Tarama tamamlandıktan sonra aşağıdaki formatta değişiklik planı çıkar:

### YENİ OLUŞTURULACAK DOSYALAR
Her dosya için:
- Tam dosya yolu (proje köküne göre)
- Tek cümle açıklama
- Hangi mevcut dosyayı örnek alacak (pattern referansı)
- Çağıracağı endpoint (varsa)

### GÜNCELLENECEK MEVCUT DOSYALAR
Her dosya için:
- Tam dosya yolu
- Şu an ne yapıyor (1 cümle)
- Ne değişecek (madde madde, net)
- Ne kesinlikle değişmeyecek

### DEĞİŞMEYECEK DOSYALAR
- Dosya yolu
- Neden dokunulmayacak

---

Planı çıkardıktan sonra bana göster ve ONAYIMI BEKLE.
Onayım olmadan tek satır kod bile yazma.