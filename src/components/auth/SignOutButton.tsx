import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="text" fullWidth icon={<LogOut aria-hidden className="size-4" />}>
        Sign out
      </Button>
    </form>
  );
}
