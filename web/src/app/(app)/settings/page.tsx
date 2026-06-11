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
    <div className="min-h-screen bg-surface">
      <div className="page-header">
        <h1 className="font-display text-3xl text-ink leading-none">Settings</h1>
        <p className="page-subtitle">Manage your profile and account security.</p>
      </div>

      <div className="page-body max-w-2xl">
        <SettingsForms
          fullName={profile.full_name}
          email={user.email ?? ""}
          role={profile.role}
        />
      </div>
    </div>
  );
}
