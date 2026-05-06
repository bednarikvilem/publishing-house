import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import type { Newspaper } from "../types";

interface UseNewspaperResult {
  newspaperName: string;
  newspaper: Newspaper | null;
  notFound: boolean;
}

export function useNewspaper(): UseNewspaperResult {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const [newspaper, setNewspaper] = useState<Newspaper | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!newspaperName) return;
    setNotFound(false);
    fetch(`${API_BASE_URL}/api/newspapers/by-slug/${newspaperName}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to fetch newspaper");
        return res.json() as Promise<Newspaper>;
      })
      .then((data) => {
        if (data) {
          setNewspaper(data);
          document.title = data.name;
        }
      })
      .catch(() => setNotFound(true));
  }, [newspaperName]);

  return { newspaperName: newspaperName ?? "", newspaper, notFound };
}
