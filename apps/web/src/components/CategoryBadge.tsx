import { Badge } from "@/components/ui/badge";

export function CategoryBadge({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-3xs font-bold tracking-wider uppercase">
      {label}
    </Badge>
  );
}
