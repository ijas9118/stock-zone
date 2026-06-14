"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, Home } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Inventory", icon: Home },
  { href: "/transfers", label: "Transfers", icon: ArrowRightLeft },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-lg items-center justify-around px-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/inventory")
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
