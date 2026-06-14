"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { setPassword } from "@/actions/user/auth";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordSectionProps {
  hasPassword?: boolean;
}

export function PasswordSection({ hasPassword = false }: PasswordSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: PasswordFormValues) {
    setIsLoading(true);
    try {
      const result = await setPassword(values.password);

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          hasPassword
            ? "Password updated successfully"
            : "Password set successfully! You can now sign in with email & password."
        );
        form.reset();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set password"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-muted-foreground/70 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
          <Lock className="h-3 w-3" />
          Password
        </h3>
      </div>

      <div className="bg-muted/20 border-border/40 rounded-xl border p-4">
        <Form {...form}>
          <FormDescription className="mb-4">
            {hasPassword
              ? "Update your password to a new one."
              : "You're currently signed in with Google. Set a password to also sign in with email & password."}
          </FormDescription>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {hasPassword ? "New Password" : "Password"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter password (min 8 chars, 1 uppercase, 1 number)"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                  <FormDescription className="text-[11px]">
                    At least 8 characters, 1 uppercase letter, and 1 number
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Confirm {hasPassword ? "New " : ""}Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Re-enter password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasPassword ? "Update Password" : "Set Password"}
            </Button>
          </form>
        </Form>
      </div>

      <Separator className="opacity-50" />
    </div>
  );
}
