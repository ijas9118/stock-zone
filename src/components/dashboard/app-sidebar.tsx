"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { logout } from "@/app/auth/actions";

interface AppSidebarProps {
  role: string;
  user: {
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function AppSidebar({ role, user }: AppSidebarProps) {
  const pathname = usePathname();
  const displayName = user.fullName || user.email || "User";

  const navItems = [
    {
      title: "Dashboard",
      href: role === "admin" ? "/admin" : "/manager",
      icon: Icons.dashboard,
    },
  ];

  if (role === "admin") {
    navItems.push(
      { title: "Inventory", href: "/admin/stock", icon: Icons.stock },
      {
        title: "Stock Movements",
        href: "/admin/stock-movements",
        icon: Icons.transfer,
      },
      { title: "Products", href: "/admin/products", icon: Icons.products },
      {
        title: "Categories",
        href: "/admin/categories",
        icon: Icons.categories,
      },
      {
        title: "Subcategories",
        href: "/admin/subcategories",
        icon: Icons.subcategories,
      },
      {
        title: "Warehouses",
        href: "/admin/warehouses",
        icon: Icons.warehouses,
      },
      { title: "Shops", href: "/admin/shops", icon: Icons.shops },
      { title: "Units of Measure", href: "/admin/uom", icon: Icons.uom },
      { title: "Users", href: "/admin/users", icon: Icons.users }
    );
  } else if (role === "manager") {
    navItems.push(
      {
        title: "Warehouses",
        href: "/manager/warehouses",
        icon: Icons.warehouses,
      },
      { title: "Products", href: "/manager/products", icon: Icons.products }
    );
  }

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  {/* Light logo */}
                  <Image
                    src="/assets/main-logo-dark.svg"
                    alt="StockZone Logo"
                    width={32}
                    height={32}
                    priority
                    className="size-6 object-contain dark:hidden"
                  />
                  {/* Dark logo */}
                  <Image
                    src="/assets/main-logo.svg"
                    alt="StockZone Logo"
                    width={32}
                    height={32}
                    priority
                    className="hidden size-6 object-contain dark:block"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-lg font-bold">StockZone</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user.avatarUrl ?? undefined}
                      alt={displayName}
                    />
                    <AvatarFallback className="rounded-lg uppercase">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {displayName}
                    </span>
                    <span className="truncate text-xs opacity-70">{role}</span>
                  </div>
                  <Icons.chevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <Icons.user className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logout} className="w-full">
                    <button className="flex w-full cursor-pointer items-center">
                      <Icons.logout className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
