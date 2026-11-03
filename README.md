# HANAMI èŠ±è¦‹

Yerel mÃ¼zik ve video Ã§alar. MÃ¼ziÄŸin ritmine gÃ¶re nefes alan Japonca bir kelime, mevsime gÃ¶re deÄŸiÅŸen yaÄŸmur, kar ve yaprak ortamlarÄ±.

DosyalarÄ±n bilgisayarÄ±ndan hiÃ§bir yere yÃ¼klenmez; her ÅŸey tarayÄ±cÄ±da (veya masaÃ¼stÃ¼ uygulamasÄ±nda) yerelde Ã§alÄ±ÅŸÄ±r.

**CanlÄ±:** https://hanami-player.vercel.app

## GeliÅŸtirme

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ klasÃ¶rÃ¼ne Ã¼retim derlemesi
npm run typecheck
```

## YapÄ±

```
src/
  engine/     arayÃ¼zden baÄŸÄ±msÄ±z motorlar (ses analizi, parÃ§acÄ±k ortamÄ±, temalar, ID3)
  components/ React bileÅŸenleri
  store.ts    uygulama durumu (zustand)
legacy/       taÅŸÄ±ma Ã¶ncesi tek dosyalÄ±k v11 sÃ¼rÃ¼mÃ¼ (referans)
```

## Yol haritasÄ±

- [x] Tek dosyalÄ±k ilk sÃ¼rÃ¼m
- [x] Vite + React + TypeScript'e taÅŸÄ±ma
- [ ] EriÅŸilebilirlik ve Apple HIG dÃ¼zeltmeleri
- [x] Ritimle titreyen kanji (yapay zeka vuruş izleyici: Beat This! small0, ~2M parametre)
- [ ] Temayla uyumlu mini video oynatÄ±cÄ±
- [x] Electron ile Windows `.exe` (kurulum + taşınabilir)
- [ ] Capacitor ile Android `.apk`


## Masaüstü (Windows)

Sürümler: https://github.com/Yusuff2560/hanami-player/releases (`HANAMI-Setup-*.exe` kurulum, `HANAMI-Portable-*.exe` kurulumsuz).
Uygulama imzasızdır; ilk açılışta Windows SmartScreen "Daha fazla bilgi > Yine de çalıştır" diyebilir.

```bash
npm run electron:dev    # derleyip Electron'da aç
npm run electron:pack   # release/ klasörüne kurulum ve taşınabilir exe üret
```

Yeni sürüm yayınlamak için: `git tag v0.2.0 && git push --tags` (GitHub Actions derleyip Releases'e yükler).
## Ritim modeli

Ortadaki yazı, çalan şarkının vuruşlarına [Beat This!](https://github.com/CPJKU/beat_this) (small0, MIT) modeliyle senkron titrer. Model tarayıcıda `onnxruntime-web` ile yerelde çalışır, ses hiçbir yere gönderilmez. Sonuç şarkı başına önbelleğe alınır. Atıf: `public/models/NOTICE.md`.

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
