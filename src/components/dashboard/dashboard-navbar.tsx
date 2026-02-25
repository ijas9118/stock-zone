"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/app/auth/actions";

interface DashboardNavbarProps {
  role: string;
}

export function DashboardNavbar({ role }: DashboardNavbarProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
        </div>

        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <div className="bg-muted/50 border-muted-foreground/10 hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:flex">
            <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
            <Badge
              variant="secondary"
              className="border-none bg-transparent text-[10px] font-semibold tracking-wider uppercase hover:bg-transparent"
            >
              {role}
            </Badge>
          </div>

          <div className="bg-border/60 hidden h-6 w-px sm:block" />

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />

            <form action={logout}>
              <Button
                variant="ghost"
                size="icon"
                className="group hover:bg-destructive/10 hover:text-destructive relative overflow-hidden transition-colors sm:w-auto sm:px-3 sm:py-2"
              >
                <Icons.logout className="h-4 w-4 transition-transform group-hover:-translate-x-1 sm:mr-2" />
                <span className="hidden font-medium sm:inline-block">
                  Sign Out
                </span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
