# Skybound Flight Simulator — Üretim Promptu

Aşağıdaki prompt, bu projeyi sıfırdan üretmek veya daha gelişmiş bir sürümünü
hazırlamak için doğrudan bir yazılım geliştirme ajanına verilebilir.

---

Modern tarayıcılarda çalışan, kurulumdan sonra tek komutla açılabilen, özgün ve
ayrıntılı bir 3B uçuş simülatörü geliştir. Ürünün adı **Skybound Flight
Simulator** olsun. Arayüz dili Türkçe olsun. Sonuç yalnızca bir tanıtım sayfası
değil; kullanıcının kalkış yapabildiği, rota takip ettiği ve tekrar piste
inebildiği gerçek zamanlı, oynanabilir bir simülatör olmalı.

## Teknik çerçeve

- React, TypeScript, Three.js ve Vite/vinext kullan.
- Uygulama istemci tarafında çalışsın; zorunlu backend, hesap veya veritabanı
  istemesin.
- Kod modüler, okunabilir, tip güvenli ve üretim derlemesine hazır olsun.
- Masaüstü ve mobil ekranları destekle.
- Harici ücretli varlık, lisans sorunu oluşturabilecek görsel veya marka
  kullanma. Uçak ve çevreyi kod ile özgün biçimde üret.
- Cloudflare Workers uyumlu ESM çıktısı oluştur.

## Uçuş dünyası

- Geniş prosedürel arazi, kıyı, su, pist, taksi alanı, hangarlar, kontrol
  kulesi, şehir blokları, dağlar ve bulutlar oluştur.
- Pistte merkez çizgisi, eşik işaretleri, omuzlar ve pist ışıkları bulunsun.
- Açık hava, rüzgârlı hava ve günbatımı olmak üzere üç görsel/hissedilir hava
  senaryosu ekle.
- Sis, gökyüzü renk geçişi, yönlü güneş, ortam ışığı ve gölgeler kullan.
- Dünyanın ölçeği uçuş ve yaklaşma hissi verecek kadar büyük olsun.

## Uçak ve fizik

- Gövde, burun, kanatlar, kuyruk, kanopi, iniş takımı ve seyrüsefer ışığı olan
  özgün bir eğitim uçağı modeli oluştur.
- Gaz, motor ivmesi, parabolik sürükleme, yer sürtünmesi, kaldırma, stall hızı,
  dikey hız, pitch, roll, yaw ve koordineli dönüşü simüle et.
- Düşük hızda kontrol yüzeylerinin etkisini azalt.
- Rüzgârlı senaryoda yan rüzgâr ve hafif türbülans ekle.
- İniş takımının açık/kapalı durumu sürüklemeyi ve güvenli inişi etkilesin.
- Pist dışına, aşırı dikey hızla, yüksek yatışla veya iniş takımı kapalı iniş
  kaza ile sonuçlansın.
- Güvenli inişte dikey hız, yatış, hız ve görev süresinden puan hesapla.

## Görev sistemi

- “SB-01 · Kıyı Devriyesi” adlı görev oluştur.
- Akış: pistten kalkış, belirli irtifaya tırmanış, dört 3B navigasyon
  kapısından sırayla geçiş, son yaklaşma ve piste iniş.
- Sıradaki aktif kapıyı parlak, tamamlanmış kapıları sönük göster.
- Her aşamada kısa, Türkçe operasyon mesajı göster.
- Yanlış sıradaki kapı görevi ilerletmesin.
- Görev sonunda skor, en iyi skor, yeniden uç ve brifinge dön seçenekleri sun.
- En iyi skoru localStorage ile cihazda sakla.

## Kokpit ve arayüz

- Görsel yön: koyu havacılık arayüzü, cam yüzeyler, açık gri tipografi,
  elektrik limon yeşili vurgu ve monospace telemetri.
- İlk ekranda güçlü “SKY / BOUND” başlığı, kısa görev açıklaması, uçak/pist/süre
  bilgileri, hava seçimi ve “Uçuşu başlat” butonu göster.
- Uçuş sırasında şu verileri gerçek zamanlı göster:
  - knot cinsinden hız
  - feet cinsinden irtifa
  - derece cinsinden baş
  - feet/dakika dikey hız
  - pitch ve roll
  - G kuvveti
  - gaz yüzdesi
  - hedefe kalan mesafe
  - yakıt göstergesi
  - görev adımları
- Ortada nişangâh, altta hareketli suni ufuk bulunmalı.
- Stall, aşırı hız, hızlı alçalma ve iniş takımı uyarıları belirgin biçimde
  görünmeli.
- Takip, kokpit ve kule kamera açıları arasında geçiş yapılabilsin.
- Duraklatma, kontrol rehberi, ses aç/kapat ve uçuşu sıfırlama işlevleri olsun.

## Kontroller ve erişilebilirlik

- Klavye: W/S pitch, A/D roll, Q/E yaw, Shift/Ctrl gaz, G iniş takımı, C kamera,
  P/Esc duraklat, R sıfırla, M ses, H yardım.
- Standart Gamepad API ile analog pitch/roll/yaw ve tetiklerle gaz desteği ver.
- Mobilde yön ve gaz için büyük, dokunmatik butonlar göster.
- Butonlara erişilebilir adlar ekle; kontrastı koru ve reduced-motion tercihini
  destekle.
- Sekme odağı kaybolduğunda uçuşu otomatik duraklat.

## Ses

- Kullanıcının ilk etkileşiminden sonra Web Audio API ile düşük seviyeli,
  sürekli bir motor tonu oluştur.
- Motor frekansı ve filtresi gaz/hıza göre değişsin.
- Ses tek buton veya M tuşuyla tamamen kapatılabilsin.

## Kalite ve teslim

- İlk yüklemede hata veya boş ekran olmamalı.
- WebGL kaynaklarını component kapanırken temizle.
- Pencere boyutu değiştiğinde kamera ve renderer ölçülerini güncelle.
- Render döngüsünde React state güncellemelerini sınırlayarak performansı koru.
- Üretim derlemesini ve temel testleri çalıştır; tüm hataları düzelt.
- Türkçe ve İngilizce proje tanımı, özellikler, kurulum, kontroller, teknoloji
  ve lisans bölümleri bulunan bir README hazırla.
- MIT lisansı ekle.
- Sonucu ayrı bir GitHub reposuna anlaşılır bir commit mesajıyla gönder.

## Kabul kriterleri

Uygulama açıldığında kullanıcı hava koşulunu seçip uçuşu başlatabilmeli; gaz
vererek pistte hızlanabilmeli; kumandalarla kalkış yapabilmeli; 3B kapıları
takip edebilmeli; kamera değiştirebilmeli; stall ve iniş takımı uyarılarını
görebilmeli; piste güvenli veya hatalı iniş yaptığında doğru sonuç ekranını
alabilmelidir. Masaüstü, gamepad ve dokunmatik kontroller çalışmalıdır.
