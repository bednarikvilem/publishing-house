import type { GlobalStats } from "./types";
import { KpiCard } from "./KpiCard";
import { StatCard } from "./StatCard";
import { Icons } from "./internal";

export function GlobalStatsDashboard({ data }: { data: GlobalStats }) {
  const maxViews = Math.max(...data.per_newspaper.map((n) => n.total_views), 1);
  const sorted   = [...data.per_newspaper].sort((a, b) => b.total_views - a.total_views);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard color="blue"   label="Total Subscribers" value={data.totals.subscribers.toLocaleString()}     icon={<Icons.Users />} />
        <KpiCard color="green"  label="Total Views"       value={data.totals.total_views.toLocaleString()}     icon={<Icons.Eye />}   />
        <KpiCard color="green"  label="Published"         value={data.totals.total_published.toLocaleString()} icon={<Icons.Doc />}   />
        <KpiCard color="rose"   label="Total Likes"       value={data.totals.total_likes.toLocaleString()}     icon={<Icons.Heart />} />
        <KpiCard color="orange" label="Total Comments"    value={data.totals.total_comments.toLocaleString()}  icon={<Icons.Chat />}  />
      </div>

      <StatCard title="Newspaper Comparison" icon={<Icons.Globe />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Newspaper", "Subscribers", "Published", "Views", "Read-Through", "Likes", "Comments", ""].map((h) => (
                  <th
                    key={h}
                    className={`pb-3 text-muted-foreground font-medium ${h === "Newspaper" ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((np, i) => (
                <tr key={np.newspaper_id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium text-foreground">
                    {i === 0 && <span className="mr-1.5 text-yellow-500 text-xs">★</span>}
                    {np.newspaper_name}
                  </td>
                  <td className="py-3 text-right text-foreground">{np.subscribers.toLocaleString()}</td>
                  <td className="py-3 text-right text-foreground">{np.total_published.toLocaleString()}</td>
                  <td className="py-3 text-right text-foreground">{np.total_views.toLocaleString()}</td>
                  <td className="py-3 text-right text-foreground">{np.read_through_rate}%</td>
                  <td className="py-3 text-right text-foreground">{np.total_likes.toLocaleString()}</td>
                  <td className="py-3 text-right text-foreground">{np.total_comments.toLocaleString()}</td>
                  <td className="py-3 pl-3 w-24">
                    <div className="bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${Math.round((np.total_views / maxViews) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StatCard>
    </div>
  );
}
