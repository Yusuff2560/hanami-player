import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/shippori-mincho-b1/latin-500.css';
import '@fontsource/shippori-mincho-b1/latin-ext-500.css';
import '@fontsource/shippori-mincho-b1/latin-600.css';
import '@fontsource/shippori-mincho-b1/latin-ext-600.css';
import '@fontsource/shippori-mincho-b1/latin-700.css';
import '@fontsource/shippori-mincho-b1/latin-ext-700.css';
import '@fontsource/shippori-mincho-b1/latin-800.css';
import '@fontsource/shippori-mincho-b1/latin-ext-800.css';
import '@fontsource/zen-kaku-gothic-new/latin-400.css';
import '@fontsource/zen-kaku-gothic-new/latin-ext-400.css';
import '@fontsource/zen-kaku-gothic-new/latin-500.css';
import '@fontsource/zen-kaku-gothic-new/latin-ext-500.css';
import '@fontsource/zen-kaku-gothic-new/latin-700.css';
import '@fontsource/zen-kaku-gothic-new/latin-ext-700.css';
import App from './App';
import './styles/app.css';
import './styles/system.css';
import './styles/ipod.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
