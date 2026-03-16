"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface UserNavbarProps {
  user: {
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function UserNavbar({ user }: UserNavbarProps) {
  const pathname = usePathname();
  const displayName = user.fullName || user.email || "User";
  const isProfilePage = pathname === "/profile";

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-lg items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Left: Logo + App Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          {/* Light logo */}
          <Image
            src="/assets/main-logo-dark.svg"
            alt="StockZone Logo"
            width={128}
            height={32}
            priority
            className="h-7 w-auto sm:h-8 dark:hidden"
          />
          {/* Dark logo */}
          <Image
            src="/assets/main-logo.svg"
            alt="StockZone Logo"
            width={128}
            height={32}
            priority
            className="hidden h-7 w-auto sm:h-8 dark:block"
          />
          <span className="text-base font-bold tracking-tight sm:text-lg">
            StockZone
          </span>
        </Link>

        {/* Right: Theme toggle + Profile avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          {/* Profile button — avatar with subtle ring on profile page */}
          <Link href="/profile">
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full p-0 sm:h-9 sm:w-9"
              aria-label="Go to profile"
            >
              <Avatar
                className={cn(
                  "h-7 w-7 transition-all sm:h-8 sm:w-8",
                  isProfilePage &&
                    "ring-primary ring-offset-background ring-2 ring-offset-2"
                )}
              >
                <AvatarImage
                  src={user.avatarUrl ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
