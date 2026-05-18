const AVATARS = [
  { id: "judge", emoji: "👨‍⚖️", bg: "from-amber-500/30 to-amber-700/30" },
  { id: "skull", emoji: "💀", bg: "from-slate-400/30 to-slate-700/30" },
  { id: "fire", emoji: "🔥", bg: "from-orange-500/30 to-red-700/30" },
  { id: "alien", emoji: "👽", bg: "from-emerald-500/30 to-emerald-800/30" },
  { id: "clown", emoji: "🤡", bg: "from-pink-500/30 to-fuchsia-700/30" },
  { id: "ghost", emoji: "👻", bg: "from-indigo-400/30 to-indigo-700/30" },
  { id: "snake", emoji: "🐍", bg: "from-lime-500/30 to-green-800/30" },
  { id: "crown", emoji: "👑", bg: "from-yellow-400/30 to-amber-700/30" },
  { id: "devil", emoji: "😈", bg: "from-red-500/30 to-red-900/30" },
  { id: "angel", emoji: "😇", bg: "from-sky-400/30 to-sky-700/30" },
  { id: "robot", emoji: "🤖", bg: "from-zinc-400/30 to-zinc-700/30" },
  { id: "cat", emoji: "🐈‍⬛", bg: "from-violet-500/30 to-violet-800/30" },
];

export const AVATAR_IDS = AVATARS.map((a) => a.id);

export function getAvatar(id?: string | null) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export function Avatar({ id, size = 40, ring = false }: { id?: string | null; size?: number; ring?: boolean }) {
  const a = getAvatar(id);
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${a.bg} flex items-center justify-center shadow-inner ${ring ? "ring-2 ring-accent" : "ring-1 ring-border"}`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      <span>{a.emoji}</span>
    </div>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATARS.map((a) => {
        const selected = a.id === value;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={`relative aspect-square rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${a.bg} ${
              selected ? "ring-2 ring-accent scale-105" : "ring-1 ring-border/60"
            } transition-transform`}
            aria-label={`Choose avatar ${a.id}`}
            aria-pressed={selected}
          >
            <span>{a.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
