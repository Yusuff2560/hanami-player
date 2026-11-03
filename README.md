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
- [x] Ritimle titreyen kanji
- [ ] Temayla uyumlu mini video oynatıcı
- [ ] Electron ile Windows `.exe`
- [ ] Capacitor ile Android `.apk`

## Lisans

MIT
