import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6 border-destructive/20">
        <div className="mx-auto bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground">
            Your account has been banned due to a violation of our community guidelines.
          </p>
        </div>

        <div className="pt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth">Back to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
