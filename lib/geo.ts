const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.978 }; // 서울시청 (위치 권한 거부/실패 시 기본값)

export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(DEFAULT_LOCATION),
      { timeout: 5000 }
    );
  });
}
