import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MessageSquare, Mail, Phone, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { useLocation } from "wouter";

type AuthMode = "login" | "signup";
type AuthMethod = "phonepass" | "phone" | "email";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<AuthMode>("login");
  const [method, setMethod] = useState<AuthMethod>("phonepass");

  // Phone + password state
  const [ppPhone, setPpPhone] = useState("");
  const [ppPassword, setPpPassword] = useState("");
  const [ppName, setPpName] = useState("");
  const [ppOrgName, setPpOrgName] = useState("");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [phoneOrgName, setPhoneOrgName] = useState("");

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailOrgName, setEmailOrgName] = useState("");

  const registerPhoneMutation = trpc.customAuth.registerPhone.useMutation();
  const loginPhonePasswordMutation = trpc.customAuth.loginPhonePassword.useMutation();
  const sendOtpMutation = trpc.customAuth.sendOtp.useMutation();
  const loginPhoneMutation = trpc.customAuth.loginPhone.useMutation();
  const loginEmailMutation = trpc.customAuth.loginEmail.useMutation();
  const registerEmailMutation = trpc.customAuth.registerEmail.useMutation();

  // ── Phone + Password handlers ──────────────────────────────────────────────

  const handlePhonePasswordLogin = async () => {
    if (!ppPhone.trim() || !ppPassword) return;
    try {
      const result = await loginPhonePasswordMutation.mutateAsync({
        phone: ppPhone.trim(),
        password: ppPassword,
      });
      if (result.success) {
        toast.success("Welcome back!");
        utils.auth.me.invalidate();
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Invalid phone number or password");
    }
  };

  const handlePhonePasswordRegister = async () => {
    if (!ppPhone.trim() || !ppPassword || !ppName.trim() || !ppOrgName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (ppPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      const result = await registerPhoneMutation.mutateAsync({
        phone: ppPhone.trim(),
        password: ppPassword,
        name: ppName.trim(),
        orgName: ppOrgName.trim(),
      });
      if (result.success) {
        toast.success("Account created! Welcome to QuotePush.io.");
        utils.auth.me.invalidate();
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create account");
    }
  };

  // ── Phone OTP handlers ─────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    if (!phone.trim()) return;
    try {
      const result = await sendOtpMutation.mutateAsync({ phone: phone.trim() });
      setOtpSent(true);
      if (result.simulated) {
        toast.info("Simulation mode: Check the server logs for your OTP code.");
      } else {
        toast.success(`Verification code sent to ${phone}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send verification code");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    try {
      const result = await loginPhoneMutation.mutateAsync({
        phone: phone.trim(),
        code: otp.trim(),
        name: phoneName.trim() || undefined,
        orgName: phoneOrgName.trim() || undefined,
      });
      if (result.success) {
        toast.success(result.isNew ? "Welcome to QuotePush.io!" : "Welcome back!");
        utils.auth.me.invalidate();
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Invalid verification code");
    }
  };

  // ── Email handlers ─────────────────────────────────────────────────────────

  const handleEmailLogin = async () => {
    try {
      const result = await loginEmailMutation.mutateAsync({ email: email.trim(), password });
      if (result.success) {
        toast.success("Welcome back!");
        utils.auth.me.invalidate();
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Invalid email or password");
    }
  };

  const handleEmailRegister = async () => {
    if (!emailName.trim() || !emailOrgName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const result = await registerEmailMutation.mutateAsync({
        email: email.trim(),
        password,
        name: emailName.trim(),
        orgName: emailOrgName.trim(),
      });
      if (result.success) {
        toast.success("Account created! Welcome to QuotePush.io.");
        utils.auth.me.invalidate();
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create account");
    }
  };

  const isPending =
    registerPhoneMutation.isPending ||
    loginPhonePasswordMutation.isPending ||
    sendOtpMutation.isPending ||
    loginPhoneMutation.isPending ||
    loginEmailMutation.isPending ||
    registerEmailMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">QuotePush.io</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to your account" : "Create your organization"}
          </p>
        </div>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6 space-y-5">
            {/* Mode toggle */}
            <div className="flex rounded-lg bg-muted/50 p-1 gap-1">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Create Account
              </button>
            </div>

            {/* Method tabs */}
            <Tabs value={method} onValueChange={(v) => { setMethod(v as AuthMethod); setOtpSent(false); }}>
              <TabsList className="w-full bg-muted/50">
                <TabsTrigger value="phonepass" className="flex-1 gap-1.5 text-xs">
                  <Lock className="h-3.5 w-3.5" /> Phone
                </TabsTrigger>
                <TabsTrigger value="email" className="flex-1 gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5" /> Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex-1 gap-1.5 text-xs">
                  <Phone className="h-3.5 w-3.5" /> OTP
                </TabsTrigger>
              </TabsList>

              {/* ── Phone + Password ── */}
              <TabsContent value="phonepass" className="mt-4 space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="pp-name" className="text-xs">Your Name</Label>
                      <Input
                        id="pp-name"
                        placeholder="Jane Smith"
                        value={ppName}
                        onChange={(e) => setPpName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pp-org" className="text-xs">Organization Name</Label>
                      <Input
                        id="pp-org"
                        placeholder="Acme Sales Co."
                        value={ppOrgName}
                        onChange={(e) => setPpOrgName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="pp-phone" className="text-xs">Mobile Number</Label>
                  <Input
                    id="pp-phone"
                    type="tel"
                    placeholder="7605184325"
                    value={ppPhone}
                    onChange={(e) => setPpPhone(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Digits only, no dashes or spaces</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pp-password" className="text-xs">Password</Label>
                  <Input
                    id="pp-password"
                    type="password"
                    placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                    value={ppPassword}
                    onChange={(e) => setPpPassword(e.target.value)}
                    className="h-9 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handlePhonePasswordLogin() : handlePhonePasswordRegister())}
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={mode === "login" ? handlePhonePasswordLogin : handlePhonePasswordRegister}
                  disabled={isPending || !ppPhone.trim() || !ppPassword}
                >
                  {(registerPhoneMutation.isPending || loginPhonePasswordMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </TabsContent>

              {/* ── Email/Password ── */}
              <TabsContent value="email" className="mt-4 space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-name" className="text-xs">Your Name</Label>
                      <Input
                        id="email-name"
                        placeholder="Jane Smith"
                        value={emailName}
                        onChange={(e) => setEmailName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-org" className="text-xs">Organization Name</Label>
                      <Input
                        id="email-org"
                        placeholder="Acme Sales Co."
                        value={emailOrgName}
                        onChange={(e) => setEmailOrgName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleEmailLogin() : handleEmailRegister())}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={mode === "login" ? handleEmailLogin : handleEmailRegister}
                  disabled={loginEmailMutation.isPending || registerEmailMutation.isPending || !email.trim() || !password}
                >
                  {(loginEmailMutation.isPending || registerEmailMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </TabsContent>

              {/* ── Phone OTP ── */}
              <TabsContent value="phone" className="mt-4 space-y-4">
                {!otpSent ? (
                  <>
                    {mode === "signup" && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone-name" className="text-xs">Your Name</Label>
                          <Input
                            id="phone-name"
                            placeholder="Jane Smith"
                            value={phoneName}
                            onChange={(e) => setPhoneName(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone-org" className="text-xs">Organization Name</Label>
                          <Input
                            id="phone-org"
                            placeholder="Acme Sales Co."
                            value={phoneOrgName}
                            onChange={(e) => setPhoneOrgName(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs">Mobile Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-9 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      />
                    </div>
                    <Button
                      className="w-full gap-2"
                      onClick={handleSendOtp}
                      disabled={sendOtpMutation.isPending || !phone.trim()}
                    >
                      {sendOtpMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      Send Verification Code
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-300">Code sent to {phone}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="otp" className="text-xs">6-Digit Code</Label>
                      <Input
                        id="otp"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-9 text-sm font-mono tracking-widest text-center"
                        maxLength={6}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleVerifyOtp}
                      disabled={loginPhoneMutation.isPending || otp.length !== 6}
                    >
                      {loginPhoneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Verify & {mode === "signup" ? "Create Account" : "Sign In"}
                    </Button>
                    <button
                      onClick={() => { setOtpSent(false); setOtp(""); }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Use a different number
                    </button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to QuotePush.io's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
