import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";
import type { NewspaperStats, GlobalStats } from "./stats/types";
import { NewspaperStatsDashboard } from "./stats/NewspaperStatsDashboard";
import { GlobalStatsDashboard } from "./stats/GlobalStatsDashboard";
import { LoadingState } from "./LoadingState";
import { Button } from "@/components/ui/button";

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

  const globalStatsQuery = useQuery({
    queryKey: ["statistics", "global"],
    enabled: view === "global",
    queryFn: async () => {
      const { data, error } = await client.api.statistics.global.get();
      if (error) throw error;
      return data as GlobalStats;
    },
  });

  const npStatsQuery = useQuery({
    queryKey: ["statistics", "newspaper", newspaperId],
    enabled: view === "newspaper" && !!newspaperId,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .statistics.get();
      if (error) throw error;
      return data as NewspaperStats;
    },
  });

  const activeQuery = view === "global" ? globalStatsQuery : npStatsQuery;
  const loading = activeQuery.isFetching;
  const error = activeQuery.isError;
  const globalStats = globalStatsQuery.data;
  const npStats = npStatsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">Statistics</h1>

        <div className="flex items-center gap-2">
          {isDirector && !!newspaperId && (
            <div className="flex gap-1 border-border border rounded-lg p-1">
              {(["global", "newspaper"] as const).map((v) => (
                <Button
                  key={v}
                  variant="ghost"
                  size="sm"
                  onClick={() => setView(v)}
                  className={view === v ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background" : "text-muted-foreground hover:text-foreground"}
                >
                  {v === "global" ? "All Newspapers" : "This Newspaper"}
                </Button>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => activeQuery.refetch()}
            title="Refresh statistics"
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
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
          </Button>
        </div>
      </div>

      {loading && <LoadingState />}

      {!loading && error && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-5 text-red-600 text-sm">
          Failed to load statistics. Please try again.
        </div>
      )}

      {!loading && !error && view === "global"    && globalStats && <GlobalStatsDashboard data={globalStats} />}
      {!loading && !error && view === "newspaper" && npStats     && <NewspaperStatsDashboard stats={npStats} />}
    </div>
  );
}
