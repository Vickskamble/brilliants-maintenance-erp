"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, ClipboardList, AlarmClock, ClipboardPlus } from "lucide-react";

const TABS = [
  {
    href: "/kiosk",
    label: "Scan",
    icon: QrCode,
    match: (path: string) => path === "/kiosk",
  },
  {
    href: "/kiosk/my-work",
    label: "My Work",
    icon: ClipboardList,
    match: (path: string) => path === "/kiosk/my-work",
  },
  {
    href: "/kiosk/new-work",
    label: "New Work",
    icon: ClipboardPlus,
    match: (path: string) => path === "/kiosk/new-work",
  },
  {
    href: "/kiosk/pm-due",
    label: "PM Due",
    icon: AlarmClock,
    match: (path: string) => path === "/kiosk/pm-due",
  },
];

export function KioskBottomNav() {
  const pathname = usePathname();
  const active = TABS.find((t) => t.match(pathname))?.href ?? "/kiosk";

  return (
    <nav className="border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.href === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold transition ${
                isActive
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-6 w-6" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}