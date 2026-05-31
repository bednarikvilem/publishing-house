export interface ArticleStat {
  article_id: string;
  title: string;
  views: number;
  completions: number;
  likes: number;
  comments: number;
  engagement_rate: number;
}

export interface EditorStat {
  id: string;
  name: string | null;
  total: number;
  approved: number;
  rejected: number;
  revisions: number;
  approval_rate: number;
}

export interface NewspaperStats {
  newspaper_id: string;
  subscribers: { total: number };
  articles: {
    total_published: number;
    total_draft: number;
    total_in_review: number;
    total_rejected: number;
    avg_days_to_publish: number | null;
    published_by_category: { category: string; count: number }[];
    published_by_author: { author_id: string; full_name: string | null; count: number }[];
  };
  views: {
    total_views: number;
    total_reads_completed: number;
    read_through_rate: number;
    views_timeline: { date: string; view_count: number }[];
    top_by_views: ArticleStat[];
    top_by_likes: ArticleStat[];
    top_by_comments: ArticleStat[];
  };
  engagement: {
    total_likes: number;
    total_comments: number;
    engagement_rate: number;
    avg_likes_per_article: number;
    avg_comments_per_article: number;
  };
  editors: { performance: EditorStat[] };
  publication_timeline: { date: string; published_count: number }[];
}

export interface GlobalStats {
  totals: {
    subscribers: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_published: number;
  };
  per_newspaper: {
    newspaper_id: string;
    newspaper_name: string;
    subscribers: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    read_through_rate: number;
    total_published: number;
  }[];
}
