import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const { error } = await supabase.from("subjects").select("id").limit(1);

  const connected = !error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Komochima</h1>
      <p className="text-lg">App educativa gamificada para niños</p>

      <div
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          connected
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {connected
          ? "✅ Conectado a Supabase"
          : `❌ Error de conexión: ${error?.message}`}
      </div>

      <p className="text-sm text-gray-500">Fase 1: setup completo</p>
    </main>
  );
}
