# HANAMI 花見

Yerel müzik ve video çalar. Çalan şarkının ritmine göre titreyen büyük bir Japonca kelime, seçtiğin mevsime göre değişen yağmur, kar ve yaprak ortamları.

Dosyaların cihazından hiçbir yere yüklenmez; her şey tarayıcıda, masaüstü uygulamasında veya telefonda yerelde çalışır.

| Platform | Nereden |
|---|---|
| Web | https://hanami-player.vercel.app |
| Windows | [Son sürüm](https://github.com/Yusuff2560/hanami-player/releases/latest): `HANAMI-Setup-*.exe` (kurulum), `HANAMI-Portable-*.exe` (kurulumsuz) |
| Android | [Son sürüm](https://github.com/Yusuff2560/hanami-player/releases/latest): `HANAMI-*.apk` (bilinmeyen kaynaklardan kurulum izni gerekir) |

## Özellikler

- Şarkı, klasör (masaüstü) ve video ekleme; albümler, favoriler, son çalınanlar
- Ritimle titreyen kelime: [Beat This!](https://github.com/CPJKU/beat_this) yapay zeka modeli (small, ~2 milyon parametre) şarkının vuruşlarını bulur, yazı tam o anlarda sarsılır
- **Kalıcı kitaplık:** eklediğin şarkılar, favoriler, albümler ve son çalınanlar uygulamayı kapatıp açınca yerinde kalır (şarkı dosyalarının bir kopyası uygulamanın yerel deposunda saklanır, orijinaller değişmez)
- 8 mevsim teması, tam ekran oynatıcı
- **Temayla uyumlu mini video oynatıcı (iPod):** her temanın kendi kasası, tekerleği ve çıkartması var; ekran parıltısı ve ışığı müziğin ritmiyle atar
- Klavye kısayolları, medya tuşları, yerel menü çubuğu (masaüstü), bildirimden denetim ve arka planda çalma (Android)
- Erişilebilirlik: klavyeyle gezinme, ekran okuyucu adları, hareketi azaltma ve "ışık yanıp sönmesini azalt" ayarı
- Telefon düzeni: alt sekme çubuğu, alt sayfalar (sheet), güvenli alanlar

## Geliştirme

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # dist/ klasörüne üretim derlemesi
npm run typecheck
npm run electron:dev   # derleyip Electron'da aç
npm run electron:pack  # release/ klasörüne Windows kurulum ve taşınabilir exe üret
npm run android:sync   # web uygulamasını Android projesine aktar
```

Android APK'yı yerelde derlemek için JDK 21 ve Android SDK gerekir; sürümlerde GitHub Actions derler.

## Yapı

```
src/
  engine/       arayüzden bağımsız motorlar: ses analizi, parçacık ortamı, temalar,
                ritim modeli (beatCore, beatWorker, rhythm), Android ve masaüstü köprüleri
  components/   React bileşenleri
  store.ts      uygulama durumu (zustand)
electron/       masaüstü kabuğu (ana süreç, güvenli ön yükleme betiği)
android/        Capacitor Android projesi (arka planda çalma servisi dahil)
public/models/  Beat This! ONNX modelleri ve atıf (MIT)
scripts/        derleme yardımcıları
legacy/         taşıma öncesi tek dosyalık v11 sürümü (referans)
```

## Yol haritası

Yapıldı:

- [x] Tek dosyalık ilk sürüm
- [x] Vite + React + TypeScript'e taşıma
- [x] Erişilebilirlik ve Apple HIG düzeltmeleri, telefon düzeni
- [x] Ritimle titreyen kelime (yapay zeka vuruş izleyici)
- [x] Yazı tipleri uygulamanın içinde, çalışırken ağ isteği yok
- [x] Windows `.exe` (kurulum + taşınabilir), GitHub Actions ile otomatik sürüm
- [x] Android `.apk` (imzalı), arka planda çalma servisi ve bildirim düğmeleri
- [x] Kütüphane kalıcılığı (şarkılar, favoriler, albümler, son çalınanlar), şarkıyı geri alınabilir kaldırma, kitaplığı temizleme
- [x] Temayla uyumlu iPod: 8 tema için kasa, tekerlek, çıkartma, ritimle atan parıltı

Sırada:

- [ ] **Windows kod imzası:** SignPath Foundation başvurusu hazır, başvuru bekleniyor
- [ ] **APK'yı gerçek telefonda sınamak:** kurulum, arka planda çalma, bildirim düğmeleri henüz bir cihazda görülmedi
- [ ] Windows taşınabilir sürümünün antivirüs uyarısı (imza ile çözülmesi beklenir)
- [ ] Otomatik güncelleme kontrolü

Fikirler (henüz planlanmadı):

- [ ] Karıştır ve tekrar, sıradaki şarkılar paneli, arama ve sıralama
- [ ] Şarkı adı ve sanatçıyı etiketlerden okuma, M4A kapak resmi
- [ ] Kapaktan tema rengi, senkron söz (`.lrc`)

## Ritim modeli

Ortadaki yazı, çalan şarkının vuruşlarına [Beat This!](https://github.com/CPJKU/beat_this) (small0, MIT) modeliyle senkron titrer. Model tarayıcıda, masaüstünde ve telefonda `onnxruntime-web` ile yerelde çalışır, ses hiçbir yere gönderilmez. Bir şarkıda ilk analiz birkaç on saniye sürer (3 dakikalık şarkıda yaklaşık 20 saniye); sonuç şarkı başına önbelleğe alınır ve sıradaki şarkı arka planda önceden analiz edilir. Analiz bitene kadar yazı sakin kalır. Model yüklenemezse basit bir enerji analizine düşülür. Atıf: `public/models/NOTICE.md`.

## Code signing policy

Windows releases are built from this repository by GitHub Actions (`.github/workflows/release.yml`) and published on the [Releases](https://github.com/Yusuff2560/hanami-player/releases) page. Every binary is built from source in an automated, verifiable build.

**Status:** an application to [SignPath Foundation](https://signpath.org) for free code signing is pending. Until it is approved, the Windows binaries are **not** code-signed (Windows SmartScreen may warn on first launch). The Android APK is signed with the project's own release key.

**Team roles** (this is a single-maintainer project):

- Authors, reviewers and approvers: [Yusuff2560](https://github.com/Yusuff2560)

Every release needs the maintainer's manual approval before signing. Two-factor authentication is required for the GitHub account.

### Privacy policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

HANAMI plays files from your own device. Music and videos are never uploaded. Rhythm analysis runs locally on the bundled [Beat This!](https://github.com/CPJKU/beat_this) model, and fonts are bundled, so the app makes no network requests while running (the website only loads its own files from its host). Nothing is collected, tracked or sent to analytics services. Your library is stored only on your device: songs you add are copied into the app's local storage (IndexedDB) so they are still there after a restart, together with favorites, play history and rhythm-analysis results. Your original files are never modified or deleted. "Clear library" in the settings removes all of it.

### Installing and uninstalling

The Windows installer (`HANAMI-Setup-*.exe`) adds a Start menu and desktop shortcut and registers an uninstaller under *Settings > Apps*. The portable build (`HANAMI-Portable-*.exe`) changes nothing on your system; delete the file to remove it.

### Antivirus and SmartScreen warnings

The Windows binaries are not code-signed yet (see the status above), and they are new, rarely downloaded files. Some antivirus programs rate such files with reputation-based heuristics and may warn or quarantine them. This was observed with Avast (`IDP.HELU.PSD11`, Behavior Shield) on `HANAMI-Portable-0.3.2.exe`, which is a self-extracting executable that unpacks itself to a temporary folder. The installer was not flagged in the same test. We believe this is a false positive, but we cannot prove it for you, so please verify the file yourself:

- Use the **installer** (`HANAMI-Setup-*.exe`) if you can; it is less likely to be flagged than the portable build.
- Compare the SHA256 of your download with the digest GitHub shows next to each file on the [Releases](https://github.com/Yusuff2560/hanami-player/releases) page (PowerShell: `Get-FileHash .\HANAMI-Setup-0.3.2.exe`). It must match exactly.
- Everything is built from this repository by GitHub Actions; you can read the source and the build workflow, or build it yourself with `npm run electron:pack`.
- If your antivirus blocks it and you do not trust it, do not run it.

## Yeni sürüm yayınlamak

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

GitHub Actions Windows `.exe` dosyalarını ve imzalı Android `.apk` dosyasını derleyip Releases'e yükler.

## Lisans

MIT. Ritim modelleri (Beat This! small0) de MIT lisanslıdır, atıf `public/models/NOTICE.md` içindedir.
