export function HorizBar({ label, value, max, sub }: {
  label: string;
  value: number;
  max: number;
  sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex gap-3">
      <div className="flex w-36 shrink-0 flex-col">
        <span className="text-sm text-foreground truncate">{label}</span>
        {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      </div>
      <div className="flex flex-1 items-center gap-3">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-right text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}
