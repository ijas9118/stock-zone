import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { logout } from "@/app/auth/actions";

export default function RejectedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 rounded-full bg-red-100 p-6 dark:bg-red-900/20">
        <Icons.error className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">Account Rejected</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Unfortunately, your account application has been rejected by the
        administrator. If you believe this is a mistake, please contact support.
      </p>
      <form action={logout}>
        <Button variant="outline">
          <Icons.logout className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </form>
    </div>
  );
}
