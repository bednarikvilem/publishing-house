import type { ArticleStatus } from "../types";

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
  REJECTED: "bg-[#dc262618] text-[#dc2626]",
};

export const STATUS_DOT: Record<ArticleStatus, string> = {
  DRAFT: "bg-muted-foreground",
  SUBMITTED: "bg-[#2563eb]",
  IN_REVIEW: "bg-[#ea580c]",
  APPROVED_BY_EDITOR: "bg-[#7c3aed]",
  APPROVED_BY_MANAGER: "bg-[#7c3aed]",
  APPROVED_BY_DIRECTOR: "bg-[#0891b2]",
  PUBLISHED: "bg-[#16a34a]",
  REJECTED: "bg-[#dc2626]",
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
