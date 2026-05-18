import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CourtHeader } from "@/components/CourtHeader";
import { Avatar, AvatarPicker } from "@/components/Avatar";
import { VerdictReveal } from "@/components/VerdictReveal";
import { VerdictCard } from "@/components/VerdictCard";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserToken, getStoredNickname, setStoredNickname, isMyRoom, markMyRoom } from "@/lib/browserToken";
import { copyText, nativeShare } from "@/lib/share";
import { pickSentence, tallyVotes, VOTE_LABEL, type VoteValue } from "@/lib/verdict";
import { toast } from "sonner";
import { Copy, Gavel, Repeat2, ScrollText, Share2, Sparkles, Swords, Trophy } from "lucide-react";

type Room = { id: string; code: string; name: string | null; current_round_id: string | null };
type Player = { id: string; room_id: string; nickname: string; avatar: string };

type Round = {
  id: string; room_id: string; case_type: string; case_template_id: string | null;
  accused_player_id: string | null; custom_title: string | null; custom_description: string | null;
  suggested_sentence: string | null; chaos_lawyer_player_id: string | null; phase: string;
};
type CasePack = { id: string; season_name: string; category: string | null };
type CaseTemplate = { id: string; pack_id: string; title: string; description: string; suggested_sentence: string | null };
type Evidence = { id: string; round_id: string; player_id: string; text: string };
type Vote = { id: string; round_id: string; player_id: string; vote: string; chaos_guess_player_id: string | null };
type Verdict = { id: string; round_id: string | null; result: string; sentence: string | null; best_evidence_id: string | null; chaos_lawyer_found: boolean | null; created_at: string };

const CHAOS_MISSIONS = [
  "Defend the accused no matter what.",
  "Make the vote as close as possible.",
  "Blame someone else.",
  "Convince the room this was justified.",
];

export default function Room() {
  const { code } = useParams();
  const token = useMemo(getBrowserToken, []);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [packs, setPacks] = useState<CasePack[]>([]);
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [loading, setLoading] = useState(true);

  // Join form state
  const [nickname, setNickname] = useState(getStoredNickname());
  const [avatar, setAvatar] = useState("clown");
  const [joining, setJoining] = useState(false);

  const me = players.find((p) => p.browser_token === token);
  const isHost = room && room.host_browser_token === token;
  const chaosMissionIdx = useMemo(() => {
    if (!round) return 0;
    let h = 0;
    for (const c of round.id) h = (h * 31 + c.charCodeAt(0)) | 0;
    return Math.abs(h) % CHAOS_MISSIONS.length;
  }, [round?.id]);

  const refresh = async () => {
    if (!code) return;
    const { data: r } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
    if (!r) { setLoading(false); return; }
    setRoom(r as any);
    const [{ data: ps }, { data: rd }, { data: roomRounds }] = await Promise.all([
      supabase.from("players").select("*").eq("room_id", (r as any).id).order("joined_at", { ascending: true }),
      (r as any).current_round_id
        ? supabase.from("rounds").select("*").eq("id", (r as any).current_round_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("rounds").select("id").eq("room_id", (r as any).id),
    ]);
    setPlayers((ps as any) ?? []);
    setRound((rd as any) ?? null);
    const roundIds = ((roomRounds as any) ?? []).map((x: any) => x.id);
    if (roundIds.length) {
      const { data: vds } = await supabase.from("verdicts").select("*").in("round_id", roundIds).order("created_at", { ascending: false });
      setVerdicts((vds as any) ?? []);
    } else {
      setVerdicts([]);
    }
    if (rd) {
      const [{ data: ev }, { data: vs }] = await Promise.all([
        supabase.from("evidence").select("*").eq("round_id", (rd as any).id),
        supabase.from("votes").select("*").eq("round_id", (rd as any).id),
      ]);
      setEvidence((ev as any) ?? []);
      setVotes((vs as any) ?? []);
    } else {
      setEvidence([]); setVotes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 3000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Load case packs once
  useEffect(() => {
    (async () => {
      const { data: pp } = await supabase.from("case_packs").select("*").order("season_name");
      const { data: tt } = await supabase.from("case_templates").select("*").order("title");
      setPacks((pp as any) ?? []);
      setTemplates((tt as any) ?? []);
    })();
  }, []);

  const joinRoom = async () => {
    if (!room) return;
    if (!nickname.trim()) { toast.error("Add a nickname."); return; }
    setStoredNickname(nickname.trim());
    setJoining(true);
    const { error } = await supabase.from("players").insert({
      room_id: room.id, nickname: nickname.trim().slice(0, 30), avatar, browser_token: token,
    });
    setJoining(false);
    if (error) {
      if (error.code === "23505") { /* already joined */ refresh(); return; }
      toast.error("Couldn't join the room.");
      return;
    }
    refresh();
  };

  const startRound = async (opts: {
    case_type: "ready" | "custom";
    case_template_id?: string | null;
    accused_player_id?: string | null;
    custom_title?: string | null;
    custom_description?: string | null;
    suggested_sentence?: string | null;
    chaos_lawyer_player_id?: string | null;
  }) => {
    if (!room) return;
    const { data: rd, error } = await supabase.from("rounds").insert({
      room_id: room.id,
      case_type: opts.case_type,
      case_template_id: opts.case_template_id ?? null,
      accused_player_id: opts.accused_player_id ?? null,
      custom_title: opts.custom_title ?? null,
      custom_description: opts.custom_description ?? null,
      suggested_sentence: opts.suggested_sentence ?? null,
      chaos_lawyer_player_id: opts.chaos_lawyer_player_id ?? null,
      phase: "evidence",
    }).select().single();
    if (error || !rd) { toast.error("Couldn't start the round."); return; }
    await supabase.from("rooms").update({ current_round_id: (rd as any).id }).eq("id", room.id);
    refresh();
  };

  const setPhase = async (phase: string) => {
    if (!round) return;
    await supabase.from("rounds").update({ phase }).eq("id", round.id);
    refresh();
  };

  const deliverPartyVerdict = async () => {
    if (!round) return;
    const t = tallyVotes(votes);
    const result: VoteValue = t.total === 0 ? "everyone_wrong" : t.winner;
    const sentence = pickSentence(result, round.suggested_sentence);
    const best = evidence.slice().sort((a, b) => b.text.length - a.text.length)[0];

    // Did the room successfully identify the chaos lawyer?
    let chaosFound: boolean | null = null;
    if (round.chaos_lawyer_player_id) {
      const guesses = votes.filter((v) => v.chaos_guess_player_id);
      const correct = guesses.filter((v) => v.chaos_guess_player_id === round.chaos_lawyer_player_id).length;
      chaosFound = guesses.length > 0 && correct > guesses.length / 2;
    }

    await supabase.from("rounds").update({
      phase: "reveal",
      suggested_sentence: sentence,
    }).eq("id", round.id);
    await supabase.from("verdicts").insert({
      round_id: round.id,
      result,
      sentence,
      best_evidence_id: best?.id ?? null,
      chaos_lawyer_found: chaosFound,
    });
    refresh();
  };

  const nextCase = async () => {
    if (!room) return;
    await supabase.from("rooms").update({ current_round_id: null }).eq("id", room.id);
    refresh();
  };

  if (loading) {
    return <div className="min-h-dvh"><CourtHeader /><div className="px-5 max-w-md mx-auto pt-10 text-center text-muted-foreground">Opening the courtroom...</div></div>;
  }
  if (!room) {
    return <div className="min-h-dvh"><CourtHeader /><div className="px-5 max-w-md mx-auto pt-10 text-center text-muted-foreground">No room with that code. <Link to="/party/new" className="underline">Start one</Link>.</div></div>;
  }

  // Join flow
  if (!me) {
    return (
      <div className="min-h-dvh">
        <CourtHeader />
        <main className="px-5 pb-16 max-w-md mx-auto">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent">⚖ Joining</p>
          <h1 className="font-display text-3xl mt-2">{room.name || "Party Court"}</h1>
          <p className="text-muted-foreground text-sm mt-1">Code <span className="font-mono tracking-widest text-foreground">{room.code}</span> · {players.length} player{players.length === 1 ? "" : "s"}</p>

          <div className="mt-5 court-card p-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Your nickname</div>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="court-input" maxLength={30} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Pick your avatar</p>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
            <button onClick={joinRoom} disabled={joining} className="btn-hero w-full">Take a seat</button>
          </div>
        </main>
        <style>{`.court-input{width:100%;background:hsl(var(--secondary)/0.5);border:1px solid hsl(var(--border));color:hsl(var(--foreground));border-radius:.875rem;padding:.7rem .9rem;font-size:.95rem;outline:none}.court-input:focus{border-color:hsl(var(--accent))}`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <CourtHeader />
      <main className="px-5 pb-20 max-w-md mx-auto">
        <RoomHeader room={room} players={players} />

        {!round && (
          <LobbyAndSelect
            room={room}
            players={players}
            packs={packs}
            templates={templates}
            verdicts={verdicts}
            isHost={!!isHost}
            onStart={startRound}
          />
        )}

        {round && round.phase === "evidence" && (
          <EvidencePhase
            round={round}
            players={players}
            me={me}
            evidence={evidence}
            isHost={!!isHost}
            chaosMission={round.chaos_lawyer_player_id === me.id ? CHAOS_MISSIONS[chaosMissionIdx] : null}
            onAdvance={() => setPhase("voting")}
            onRefresh={refresh}
          />
        )}

        {round && round.phase === "voting" && (
          <VotingPhase
            round={round}
            players={players}
            me={me}
            votes={votes}
            isHost={!!isHost}
            onDeliver={deliverPartyVerdict}
            onRefresh={refresh}
          />
        )}

        {round && round.phase === "reveal" && (
          <RevealPhase
            room={room}
            round={round}
            players={players}
            votes={votes}
            evidence={evidence}
            verdicts={verdicts}
            isHost={!!isHost}
            onNext={nextCase}
          />
        )}
      </main>
      <style>{`.court-input{width:100%;background:hsl(var(--secondary)/0.5);border:1px solid hsl(var(--border));color:hsl(var(--foreground));border-radius:.875rem;padding:.7rem .9rem;font-size:.95rem;outline:none}.court-input:focus{border-color:hsl(var(--accent))}`}</style>
    </div>
  );
}

/* ---- Subcomponents ---- */

function RoomHeader({ room, players }: { room: Room; players: Player[] }) {
  const url = `${window.location.origin}/r/${room.code}`;
  return (
    <div className="court-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Party Court</p>
          <h1 className="font-display text-2xl mt-0.5 truncate max-w-[14rem]">{room.name || "Courtroom"}</h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Code</div>
          <div className="font-mono tracking-[0.3em] text-lg">{room.code}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => copyText(url, "Invite link copied")} className="btn-ghost-court text-xs"><Copy className="w-4 h-4" /> Copy invite</button>
        <button onClick={() => nativeShare({ title: "OBJECTION! Party Court", text: `Join my courtroom: ${url}`, url }, `Join my courtroom: ${url}`)} className="btn-ghost-court text-xs">
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2 bg-secondary/50 border border-border rounded-full pr-3 pl-1 py-1">
            <Avatar id={p.avatar} size={26} />
            <span className="text-xs">{p.nickname}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LobbyAndSelect({
  room, players, packs, templates, verdicts, isHost, onStart,
}: {
  room: Room; players: Player[]; packs: CasePack[]; templates: CaseTemplate[]; verdicts: Verdict[];
  isHost: boolean;
  onStart: (o: any) => void;
}) {
  const [tab, setTab] = useState<"ready" | "custom">("ready");
  const [packId, setPackId] = useState<string>("");
  const [accusedId, setAccusedId] = useState<string>("");
  const [chaos, setChaos] = useState(true);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customSentence, setCustomSentence] = useState("");

  useEffect(() => { if (!packId && packs.length) setPackId(packs[0].id); }, [packs, packId]);

  const enoughPlayers = players.length >= 3;
  const visibleTemplates = templates.filter((t) => t.pack_id === packId);

  const start = (templateId?: string) => {
    if (!enoughPlayers) { toast.error("Need at least 3 players."); return; }
    if (!accusedId) { toast.error("Pick who's on trial."); return; }
    const chaosId = chaos ? players[Math.floor(Math.random() * players.length)].id : null;
    if (tab === "ready") {
      const tmpl = templates.find((t) => t.id === templateId);
      if (!tmpl) return;
      onStart({
        case_type: "ready",
        case_template_id: tmpl.id,
        accused_player_id: accusedId,
        custom_title: tmpl.title,
        custom_description: tmpl.description,
        suggested_sentence: tmpl.suggested_sentence,
        chaos_lawyer_player_id: chaosId,
      });
    } else {
      if (!customTitle.trim() || !customDesc.trim()) { toast.error("Add a title and what happened."); return; }
      onStart({
        case_type: "custom",
        accused_player_id: accusedId,
        custom_title: customTitle.trim().slice(0, 60),
        custom_description: customDesc.trim().slice(0, 180),
        suggested_sentence: customSentence.trim() || null,
        chaos_lawyer_player_id: chaosId,
      });
    }
  };

  return (
    <>
      <section className="mt-5 court-card p-5">
        <h2 className="font-display text-xl">Choose a case</h2>
        {!enoughPlayers && (
          <p className="text-xs text-muted-foreground mt-1">Need at least 3 players to start.</p>
        )}

        {isHost ? (
          <>
            <div className="mt-4 flex bg-secondary/40 rounded-xl p-1">
              {(["ready", "custom"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  {t === "ready" ? "Ready Cases" : "Custom Case"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Accused</div>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAccusedId(p.id)}
                      className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-colors ${accusedId === p.id ? "border-accent bg-accent/20" : "border-border bg-secondary/50"}`}
                    >
                      <Avatar id={p.avatar} size={24} />
                      <span className="text-xs">{p.nickname}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={chaos} onChange={(e) => setChaos(e.target.checked)} />
                Include secret <span className="inline-flex items-center gap-1 text-accent"><Swords className="w-3.5 h-3.5" /> Chaos Lawyer</span>
              </label>

              {tab === "ready" ? (
                <>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Season</div>
                    <select value={packId} onChange={(e) => setPackId(e.target.value)} className="court-input">
                      {packs.map((p) => <option key={p.id} value={p.id}>{p.season_name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {visibleTemplates.map((t) => (
                      <button key={t.id} onClick={() => start(t.id)} className="text-left rounded-xl p-3 border border-border bg-secondary/40 hover:bg-secondary/70 transition-colors">
                        <div className="font-display text-base">{t.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <input placeholder="Crime title (max 60)" value={customTitle} onChange={(e) => setCustomTitle(e.target.value.slice(0,60))} className="court-input" />
                  <textarea placeholder="What happened? (max 180)" rows={3} value={customDesc} onChange={(e) => setCustomDesc(e.target.value.slice(0,180))} className="court-input resize-none" />
                  <input placeholder="Suggested sentence (optional)" value={customSentence} onChange={(e) => setCustomSentence(e.target.value.slice(0,120))} className="court-input" />
                  <button onClick={() => start()} className="btn-hero w-full"><Gavel className="w-5 h-5" /> Start the round</button>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">Waiting for the host to pick a case...</p>
        )}
      </section>

      <GroupRecord players={players} verdicts={verdicts} />
    </>
  );
}

function EvidencePhase({
  round, players, me, evidence, isHost, chaosMission, onAdvance, onRefresh,
}: {
  round: Round; players: Player[]; me: Player; evidence: Evidence[]; isHost: boolean;
  chaosMission: string | null;
  onAdvance: () => void; onRefresh: () => void;
}) {
  const accused = players.find((p) => p.id === round.accused_player_id);
  const myEv = evidence.find((e) => e.player_id === me.id);
  const [text, setText] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from("evidence").insert({
      round_id: round.id, player_id: me.id, text: text.trim().slice(0, 80),
    });
    if (error) { toast.error("Couldn't submit evidence."); return; }
    setText(""); onRefresh();
  };

  const skip = async () => {
    await supabase.from("evidence").insert({
      round_id: round.id, player_id: me.id, text: "No statement. Suspicious.",
    });
    onRefresh();
  };

  return (
    <>
      <CaseHeader round={round} accused={accused} />
      {chaosMission && (
        <div className="mt-4 rounded-2xl p-4 border border-accent/60 bg-accent/10">
          <div className="flex items-center gap-2 text-accent"><Swords className="w-4 h-4" /> <span className="text-xs uppercase tracking-[0.2em]">Secret role</span></div>
          <p className="mt-1 text-sm">You are the <strong>Chaos Lawyer</strong>. Mission: <em>{chaosMission}</em></p>
        </div>
      )}
      {!chaosMission && round.chaos_lawyer_player_id && (
        <div className="mt-4 rounded-2xl p-4 border border-border bg-secondary/40">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your role</p>
          <p className="text-sm mt-1">You are a <strong>Juror</strong>. Find the truth.</p>
        </div>
      )}

      <section className="mt-5 court-card p-5">
        <h2 className="font-display text-xl">Evidence phase</h2>
        <p className="text-xs text-muted-foreground mt-1">One line each, max 80 chars.</p>
        {!myEv ? (
          <div className="mt-3 space-y-2">
            <input value={text} onChange={(e) => setText(e.target.value.slice(0,80))} placeholder="Your statement..." className="court-input" />
            <div className="text-[11px] text-right text-muted-foreground">{text.length}/80</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={skip} className="btn-ghost-court">Skip</button>
              <button onClick={submit} className="btn-hero">Submit</button>
            </div>
          </div>
        ) : (
          <p className="text-sm mt-3 text-muted-foreground">Evidence submitted. Barely.</p>
        )}

        <div className="mt-4 space-y-2">
          {players.map((p) => {
            const e = evidence.find((x) => x.player_id === p.id);
            return (
              <div key={p.id} className="flex items-start gap-2 text-sm">
                <Avatar id={p.avatar} size={24} />
                <div>
                  <div className="text-xs text-muted-foreground">{p.nickname}</div>
                  <div className="italic">{e ? `“${e.text}”` : "…waiting"}</div>
                </div>
              </div>
            );
          })}
        </div>

        {isHost && (
          <button onClick={onAdvance} className="btn-gold w-full mt-5">Move to voting</button>
        )}
      </section>
    </>
  );
}

function VotingPhase({
  round, players, me, votes, isHost, onDeliver, onRefresh,
}: {
  round: Round; players: Player[]; me: Player; votes: Vote[]; isHost: boolean;
  onDeliver: () => void; onRefresh: () => void;
}) {
  const accused = players.find((p) => p.id === round.accused_player_id);
  const myVote = votes.find((v) => v.player_id === me.id);
  const [vote, setVote] = useState<VoteValue | null>(null);
  const [guess, setGuess] = useState<string>("");

  const submit = async () => {
    if (!vote) return;
    const { error } = await supabase.from("votes").insert({
      round_id: round.id, player_id: me.id, vote, chaos_guess_player_id: guess || null,
    });
    if (error) { toast.error("Couldn't lock vote."); return; }
    onRefresh();
  };

  return (
    <>
      <CaseHeader round={round} accused={accused} />
      <section className="mt-5 court-card p-5">
        <h2 className="font-display text-xl">Voting phase</h2>

        {!myVote ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2">
              {(["guilty", "not_guilty", "everyone_wrong"] as VoteValue[]).map((v) => (
                <button key={v} onClick={() => setVote(v)}
                  className={`text-left rounded-2xl px-4 py-3 border transition-all ${vote === v ? "border-accent bg-accent/20" : "border-border bg-secondary/40 hover:bg-secondary/70"}`}>
                  <span className="font-semibold">{VOTE_LABEL[v]}</span>
                </button>
              ))}
            </div>
            {round.chaos_lawyer_player_id && (
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Guess the Chaos Lawyer (optional)</div>
                <select value={guess} onChange={(e) => setGuess(e.target.value)} className="court-input">
                  <option value="">— no guess —</option>
                  {players.filter((p) => p.id !== me.id).map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                </select>
              </div>
            )}
            <button onClick={submit} disabled={!vote} className="btn-hero w-full disabled:opacity-60">Lock vote</button>
          </div>
        ) : (
          <p className="text-sm mt-3 text-muted-foreground">Vote locked. The accused is sweating.</p>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          {votes.length} / {players.length} voted
        </div>

        {isHost && (
          <button onClick={onDeliver} className="btn-gold w-full mt-5"><ScrollText className="w-4 h-4" /> Deliver verdict</button>
        )}
      </section>
    </>
  );
}

function RevealPhase({
  room, round, players, votes, evidence, verdicts, isHost, onNext,
}: {
  room: Room; round: Round; players: Player[]; votes: Vote[]; evidence: Evidence[];
  verdicts: Verdict[]; isHost: boolean; onNext: () => void;
}) {
  const accused = players.find((p) => p.id === round.accused_player_id);
  const tally = tallyVotes(votes);
  const result = tally.total === 0 ? "everyone_wrong" : tally.winner;
  const verdict = verdicts.find((v) => v.round_id === round.id);
  const sentence = verdict?.sentence || round.suggested_sentence || pickSentence(result, null);
  const best = evidence.find((e) => e.id === verdict?.best_evidence_id) ||
    evidence.slice().sort((a, b) => b.text.length - a.text.length)[0];
  const chaosPlayer = players.find((p) => p.id === round.chaos_lawyer_player_id);

  return (
    <>
      <CaseHeader round={round} accused={accused} />
      <div className="mt-5">
        <VerdictReveal
          counts={tally.counts}
          total={tally.total}
          winner={result}
          confidence={tally.confidence || 100}
          caseTitle={round.custom_title || "Untitled case"}
          accused={accused?.nickname || "Unknown"}
          sentence={sentence}
          bestEvidence={best?.text || null}
        />
      </div>

      {chaosPlayer && (
        <div className="mt-5 court-card p-5">
          <div className="flex items-center gap-2 text-accent"><Swords className="w-4 h-4" /> <span className="text-xs uppercase tracking-[0.2em]">Chaos Lawyer reveal</span></div>
          <div className="mt-2 flex items-center gap-3">
            <Avatar id={chaosPlayer.avatar} size={36} ring />
            <div>
              <p className="font-display text-lg">{chaosPlayer.nickname}</p>
              <p className="text-xs text-muted-foreground">
                {verdict?.chaos_lawyer_found ? "Caught by the room." : "The room failed to identify them. Chaos wins."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        <VerdictCard
          caseTitle={round.custom_title || "Untitled case"}
          accused={accused?.nickname || "Unknown"}
          result={result}
          sentence={sentence}
          confidence={tally.confidence || 100}
          bestEvidence={best?.text || null}
        />
      </div>

      {isHost && (
        <div className="mt-5 grid gap-3">
          <button onClick={onNext} className="btn-hero w-full"><Repeat2 className="w-5 h-5" /> Next case</button>
        </div>
      )}

      <GroupRecord players={players} verdicts={verdicts.filter((v) => v.round_id !== round.id || true)} />
    </>
  );
}

function CaseHeader({ round, accused }: { round: Round; accused?: Player }) {
  return (
    <div className="mt-5 court-card p-5">
      <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Case in session</p>
      <h2 className="font-display text-2xl mt-1 text-balance">{round.custom_title}</h2>
      <p className="text-sm text-muted-foreground mt-1 text-balance">{round.custom_description}</p>
      {accused && (
        <div className="mt-3 flex items-center gap-2">
          <Avatar id={accused.avatar} size={28} />
          <span className="text-sm">Accused: <strong>{accused.nickname}</strong></span>
        </div>
      )}
    </div>
  );
}

function GroupRecord({ players, verdicts }: { players: Player[]; verdicts: Verdict[] }) {
  // Aggregate guilty count per accused player using round info we already have? We don't have round->player mapping here easily.
  // We'll show simple aggregates: total cases, most recent verdicts list. For "most convicted" we'd need rounds; skip for MVP simplicity.
  return (
    <section className="mt-6 court-card p-5">
      <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-accent" /><h2 className="font-display text-xl">Group record</h2></div>
      {verdicts.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-2">No cases yet. The lore is waiting.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <Stat label="Cases" value={verdicts.length} />
            <Stat label="Guilty" value={verdicts.filter((v) => v.result === "guilty").length} />
            <Stat label="Chaos win" value={verdicts.filter((v) => v.chaos_lawyer_found === false).length} />
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Recent verdicts</p>
            {verdicts.slice(0, 5).map((v) => (
              <div key={v.id} className="text-sm flex items-center justify-between border-b border-border/60 pb-1.5 last:border-0">
                <span className="font-medium">{VOTE_LABEL[v.result as VoteValue]}</span>
                <span className="text-muted-foreground text-xs">{new Date(v.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-accent" /> Coming later: per-player crime stats & saved history.</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-secondary/40 border border-border p-2">
      <div className="font-display text-xl">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    </div>
  );
}
