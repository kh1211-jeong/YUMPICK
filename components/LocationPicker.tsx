"use client";

import { useEffect, useState } from "react";
import { getCurrentLocation } from "@/lib/geo";
import KakaoMap from "./KakaoMap";
import type { PlaceResult } from "@/lib/kakao";

export default function LocationPicker({
  onConfirm,
  confirming,
}: {
  onConfirm: (lat: number, lng: number) => void;
  confirming: boolean;
}) {
  const [selected, setSelected] = useState<{ lat: number; lng: number; label: string } | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getCurrentLocation().then(({ lat, lng }) => setSelected({ lat, lng, label: "현재 위치" }));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/place-search?query=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      setResults(json.places ?? []);
    } finally {
      setSearching(false);
    }
  }

  function handlePick(p: PlaceResult) {
    setSelected({ lat: p.lat, lng: p.lng, label: p.name });
    setResults([]);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-3">
      {selected ? (
        <div className="card flex flex-col gap-2 p-4">
          <span className="text-[13px] font-medium text-text-muted">기준 위치: {selected.label}</span>
          <KakaoMap lat={selected.lat} lng={selected.lng} radiusM={3000} className="h-36 w-full" />
        </div>
      ) : (
        <div className="card flex h-36 w-full items-center justify-center p-4 text-sm text-text-muted">
          위치 확인 중...
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="input-field flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장소를 검색해서 기준점을 바꿀 수 있어요"
        />
        <button type="submit" className="btn btn-secondary px-4" disabled={!query.trim() || searching}>
          검색
        </button>
      </form>

      {results.length > 0 ? (
        <div className="flex max-h-52 flex-col gap-2 overflow-y-auto">
          {results.map((p) => (
            <button
              key={`${p.name}-${p.lat}-${p.lng}`}
              onClick={() => handlePick(p)}
              className="card flex flex-col items-start gap-0.5 p-3 text-left"
            >
              <span className="text-[14px] font-semibold text-text">{p.name}</span>
              <span className="text-xs text-text-muted">{p.address}</span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        className="btn btn-primary"
        disabled={!selected || confirming}
        onClick={() => selected && onConfirm(selected.lat, selected.lng)}
      >
        {confirming ? "확인 중..." : "여기 기준으로 찾을게요"}
      </button>
    </div>
  );
}
