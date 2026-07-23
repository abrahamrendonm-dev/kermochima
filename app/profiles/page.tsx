import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { AddProfileForm } from "@/components/profiles/AddProfileForm";
import { SignOutButton } from "@/components/profiles/SignOutButton";

export default async function ProfilesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, birth_year, avatar_config, pin")
    .order("created_at", { ascending: true });

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-2xl font-bold">¿Quién va a jugar?</h1>
        <div className="flex items-center gap-4">
          <Link href="/parent" className="text-sm text-indigo-600 hover:underline">
            Panel del padre
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="flex w-full max-w-2xl flex-wrap justify-center gap-6">
        {profiles?.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>

      <AddProfileForm parentId={user.id} />
    </main>
  );
}
