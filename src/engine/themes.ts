export interface Theme {
  name: string;
  mode: string;
  pink: string;
  pale: string;
  accentDark: string;
  glow: string;
  accentBg: string;
  bgGradient: string;
}

export const themes: Record<string, Theme> = {
  sakura: {
    name: 'Sakura Pink',
    mode: 'sakura',
    pink: '#efa6c5',
    pale: '#f9d9e7',
    accentDark: '#9c4e73',
    glow: 'rgba(239, 166, 197, 0.45)',
    accentBg: 'rgba(239, 166, 197, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(42, 28, 42, 0.35), transparent 45%), #101014'
  },
  rose: {
    name: 'Rose Petals',
    mode: 'rose',
    pink: '#e05368',
    pale: '#ffd4d9',
    accentDark: '#8a2030',
    glow: 'rgba(224, 83, 104, 0.45)',
    accentBg: 'rgba(224, 83, 104, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(55, 18, 26, 0.4), transparent 50%), #140f11'
  },
  red: {
    name: 'Rose Petals',
    mode: 'rose',
    pink: '#e05368',
    pale: '#ffd4d9',
    accentDark: '#8a2030',
    glow: 'rgba(224, 83, 104, 0.45)',
    accentBg: 'rgba(224, 83, 104, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(55, 18, 26, 0.4), transparent 50%), #140f11'
  },
  green: {
    name: 'Forest Green',
    mode: 'leaves',
    pink: '#4ec985',
    pale: '#d1f7e1',
    accentDark: '#1f6d3f',
    glow: 'rgba(78, 201, 133, 0.45)',
    accentBg: 'rgba(78, 201, 133, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(20, 52, 32, 0.4), transparent 50%), #0f1411'
  },
  nemophila: {
    name: 'Nemophila Blue',
    mode: 'nemophila',
    pink: '#5aa2f2',
    pale: '#d5e8fe',
    accentDark: '#205697',
    glow: 'rgba(90, 162, 242, 0.45)',
    accentBg: 'rgba(90, 162, 242, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(20, 36, 56, 0.4), transparent 50%), #0f1217'
  },
  blue: {
    name: 'Nemophila Blue',
    mode: 'nemophila',
    pink: '#5aa2f2',
    pale: '#d5e8fe',
    accentDark: '#205697',
    glow: 'rgba(90, 162, 242, 0.45)',
    accentBg: 'rgba(90, 162, 242, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(20, 36, 56, 0.4), transparent 50%), #0f1217'
  },
  rain: {
    name: 'Rainy Weather',
    mode: 'rain',
    pink: '#88a8c4',
    pale: '#d8e4ee',
    accentDark: '#3a5670',
    glow: 'rgba(136, 168, 196, 0.45)',
    accentBg: 'rgba(136, 168, 196, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 50% 0%, rgba(35, 48, 64, 0.45), transparent 60%), #111418'
  },
  snow: {
    name: 'Winter Snow',
    mode: 'snow',
    pink: '#c5d5e6',
    pale: '#f2f6fa',
    accentDark: '#58718a',
    glow: 'rgba(197, 213, 230, 0.5)',
    accentBg: 'rgba(197, 213, 230, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(30, 38, 52, 0.4), transparent 50%), #0d1014'
  },
  storm: {
    name: 'Midnight Storm',
    mode: 'storm',
    pink: '#6c8bd2',
    pale: '#d4e0fa',
    accentDark: '#293c68',
    glow: 'rgba(108, 139, 210, 0.5)',
    accentBg: 'rgba(108, 139, 210, 0.14)',
    bgGradient: 'radial-gradient(ellipse at 60% 0%, rgba(18, 28, 54, 0.55), transparent 55%), #080a12'
  },
  yellow: {
    name: 'Golden Leaves',
    mode: 'autumn',
    pink: '#e5b842',
    pale: '#fdf3ce',
    accentDark: '#8a6713',
    glow: 'rgba(229, 184, 66, 0.45)',
    accentBg: 'rgba(229, 184, 66, 0.12)',
    bgGradient: 'radial-gradient(ellipse at 70% 0%, rgba(48, 38, 18, 0.4), transparent 50%), #14120e'
  }
};

export const themeOptions: { value: string; label: string }[] = [
  { value: 'sakura', label: '🌸 Sakura Pink' },
  { value: 'rose', label: '🌹 Rose Petals' },
  { value: 'green', label: '🍃 Forest Green' },
  { value: 'nemophila', label: '💠 Nemophila Blue' },
  { value: 'rain', label: '🌧️ Rainy Weather' },
  { value: 'snow', label: '❄️ Winter Snow' },
  { value: 'storm', label: '⚡ Midnight Storm' },
  { value: 'yellow', label: '🍂 Golden Leaves' }
];

export function normalizeTheme(key: string): string {
  if (key === 'red') return 'rose';
  if (key === 'blue') return 'nemophila';
  return themes[key] ? key : 'sakura';
}

export const brandIcons: Record<string, string> = {
  sakura: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Sakura">
    <g fill="#f5b4d0" stroke="#ffe8f1" stroke-width="1.5">
      <path d="M50 48 C36 35 31 17 43 9 Q50 5 57 9 C69 17 64 35 50 48Z"/><path d="M50 48 C36 35 31 17 43 9 Q50 5 57 9 C69 17 64 35 50 48Z" transform="rotate(72 50 50)"/><path d="M50 48 C36 35 31 17 43 9 Q50 5 57 9 C69 17 64 35 50 48Z" transform="rotate(144 50 50)"/><path d="M50 48 C36 35 31 17 43 9 Q50 5 57 9 C69 17 64 35 50 48Z" transform="rotate(216 50 50)"/><path d="M50 48 C36 35 31 17 43 9 Q50 5 57 9 C69 17 64 35 50 48Z" transform="rotate(288 50 50)"/>
    </g><circle cx="50" cy="50" r="7" fill="#f6d78c"/><g stroke="#fff2c9" stroke-width="1.5" stroke-linecap="round"><path d="M50 50L43 38M50 50L58 38M50 50L64 49M50 50L58 61M50 50L43 62"/></g></svg>`,
  rose: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Rose"><path d="M50 88C35 76 13 58 18 37C22 19 43 17 50 31C58 12 82 18 84 38C88 59 66 78 50 88Z" fill="#d94359"/><path d="M50 78C31 61 34 42 50 42C62 29 76 43 67 57C62 66 56 72 50 78Z" fill="#ff9aa8"/><path d="M50 69C42 58 47 48 57 49C65 52 60 63 50 69Z" fill="#a51f38"/><path d="M18 56Q7 45 12 31Q24 39 30 45M82 57Q95 45 88 30Q76 39 70 45" fill="#4b9b68" stroke="#83c993" stroke-width="3"/></svg>`,
  nemophila: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Nemophila"><g fill="#75b9ff" stroke="#d9edff" stroke-width="2"><path d="M50 49C35 40 31 21 43 13C53 7 61 21 50 49Z"/><path d="M50 49C35 40 31 21 43 13C53 7 61 21 50 49Z" transform="rotate(72 50 50)"/><path d="M50 49C35 40 31 21 43 13C53 7 61 21 50 49Z" transform="rotate(144 50 50)"/><path d="M50 49C35 40 31 21 43 13C53 7 61 21 50 49Z" transform="rotate(216 50 50)"/><path d="M50 49C35 40 31 21 43 13C53 7 61 21 50 49Z" transform="rotate(288 50 50)"/></g><circle cx="50" cy="50" r="7" fill="#f7e9c0"/><circle cx="50" cy="50" r="3" fill="#fff"/></svg>`,
  snow: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Snowflake"><g stroke="#8fb5d8" stroke-width="7" stroke-linecap="round" fill="none"><path d="M50 9V91M14 29L86 71M14 71L86 29"/><path d="M50 9L40 21M50 9L60 21M50 91L40 79M50 91L60 79M14 29L29 30M14 29L20 43M86 71L71 70M86 71L80 57M14 71L29 70M14 71L20 57M86 29L71 30M86 29L80 43" stroke-width="4"/></g><circle cx="50" cy="50" r="6" fill="#d8ebfa"/></svg>`,
  green: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Green leaf"><path d="M17 79C13 42 39 13 83 15C85 56 59 85 17 79Z" fill="#48a96b" stroke="#a6e3b7" stroke-width="3"/><path d="M18 80C37 59 54 42 81 17M39 59L34 36M54 45L73 48" fill="none" stroke="#d5f4dc" stroke-width="3" stroke-linecap="round"/></svg>`,
  rain: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Rain cloud"><path d="M23 63C8 62 8 40 25 36C27 17 56 13 67 32C87 29 96 54 79 63Z" fill="#263e60" stroke="#9bb8d8" stroke-width="4"/><path d="M30 72L24 86M50 72L44 86M70 72L64 86" stroke="#73b9ed" stroke-width="5" stroke-linecap="round"/></svg>`,
  storm: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Lightning"><path d="M55 7L20 55H44L35 94L82 39H56Z" fill="#f4d45c" stroke="#fff0a4" stroke-width="4" stroke-linejoin="round"/></svg>`,
  yellow: `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="Dry autumn leaf"><path d="M18 78C13 56 18 27 48 12C63 31 82 31 87 34C81 65 58 84 18 78Z" fill="#b9822e" stroke="#e8c77b" stroke-width="3"/><path d="M17 82C39 61 58 42 82 33M42 59L34 35M57 47L72 53M30 70L25 53" fill="none" stroke="#f3d99b" stroke-width="3" stroke-linecap="round"/></svg>`
};

export const hanamiJapaneseWords: string[] = ['桜', '花', '春', '夏', '秋', '冬', '雪', '雨', '風', '雲', '空', '月', '星', '光', '影', '森', '林', '木', '葉', '草', '花火', '虹', '海', '波', '川', '山', '丘', '島', '朝', '夕', '夜', '夜明け', '夢', '音', '歌', '詩', '心', '愛', '希望', '静寂', '平和', '旅', '道', '景色', '自然', '生命', '輝き', '温もり', '優しさ', '微笑み', '青空', '夕焼け', '木漏れ日', '新緑', '紅葉', '落葉', '吹雪', '霧', '露', '小雨', '雷', '稲妻', '雫', '水', '光景', '花園', '野原', '竹', '松', '梅', '藤', '菊', '椿', '紫陽花', '勿忘草', '薔薇', '百合', '蓮', '牡丹', '楓', '銀杏', '若葉', '枯葉', '木枯らし', '初雪', '粉雪', '夜空', '満月', '三日月', '流星', '朝露', '春風', '潮風', 'そよ風', '雨音', '雪景色', '森羅', '悠久', '刹那', '幻想', '癒し'];

// Sakura için ayrıntılı (gradyanlı) logo; diğer temalar brandIcons'taki sade çizimi kullanır.
brandIcons.sakura = `<svg class="brand-flower" viewBox="0 0 100 100" width="34" height="34" aria-label="HANAMI Çiçeği">
        <defs>
          <linearGradient id="sakuraGrad" x1="0%" y1="90%" x2="0%" y2="5%">
            <stop offset="0%" stop-color="#9c4e73" stop-opacity="0.95"/>
            <stop offset="35%" stop-color="#efa6c5"/>
            <stop offset="78%" stop-color="#f9d9e7"/>
            <stop offset="100%" stop-color="#ffffff"/>
          </linearGradient>
          <filter id="petalShadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="rgba(0,0,0,0.45)"/>
          </filter>
          <radialGradient id="flowerCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff5cc"/>
            <stop offset="50%" stop-color="#efa6c5"/>
            <stop offset="100%" stop-color="#9c4e73" stop-opacity="0"/>
          </radialGradient>
          <g id="petalDef">
            <!-- Distinct cherry blossom petal with cleft notch -->
            <path d="M 50 50 C 40 37 30 20 40 9 C 44 4.5 48 7.5 50 12.5 C 52 7.5 56 4.5 60 9 C 70 20 60 37 50 50 Z" 
                  fill="url(#sakuraGrad)" filter="url(#petalShadow)"/>
            <path d="M 50 48 Q 49.5 28 50 13" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M 50 48 Q 50.8 30 50 14" stroke="#9c4e73" stroke-opacity="0.35" stroke-width="0.8" stroke-linecap="round"/>
          </g>
        </defs>
        <!-- 5 Layered 3D Petals -->
        <use href="#petalDef" transform="rotate(0 50 50)"/>
        <use href="#petalDef" transform="rotate(72 50 50)"/>
        <use href="#petalDef" transform="rotate(144 50 50)"/>
        <use href="#petalDef" transform="rotate(216 50 50)"/>
        <use href="#petalDef" transform="rotate(288 50 50)"/>
        <!-- Central Glow & Stamens -->
        <circle cx="50" cy="50" r="14" fill="url(#flowerCenterGlow)"/>
        <g stroke="rgba(255, 245, 210, 0.85)" stroke-width="0.9" stroke-linecap="round">
          <line x1="50" y1="50" x2="50" y2="35"/>
          <line x1="50" y1="50" x2="61" y2="38"/>
          <line x1="50" y1="50" x2="64" y2="48"/>
          <line x1="50" y1="50" x2="59" y2="60"/>
          <line x1="50" y1="50" x2="48" y2="64"/>
          <line x1="50" y1="50" x2="38" y2="58"/>
          <line x1="50" y1="50" x2="36" y2="46"/>
          <line x1="50" y1="50" x2="41" y2="38"/>
        </g>
        <!-- Golden Pollen Tips -->
        <g fill="#ffe58f" stroke="rgba(120, 80, 20, 0.4)" stroke-width="0.4">
          <circle cx="50" cy="34" r="1.8"/>
          <circle cx="61.5" cy="37.5" r="1.8"/>
          <circle cx="65" cy="48" r="1.8"/>
          <circle cx="59.5" cy="61" r="1.8"/>
          <circle cx="48" cy="65" r="1.8"/>
          <circle cx="37" cy="59" r="1.8"/>
          <circle cx="35" cy="46" r="1.8"/>
          <circle cx="40.5" cy="37" r="1.8"/>
        </g>
        <circle cx="50" cy="50" r="3.2" fill="#fff5cc" stroke="#9c4e73" stroke-width="0.8"/>
      </svg>`;
