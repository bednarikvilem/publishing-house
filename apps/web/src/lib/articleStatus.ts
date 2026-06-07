import type { ArticleStatus } from "../types";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function statusToVariant(status: ArticleStatus): BadgeVariant {
  const map: Record<ArticleStatus, BadgeVariant> = {
    DRAFT: "draft",
    SUBMITTED: "submitted",
    IN_REVIEW: "in-review",
    APPROVED_BY_EDITOR: "approved-editor",
    APPROVED_BY_MANAGER: "approved-manager",
    APPROVED_BY_DIRECTOR: "approved-director",
    PUBLISHED: "published",
    REJECTED: "rejected",
  };
  return map[status];
}

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In Review",
  APPROVED_BY_EDITOR: "Editor Approved",
  APPROVED_BY_MANAGER: "Manager Approved",
  APPROVED_BY_DIRECTOR: "Director Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

export const STATUS_STYLES: Record<ArticleStatus, string> = {
  DRAFT: "bg-muted border border-border text-muted-foreground",
  SUBMITTED: "bg-[#2563eb18] text-[#2563eb]",
  IN_REVIEW: "bg-[#ea580c18] text-[#ea580c]",
  APPROVED_BY_EDITOR: "bg-[#7c3aed18] text-[#7c3aed]",
  APPROVED_BY_MANAGER: "bg-[#7c3aed18] text-[#7c3aed]",
  APPROVED_BY_DIRECTOR: "bg-[#0891b218] text-[#0891b2]",
  PUBLISHED: "bg-[#16a34a18] text-[#16a34a]",
  REJECTED: "bg-destructive/10 text-destructive",
};

export const STATUS_DOT: Record<ArticleStatus, string> = {
  DRAFT: "bg-muted-foreground",
  SUBMITTED: "bg-[#2563eb]",
  IN_REVIEW: "bg-[#ea580c]",
  APPROVED_BY_EDITOR: "bg-[#7c3aed]",
  APPROVED_BY_MANAGER: "bg-[#7c3aed]",
  APPROVED_BY_DIRECTOR: "bg-[#0891b2]",
  PUBLISHED: "bg-[#16a34a]",
  REJECTED: "bg-destructive",
};

export const MY_ARTICLE_FILTERS: { label: string; value: ArticleStatus | null }[] = [
  { label: "All Articles", value: null },
  { label: "Drafts", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Approved", value: "APPROVED_BY_EDITOR" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Rejected", value: "REJECTED" },
];

export const EDITORIAL_ROLES = ["AUTHOR", "EDITOR", "NEWSPAPER_MANAGER"] as const;
