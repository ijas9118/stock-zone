import { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import GradientBlinds from "@/components/gradient-blinds";

export const metadata: Metadata = {
  title: "Forgot Password | StockZone",
  description: "Reset your StockZone account password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative container flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full w-full flex-col bg-zinc-950 text-white lg:flex">
        <div className="relative h-full w-full">
          <GradientBlinds
            gradientColors={["#a14bf7ff", "#818cf8", "#1423f6ff"]}
            angle={20}
            noise={0.1}
            blindCount={33}
            blindMinWidth={70}
            spotlightRadius={0.5}
            spotlightSoftness={1}
            spotlightOpacity={1}
            mouseDampening={0.5}
            distortAmount={17}
            shineDirection="right"
            mixBlendMode="screen"
          />
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Reset your password
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we will send you a reset link
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
