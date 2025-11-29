"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authUtils } from "@/lib/navigation";
import { initWebSocket } from "@/lib/websocket";

export default function ClientRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { loggedIn, user } = await authUtils.checkAuth();
        if (loggedIn) {
          initWebSocket(user.id);
        } else router.push("/auth");
      } catch {
        router.push("/auth");
      }
    };
    checkAuth();
  }, [router]);

  return <>{children}</>;
}
