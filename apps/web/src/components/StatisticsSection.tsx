import { useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArticleStat {
    article_id:      string;
    title:           string;
    views:           number;
    completions:     number;
    likes:           number;
    comments:        number;
    engagement_rate: number;
}

interface EditorStat {
    id:            string;
    name:          string | null;
    total:         number;
    approved:      number;
    rejected:      number;
    revisions:     number;
    approval_rate: number;
}

interface NewspaperStats {
    newspaper_id: string;
    subscribers:  { total: number };
    articles: {
        total_published:       number;
        total_draft:           number;
        total_in_review:       number;
        total_rejected:        number;
        avg_days_to_publish:   number | null;
        published_by_category: { category: string; count: number }[];
        published_by_author:   { author_id: string; full_name: string | null; count: number }[];
    };
    views: {
        total_views:           number;
        total_reads_completed: number;
        read_through_rate:     number;
        views_timeline:        { date: string; view_count: number }[];
        top_by_views:          ArticleStat[];
        top_by_likes:          ArticleStat[];
        top_by_comments:       ArticleStat[];
    };
    engagement: {
        total_likes:              number;
        total_comments:           number;
        engagement_rate:          number;
        avg_likes_per_article:    number;
        avg_comments_per_article: number;
    };
    editors: { performance: EditorStat[] };
    publication_timeline: { date: string; published_count: number }[];
}

interface GlobalStats {
    totals: {
        subscribers:     number;
        total_views:     number;
        total_likes:     number;
        total_comments:  number;
        total_published: number;
    };
    per_newspaper: {
        newspaper_id:      string;
        newspaper_name:    string;
        subscribers:       number;
        total_views:       number;
        total_likes:       number;
        total_comments:    number;
        read_through_rate: number;
        total_published:   number;
    }[];
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "blue", icon }: {
    label:  string;
    value:  string | number;
    sub?:   string;
    color?: "blue" | "green" | "purple" | "orange" | "rose" | "teal";
    icon:   React.ReactNode;
}) {
    const bg: Record<string, string> = {
        blue:   "bg-blue-50   text-blue-600",
        green:  "bg-green-50  text-green-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600",
        rose:   "bg-rose-50   text-rose-600",
        teal:   "bg-teal-50   text-teal-600",
    };
    return (
        <div className="border-border bg-card rounded-xl border p-5 flex gap-4 items-start">
            <div className={`p-3 rounded-xl shrink-0 ${bg[color]}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs truncate">{label}</p>
                <p className="text-foreground text-2xl font-bold leading-tight">{value}</p>
                {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function HorizBar({ label, value, max, sub }: {
    label: string; value: number; max: number; sub?: string;
}) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div>
            <div className="flex items-center gap-3">
                <span className="w-36 text-sm text-foreground truncate">{label}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <span className="w-8 text-right text-sm font-medium text-foreground">{value}</span>
            </div>
            {sub && <p className="text-muted-foreground text-xs mt-0.5 ml-[9.75rem]">{sub}</p>}
        </div>
    );
}

function Card({ title, icon, children }: {
    title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="border-border bg-card rounded-xl border p-6">
            <h3 className="text-foreground font-semibold mb-5 flex items-center gap-2">
                {icon}{title}
            </h3>
            {children}
        </div>
    );
}

function Empty({ msg }: { msg: string }) {
    return <p className="text-muted-foreground text-sm">{msg}</p>;
}

// ── Bar timeline ──────────────────────────────────────────────────────────────

function Timeline({ data, valueKey, label, color = "bg-primary" }: {
    data:     Record<string, number | string>[];
    valueKey: string;
    label:    string;
    color?:   string;
}) {
    if (!data.length) return <Empty msg={`No ${label.toLowerCase()} data yet.`} />;
    const max = Math.max(...data.map(d => d[valueKey] as number), 1);
    return (
        <div>
            <div className="flex items-end gap-0.5 h-20">
                {data.map((d, i) => {
                    const val = d[valueKey] as number;
                    const pct = Math.round((val / max) * 100);
                    return (
                        <div key={i} className="flex-1 flex items-end group cursor-default"
                            title={`${d.date}: ${val}`}>
                            <div className={`w-full ${color} group-hover:opacity-70 rounded-sm transition-opacity`}
                                style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }} />
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{data[0]?.date}</span>
                <span>{data[data.length - 1]?.date}</span>
            </div>
        </div>
    );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const I = {
    Users:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0z" /></svg>,
    Eye:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    Check:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2" /></svg>,
    Heart:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>,
    Chat:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>,
    Doc:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7l-5-5H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Clock:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>,
    Trend:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    Globe:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
    Star:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
};

// ── Top-articles tabbed panel ─────────────────────────────────────────────────

type TopTab = "views" | "likes" | "comments";

function TopArticlesPanel({ stats }: { stats: NewspaperStats }) {
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
    const max  = Math.max(...data.map(r => r[metricKey[tab]] as number), 1);

    return (
        <Card title="Top Articles" icon={<I.Trend />}>
            <div className="flex gap-2 mb-4">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            tab === t.key
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>
            {data.length === 0
                ? <Empty msg="No data yet." />
                : (
                    <div className="space-y-3">
                        {data.map(r => (
                            <HorizBar
                                key={r.article_id}
                                label={r.title}
                                value={r[metricKey[tab]] as number}
                                max={max}
                                sub={tab === "views"
                                    ? `${r.completions} full reads · ${r.views > 0 ? Math.round((r.completions / r.views) * 100) : 0}% read-through`
                                    : undefined}
                            />
                        ))}
                    </div>
                )}
        </Card>
    );
}

// ── Newspaper-level dashboard ─────────────────────────────────────────────────

function NewspaperStatsDashboard({ stats }: { stats: NewspaperStats }) {
    const maxCat    = Math.max(...stats.articles.published_by_category.map(c => c.count), 1);
    const maxAuthor = Math.max(...stats.articles.published_by_author.map(a => a.count), 1);
    const maxEditor = Math.max(...stats.editors.performance.map(e => e.total), 1);
    const pipeTotal = stats.articles.total_published + stats.articles.total_in_review +
                      stats.articles.total_draft     + stats.articles.total_rejected;

    return (
        <div className="space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <KpiCard color="blue"   label="Subscribers"     value={stats.subscribers.total.toLocaleString()}                        icon={<I.Users />} />
                <KpiCard color="green"  label="Total Views"     value={stats.views.total_views.toLocaleString()}      sub="all articles" icon={<I.Eye />}   />
                <KpiCard color="purple" label="Read-Through"    value={`${stats.views.read_through_rate}%`}
                    sub={`${stats.views.total_reads_completed.toLocaleString()} full reads`}                                            icon={<I.Check />} />
                <KpiCard color="rose"   label="Total Likes"     value={stats.engagement.total_likes.toLocaleString()}                   icon={<I.Heart />} />
                <KpiCard color="orange" label="Total Comments"  value={stats.engagement.total_comments.toLocaleString()}                icon={<I.Chat />}  />
                <KpiCard color="green"  label="Published"       value={stats.articles.total_published.toLocaleString()}
                    sub={`${stats.articles.total_in_review} in review`}                                                                 icon={<I.Doc />}   />
                <KpiCard color="teal"   label="Avg. to Publish"
                    value={stats.articles.avg_days_to_publish != null ? `${stats.articles.avg_days_to_publish}d` : "—"}
                    sub="submission → live"                                                                                              icon={<I.Clock />} />
            </div>

            {/* Engagement quick-stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Engagement Rate",        value: `${stats.engagement.engagement_rate}%`,       sub: "(likes + comments) per 100 views" },
                    { label: "Avg Likes / Article",    value: stats.engagement.avg_likes_per_article,        sub: "across published articles"        },
                    { label: "Avg Comments / Article", value: stats.engagement.avg_comments_per_article,     sub: "across published articles"        },
                ].map(c => (
                    <div key={c.label} className="border-border bg-card rounded-xl border p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{c.value}</p>
                        <p className="text-sm font-medium text-foreground mt-1">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.sub}</p>
                    </div>
                ))}
            </div>

            {/* Timelines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Views — Last 30 Days" icon={<I.Eye />}>
                    <Timeline data={stats.views.views_timeline as any} valueKey="view_count" label="Views" color="bg-blue-400" />
                </Card>
                <Card title="Publications — Last 30 Days" icon={<I.Doc />}>
                    <Timeline data={stats.publication_timeline as any} valueKey="published_count" label="Publications" color="bg-green-400" />
                </Card>
            </div>

            {/* Top articles */}
            <TopArticlesPanel stats={stats} />

            {/* Pipeline + by-category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Article Pipeline" icon={<I.Doc />}>
                    <div className="space-y-3">
                        {[
                            { label: "Published", value: stats.articles.total_published, color: "bg-green-400"  },
                            { label: "In Review", value: stats.articles.total_in_review, color: "bg-yellow-400" },
                            { label: "Draft",     value: stats.articles.total_draft,     color: "bg-gray-300"   },
                            { label: "Rejected",  value: stats.articles.total_rejected,  color: "bg-red-400"    },
                        ].map(item => {
                            const pct = pipeTotal > 0 ? Math.round((item.value / pipeTotal) * 100) : 0;
                            return (
                                <div key={item.label} className="flex items-center gap-3">
                                    <span className="w-20 text-sm text-foreground">{item.label}</span>
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                        <div className={`${item.color} h-2 rounded-full transition-all duration-500`}
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-8 text-right text-sm font-medium text-foreground">{item.value}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card title="By Category" icon={<I.Star />}>
                    {stats.articles.published_by_category.length === 0
                        ? <Empty msg="No categories yet." />
                        : <div className="space-y-2">
                            {stats.articles.published_by_category.map(c => (
                                <HorizBar key={c.category} label={c.category} value={c.count} max={maxCat} />
                            ))}
                        </div>}
                </Card>
            </div>

            {/* By author + editor performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="By Author" icon={<I.Users />}>
                    {stats.articles.published_by_author.length === 0
                        ? <Empty msg="No authors yet." />
                        : <div className="space-y-2">
                            {stats.articles.published_by_author.map(a => (
                                <HorizBar key={a.author_id} label={a.full_name ?? "Unknown"} value={a.count} max={maxAuthor} />
                            ))}
                        </div>}
                </Card>

                <Card title="Editor Performance" icon={<I.Check />}>
                    {stats.editors.performance.length === 0
                        ? <Empty msg="No reviews recorded yet." />
                        : <div className="space-y-3">
                            {stats.editors.performance.map(e => (
                                <HorizBar
                                    key={e.id}
                                    label={e.name ?? "Unknown"}
                                    value={e.total}
                                    max={maxEditor}
                                    sub={`${e.approved} approved · ${e.rejected} rejected · ${e.revisions} revisions · ${e.approval_rate}% approval`}
                                />
                            ))}
                        </div>}
                </Card>
            </div>
        </div>
    );
}

// ── Director global view ──────────────────────────────────────────────────────

function GlobalStatsDashboard({ data }: { data: GlobalStats }) {
    const maxViews = Math.max(...data.per_newspaper.map(n => n.total_views), 1);
    const sorted   = [...data.per_newspaper].sort((a, b) => b.total_views - a.total_views);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard color="blue"   label="Total Subscribers" value={data.totals.subscribers.toLocaleString()}     icon={<I.Users />} />
                <KpiCard color="green"  label="Total Views"       value={data.totals.total_views.toLocaleString()}     icon={<I.Eye />}   />
                <KpiCard color="green"  label="Published"         value={data.totals.total_published.toLocaleString()} icon={<I.Doc />}   />
                <KpiCard color="rose"   label="Total Likes"       value={data.totals.total_likes.toLocaleString()}     icon={<I.Heart />} />
                <KpiCard color="orange" label="Total Comments"    value={data.totals.total_comments.toLocaleString()}  icon={<I.Chat />}  />
            </div>

            <Card title="Newspaper Comparison" icon={<I.Globe />}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {["Newspaper","Subscribers","Published","Views","Read-Through","Likes","Comments",""].map(h => (
                                    <th key={h} className={`pb-3 text-muted-foreground font-medium ${h === "Newspaper" ? "text-left" : "text-right"}`}>{h}</th>
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
                                            <div className="bg-primary h-1.5 rounded-full"
                                                style={{ width: `${Math.round((np.total_views / maxViews) * 100)}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ── Root export ───────────────────────────────────────────────────────────────

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

    useEffect(() => {
        if (view === "newspaper" && !newspaperId) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        const url = view === "global"
            ? `${API_BASE_URL}/api/statistics/global`
            : `${API_BASE_URL}/api/newspapers/${newspaperId}/statistics`;

        fetch(url, { headers: authHeaders() })
            .then(res => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                if (view === "global") setGlobalStats(data as GlobalStats);
                else                   setNpStats(data as NewspaperStats);
            })
            .catch(() => { if (!cancelled) setError("Failed to load statistics. Please try again."); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [view, newspaperId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-foreground text-2xl font-bold">Statistics</h1>
                {isDirector && (
                    <div className="flex gap-1 border-border border rounded-lg p-1">
                        {(["global", "newspaper"] as const).map(v => (
                            <button key={v} onClick={() => setView(v)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    view === v
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}>
                                {v === "global" ? "All Newspapers" : "This Newspaper"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading statistics…
                </div>
            )}

            {!loading && error && (
                <div className="border border-red-200 bg-red-50 rounded-xl p-5 text-red-600 text-sm">{error}</div>
            )}

            {!loading && !error && view === "global"    && globalStats && <GlobalStatsDashboard data={globalStats} />}
            {!loading && !error && view === "newspaper" && npStats     && <NewspaperStatsDashboard stats={npStats} />}
        </div>
    );
}