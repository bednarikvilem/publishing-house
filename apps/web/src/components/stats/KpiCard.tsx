type Color = "blue" | "green" | "purple" | "orange" | "rose" | "teal";

const colorClass: Record<Color, string> = {
  blue:   "bg-blue-50   text-blue-600",
  green:  "bg-green-50  text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
  rose:   "bg-rose-50   text-rose-600",
  teal:   "bg-teal-50   text-teal-600",
};

export function KpiCard({ label, value, sub, color = "blue", icon }: {
  label: string;
  value: string | number;
  sub?: string;
  color?: Color;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-5 flex gap-4 items-start">
      <div className={`p-3 rounded-xl shrink-0 ${colorClass[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs truncate">{label}</p>
        <p className="text-foreground text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
