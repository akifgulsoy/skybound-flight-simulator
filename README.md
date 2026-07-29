# Skybound Flight Simulator

Tarayıcıda çalışan, görev tabanlı ve gerçek zamanlı bir 3B uçuş simülatörü.
Harici model veya oyun motoru kullanmadan Three.js ile oluşturulan dünya;
prosedürel arazi, pist, şehir, dağlar, bulutlar, navigasyon kapıları ve özgün
bir eğitim uçağı içerir.

## Öne çıkan özellikler

- Hız, sürükleme, kaldırma, stall, yer sürtünmesi ve iniş darbesini hesaba katan
  erişilebilir uçuş modeli
- Dört navigasyon kapısı, kalkış ve hassas inişten oluşan görev akışı
- Açık, rüzgârlı ve günbatımı hava senaryoları
- Takip, kokpit ve kule kamera modları
- Gerçek zamanlı HUD: hız, irtifa, baş, dikey hız, pitch/roll, G kuvveti,
  throttle ve hedef mesafesi
- Stall, aşırı hız, alçalma ve iniş takımı ikazları
- Motor sesi, iniş skoru ve cihazda saklanan en iyi skor
- Klavye, gamepad ve mobil dokunmatik kontrol desteği
- Masaüstü ve mobil ekranlara uyumlu arayüz

## Hızlı başlangıç

Node.js 22.13 veya daha yeni bir sürüm gereklidir.

```bash
npm install
npm run dev
```

Ardından terminalde gösterilen yerel adresi tarayıcıda açın.

Üretim derlemesi ve testler:

```bash
npm run build
npm test
```

## Kontroller

| Kontrol | İşlev |
| --- | --- |
| `W` / `S` | Burnu kaldır / indir |
| `A` / `D` | Sola / sağa yatış |
| `Q` / `E` | Dümen |
| `Shift` / `Ctrl` | Gaz artır / azalt |
| `G` | İniş takımını aç / kapat |
| `C` | Kamera değiştir |
| `P` veya `Esc` | Duraklat / devam |
| `R` | Uçuşu sıfırla |
| `M` | Motor sesini aç / kapat |
| `H` | Kontrol yardımını göster |

Standart gamepad kullanıldığında sol analog pitch/roll, sağ analog dümen,
tetikler ise gaz kontrolü sağlar.

## Görev

Pist 27’den kalkın, 300 ft üzerine tırmanın, sırayla dört parlak navigasyon
kapısından geçin ve meydana dönün. Son yaklaşmada iniş takımını açın; 135 knot
altında, düşük dikey hız ve yatış açısıyla pist üzerinde teker koyun.

## Technology

- React 19 + TypeScript
- Three.js
- vinext / Vite
- Cloudflare Workers-compatible production output

The simulator runs fully in the browser and needs no account, database, or
external game server.

## Proje promptu

Aynı ürünü yeniden üretmek veya geliştirmek için kullanılan ayrıntılı Türkçe
prompt [PROMPT_TR.md](./PROMPT_TR.md) dosyasındadır.

## Lisans

MIT
