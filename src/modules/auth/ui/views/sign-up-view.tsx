"use client";

import z from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { ShoppingBagIcon, StoreIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { registerSchema } from "../../schemas";

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

interface SignUpViewProps {
  initialRole?: "user" | "vendor";
}

export const SignUpView = ({ initialRole = "user" }: SignUpViewProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<"user" | "vendor">(initialRole);

  const register = useMutation(
    trpc.auth.register.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(trpc.auth.session.queryFilter());

        if (data.role === "vendor") {
          toast.success("Store created! Your account is pending admin approval.");
          router.push("/vendor/dashboard");
        } else {
          toast.success("Account created! Please check your email to verify your address.");
          router.push("/");
        }
      },
    })
  );

  type RegisterForm = {
    email: string;
    username: string;
    password: string;
    storeName?: string;
    role: "user" | "vendor";
  };

  const form = useForm<RegisterForm>({
    mode: "all",
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { email: "", password: "", username: "", storeName: "", role: "user" },
  });

  const onSubmit = (values: RegisterForm) => {
    register.mutate({ ...values, role: selectedRole });
  };

  const username = form.watch("username");
  const usernameErrors = form.formState.errors.username;
  const showPreview = username && !usernameErrors && selectedRole === "vendor";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5">
      <div className="bg-[#F4F4F0] h-screen w-full lg:col-span-3 overflow-y-auto">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-8 p-4 lg:p-16"
          >
            <div className="flex items-center justify-between mb-8">
              <Link href="/">
                <span className={cn("text-2xl font-semibold", poppins.className)}>
                  funroad
                </span>
              </Link>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-base border-none underline"
              >
                <Link prefetch href="/sign-in">Sign in</Link>
              </Button>
            </div>

            {/* Role toggle */}
            <div>
              <p className="text-base font-medium mb-3">I want to…</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole("user")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    selectedRole === "user"
                      ? "border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      : "border-transparent bg-white hover:border-gray-300"
                  )}
                >
                  <ShoppingBagIcon className="size-6" />
                  <span className="font-semibold text-sm">Browse & Buy</span>
                  <span className="text-xs text-gray-500">Find and purchase products</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("vendor")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    selectedRole === "vendor"
                      ? "border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      : "border-transparent bg-white hover:border-gray-300"
                  )}
                >
                  <StoreIcon className="size-6" />
                  <span className="font-semibold text-sm">Sell Products</span>
                  <span className="text-xs text-gray-500">Create your own store</span>
                </button>
              </div>
            </div>

            <h1 className="text-4xl font-medium">
              {selectedRole === "vendor"
                ? "Join over 1,580 creators earning money on Funroad."
                : "Join Funroad and discover amazing products."}
            </h1>

            <FormField
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  {showPreview && (
                    <FormDescription>
                      Your store will be available at&nbsp;
                      <strong>{username}</strong>.funroad.com
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedRole === "vendor" && (
              <FormField
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Store name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Ahmed's Digital Store" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={register.isPending}
              type="submit"
              size="lg"
              variant="elevated"
              className="bg-black text-white hover:bg-pink-400 hover:text-primary"
            >
              {selectedRole === "vendor" ? "Start selling" : "Create account"}
            </Button>
          </form>
        </Form>
      </div>
      <div
        className="h-screen w-full lg:col-span-2 hidden lg:block"
        style={{
          backgroundImage: "url('/auth-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </div>
  );
};
