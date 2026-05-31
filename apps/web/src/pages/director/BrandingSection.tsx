import { useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { SectionTitle } from "../../components/SectionTitle";

const PRESETS: { key: string | null; label: string }[] = [
  { key: null,       label: "Default"  },
  { key: "blue",     label: "Blue"     },
  { key: "rose",     label: "Rose"     },
  { key: "emerald",  label: "Emerald"  },
  { key: "violet",   label: "Violet"   },
  { key: "orange",   label: "Orange"   },
  { key: "teal",     label: "Teal"     },
];

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
          {PRESETS.map(({ key, label }) => {
            const isActive = selected === key;
            return (
              <button
                key={String(key)}
                onClick={() => handleSelect(key)}
                title={label}
                className={`flex flex-col items-center gap-1.5 rounded-md p-2 transition-colors hover:bg-muted ${isActive ? "bg-muted" : ""}`}
              >
                <span
                  className={`h-9 w-9 rounded-full border-2 transition-all ${key ? `theme-${key}` : ""} ${isActive ? "ring-2 ring-offset-2 ring-current border-transparent" : "border-border"}`}
                  style={{ backgroundColor: "var(--primary)" }}
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
