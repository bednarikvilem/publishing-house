import { useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { SectionTitle } from "../../components/SectionTitle";

const PRESETS = [
  { key: null,       label: "Default",  color: "oklch(0.852 0.199 91.936)" },
  { key: "blue",     label: "Blue",     color: "oklch(0.623 0.214 255.6)" },
  { key: "rose",     label: "Rose",     color: "oklch(0.645 0.246 16.4)" },
  { key: "emerald",  label: "Emerald",  color: "oklch(0.696 0.17 162.5)" },
  { key: "violet",   label: "Violet",   color: "oklch(0.606 0.228 293.5)" },
  { key: "orange",   label: "Orange",   color: "oklch(0.749 0.207 58.0)" },
  { key: "teal",     label: "Teal",     color: "oklch(0.704 0.14 202.1)" },
] as const;

export function BrandingSection({
  newspaperId,
  currentColor,
}: {
  newspaperId: string;
  currentColor: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(currentColor);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(key: string | null) {
    setError(null);
    setSaved(false);
    const res = await fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ primary_color: key }),
    });
    if (!res.ok) {
      setError("Failed to save color. Please try again.");
      return;
    }
    setSelected(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Newspaper Branding" />
      <div className="flex flex-col gap-3">
        <p className="text-foreground text-[14px] font-semibold">Accent Color</p>
        <div className="flex flex-wrap gap-4">
          {PRESETS.map(({ key, label, color }) => {
            const isActive = selected === key;
            return (
              <button
                key={String(key)}
                onClick={() => handleSelect(key)}
                title={label}
                className={`flex flex-col items-center gap-1.5 rounded-md p-2 transition-colors hover:bg-muted ${isActive ? "bg-muted" : ""}`}
              >
                <span
                  className={`h-9 w-9 rounded-full border-2 transition-all ${isActive ? "ring-2 ring-offset-2 ring-current border-transparent" : "border-border"}`}
                  style={{ backgroundColor: color }}
                />
                <span className={`text-[11px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        {saved && (
          <p className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">Saved</p>
        )}
        {error && (
          <p className="text-destructive text-[13px]">{error}</p>
        )}
      </div>
    </div>
  );
}
