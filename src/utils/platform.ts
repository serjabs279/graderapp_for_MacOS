import { useState, useEffect } from 'react';

/**
 * platform.ts
 *
 * Centralized platform detection & responsive mobile helper.
 * Allows components and adapters to safely branch logic between
 * Android, Desktop (Electron / Tauri), and standard Web browsers.
 */

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const isElectron = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (/electron/i.test(navigator.userAgent) || Boolean((window as unknown as { process?: { type?: string } }).process?.type))
  );
};

export const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
};

export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

export const isMobileDevice = (): boolean => {
  return isAndroid() || isIOS();
};

export const isDesktop = (): boolean => {
  return !isMobileDevice();
};

export type PlatformType = 'android' | 'ios' | 'electron' | 'tauri-desktop' | 'web';

export const getPlatform = (): PlatformType => {
  if (isAndroid()) return 'android';
  if (isIOS()) return 'ios';
  if (isElectron()) return 'electron';
  if (isTauri()) return 'tauri-desktop';
  return 'web';
};

export interface PlatformInfo {
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;       // Either native mobile device OR screen width < 768px
  isNativeMobile: boolean; // Strictly Android / iOS user agent
  isDesktop: boolean;
  isTauri: boolean;
  isElectron: boolean;
  platform: PlatformType;
  screenWidth: number;
}

/**
 * React hook to reactively track platform and responsive viewport width.
 */
export function usePlatform(): PlatformInfo {
  const [screenWidth, setScreenWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nativeMobile = isMobileDevice();
  const isMobile = nativeMobile || screenWidth < 768;

  return {
    isAndroid: isAndroid(),
    isIOS: isIOS(),
    isMobile,
    isNativeMobile: nativeMobile,
    isDesktop: !isMobile,
    isTauri: isTauri(),
    isElectron: isElectron(),
    platform: getPlatform(),
    screenWidth,
  };
}
