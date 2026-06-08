import type { GlobalStats } from "./types";
import { KpiCard } from "./KpiCard";
import { StatCard } from "./StatCard";
import { Icons } from "./internal";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "../ui/table";

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
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {["Newspaper", "Subscribers", "Published", "Views", "Read-Through", "Likes", "Comments", ""].map((h) => (
                <TableHead
                  key={h}
                  className={`h-auto px-0 pb-3 font-medium ${h === "Newspaper" ? "" : "text-right"}`}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((np, i) => (
              <TableRow key={np.newspaper_id} className="border-border/50 last:border-0">
                <TableCell className="px-0 py-3 font-medium text-foreground">
                  {i === 0 && <span className="mr-1.5 text-yellow-500 text-xs">★</span>}
                  {np.newspaper_name}
                </TableCell>
                <TableCell className="px-0 py-3 text-right text-foreground">{np.subscribers.toLocaleString()}</TableCell>
                <TableCell className="px-0 py-3 text-right text-foreground">{np.total_published.toLocaleString()}</TableCell>
                <TableCell className="px-0 py-3 text-right text-foreground">{np.total_views.toLocaleString()}</TableCell>
                <TableCell className="px-0 py-3 text-right text-foreground">{np.read_through_rate}%</TableCell>
                <TableCell className="px-0 py-3 text-right text-foreground">{np.total_likes.toLocaleString()}</TableCell>
                <TableCell className="px-0 py-3 text-right text-foreground">{np.total_comments.toLocaleString()}</TableCell>
                <TableCell className="w-24 py-3 pl-3 pr-0">
                  <div className="bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${Math.round((np.total_views / maxViews) * 100)}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StatCard>
    </div>
  );
}
