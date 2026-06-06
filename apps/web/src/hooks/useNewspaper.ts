import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";
import type { Newspaper } from "../types";

interface UseNewspaperResult {
  newspaperName: string;
  newspaper: Newspaper | null;
  notFound: boolean;
}

export function useNewspaper(): UseNewspaperResult {
  const { newspaperName } = useParams<{ newspaperName: string }>();

  const { data: newspaper = null, isError } = useQuery({
    queryKey: ["newspaper", newspaperName],
    enabled: !!newspaperName,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client.api.newspapers["by-slug"]({
        slug: newspaperName!,
      }).get();
      if (error) throw error;
      return data as Newspaper;
    },
  });

  useEffect(() => {
    if (newspaper) document.title = newspaper.name;
  }, [newspaper]);

  return { newspaperName: newspaperName ?? "", newspaper, notFound: isError };
}
