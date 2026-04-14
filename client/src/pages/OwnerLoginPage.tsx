import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Lock, Phone, Shield } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function OwnerLoginPage() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();

  const login = trpc.customAuth.ownerLogin.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success(`Welcome back, ${data.user.name ?? "Owner"}!`);
      if (data.org) {
        setLocation("/");
      } else {
        setLocation("/onboarding");
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password) return;
    login.mutate({ phone, password });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
            <Shield className="h-7 w-7 text-violet-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Owner Access</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your master credentials
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium">
              Mobile Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 7605184325"
                className="pl-9"
                autoComplete="tel"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your master password"
                className="pl-9 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!phone || !password || login.isPending}
          >
            {login.isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 space-y-1">
          <p className="font-medium">First-time setup?</p>
          <p>
            You must sign in with Manus OAuth at least once first (via{" "}
            <a href="/auth" className="underline hover:text-amber-200">/auth</a>) to create your
            owner account. Then go to <strong>Admin Panel → Set Master Password</strong> to save
            your phone + password credentials.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Not the owner?{" "}
          <a href="/auth" className="text-violet-400 hover:underline">
            Sign in with your account
          </a>
        </p>
      </div>
    </div>
  );
}
