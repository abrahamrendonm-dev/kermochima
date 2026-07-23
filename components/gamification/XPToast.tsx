"use client";

import type { AwardXPResult } from "@/lib/xpEngine";

export function XPToast({
  result,
  onClose,
}: {
  result: AwardXPResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-4xl">✨</p>
        <p className="text-2xl font-bold text-indigo-600">
          +{result.xpEarned} XP
        </p>

        {result.leveledUp && (
          <p className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
            ¡Subiste a nivel {result.level}! 🎊
          </p>
        )}

        {result.currentStreak > 1 && (
          <p className="text-sm text-gray-600">
            🔥 Racha de {result.currentStreak} días
          </p>
        )}

        {result.newBadges.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-indigo-50 p-3">
            <p className="text-sm font-semibold text-indigo-700">
              ¡Nueva insignia!
            </p>
            {result.newBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center justify-center gap-2"
              >
                <span className="text-2xl">{badge.icon ?? "🏅"}</span>
                <span className="text-sm font-medium">{badge.name}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-2 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
