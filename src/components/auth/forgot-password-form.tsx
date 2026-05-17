"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { requestPasswordReset } from "@/app/auth/actions";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type ForgotPasswordFormProps = React.HTMLAttributes<HTMLDivElement>;

export function ForgotPasswordForm({
  className,
  ...props
}: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSuccess, setIsSuccess] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", values.email);

    const result = await requestPasswordReset(formData);

    setIsLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      setIsSuccess(true);
      toast.success("Password reset link sent to your email!");
    }
  }

  if (isSuccess) {
    return (
      <div className={cn("grid gap-6 text-center", className)} {...props}>
        <div className="flex flex-col items-center justify-center space-y-3 py-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
            <Icons.check className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Check your email
          </h2>
          <p className="text-muted-foreground max-w-[320px] text-sm">
            We&apos;ve sent a password reset link to{" "}
            <span className="text-foreground font-semibold">
              {form.getValues("email")}
            </span>
            . Please check your inbox and spam folders.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/auth/login">Back to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="name@example.com"
                    type="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Send Reset Link
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm">
        <Link
          href="/auth/login"
          className="text-muted-foreground hover:text-primary underline underline-offset-4"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
