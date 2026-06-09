import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, setArticleSubscriberOnly } from "../lib/api";
import { useToast } from "../components/ui/toaster";
import type { PaginatedResponse, ReviewDecision } from "../types";
import type { QueueArticle } from "../types/dashboard";

type Editor = { id: string; full_name: string };

export function useEditorialQueue(newspaperId: string) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ["editorial-queue", newspaperId, currentPage],
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles.queue.get({
          query: { page: currentPage, limit: 20, view: "NEWSPAPER_MANAGER" },
        });
      if (error) throw error;
      return data as PaginatedResponse<QueueArticle>;
    },
  });

  const editorsQuery = useQuery({
    queryKey: ["editors", newspaperId],
    enabled: activeId !== null,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .editors.get();
      if (error) throw error;
      return (data as { data: Editor[] }).data;
    },
  });

  const invalidateQueue = () =>
    queryClient.invalidateQueries({ queryKey: ["editorial-queue", newspaperId] });

  const invalidateAfterTransition = (articleId: string) => {
    for (const key of ["editorial-queue", "review-queue", "approval-queue", "publication-queue"]) {
      queryClient.invalidateQueries({ queryKey: [key, newspaperId] });
    }
    queryClient.invalidateQueries({ queryKey: ["article", newspaperId, articleId] });
  };

  const assignEditor = useMutation({
    mutationFn: async ({ articleId, editorId }: { articleId: string; editorId: string }) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId })
        .status.patch({ action: "ASSIGN_EDITOR", editor_id: editorId });
      if (error) throw error;
    },
    onSuccess: (_data, { articleId }) => {
      setActiveId(null);
      invalidateAfterTransition(articleId);
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to assign editor. Please try again.",
        variant: "error",
      }),
  });

  const toggleSubscriber = useMutation({
    mutationFn: ({ articleId, current }: { articleId: string; current: boolean }) =>
      setArticleSubscriberOnly(newspaperId, articleId, !current),
    onSuccess: (_data, { articleId }) => {
      invalidateQueue();
      queryClient.invalidateQueries({ queryKey: ["article", newspaperId, articleId] });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to update subscriber-only setting. Please try again.",
        variant: "error",
      }),
  });

  const approve = useMutation({
    mutationFn: async ({
      articleId,
      decision,
      note,
    }: {
      articleId: string;
      decision: ReviewDecision;
      note: string;
    }) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId })
        .status.patch({
          action: "APPROVE",
          decision,
          note: note || undefined,
          view: "NEWSPAPER_MANAGER",
        });
      if (error) throw error;
    },
    onSuccess: (_data, { articleId }) => {
      setActiveId(null);
      invalidateAfterTransition(articleId);
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "error",
      }),
  });

  function toggleActive(articleId: string) {
    setActiveId((prev) => (prev === articleId ? null : articleId));
  }

  function setPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  }

  return {
    articles: queueQuery.data?.data ?? [],
    totalPages: queueQuery.data?.pagination.total_pages ?? 1,
    total: queueQuery.data?.pagination.total ?? 0,
    currentPage,
    isLoading: queueQuery.isLoading,
    isError: queueQuery.isError,
    editors: editorsQuery.data ?? [],
    loadingEditors: editorsQuery.isLoading,
    activeId,
    toggleActive,
    setPage,
    assignEditor,
    toggleSubscriber,
    approve,
  };
}
