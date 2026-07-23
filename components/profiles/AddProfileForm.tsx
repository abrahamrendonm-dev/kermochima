"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AddProfileForm({ parentId }: { parentId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin && pin.length !== 4) {
      setError("El PIN debe tener 4 dígitos, o déjalo vacío.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("profiles").insert({
      parent_id: parentId,
      name,
      birth_year: Number(birthYear),
      pin: pin || null,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setName("");
    setBirthYear("");
    setPin("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600"
      >
        + Agregar hijo/a
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-gray-200 p-4"
    >
      <h2 className="text-sm font-semibold">Nuevo perfil</h2>
      <input
        required
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        required
        type="number"
        min={2000}
        max={new Date().getFullYear()}
        placeholder="Año de nacimiento"
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder="PIN de 4 dígitos (opcional)"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="rounded-lg border border-gray-300 px-3 py-2"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
