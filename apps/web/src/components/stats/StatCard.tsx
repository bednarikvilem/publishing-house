export function StatCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-6">
      <h3 className="text-foreground font-semibold mb-5 flex items-center gap-2">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}
