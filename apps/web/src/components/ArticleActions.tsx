import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { client } from "../lib/api";
import { Button } from "./ui/button";

interface ArticleActionsProps {
  articleId: string;
  newspaperId: string;
  initialLikesCount: number;
  initialLikedByMe: boolean;
  isLoggedIn: boolean;
}

export function ArticleActions({
  articleId,
  newspaperId,
  initialLikesCount,
  initialLikedByMe,
  isLoggedIn,
}: ArticleActionsProps) {
  const queryClient = useQueryClient();
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);

  const toggleLike = useMutation({
    mutationFn: async (wasLiked: boolean) => {
      const likes = client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId }).likes;
      const { data, error } = wasLiked ? await likes.delete() : await likes.post();
      if (error) throw error;
      return data as { likes_count: number };
    },
    onMutate: (wasLiked) => {
      setLikedByMe(!wasLiked);
      setLikesCount((c) => c + (wasLiked ? -1 : 1));
    },
    onSuccess: (data) => {
      setLikesCount(data.likes_count);
      queryClient.invalidateQueries({ queryKey: ["article", newspaperId, articleId] });
    },
    onError: (_err, wasLiked) => {
      setLikedByMe(wasLiked);
      setLikesCount((c) => c + (wasLiked ? 1 : -1));
    },
  });

  if (!isLoggedIn) {
    return (
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Heart size={16} />
        {likesCount} {likesCount === 1 ? "Like" : "Likes"}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => toggleLike.mutate(likedByMe)}
      disabled={toggleLike.isPending}
      className={likedByMe ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100 rounded-full" : "rounded-full"}
    >
      <Heart
        size={16}
        className={likedByMe ? "fill-red-500 stroke-red-500" : ""}
      />
      {likesCount} {likesCount === 1 ? "Like" : "Likes"}
    </Button>
  );
}
