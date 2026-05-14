import type { NewspaperStats } from "./types";
import { KpiCard } from "./KpiCard";
import { HorizBar } from "./HorizBar";
import { StatCard } from "./StatCard";
import { Timeline } from "./Timeline";
import { TopArticlesPanel } from "./TopArticlesPanel";
import { Empty, Icons } from "./internal";

export function NewspaperStatsDashboard({ stats }: { stats: NewspaperStats }) {
  const maxCat    = Math.max(...stats.articles.published_by_category.map((c) => c.count), 1);
  const maxAuthor = Math.max(...stats.articles.published_by_author.map((a) => a.count), 1);
  const maxEditor = Math.max(...stats.editors.performance.map((e) => e.total), 1);
  const pipeTotal =
    stats.articles.total_published + stats.articles.total_in_review +
    stats.articles.total_draft     + stats.articles.total_rejected;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard color="blue"   label="Subscribers"    value={stats.subscribers.total.toLocaleString()}                       icon={<Icons.Users />} />
        <KpiCard color="green"  label="Total Views"    value={stats.views.total_views.toLocaleString()}    sub="all articles"  icon={<Icons.Eye />}   />
        <KpiCard color="purple" label="Read-Through"   value={`${stats.views.read_through_rate}%`}
          sub={`${stats.views.total_reads_completed.toLocaleString()} full reads`}                                             icon={<Icons.Check />} />
        <KpiCard color="rose"   label="Total Likes"    value={stats.engagement.total_likes.toLocaleString()}                  icon={<Icons.Heart />} />
        <KpiCard color="orange" label="Total Comments" value={stats.engagement.total_comments.toLocaleString()}               icon={<Icons.Chat />}  />
        <KpiCard color="green"  label="Published"      value={stats.articles.total_published.toLocaleString()}
          sub={`${stats.articles.total_in_review} in review`}                                                                 icon={<Icons.Doc />}   />
        <KpiCard color="teal"   label="Avg. to Publish"
          value={stats.articles.avg_days_to_publish != null ? `${stats.articles.avg_days_to_publish}d` : "—"}
          sub="submission → live"                                                                                              icon={<Icons.Clock />} />
      </div>

      {/* Engagement quick-stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Engagement Rate",        value: `${stats.engagement.engagement_rate}%`,      sub: "(likes + comments) per 100 views" },
          { label: "Avg Likes / Article",    value: stats.engagement.avg_likes_per_article,       sub: "across published articles"        },
          { label: "Avg Comments / Article", value: stats.engagement.avg_comments_per_article,    sub: "across published articles"        },
        ].map((c) => (
          <div key={c.label} className="border-border bg-card rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm font-medium text-foreground mt-1">{c.label}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Timelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="Views — Last 30 Days" icon={<Icons.Eye />}>
          <Timeline data={stats.views.views_timeline as any} valueKey="view_count" label="Views" color="bg-blue-400" />
        </StatCard>
        <StatCard title="Publications — Last 30 Days" icon={<Icons.Doc />}>
          <Timeline data={stats.publication_timeline as any} valueKey="published_count" label="Publications" color="bg-green-400" />
        </StatCard>
      </div>

      {/* Top articles */}
      <TopArticlesPanel stats={stats} />

      {/* Pipeline + by-category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="Article Pipeline" icon={<Icons.Doc />}>
          <div className="space-y-3">
            {[
              { label: "Published", value: stats.articles.total_published, color: "bg-green-400"  },
              { label: "In Review", value: stats.articles.total_in_review, color: "bg-yellow-400" },
              { label: "Draft",     value: stats.articles.total_draft,     color: "bg-gray-300"   },
              { label: "Rejected",  value: stats.articles.total_rejected,  color: "bg-red-400"    },
            ].map((item) => {
              const pct = pipeTotal > 0 ? Math.round((item.value / pipeTotal) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-foreground">{item.label}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-foreground">{item.value}</span>
                </div>
              );
            })}
          </div>
        </StatCard>

        <StatCard title="By Category" icon={<Icons.Star />}>
          {stats.articles.published_by_category.length === 0 ? (
            <Empty msg="No categories yet." />
          ) : (
            <div className="space-y-2">
              {stats.articles.published_by_category.map((c) => (
                <HorizBar key={c.category} label={c.category} value={c.count} max={maxCat} />
              ))}
            </div>
          )}
        </StatCard>
      </div>

      {/* By author + editor performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="By Author" icon={<Icons.Users />}>
          {stats.articles.published_by_author.length === 0 ? (
            <Empty msg="No authors yet." />
          ) : (
            <div className="space-y-2">
              {stats.articles.published_by_author.map((a) => (
                <HorizBar key={a.author_id} label={a.full_name ?? "Unknown"} value={a.count} max={maxAuthor} />
              ))}
            </div>
          )}
        </StatCard>

        <StatCard title="Editor Performance" icon={<Icons.Check />}>
          {stats.editors.performance.length === 0 ? (
            <Empty msg="No reviews recorded yet." />
          ) : (
            <div className="space-y-3">
              {stats.editors.performance.map((e) => (
                <HorizBar
                  key={e.id}
                  label={e.name ?? "Unknown"}
                  value={e.total}
                  max={maxEditor}
                  sub={`${e.approved} approved · ${e.rejected} rejected · ${e.revisions} revisions · ${e.approval_rate}% approval`}
                />
              ))}
            </div>
          )}
        </StatCard>
      </div>
    </div>
  );
}
