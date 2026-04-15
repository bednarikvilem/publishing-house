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
