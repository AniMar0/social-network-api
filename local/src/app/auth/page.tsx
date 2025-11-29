"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth";
import { siteConfig } from "@/config/site.config";
export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "logout") {
        window.location.reload();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const checkLogin = async () => {
      try {
        const res = await fetch(`${siteConfig.domain}/api/logged`, {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.loggedIn) {
          router.push("/");
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching login:", err);
        setLoading(false);
      }
    };

    checkLogin();
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="auth-scope min-h-screen glass-page flex items-center justify-center p-6">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="auth-scope min-h-screen glass-page flex items-center justify-center p-6">
      <AuthForm />
    </div>
  );
}
