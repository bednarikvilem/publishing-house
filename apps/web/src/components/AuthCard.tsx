interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
      <div className="border-border bg-card flex w-full max-w-[420px] flex-col gap-8 rounded-xl border p-10 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <span
            className="text-foreground text-[26px] font-black tracking-[-1px] font-outfit"
          >
            {title}
          </span>
          <span className="text-muted-foreground text-[15px]">{subtitle}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
