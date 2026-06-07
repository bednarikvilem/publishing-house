import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface UseCategoryResult {
  categorySlug: string;
  category: Category | null;
}

export function useCategory(
  newspaperId: string | undefined
): UseCategoryResult {
  const { categoryName: categorySlug } = useParams<{ categoryName: string }>();

  const { data: category = null } = useQuery({
    queryKey: ["category", newspaperId, categorySlug],
    enabled: !!newspaperId && !!categorySlug,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId! })
        .categories["by-slug"]({ slug: categorySlug! })
        .get();
      if (error) throw error;
      return data as Category;
    },
  });

  return { categorySlug: categorySlug ?? "", category };
}
