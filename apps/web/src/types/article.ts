export interface Article {
  id: string;
  title: string;
  perex: string;
  publication_date: string;
  category: string;
  keywords: string[];
  primary_image: { url: string; caption: string } | null;
  author: { id: string; full_name: string; profile_picture: string | null };
}

export interface ArticlesResponse {
  data: Article[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export interface AuthorDetail {
  id: string;
  full_name: string;
  profile_picture: string | null;
  role: string;
  bio: string;
  articles_count: number;
  years_active: number;
  total_likes: number;
  social_links: {
    twitter?: string;
    linkedin?: string;
    email?: string;
  };
  articles: Article[];
}

export interface ArticleDetail {
  id: string;
  title: string;
  perex: string;
  content: string;
  publication_date: string;
  category: string;
  keywords: string[];
  likes_count: number;
  liked_by_me: boolean;
  author: { id: string; full_name: string; profile_picture: string | null };
  images: { url: string; caption: string; is_primary: boolean }[];
  comments: {
    id: string;
    content: string;
    created_at: string;
    author: { id: string; username: string };
  }[];
}
