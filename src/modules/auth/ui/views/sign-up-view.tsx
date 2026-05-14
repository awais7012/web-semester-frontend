"use client";

import z from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, RefreshCw, Check } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api-client";
import { saveAuthResult } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

const registerSchema = z.object({
  username: z.string().min(3, "Min 3 characters").max(50).regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _ or -"),
  email: z.string().email("Invalid email"),
  password: z.string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  storeName: z.string().optional(),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

type RegisterForm = z.infer<typeof registerSchema>;
type OtpForm = z.infer<typeof otpSchema>;

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="flex gap-3 mt-1.5">
      {checks.map(({ label, ok }) => (
        <span key={label} className={cn("flex items-center gap-1 text-xs transition-colors", ok ? "text-emerald-600" : "text-zinc-400")}>
          <Check className={cn("w-3 h-3", ok ? "opacity-100" : "opacity-30")} />
          {label}
        </span>
      ))}
    </div>
  );
}

const BgPanel = () => (
  <div
    className="hidden lg:flex lg:col-span-2 h-screen flex-col justify-between p-12 relative overflow-hidden"
    style={{ backgroundImage: "url('/auth-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
    <div className="relative z-10">
      <span className={cn("text-white text-3xl font-bold tracking-tight", poppins.className)}>funroad</span>
    </div>
    <div className="relative z-10 space-y-6">
      {[
        { n: "1,580+", label: "Active creators" },
        { n: "12,400+", label: "Products sold" },
        { n: "PKR 2.4M+", label: "Revenue generated" },
      ].map(({ n, label }) => (
        <div key={label}>
          <p className="text-white text-2xl font-bold">{n}</p>
          <p className="text-white/60 text-sm">{label}</p>
        </div>
      ))}
    </div>
  </div>
);

export const SignUpView = ({ initialRole = "user" }: { initialRole?: "user" | "vendor" }) => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"user" | "vendor">(initialRole);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"register" | "otp">("register");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingRole, setPendingRole] = useState<"user" | "vendor">("user");
  const [formError, setFormError] = useState<string | null>(null);

  const registerForm = useForm<RegisterForm>({
    mode: "all",
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", username: "", storeName: "" },
  });

  const otpForm = useForm<OtpForm>({
    mode: "all",
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const username = registerForm.watch("username");
  const password = registerForm.watch("password");
  const usernameErrors = registerForm.formState.errors.username;
  const showPreview = username && !usernameErrors && selectedRole === "vendor";

  const onRegister = async (values: RegisterForm) => {
    setIsPending(true);
    setFormError(null);
    try {
      const res = await authApi.register({
        username: values.username,
        email: values.email,
        password: values.password,
        role: selectedRole,
        ...(selectedRole === "vendor" && values.storeName ? { storeName: values.storeName } : {}),
      });

      if (!res.success) {
        setFormError(res.error ?? "Registration failed. Please try again.");
        return;
      }

      setPendingEmail(values.email);
      setPendingRole(selectedRole);
      setStep("otp");
      toast.success("Account created! Check your email for the verification code.");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const onVerifyOtp = async (values: OtpForm) => {
    setIsPending(true);
    setFormError(null);
    try {
      const res = await authApi.verifyOtp(pendingEmail, values.otp);

      if (!res.success || !res.data) {
        setFormError(res.error ?? "Invalid code. Please try again.");
        return;
      }

      saveAuthResult(res.data.token, res.data.user);

      if (pendingRole === "vendor") {
        toast.success("Email verified! Your vendor account is pending admin approval.");
        router.push("/vendor/dashboard");
      } else {
        toast.success("Welcome to Funroad!");
        router.push("/");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const onResendOtp = async () => {
    try {
      await authApi.resendOtp(pendingEmail);
      toast.success("New code sent to your email.");
    } catch {
      toast.error("Failed to resend code.");
    }
  };

  // ── OTP Step ─────────────────────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 min-h-screen">
        <div className="lg:col-span-3 flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-md">
            <Link href="/" className="block mb-10">
              <span className={cn("text-2xl font-bold", poppins.className)}>funroad</span>
            </Link>

            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-6">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Verify your email</h1>
              <p className="text-zinc-500 text-sm leading-relaxed">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-black">{pendingEmail}</span>
              </p>
            </div>

            {formError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{formError}</span>
              </div>
            )}

            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-5">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-zinc-700">Verification code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          maxLength={6}
                          placeholder="000000"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          className="text-3xl tracking-[0.6em] text-center font-mono h-16 border-2 border-zinc-200 rounded-xl focus:border-black transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  disabled={isPending}
                  type="submit"
                  className="w-full h-12 bg-black hover:bg-zinc-800 text-white rounded-xl font-semibold text-base transition-all"
                >
                  {isPending
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : "Verify & continue"
                  }
                </Button>
              </form>
            </Form>

            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onResendOtp}
                className="text-sm text-zinc-500 hover:text-black flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend code
              </button>
              <button
                type="button"
                onClick={() => { setStep("register"); setFormError(null); }}
                className="text-sm text-zinc-400 hover:text-black transition-colors"
              >
                ← Back to sign up
              </button>
            </div>
          </div>
        </div>
        <BgPanel />
      </div>
    );
  }

  // ── Register Step ─────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 min-h-screen">
      <div className="lg:col-span-3 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <Link href="/">
              <span className={cn("text-2xl font-bold", poppins.className)}>funroad</span>
            </Link>
            <Link href="/sign-in" className="text-sm text-zinc-500 hover:text-black transition-colors font-medium">
              Sign in →
            </Link>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-600 mb-2.5">I want to…</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedRole("user")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left",
                  selectedRole === "user"
                    ? "border-black bg-zinc-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
                )}
              >
                <ShoppingBag className={cn("w-5 h-5", selectedRole === "user" ? "text-black" : "text-zinc-400")} />
                <div>
                  <p className="font-semibold text-sm text-center">Browse & Buy</p>
                  <p className="text-xs text-zinc-400 text-center mt-0.5">Find & purchase products</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("vendor")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left",
                  selectedRole === "vendor"
                    ? "border-black bg-zinc-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
                )}
              >
                <Store className={cn("w-5 h-5", selectedRole === "vendor" ? "text-black" : "text-zinc-400")} />
                <div>
                  <p className="font-semibold text-sm text-center">Sell Products</p>
                  <p className="text-xs text-zinc-400 text-center mt-0.5">Create your own store</p>
                </div>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-zinc-900">
              {selectedRole === "vendor"
                ? "Start selling on Funroad"
                : "Create your account"}
            </h1>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{formError}</span>
            </div>
          )}

          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-zinc-700">Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                          {...field}
                          placeholder="yourname"
                          className="pl-10 h-11 border-zinc-200 rounded-xl focus:border-black transition-colors"
                        />
                      </div>
                    </FormControl>
                    {showPreview && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Your store URL: <span className="font-medium text-zinc-600">{username}.funroad.com</span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === "vendor" && (
                <FormField
                  control={registerForm.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-zinc-700">Store name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <Input
                            {...field}
                            placeholder="e.g. Ahmed's Digital Store"
                            className="pl-10 h-11 border-zinc-200 rounded-xl focus:border-black transition-colors"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-zinc-700">Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10 h-11 border-zinc-200 rounded-xl focus:border-black transition-colors"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-zinc-700">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 h-11 border-zinc-200 rounded-xl focus:border-black transition-colors"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <PasswordStrength password={password ?? ""} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-1">
                <Button
                  disabled={isPending}
                  type="submit"
                  className="w-full h-12 bg-black hover:bg-zinc-800 text-white rounded-xl font-semibold text-base transition-all"
                >
                  {isPending
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : (
                      <span className="flex items-center justify-center gap-2">
                        {selectedRole === "vendor" ? "Start selling" : "Create account"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )
                  }
                </Button>
              </div>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-black hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <BgPanel />
    </div>
  );
};
