export function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
      {label}
    </span>
  );
}
