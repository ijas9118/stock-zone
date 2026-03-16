"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener
      );
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-background border-border fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-lg">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">Install StockZone</span>
        <span className="text-muted-foreground text-xs">
          Add to your home screen for faster access
        </span>
      </div>
      <Button size="sm" onClick={handleInstall} className="shrink-0">
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Install
      </Button>
    </div>
  );
}
