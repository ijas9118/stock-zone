import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { logout } from "@/app/auth/actions";

export default function PendingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 rounded-full bg-yellow-100 p-6 dark:bg-yellow-900/20">
        <Icons.alert className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">Account Pending</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Your account has been created and is currently awaiting administrator
        approval. You will be able to access the dashboard once your account is
        activated.
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
