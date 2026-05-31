import { useState } from "react";
import { SunIcon, MoonIcon, MenuIcon, XIcon } from "./Icons";
import { useTheme } from "../hooks/useTheme";

export function PortalLayout({
  title,
  sidebarContent,
  children,
}: {
  title: string;
  sidebarContent: React.ReactNode;
  children: React.ReactNode;
}) {
  const { isDark, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const header = (
    <div className="flex items-center justify-between px-2 pb-4">
      <span
        className="text-foreground text-[16px] font-black tracking-[-0.5px]"
        style={{ fontFamily: "Outfit, Inter, sans-serif" }}
      >
        {title}
      </span>
      <button
        onClick={toggle}
        aria-label="Toggle dark mode"
        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
      >
        {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      </button>
    </div>
  );

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="border-border bg-card hidden w-64 shrink-0 flex-col gap-1 border-r px-3 py-6 md:flex">
        {header}
        {sidebarContent}
      </aside>

      {/* Mobile trigger bar */}
      <div className="border-border bg-background flex items-center justify-between border-b px-4 py-3 md:hidden">
        <span
          className="text-foreground text-[15px] font-black tracking-[-0.5px]"
          style={{ fontFamily: "Outfit, Inter, sans-serif" }}
        >
          {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors"
          >
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors"
          >
            <MenuIcon size={18} />
            Menu
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="border-border bg-card absolute inset-y-0 left-0 flex w-72 flex-col gap-1 border-r px-3 py-6 shadow-xl">
            <div className="flex items-center justify-between px-2 pb-4">
              <span
                className="text-foreground text-[16px] font-black tracking-[-0.5px]"
                style={{ fontFamily: "Outfit, Inter, sans-serif" }}
              >
                {title}
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex flex-1 flex-col gap-7 px-4 py-6 md:px-12 md:py-8">
        {children}
      </main>
    </div>
  );
}
