"use client";

import Link from "next/link";
import { DashboardStats } from "@/actions/admin/dashboard";
import { format } from "date-fns";
import { ChevronRight, ExternalLink } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TopStockedCardProps {
  topStockData: DashboardStats["topStockedProducts"];
  recentUsers: DashboardStats["recentUsers"];
}

export function TopStockedCard({
  topStockData,
  recentUsers,
}: TopStockedCardProps) {
  const maxQuantity = Math.max(...topStockData.map((s) => s.totalQuantity), 1);

  return (
    <Card className="h-full overflow-hidden border shadow-none">
      <CardHeader className="px-0 pt-4 pb-0">
        <Tabs defaultValue="stock">
          <div className="flex items-center justify-between px-4 sm:px-6">
            <TabsList className="bg-muted/50 h-7 gap-0.5 p-0.5">
              <TabsTrigger value="stock" className="h-6 px-3 text-[11px]">
                Top Stock
              </TabsTrigger>
              <TabsTrigger value="users" className="h-6 px-3 text-[11px]">
                Recent Users
              </TabsTrigger>
            </TabsList>
            <Link
              href="/admin/stock"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <TabsContent value="stock" className="mt-0 pt-3">
            <div className="space-y-1 pb-4">
              {topStockData.map((item, i) => {
                const pct =
                  maxQuantity > 0
                    ? (item.totalQuantity / maxQuantity) * 100
                    : 0;
                const hasMultiple = item.locationCount > 1;

                return (
                  <div key={i} className="group/stock-item">
                    {/* Main product row */}
                    <Link href="/admin/stock" className="block">
                      <div className="hover:bg-muted/30 rounded-lg px-3 py-2 transition-colors sm:px-4">
                        {/* Top line: name + total */}
                        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="text-foreground min-w-0 flex-1 truncate text-xs font-medium">
                              {item.name}
                            </span>
                            {hasMultiple && (
                              <span className="text-muted-foreground bg-muted shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium">
                                {item.locationCount}×
                              </span>
                            )}
                          </div>
                          <span className="text-foreground ml-2 shrink-0 font-mono text-xs font-semibold">
                            {item.totalQuantity.toLocaleString()}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-primary/35 group-hover/stock-item:bg-primary/55 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Link>

                    {/* Location breakdown — only shown if multiple locations */}
                    {hasMultiple && (
                      <div className="mb-1 ml-2 hidden group-hover/stock-item:block sm:ml-4">
                        <div className="border-border/50 ml-1 space-y-0.5 border-l py-1 pl-2 sm:ml-2 sm:pl-3">
                          {item.locations.map((loc, j) => (
                            <div
                              key={j}
                              className="flex items-center justify-between gap-2 px-2 py-0.5"
                            >
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className="text-muted-foreground truncate text-[10px]">
                                  {loc.warehouse}
                                </span>
                                <span className="text-muted-foreground/50 text-[10px]">
                                  ·
                                </span>
                                <span className="text-muted-foreground truncate text-[10px]">
                                  {loc.shop}
                                </span>
                              </div>
                              <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                                {loc.quantity.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {topStockData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-muted-foreground text-xs">
                    No stock data available
                  </p>
                </div>
              )}
            </div>

            {/* Footer link */}
            <div className="border-border/40 border-t px-3 pt-3 pb-1 sm:px-4">
              <Link
                href="/admin/stock"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                View full inventory <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-0 pt-4">
            {/* Recent users list */}
            <div className="divide-border/50 divide-y pb-2">
              {recentUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="hover:bg-muted/40 flex items-center gap-3 px-3 py-2.5 transition-colors sm:px-6"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(user.full_name || user.email || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs leading-none font-medium">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      user.status === "active"
                        ? "success"
                        : user.status === "pending"
                          ? "warning"
                          : "secondary"
                    }
                    className="px-1.5 py-0 text-[9px] capitalize"
                  >
                    {user.status}
                  </Badge>
                </Link>
              ))}
              {recentUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-muted-foreground text-xs">
                    No recent users
                  </p>
                </div>
              )}
            </div>
            <div className="px-3 pt-3 pb-4 sm:px-6">
              <Link
                href="/admin/users"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                View all users <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}
