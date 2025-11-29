

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export interface SiteConfig {
  siteName: string;
  domain: string;
  logo: string;
  theme: {
    default: "light" | "dark";
    allowSystem: boolean;
  };
  navigation: NavItem[];
}

export const siteConfig: SiteConfig = {
  siteName: "Social Network",
  domain: "http://localhost:8080",
  logo: "https://avatars.githubusercontent.com/u/89809533?v=4",
  theme: {
    default: "dark",
    allowSystem: true,
  },
  navigation: [
    { label: "Home", href: "/" },
    { label: "Messages", href: "/messages" },
    { label: "Groups", href: "/groups" },
    { label: "Explore", href: "/explore" },
    { label: "Notifications", href: "/notifications" },
    { label: "Profile", href: "/profile" },
    { label: "Auth", href: "/auth" },
    { label: "404", href: "/404" },
  ],
};
