export function ListRow({
  first,
  last,
  children,
}: {
  first: boolean;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-border bg-card px-5 py-4 ${
        first ? "rounded-t-lg border" : "border-r border-b border-l"
      } ${last ? "rounded-b-lg" : ""}`}
    >
      {children}
    </div>
  );
}
