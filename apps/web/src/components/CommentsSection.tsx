import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { MessageCircle } from "lucide-react";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { formatDate } from "../lib/utils";
import type { Comment } from "../types";

interface CommentFormValues {
  content: string;
}

interface CommentsSectionProps {
  articleId: string;
  newspaperId: string;
  initialComments: Comment[];
  isLoggedIn: boolean;
}

export function CommentsSection({
  articleId,
  newspaperId,
  initialComments,
  isLoggedIn,
}: CommentsSectionProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<CommentFormValues>({ defaultValues: { content: "" } });
  const commentContent = watch("content", "");

  const postComment = useMutation({
    mutationFn: async ({ content }: CommentFormValues) => {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/comments`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        },
      );
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json() as Promise<Comment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article", newspaperId, articleId] });
      reset();
    },
  });

  /* Merge optimistic + server comments: use initialComments (from cache) as source of truth */
  const comments = initialComments;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <MessageCircle size={20} />
        Comments ({comments.length})
      </h2>

      {isLoggedIn && (
        <form
          onSubmit={handleSubmit((values) => postComment.mutate(values))}
          className="flex flex-col gap-3"
        >
          <Textarea
            placeholder="Write a comment…"
            maxLength={2000}
            rows={3}
            {...register("content")}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!commentContent.trim() || isSubmitting || postComment.isPending}
            >
              {isSubmitting || postComment.isPending ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No comments yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border-border rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xs font-semibold">@{comment.author.username}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDate(comment.created_at, "long")}
                </span>
              </div>
              <p className="text-foreground text-sm leading-relaxed">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
