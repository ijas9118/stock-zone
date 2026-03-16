"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full p-6">
        {/* Light logo */}
        <Image
          src="/assets/main-logo-dark.svg"
          alt="StockZone Logo"
          width={48}
          height={48}
          className="h-12 w-12 object-contain dark:hidden"
        />
        {/* Dark logo */}
        <Image
          src="/assets/main-logo.svg"
          alt="StockZone Logo"
          width={48}
          height={48}
          className="hidden h-12 w-12 object-contain dark:block"
        />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          StockZone requires an internet connection. Please check your network
          and try again.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Try Again</Link>
      </Button>
    </div>
  );
}
