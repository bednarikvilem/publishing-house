export function HorizBar({ label, value, max, sub }: {
  label: string;
  value: number;
  max: number;
  sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="w-36 text-sm text-foreground truncate">{label}</span>
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-right text-sm font-medium text-foreground">{value}</span>
      </div>
      {sub && <p className="text-muted-foreground text-xs mt-0.5 ml-[9.75rem]">{sub}</p>}
    </div>
  );
}
