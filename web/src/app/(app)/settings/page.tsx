import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";
import SettingsForms from "./SettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div>
      {/* Header */}
      <div className="px-8 py-5 border-b border-line bg-white/60 sticky top-0 backdrop-blur z-10">
        <h1 className="font-display text-2xl">Settings</h1>
        <p className="text-muted text-sm">Manage your profile and account security.</p>
      </div>

      <div className="p-8 max-w-2xl">
        <SettingsForms
          fullName={profile.full_name}
          email={user.email ?? ""}
          role={profile.role}
        />
      </div>
    </div>
  );
}
