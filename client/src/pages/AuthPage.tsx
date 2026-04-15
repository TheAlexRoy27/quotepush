import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Phone, ArrowRight, CheckCircle2, Lock, Gift, X } from "lucide-react";
import { useLocation } from "wouter";

type AuthMode = "login" | "signup";
type AuthMethod = "phonepass" | "phone" | "email";

// ─── Referral Code Input ──────────────────────────────────────────────────────

function ReferralCodeField({
  value,
  onChange,
  validState,
}: {
  value: string;
  onChange: (v: string) => void;
  validState: "idle" | "valid" | "invalid";
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="referral-code" className="text-xs flex items-center gap-1.5">
        <Gift className="h-3 w-3 text-violet-400" />
        Referral Code
        <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <div className="relative">
        <Input
          id="referral-code"
          placeholder="e.g. ALEX-4X2K"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().trim())}
          className={`h-9 text-sm font-mono tracking-wider pr-8 ${
            validState === "valid"
              ? "border-emerald-500/60 focus-visible:ring-emerald-500/30"
              : validState === "invalid"
              ? "border-rose-500/60 focus-visible:ring-rose-500/30"
              : ""
          }`}
        />
        {validState === "valid" && (
          <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
        )}
        {validState === "invalid" && (
          <X className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400 pointer-events-none" />
        )}
      </div>
      {validState === "valid" && (
        <p className="text-xs text-emerald-400">Valid referral code applied!</p>
      )}
      {validState === "invalid" && (
        <p className="text-xs text-rose-400">Code not found. Double-check and try again.</p>
      )}
    </div>
  );
}

export default function AuthPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<AuthMode>("login");
  const [method, setMethod] = useState<AuthMethod>("phonepass");

  // Shared referral code state (one field, shared across all tabs)
  const [referralCode, setReferralCode] = useState("");
  const [referralState, setReferralState] = useState<"idle" | "valid" | "invalid">("idle");
  const [referrerId, setReferrerId] = useState<number | null>(null);

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
  const trackVisitMutation = trpc.referrals.trackVisit.useMutation();
  const recordSignupMutation = trpc.referrals.recordSignup.useMutation();

  // Pre-fill referral code from ?ref= query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const code = ref.toUpperCase().trim();
      setReferralCode(code);
      setMode("signup");
      // Auto-validate
      trackVisitMutation.mutateAsync({ code }).then((res) => {
        if (res.valid && res.referrerId) {
          setReferralState("valid");
          setReferrerId(res.referrerId);
        } else {
          setReferralState("invalid");
        }
      }).catch(() => setReferralState("invalid"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate referral code when user stops typing (debounced)
  useEffect(() => {
    if (!referralCode || mode !== "signup") {
      setReferralState("idle");
      setReferrerId(null);
      return;
    }
    if (referralCode.length < 4) {
      setReferralState("idle");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await trackVisitMutation.mutateAsync({ code: referralCode });
        if (res.valid && res.referrerId) {
          setReferralState("valid");
          setReferrerId(res.referrerId);
        } else {
          setReferralState("invalid");
          setReferrerId(null);
        }
      } catch {
        setReferralState("invalid");
        setReferrerId(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralCode, mode]);

  // Helper: record referral attribution after a successful signup
  const recordReferral = async (newUserId: number) => {
    if (referrerId && referralState === "valid") {
      try {
        await recordSignupMutation.mutateAsync({ referrerId, referredId: newUserId });
      } catch {
        // Non-fatal — don't block the signup
      }
    }
  };

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
      });        if (result.success) {
        if (result.user?.id) await recordReferral(result.user.id);
        toast.success("Account created! Welcome to QuotePush.io.");
        utils.auth.me.invalidate();
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create account");
    }
  };

  // ── Phone OTP handlers─────────────────────────────────────────────────────

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
        if (result.isNew && result.user?.id) await recordReferral(result.user.id);
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
        if (result.user?.id) await recordReferral(result.user.id);
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
        <div className="text-center space-y-3">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-favicon-hsV6w9Xq6ruPjUPpEDFYpV.webp"
            alt="QuotePush.io"
            className="h-24 w-24 rounded-3xl shadow-xl mx-auto"
          />
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
                {/* Referral code — signup only */}
                {mode === "signup" && (
                  <ReferralCodeField
                    value={referralCode}
                    onChange={setReferralCode}
                    validState={referralState}
                  />
                )}
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
                {/* Referral code — signup only */}
                {mode === "signup" && (
                  <ReferralCodeField
                    value={referralCode}
                    onChange={setReferralCode}
                    validState={referralState}
                  />
                )}
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
                    {/* Referral code — signup only, shown before sending OTP */}
                    {mode === "signup" && (
                      <ReferralCodeField
                        value={referralCode}
                        onChange={setReferralCode}
                        validState={referralState}
                      />
                    )}
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
                      Verify &amp; {mode === "signup" ? "Create Account" : "Sign In"}
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

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            By providing your phone number and clicking <strong className="text-foreground">Create Account</strong> or{" "}
            <strong className="text-foreground">Sign In</strong>, you expressly consent to receive recurring automated
            marketing text messages (e.g. promotions, updates) from QuotePush.io at the number provided.
            Consent is not a condition of purchase. Message &amp; data rates may apply.
            Reply <strong className="text-foreground">STOP</strong> to unsubscribe at any time.
          </p>
          <p className="text-xs text-muted-foreground">
            By continuing, you also agree to QuotePush.io&apos;s{" "}
            <a href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
