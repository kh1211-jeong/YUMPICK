"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
        Marker: new (options: { position: unknown; map?: unknown }) => { setMap: (map: unknown) => void };
        Circle: new (options: Record<string, unknown>) => unknown;
      };
    };
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadKakaoSdk(appKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.kakao?.maps?.Map) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error("Kakao Maps SDK load failed"));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

export default function KakaoMap({
  lat,
  lng,
  radiusM,
  className,
}: {
  lat: number;
  lng: number;
  radiusM?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  useEffect(() => {
    if (!appKey || !ref.current) return;
    let cancelled = false;

    loadKakaoSdk(appKey).then(() => {
      if (cancelled || !ref.current) return;
      const kakao = window.kakao;
      const center = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(ref.current, { center, level: 5 });
      new kakao.maps.Marker({ position: center, map });
      if (radiusM) {
        new kakao.maps.Circle({
          center,
          radius: radiusM,
          strokeWeight: 1,
          strokeColor: "#E8703A",
          strokeOpacity: 0.5,
          fillColor: "#FCE9DE",
          fillOpacity: 0.5,
          map,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [appKey, lat, lng, radiusM]);

  if (!appKey) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-yum-soft text-sm text-text-muted ${className ?? "h-40 w-full"}`}
      >
        지도 표시 (카카오맵 키 필요)
      </div>
    );
  }

  return <div ref={ref} className={`overflow-hidden rounded-2xl ${className ?? "h-40 w-full"}`} />;
}
