import { redirect } from "next/navigation";
import { getMyAssignedShops, getMyProfile } from "@/actions/user/stock";

import { getAuthContext } from "@/lib/supabase/server";
import { UserProfileView } from "@/components/user/profile/user-profile-view";

export default async function ProfilePage() {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) redirect("/auth/login");

  const [profile, assignedShops] = await Promise.all([
    getMyProfile(),
    getMyAssignedShops(),
  ]);

  if (!profile) {
    redirect("/");
  }

  return (
    <div className="py-2 pb-10">
      <UserProfileView profile={profile} assignedShops={assignedShops} />
    </div>
  );
}
