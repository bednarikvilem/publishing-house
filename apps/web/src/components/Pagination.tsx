export function Pagination({
  currentPage,
  totalPages,
  total,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-[13px]">
        Page {currentPage} of {totalPages} — {total} item{total !== 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
