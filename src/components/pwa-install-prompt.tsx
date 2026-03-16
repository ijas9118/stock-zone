"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

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
    // Check if user has previously dismissed the prompt in this session/period
    const isDismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (isDismissed) return;

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
    if (outcome === "accepted") {
      setIsVisible(false);
      localStorage.setItem("pwa-prompt-dismissed", "true");
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for the next 24 hours (or just current session depending on needs)
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="bg-background border-border animate-in fade-in slide-in-from-bottom-4 fixed right-4 bottom-4 z-50 flex items-start gap-4 rounded-xl border p-4 shadow-xl duration-300">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Install StockZone</span>
        <p className="text-muted-foreground max-w-[180px] text-xs leading-relaxed">
          Add to your home screen for a premium, app-like experience.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleInstall}
            className="h-8 px-3 text-xs"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 px-3 text-xs"
          >
            Later
          </Button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 rounded-full p-1 transition-colors"
        aria-label="Dismiss prompt"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
