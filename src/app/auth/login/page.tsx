import { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import GradientBlinds from "@/components/gradient-blinds";

export const metadata: Metadata = {
  title: "Login | StockZone",
  description: "Login to your StockZone account",
};

export default function LoginPage() {
  return (
    <div className="relative container flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="bg-dark relative hidden h-full w-full flex-col text-white lg:flex">
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
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter your email to sign in to your account
            </p>
          </div>
          <LoginForm />
          <p className="text-muted-foreground px-8 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="hover:text-primary underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
