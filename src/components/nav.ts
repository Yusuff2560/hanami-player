import type { View } from '../store';

export const NAV: { view: View; icon: string; label: string; short: string }[] = [
  { view: 'music', icon: 'music', label: 'Müzikler', short: 'Müzik' },
  { view: 'albums', icon: 'albums', label: 'Albümler', short: 'Albümler' },
  { view: 'recent', icon: 'clock', label: 'Son çalınanlar', short: 'Geçmiş' },
  { view: 'favorites', icon: 'heart', label: 'Favoriler', short: 'Favoriler' }
];
