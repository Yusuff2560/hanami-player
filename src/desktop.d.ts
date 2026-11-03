export {};

declare global {
  interface Window {
    /** Yalnızca Electron kabuğunda bulunur (electron/preload.cjs) */
    hanamiDesktop?: {
      platform: string;
      onMenu: (handler: (action: string) => void) => () => void;
    };
  }
}
