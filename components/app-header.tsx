"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLES: Record<string, string> = {
  "/": "Create Calls",
  "/history": "Call History",
};

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Swasth 365";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <h1 className="text-sm font-medium tracking-tight">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>
    </header>
  );
}
