# HANAMI 花見

Yerel müzik ve video çalar. Müziğin ritmine göre nefes alan Japonca bir kelime, mevsime göre değişen yağmur, kar ve yaprak ortamları.

Dosyaların bilgisayarından hiçbir yere yüklenmez; her şey tarayıcıda (veya masaüstü uygulamasında) yerelde çalışır.

**Canlı:** https://hanami-player.vercel.app

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ klasörüne üretim derlemesi
npm run typecheck
```

## Yapı

```
src/
  engine/     arayüzden bağımsız motorlar (ses analizi, parçacık ortamı, temalar, ID3)
  components/ React bileşenleri
  store.ts    uygulama durumu (zustand)
legacy/       taşıma öncesi tek dosyalık v11 sürümü (referans)
```

## Yol haritası

- [x] Tek dosyalık ilk sürüm
- [x] Vite + React + TypeScript'e taşıma
- [ ] Erişilebilirlik ve Apple HIG düzeltmeleri
- [x] Ritimle titreyen kanji (yapay zeka vuru� izleyici: Beat This! small0, ~2M parametre)
- [ ] Temayla uyumlu mini video oynatıcı
- [x] Electron ile Windows `.exe` (kurulum + ta��nabilir)
- [ ] Capacitor ile Android `.apk`


## Masa�st� (Windows)

S�r�mler: https://github.com/Yusuff2560/hanami-player/releases (`HANAMI-Setup-*.exe` kurulum, `HANAMI-Portable-*.exe` kurulumsuz).
Uygulama imzas�zd�r; ilk a��l��ta Windows SmartScreen "Daha fazla bilgi > Yine de �al��t�r" diyebilir.

```bash
npm run electron:dev    # derleyip Electron'da a�
npm run electron:pack   # release/ klas�r�ne kurulum ve ta��nabilir exe �ret
```

Yeni s�r�m yay�nlamak i�in: `git tag v0.2.0 && git push --tags` (GitHub Actions derleyip Releases'e y�kler).
## Ritim modeli

Ortadaki yaz�, �alan �ark�n�n vuru�lar�na [Beat This!](https://github.com/CPJKU/beat_this) (small0, MIT) modeliyle senkron titrer. Model taray�c�da `onnxruntime-web` ile yerelde �al���r, ses hi�bir yere g�nderilmez. Sonu� �ark� ba��na �nbelle�e al�n�r. At�f: `public/models/NOTICE.md`.

## Code signing policy

Windows releases are built from this repository by GitHub Actions (`.github/workflows/release.yml`) and published on the [Releases](https://github.com/Yusuff2560/hanami-player/releases) page. Every binary is built from source in an automated, verifiable build.

**Status:** an application to [SignPath Foundation](https://signpath.org) for free code signing is pending. Until it is approved, the Windows binaries are **not** code-signed (Windows SmartScreen may warn on first launch). The Android APK is signed with the project's own release key.

**Team roles** (this is a single-maintainer project):

- Authors, reviewers and approvers: [Yusuff2560](https://github.com/Yusuff2560)

Every release needs the maintainer's manual approval before signing. Two-factor authentication is required for the GitHub account.

### Privacy policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

HANAMI plays files from your own device. Music and videos are never uploaded. Rhythm analysis runs locally on the bundled [Beat This!](https://github.com/CPJKU/beat_this) model, and fonts are bundled, so the app makes no network requests while running (the website only loads its own files from its host). Nothing is collected, tracked or sent to analytics services. Analysis results are cached only in your browser's local storage (IndexedDB).

### Installing and uninstalling

The Windows installer (`HANAMI-Setup-*.exe`) adds a Start menu and desktop shortcut and registers an uninstaller under *Settings > Apps*. The portable build (`HANAMI-Portable-*.exe`) changes nothing on your system; delete the file to remove it.

## Lisans

MIT
