import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({
  params,
}: {
  params: { profileId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, birth_year")
    .eq("id", params.profileId)
    .single();

  if (!profile) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-3xl">
        {profile.name.charAt(0).toUpperCase()}
      </div>
      <h1 className="text-2xl font-bold">¡Hola, {profile.name}!</h1>
      <p className="text-gray-500">
        Tu mapa de Matemáticas llega en la Fase 3 🚧
      </p>
    </main>
  );
}
