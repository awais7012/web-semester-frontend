"use client";

import z from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api-client";
import { saveAuthResult } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

type LoginForm = z.infer<typeof loginSchema>;
type OtpForm = z.infer<typeof otpSchema>;

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

const BgPanel = () => (
  <div
    className="hidden lg:flex lg:col-span-2 h-screen flex-col justify-between p-12 relative overflow-hidden"
    style={{ backgroundImage: "url('/auth-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
    <div className="relative z-10">
      <span className={cn("text-white text-3xl font-bold tracking-tight", poppins.className)}>funroad</span>
    </div>
    <div className="relative z-10 space-y-4">
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-white/80" />
        ))}
      </div>
      <blockquote className="text-white text-xl font-medium leading-relaxed">
        &ldquo;The best place to discover and buy digital products from creators worldwide.&rdquo;
      </blockquote>
      <p className="text-white/60 text-sm">— Funroad Community</p>
    </div>
  </div>
);

export const SignInView = () => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({
    mode: "all",
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const otpForm = useForm<OtpForm>({
    mode: "all",
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const onLogin = async (values: LoginForm) => {
    setIsPending(true);
    setFormError(null);
    try {
      const res = await authApi.login(values);

      if (!res.success && (res as { requiresOTP?: boolean }).requiresOTP) {
        setOtpEmail(values.email);
        toast.info("Please verify your email. A new code has been sent.");
        return;
      }

      if (!res.success || !res.data) {
        setFormError(res.error ?? "Login failed. Please try again.");
        return;
      }

      saveAuthResult(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.username}!`);

      const { role } = res.data.user;
      if (role === "admin") router.push("/admin");
      else if (role === "vendor") router.push("/vendor/dashboard");
      else router.push("/library");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const onVerifyOtp = async (values: OtpForm) => {
    if (!otpEmail) return;
    setIsPending(true);
    setFormError(null);
    try {
      const res = await authApi.verifyOtp(otpEmail, values.otp);
      if (!res.success || !res.data) {
        setFormError(res.error ?? "Invalid code. Please try again.");
        return;
      }
      saveAuthResult(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.username}!`);
      const { role } = res.data.user;
      if (role === "admin") router.push("/admin");
      else if (role === "vendor") router.push("/vendor/dashboard");
      else router.push("/library");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const onResendOtp = async () => {
    if (!otpEmail) return;
    try {
      await authApi.resendOtp(otpEmail);
      toast.success("New code sent to your email.");
    } catch {
      toast.error("Failed to resend code.");
    }
  };

  // ── OTP Step ─────────────────────────────────────────────────────────────────
  if (otpEmail) {
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
              <h1 className="text-3xl font-bold mb-2">Check your inbox</h1>
              <p className="text-zinc-500 text-sm leading-relaxed">
                We sent a 6-digit verification code to{" "}
                <span className="font-semibold text-black">{otpEmail}</span>
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
                    : "Verify email"
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
                onClick={() => { setOtpEmail(null); setFormError(null); }}
                className="text-sm text-zinc-400 hover:text-black transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>
        <BgPanel />
      </div>
    );
  }

  // ── Login Step ────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 min-h-screen">
      <div className="lg:col-span-3 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-10">
            <Link href="/">
              <span className={cn("text-2xl font-bold", poppins.className)}>funroad</span>
            </Link>
            <Link
              href="/sign-up"
              className="text-sm text-zinc-500 hover:text-black transition-colors font-medium"
            >
              Create account →
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-1.5">Welcome back</h1>
            <p className="text-zinc-500 text-sm">Sign in to your Funroad account to continue.</p>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{formError}</span>
            </div>
          )}

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
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
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium text-zinc-700">Password</FormLabel>
                    </div>
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
                        Sign in <ArrowRight className="w-4 h-4" />
                      </span>
                    )
                  }
                </Button>
              </div>
            </form>
          </Form>

          <p className="mt-7 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-semibold text-black hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
      <BgPanel />
    </div>
  );
};
