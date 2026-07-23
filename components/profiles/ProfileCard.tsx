"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  name: string;
  birth_year: number;
  avatar_config: Record<string, unknown> | null;
  pin: string | null;
};

export function ProfileCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [enteringPin, setEnteringPin] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const age = new Date().getFullYear() - profile.birth_year;

  function handleClick() {
    if (profile.pin) {
      setEnteringPin(true);
    } else {
      router.push(`/dashboard/${profile.id}`);
    }
  }

  function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    setError(false);

    if (digits.length === 4) {
      if (digits === profile.pin) {
        router.push(`/dashboard/${profile.id}`);
      } else {
        setError(true);
        setPin("");
      }
    }
  }

  if (enteringPin) {
    return (
      <div className="flex w-40 flex-col items-center gap-2 rounded-2xl border border-gray-200 p-4">
        <p className="text-sm font-medium">{profile.name}</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest"
          placeholder="PIN"
        />
        {error && <p className="text-xs text-red-600">PIN incorrecto</p>}
        <button
          type="button"
          className="text-xs text-gray-500 hover:underline"
          onClick={() => {
            setEnteringPin(false);
            setPin("");
            setError(false);
          }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-40 flex-col items-center gap-2 rounded-2xl border border-gray-200 p-4 transition hover:border-indigo-400 hover:shadow-md"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl">
        {profile.name.charAt(0).toUpperCase()}
      </div>
      <p className="font-medium">{profile.name}</p>
      <p className="text-xs text-gray-500">{age} años</p>
    </button>
  );
}
