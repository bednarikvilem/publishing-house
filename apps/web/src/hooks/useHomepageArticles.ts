import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";
import type { Article, ArticlesResponse } from "../types/article";

export function useHomepageArticles(newspaperId: string | null | undefined) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["homepage-articles", newspaperId],
    enabled: !!newspaperId,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId! })
        .articles.get({ query: { page: 1, limit: 20 } });
      if (error) throw error;
      return (data as ArticlesResponse).data as Article[];
    },
  });

  return { articles: data ?? [], isLoading, isError };
}
