export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params ?? {});
  } else {
    console.log("[GA mock]", name, params ?? {});
  }
}
