export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-foreground text-2xl font-bold">{title}</h1>
      {action}
    </div>
  );
}
