import { useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../lib/api";
import type { NewspaperStats, GlobalStats } from "./stats/types";
import { NewspaperStatsDashboard } from "./stats/NewspaperStatsDashboard";
import { GlobalStatsDashboard } from "./stats/GlobalStatsDashboard";
import { LoadingState } from "./LoadingState";

export function StatisticsSection({
  newspaperId,
  isDirector = false,
}: {
  newspaperId: string;
  isDirector?: boolean;
}) {
  const [view, setView] = useState<"newspaper" | "global">(
    isDirector ? "global" : "newspaper"
  );
  const [npStats,     setNpStats]     = useState<NewspaperStats | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  useEffect(() => {
    if (view === "newspaper" && !newspaperId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const url =
      view === "global"
        ? `${API_BASE_URL}/api/statistics/global`
        : `${API_BASE_URL}/api/newspapers/${newspaperId}/statistics`;

    fetch(url, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (view === "global") setGlobalStats(data as GlobalStats);
        else                   setNpStats(data as NewspaperStats);
      })
      .catch(() => { if (!cancelled) setError("Failed to load statistics. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [view, newspaperId, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">Statistics</h1>

        <div className="flex items-center gap-2">
          {isDirector && !!newspaperId && (
            <div className="flex gap-1 border-border border rounded-lg p-1">
              {(["global", "newspaper"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === v
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "global" ? "All Newspapers" : "This Newspaper"}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Refresh statistics"
            disabled={loading}
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {loading && <LoadingState />}

      {!loading && error && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-5 text-red-600 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && view === "global"    && globalStats && <GlobalStatsDashboard data={globalStats} />}
      {!loading && !error && view === "newspaper" && npStats     && <NewspaperStatsDashboard stats={npStats} />}
    </div>
  );
}
