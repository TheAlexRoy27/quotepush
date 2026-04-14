import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState("");
  const [, setLocation] = useLocation();

  const createOrg = trpc.org.createForCurrentUser.useMutation({
    onSuccess: () => {
      toast.success("Organization created! Welcome to QuotePush.io.");
      setLocation("/");
      window.location.reload();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to create organization");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    createOrg.mutate({ name: orgName.trim() });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-favicon-hsV6w9Xq6ruPjUPpEDFYpV.webp"
                alt="QuotePush.io"
                className="h-16 w-16 rounded-2xl shadow-lg"
              />
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Welcome to QuotePush.io
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Let's set up your organization to get started.
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="border-border/50 shadow-xl bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-indigo-400" />
              Create Your Organization
            </CardTitle>
            <CardDescription>
              Your organization is your workspace — leads, templates, and settings all live here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="e.g. Acme Insurance, Smith Realty..."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="bg-background/50"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                disabled={!orgName.trim() || createOrg.isPending}
              >
                {createOrg.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization & Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          You can rename your organization anytime from the Organization settings.
        </p>
      </div>
    </div>
  );
}
