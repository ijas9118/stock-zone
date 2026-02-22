import {
  ArrowRight,
  BarChart3,
  Globe,
  Layout,
  Shield,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-2">
              <BarChart3 className="text-primary-foreground h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">StockZone</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a
              href="#"
              className="hover:text-primary text-muted-foreground transition-colors"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="hover:text-primary text-muted-foreground transition-colors"
            >
              Markets
            </a>
            <a
              href="#"
              className="hover:text-primary text-muted-foreground transition-colors"
            >
              Portfolio
            </a>
            <a
              href="#"
              className="hover:text-primary text-muted-foreground transition-colors"
            >
              Analytics
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" className="hidden sm:inline-flex">
              Sign In
            </Button>
            <Button>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32">
          {/* Background Decoration */}
          <div className="bg-background absolute top-0 -z-10 h-full w-full">
            <div className="bg-primary/20 absolute top-[20%] left-[10%] h-[300px] w-[300px] rounded-full blur-[100px]" />
            <div className="absolute top-[10%] right-[10%] h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
          </div>

          <div className="container px-4 text-center md:px-8">
            <Badge
              variant="secondary"
              className="animate-in fade-in slide-in-from-bottom-3 mb-4 px-3 py-1 text-sm font-medium duration-500"
            >
              New: Real-time Analytics 2.0
            </Badge>
            <h1 className="from-foreground to-foreground/70 mb-6 bg-gradient-to-br bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-7xl">
              Transform Your Trading <br className="hidden sm:block" />{" "}
              Experience with Precision
            </h1>
            <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-5 mx-auto mb-10 max-w-[700px] text-lg duration-700 sm:text-xl">
              Empower your financial decisions with AI-driven insights and
              lightning-fast execution. The next generation of stock analysis is
              here.
            </p>
            <div className="animate-in fade-in slide-in-from-bottom-10 flex flex-col items-center justify-center gap-4 duration-1000 sm:flex-row">
              <Button size="lg" className="group h-12 px-8 text-base">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
              >
                View Live Demo
              </Button>
            </div>

            {/* Mockup Figure */}
            <div className="bg-card animate-in zoom-in-95 relative mx-auto mt-16 max-w-[1000px] rounded-2xl border p-2 shadow-2xl duration-1000 md:mt-24">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border bg-zinc-950 p-8">
                <div className="relative h-full w-full rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-inner">
                  {/* Dashboard Mockup Content */}
                  <div className="flex gap-4">
                    <div className="w-1/3 space-y-4">
                      <div className="h-32 animate-pulse rounded bg-zinc-800" />
                      <div className="h-48 animate-pulse rounded bg-zinc-800" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="h-12 animate-pulse rounded bg-zinc-800" />
                      <div className="h-68 animate-pulse rounded bg-zinc-800" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted/30 py-20">
          <div className="container px-4 md:px-8">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Powerful Features
              </h2>
              <p className="text-muted-foreground mx-auto max-w-[600px]">
                Everything you need to stay ahead of the market in one
                comprehensive platform.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card className="group border-primary/10 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors">
                    <Zap className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle>Lightning Fast</CardTitle>
                  <CardDescription>
                    Execute trades with millisecond latency using unsere direct
                    market access.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-primary/10 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors">
                    <Shield className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle>Secure & Private</CardTitle>
                  <CardDescription>
                    Military-grade encryption for all your financial data and
                    transactions.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-primary/10 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors">
                    <Globe className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle>Global Markets</CardTitle>
                  <CardDescription>
                    Access and trade in over 150 markets across 33 countries
                    worldwide.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-primary/10 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors">
                    <BarChart3 className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle>Advanced Analytics</CardTitle>
                  <CardDescription>
                    Powerful charting tools and technical indicators for deep
                    market analysis.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group border-primary/10 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors">
                    <Layout className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle>Custom Interfaces</CardTitle>
                  <CardDescription>
                    Design your own trading dashboard with modular drag-and-drop
                    widgets.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-primary text-primary-foreground group relative flex items-center justify-center overflow-hidden border-none p-8 text-center shadow-xl">
                <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative z-10">
                  <h3 className="mb-4 text-2xl font-bold">Ready to Scale?</h3>
                  <Button variant="secondary" size="lg" className="w-full">
                    Upgrade to Pro
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t py-12">
        <div className="container grid grid-cols-2 gap-8 px-4 md:grid-cols-4 md:px-8">
          <div className="col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="text-primary h-6 w-6" />
              <span className="text-xl font-bold">StockZone</span>
            </div>
            <p className="text-muted-foreground max-w-[300px] text-sm">
              The premier platform for modern traders and investors. Real-time
              data, expert analysis, and seamless execution.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wider uppercase">
              Product
            </h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wider uppercase">
              Legal
            </h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-muted-foreground container mt-12 border-t px-4 pt-8 text-center text-sm md:px-8">
          © {new Date().getFullYear()} StockZone Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
