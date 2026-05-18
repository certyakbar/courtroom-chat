import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CourtHeader } from "@/components/CourtHeader";
import { AvatarPicker } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserToken, getStoredNickname, randomRoomCode, setStoredNickname } from "@/lib/browserToken";
import { toast } from "sonner";
import { Users } from "lucide-react";

export default function PartyNew() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState(getStoredNickname());
  const [avatar, setAvatar] = useState("judge");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!nickname.trim()) { toast.error("Need a nickname."); return; }
    setLoading(true);
    setStoredNickname(nickname.trim());
    const token = getBrowserToken();
    const code = randomRoomCode();
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({ code, name: name.trim() || null, host_browser_token: token })
      .select("id,code,name,current_round_id").single();
    if (error || !room) { setLoading(false); toast.error("Couldn't open the courtroom."); return; }
    const { error: pErr } = await supabase.from("players").insert({
      room_id: room.id, nickname: nickname.trim().slice(0, 30), avatar, browser_token: token,
    });
    setLoading(false);
    if (pErr) { toast.error("Couldn't seat the host."); return; }
    const { markMyRoom } = await import("@/lib/browserToken");
    markMyRoom(room.code);
    nav(`/r/${room.code}`);

  };

  return (
    <div className="min-h-dvh">
      <CourtHeader />
      <main className="px-5 pb-16 max-w-md mx-auto">
        <p className="text-[11px] uppercase tracking-[0.3em] text-accent">⚖ Party Court</p>
        <h1 className="font-display text-3xl mt-2">Open a courtroom.</h1>
        <p className="text-muted-foreground mt-2 text-sm">3–8 players recommended. Invite by link or code.</p>

        <div className="mt-5 court-card p-5 space-y-4">
          <Field label="Room name (optional)">
            <input value={name} onChange={(e) => setName(e.target.value)} className="court-input" maxLength={40} placeholder="e.g. Sunday Chaos Court" />
          </Field>
          <Field label="Your nickname">
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="court-input" maxLength={30} placeholder="e.g. Judge Jules" />
          </Field>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Choose avatar</p>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </div>
          <button onClick={create} disabled={loading} className="btn-hero w-full">
            <Users className="w-5 h-5" /> {loading ? "Opening..." : "Open courtroom"}
          </button>
        </div>
      </main>
      <style>{`
        .court-input { width:100%; background: hsl(var(--secondary)/0.5); border:1px solid hsl(var(--border)); color:hsl(var(--foreground)); border-radius:.875rem; padding:.7rem .9rem; font-size:.95rem; outline:none; }
        .court-input:focus { border-color: hsl(var(--accent)); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
