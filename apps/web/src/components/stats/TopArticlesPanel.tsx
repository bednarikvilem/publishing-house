import { useState } from "react";
import type { ArticleStat, NewspaperStats } from "./types";
import { HorizBar } from "./HorizBar";
import { StatCard } from "./StatCard";
import { Empty } from "./internal";
import { Icons } from "./internal";
import { Button } from "../ui/button";

type TopTab = "views" | "likes" | "comments";

export function TopArticlesPanel({ stats }: { stats: NewspaperStats }) {
  const [tab, setTab] = useState<TopTab>("views");

  const tabs: { key: TopTab; label: string }[] = [
    { key: "views",    label: "Most Viewed"    },
    { key: "likes",    label: "Most Liked"     },
    { key: "comments", label: "Most Commented" },
  ];

  const rows: Record<TopTab, ArticleStat[]> = {
    views:    stats.views.top_by_views,
    likes:    stats.views.top_by_likes,
    comments: stats.views.top_by_comments,
  };

  const metricKey: Record<TopTab, keyof ArticleStat> = {
    views: "views", likes: "likes", comments: "comments",
  };

  const data = rows[tab];
  const max = Math.max(...data.map((r) => r[metricKey[tab]] as number), 1);

  return (
    <StatCard title="Top Articles" icon={<Icons.Trend />}>
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <Button
            key={t.key}
            onClick={() => setTab(t.key)}
            variant={tab === t.key ? "default" : "secondary"}
            size="xs"
          >
            {t.label}
          </Button>
        ))}
      </div>
      {data.length === 0 ? (
        <Empty msg="No data yet." />
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <HorizBar
              key={r.article_id}
              label={r.title}
              value={r[metricKey[tab]] as number}
              max={max}
              sub={
                tab === "views"
                  ? `${r.completions} full reads · ${r.views > 0 ? Math.round((r.completions / r.views) * 100) : 0}% read-through`
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </StatCard>
  );
}
