"use client";

import Link from "next/link";
import type React from "react";
import { authUtils } from "@/lib/navigation";
import { closeWebSocket } from "@/lib/websocket";
import { siteConfig } from "@/config/site.config";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  Bell,
  MessageSquare,
  Users,
  User,
  Plus,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

interface SidebarNavigationProps {
  activeItem?: string;
  onNewPost?: () => void;
  notificationCount?: number;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

function SidebarNavigation({
  activeItem,
  onNewPost,
  notificationCount = 0,
  isMobileMenuOpen = false,
  onMobileMenuToggle,
}: SidebarNavigationProps) {
  const [currentActive] = useState(activeItem);

  const navigationItems: NavigationItem[] = [
    { id: "home", label: "Home", icon: Home, href: "/" },
    { id: "explore", label: "Explore", icon: Search, href: "/explore" },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      href: "/notifications",
    },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      href: "/messages",
    },
    { id: "groups", label: "Groups", icon: Users, href: "/groups" },
    { id: "profile", label: "Profile", icon: User, href: "/profile" }, // غادي نبدلها تحت
  ];

  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault();
    await fetch(`${siteConfig.domain}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    closeWebSocket();
    localStorage.setItem("logout", Date.now().toString());
    window.location.href = "/auth"; // نقدر نستعمل replace هنا
  };

  const handleNewPost = () => {
    onNewPost?.();
    // Close mobile menu after action
    if (onMobileMenuToggle && isMobileMenuOpen) {
      onMobileMenuToggle();
    }
  };

  const handleNavItemClick = () => {
    // Close mobile menu when navigating
    if (onMobileMenuToggle && isMobileMenuOpen) {
      onMobileMenuToggle();
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-card border border-border rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5 text-foreground" />
        ) : (
          <Menu className="h-5 w-5 text-foreground" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onMobileMenuToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-screen glass-panel flex flex-col z-40 transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-72 lg:z-30
          ${isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"}
        `}
      >
        <div className="p-8 border-b border-border/50">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Social Network
          </h1>
        </div>

        <nav className="flex-1 p-6">
          <ul className="space-y-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentActive === item.id;

              // special case for profile (بما أنو عندك url خاص بالمستخدم)
              if (item.id === "profile") {
                return (
                  <li key={item.id}>
                    <button
                      onClick={async () => {
                        const user = await authUtils.CurrentUser();
                        window.location.href = `/profile/${user.url}`;
                        handleNavItemClick();
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 relative group ${
                        isActive
                          ? "bg-primary/15 text-primary font-semibold shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:translate-x-1"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                          isActive ? "text-primary" : ""
                        }`}
                      />
                      <span className="text-base">{item.label}</span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    href={item.href || "/"}
                    onClick={handleNavItemClick}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 relative group ${
                      isActive
                        ? "bg-primary/15 text-primary font-semibold shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:translate-x-1"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                        isActive ? "text-primary" : ""
                      }`}
                    />
                    <span className="text-base">{item.label}</span>
                    {item.id === "notifications" && notificationCount > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg shadow-primary/40 animate-pulse">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-6 space-y-4">
          <Button
            onClick={handleNewPost}
            className="w-full glass-button h-12 text-base font-semibold rounded-xl cursor-pointer"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Post
          </Button>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-12 rounded-xl justify-start px-4 cursor-pointer"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}

export { SidebarNavigation };
export default SidebarNavigation;
