"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneOutgoing,
  History,
  Users,
  BarChart3,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; disabled?: boolean };
type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "Calls",
    items: [
      { href: "/", label: "Create Calls", icon: PhoneOutgoing },
      { href: "/history", label: "Call History", icon: History },
    ],
  },
  {
    title: "Coming soon",
    items: [
      { href: "#", label: "Patients", icon: Users, disabled: true },
      { href: "#", label: "Analytics", icon: BarChart3, disabled: true },
      { href: "#", label: "Settings", icon: Settings, disabled: true },
    ],
  },
];

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile scrim */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} aria-hidden />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
            <Activity className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Swasth 365</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Call Console</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV.map((section) => (
            <div key={section.title}>
              <div className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href && !item.disabled;
                  const Icon = item.icon;
                  const content = (
                    <>
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.disabled && (
                        <span className="ml-auto text-[10px] text-muted-foreground/60">soon</span>
                      )}
                    </>
                  );
                  const base =
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors";
                  return (
                    <li key={item.label}>
                      {item.disabled ? (
                        <span className={cn(base, "cursor-not-allowed text-muted-foreground/50")}>{content}</span>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            base,
                            active
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
              MP
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-medium">Mankind Pharma</div>
              <div className="truncate text-[11px] text-muted-foreground">PSP workspace</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
