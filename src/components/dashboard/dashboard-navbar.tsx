"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logout } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

interface DashboardNavbarProps {
  role: string;
}

export function DashboardNavbar({ role }: DashboardNavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Icons.logo className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-bold text-lg tracking-tight sm:inline-block bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              StockZone
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <div className="hidden items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-muted-foreground/10 sm:flex">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <Badge variant="secondary" className="bg-transparent border-none text-[10px] font-semibold uppercase tracking-wider hover:bg-transparent">
              {role}
            </Badge>
          </div>
          
          <div className="hidden h-6 w-px bg-border/60 sm:block" />

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            
            <form action={logout}>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative overflow-hidden group hover:bg-destructive/10 hover:text-destructive transition-colors sm:w-auto sm:px-3 sm:py-2"
              >
                <Icons.logout className="h-4 w-4 transition-transform group-hover:-translate-x-1 sm:mr-2" />
                <span className="hidden font-medium sm:inline-block">Sign Out</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
