export default function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden className="text-[var(--yum)] text-sm leading-none">
        {"★".repeat(full)}
        {half ? "☆" : ""}
      </span>
      <span className="tabular-nums text-xs text-text-muted">{rating.toFixed(1)}</span>
    </span>
  );
}
