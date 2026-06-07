import { useState } from "react";
import { SunIcon, MoonIcon, MenuIcon, XIcon } from "./Icons";
import { useTheme } from "../hooks/useTheme";
import { Button } from "@/components/ui/button";

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
        className="text-foreground text-base font-black tracking-tight-px font-outfit"
      >
        {title}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        aria-label="Toggle dark mode"
        className="text-muted-foreground hover:text-foreground"
      >
        {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      </Button>
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
          className="text-foreground text-xs-plus font-black tracking-tight-px font-outfit"
        >
          {title}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="text-muted-foreground hover:text-foreground"
          >
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <MenuIcon size={18} />
            Menu
          </Button>
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
                className="text-foreground text-base font-black tracking-tight-px font-outfit"
              >
                {title}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDrawerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon size={18} />
              </Button>
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
