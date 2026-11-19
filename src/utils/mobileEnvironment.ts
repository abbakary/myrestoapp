import { useEffect, useState } from 'react';
import { Role } from '../types/restaurant';

declare global {
  interface Window {
    flutter_inappwebview?: {
      callHandler: (handlerName: string, ...args: unknown[]) => Promise<unknown>;
    };
    FlutterBridge?: {
      postMessage: (message: string) => void;
    };
    Android?: Record<string, unknown>;
    webkit?: {
      messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }>;
    };
  }
}

export interface MobileEnvironmentInfo {
  /** True when viewport is mobile-sized (< 768px), including browser DevTools mobile inspect mode */
  isMobileViewport: boolean;
  /** True when running inside a Flutter/native WebView, installed PWA, or mobile device */
  isNativeOrMobileDevice: boolean;
  /** True when opened in a standalone portal / embedded app mode (e.g. ?portal=customer or ?standalone=1 or WebView) */
  isStandalonePortal: boolean;
}

export interface DeepLinkParams {
  portal?: Role;
  referralCode?: string;
  tableNumber?: string;
  tenantId?: string;
  standalone?: boolean;
}

const VALID_PORTALS: Role[] = ['owner', 'manager', 'cashier', 'reception', 'waiter', 'kitchen', 'customer'];

export function detectNativeWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const hasFlutter =
    Boolean(window.flutter_inappwebview) ||
    Boolean(window.FlutterBridge) ||
    Boolean(window.Android) ||
    Boolean(window.webkit?.messageHandlers && Object.keys(window.webkit.messageHandlers).length > 0);
  const isPwaStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ua = navigator.userAgent || '';
  const isWebViewUa = /\bwv\b|Flutter|WebView/i.test(ua);
  return hasFlutter || isPwaStandalone || isWebViewUa;
}

export function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  return mobileUa || coarsePointer || detectNativeWebView();
}

export function parseAppDeepLink(): DeepLinkParams {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.toLowerCase();

  let portal: Role | undefined;
  const portalParam = params.get('portal')?.toLowerCase() as Role | undefined;
  if (portalParam && VALID_PORTALS.includes(portalParam)) {
    portal = portalParam;
  } else if (path.startsWith('/customer') || path.startsWith('/menu') || path.startsWith('/w/')) {
    portal = 'customer';
  } else if (path.startsWith('/waiter')) {
    portal = 'waiter';
  }

  let referralCode = params.get('w') || params.get('ref') || undefined;
  if (!referralCode && path.startsWith('/w/')) {
    const slugCode = path.replace('/w/', '').split('/')[0];
    if (slugCode) referralCode = slugCode.toUpperCase();
  }
  if (referralCode) {
    referralCode = referralCode.toUpperCase();
    if (!portal) portal = 'customer';
  }

  const tableNumber = params.get('table') || undefined;
  const tenantId = params.get('tenant') || undefined;
  const standalone =
    params.get('standalone') === '1' ||
    params.get('app') === '1' ||
    Boolean(portalParam) ||
    detectNativeWebView();

  return {
    portal,
    referralCode,
    tableNumber,
    tenantId,
    standalone,
  };
}

export function useMobileEnvironment(): MobileEnvironmentInfo {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  const [isNativeOrMobileDevice] = useState<boolean>(() => detectMobileDevice());
  const [isStandalonePortal] = useState<boolean>(() => Boolean(parseAppDeepLink().standalone));

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    setIsMobileViewport(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return {
    isMobileViewport,
    isNativeOrMobileDevice,
    isStandalonePortal,
  };
}

/**
 * Notify Flutter WebView host if embedded, otherwise fallback safely.
 */
export function notifyFlutterHost(event: string, payload: Record<string, unknown>) {
  try {
    if (window.flutter_inappwebview?.callHandler) {
      window.flutter_inappwebview.callHandler(event, payload).catch(() => {});
    } else if (window.FlutterBridge?.postMessage) {
      window.FlutterBridge.postMessage(JSON.stringify({ event, payload }));
    }
  } catch {
    // Ignore bridge errors in standard browsers
  }
}

/**
 * Native mobile share sheet with clipboard fallback.
 */
export async function shareOrCopyLink(params: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied' | 'failed'> {
  notifyFlutterHost('shareLink', params);
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(params);
      return 'shared';
    } catch {
      // User cancelled or share unavailable; fall through to clipboard
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(params.url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}
