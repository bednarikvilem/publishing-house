import { Link, useParams, useNavigate } from "react-router-dom";
import type { Article } from "../types/article";
import { CategoryBadge } from "./CategoryBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ArticleCard({ article }: { article: Article }) {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card cursor-pointer"
      onClick={() => navigate(`/${newspaperName}/articles/${article.id}`)}
    >
      <div className="h-[200px] overflow-hidden">
        {article.primary_image ? (
          <img
            src={article.primary_image.url}
            alt={article.primary_image.caption}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <CategoryBadge label={article.category} />
        <p className="line-clamp-3 text-[16px] font-bold leading-[1.3] text-card-foreground">
          {article.title}
        </p>
        <p className="line-clamp-3 text-[13px] leading-[1.5] text-muted-foreground">
          {article.perex}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <Link
            to={`/${newspaperName}/authors/${article.author.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {article.author.full_name}
          </Link>
          <span className="text-[12px] text-muted-foreground">
            {formatDate(article.publication_date)}
          </span>
        </div>
      </div>
    </div>
  );
}
