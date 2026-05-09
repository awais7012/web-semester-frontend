"use client";

import z from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { resetPasswordSchema } from "../../schemas";

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

export const ResetPasswordView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const resetPassword = useMutation(
    trpc.auth.resetPassword.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
        toast.success("Password reset! You are now logged in.");
        router.push("/");
      },
    })
  );

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    mode: "all",
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "" },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center p-4">
        <div className="bg-white border-2 border-black rounded-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold mb-3">Invalid link</h2>
          <p className="text-gray-600 mb-6">This reset link is invalid or has expired.</p>
          <Link href="/forgot-password" className="underline text-sm font-medium">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5">
      <div className="bg-[#F4F4F0] h-screen w-full lg:col-span-3 overflow-y-auto">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => resetPassword.mutate(v))}
            className="flex flex-col gap-8 p-4 lg:p-16"
          >
            <div className="flex items-center justify-between mb-8">
              <Link href="/">
                <span className={cn("text-2xl font-semibold", poppins.className)}>
                  funroad
                </span>
              </Link>
            </div>

            <h1 className="text-4xl font-medium">Set a new password</h1>

            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">New Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={resetPassword.isPending}
              type="submit"
              size="lg"
              variant="elevated"
              className="bg-black text-white hover:bg-pink-400 hover:text-primary"
            >
              Reset password
            </Button>
          </form>
        </Form>
      </div>
      <div
        className="h-screen w-full lg:col-span-2 hidden lg:block"
        style={{ backgroundImage: "url('/auth-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      />
    </div>
  );
};
