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
- [x] Ritimle titreyen kanji (yapay zeka vuruþ izleyici: Beat This! small0, ~2M parametre)
- [ ] Temayla uyumlu mini video oynatÄ±cÄ±
- [x] Electron ile Windows `.exe` (kurulum + taþýnabilir)
- [ ] Capacitor ile Android `.apk`


## Masaüstü (Windows)

Sürümler: https://github.com/Yusuff2560/hanami-player/releases (`HANAMI-Setup-*.exe` kurulum, `HANAMI-Portable-*.exe` kurulumsuz).
Uygulama imzasýzdýr; ilk açýlýþta Windows SmartScreen "Daha fazla bilgi > Yine de çalýþtýr" diyebilir.

```bash
npm run electron:dev    # derleyip Electron'da aç
npm run electron:pack   # release/ klasörüne kurulum ve taþýnabilir exe üret
```

Yeni sürüm yayýnlamak için: `git tag v0.2.0 && git push --tags` (GitHub Actions derleyip Releases'e yükler).
## Ritim modeli

Ortadaki yazý, çalan þarkýnýn vuruþlarýna [Beat This!](https://github.com/CPJKU/beat_this) (small0, MIT) modeliyle senkron titrer. Model tarayýcýda `onnxruntime-web` ile yerelde çalýþýr, ses hiçbir yere gönderilmez. Sonuç þarký baþýna önbelleðe alýnýr. Atýf: `public/models/NOTICE.md`.

## Lisans

MIT
