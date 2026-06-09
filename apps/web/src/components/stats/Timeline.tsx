import { Empty } from "./internal";

function fmtDay(value: number | string | Date | undefined): string {
  if (value == null) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

export function Timeline({ data, valueKey, label, color = "bg-primary" }: {
  data: Record<string, number | string | Date>[];
  valueKey: string;
  label: string;
  color?: string;
}) {
  if (!data.length) return <Empty msg={`No ${label.toLowerCase()} data yet.`} />;
  const max = Math.max(...data.map((d) => d[valueKey] as number), 1);
  return (
    <div>
      <div className="flex items-end gap-0.5 h-20">
        {data.map((d, i) => {
          const val = d[valueKey] as number;
          const pct = Math.round((val / max) * 100);
          return (
            <div
              key={i}
              className="flex-1 h-full flex items-end group cursor-default"
              title={`${fmtDay(d.date)}: ${val}`}
            >
              <div
                className={`w-full ${color} group-hover:opacity-70 rounded-sm transition-opacity`}
                style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{fmtDay(data[0]?.date)}</span>
        <span>{fmtDay(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}
