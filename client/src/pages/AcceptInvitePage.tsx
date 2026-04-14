import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle, Users } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = trpc.org.acceptInvite.useMutation({
    onSuccess: () => {
      setAccepted(true);
      toast.success("You've joined the organization!");
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: (err) => {
      setError(err.message || "Invalid or expired invite link.");
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      // Store the invite token in sessionStorage so we can use it after login
      sessionStorage.setItem("pendingInviteToken", token ?? "");
      setLocation(`/auth?redirect=/invite/${token}`);
    }
  }, [loading, user, token, setLocation]);

  useEffect(() => {
    // If user just logged in and there's a pending invite, auto-accept
    if (user && token && !acceptInvite.isPending && !accepted && !error) {
      acceptInvite.mutate({ token, userId: user.id });
    }
  }, [user, token]);

  if (loading || (!user && !error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotenudge-icon-cKbhektFvrauqCx5id6HxR.webp"
            alt="QuotePush.io"
            className="h-14 w-14 rounded-2xl shadow-lg mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            QuotePush.io
          </h1>
        </div>

        <Card className="border-border/50 shadow-xl bg-card">
          <CardHeader className="text-center pb-4">
            {accepted ? (
              <>
                <div className="flex justify-center mb-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                </div>
                <CardTitle className="text-emerald-400">You're in!</CardTitle>
                <CardDescription>You've successfully joined the organization. Redirecting to your dashboard...</CardDescription>
              </>
            ) : error ? (
              <>
                <div className="flex justify-center mb-3">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Invite Invalid</CardTitle>
                <CardDescription>{error}</CardDescription>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <Users className="h-12 w-12 text-indigo-400" />
                </div>
                <CardTitle>Joining Organization</CardTitle>
                <CardDescription>Please wait while we process your invite...</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            {acceptInvite.isPending && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
            {(error || accepted) && (
              <Button
                onClick={() => setLocation(accepted ? "/" : "/auth")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {accepted ? "Go to Dashboard" : "Back to Sign In"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
