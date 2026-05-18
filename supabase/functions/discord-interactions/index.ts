// Discord interactions webhook for OBJECTION!
// Handles /objection slash command and vote / close / revenge buttons.
import nacl from "npm:tweetnacl@1.0.3";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ??
  "https://id-preview--80da8b0a-7ce7-49d8-9a88-27079a1088b8.lovable.app";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ----- helpers -----
function hex2bytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function verifySignature(req: Request, raw: string) {
  const sig = req.headers.get("x-signature-ed25519");
  const ts = req.headers.get("x-signature-timestamp");
  if (!sig || !ts) return false;
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(ts + raw),
      hex2bytes(sig),
      hex2bytes(DISCORD_PUBLIC_KEY),
    );
  } catch { return false; }
}

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "case";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

const VOTE_LABEL: Record<string, string> = {
  guilty: "GUILTY",
  not_guilty: "NOT GUILTY",
  everyone_wrong: "EVERYONE IS WRONG",
};

const SENTENCES: Record<string, string[]> = {
  guilty: [
    "Banned from saying 'nearly there' until further notice.",
    "Must buy snacks next time.",
    "Sentenced to 24 hours of read-receipts on.",
    "Loses aux privileges for two weeks.",
  ],
  not_guilty: [
    "Free, but emotionally suspicious.",
    "Acquitted with strong side-eye.",
    "Cleared by the jury, condemned by the group chat.",
  ],
  everyone_wrong: [
    "The group chat has failed society.",
    "Court is dismissed. Touch grass.",
    "Mistrial declared. Everyone owes everyone an apology.",
  ],
};
function pickSentence(result: string, provided?: string | null) {
  if (provided && provided.trim()) return provided.trim();
  const arr = SENTENCES[result] || SENTENCES.everyone_wrong;
  return arr[Math.floor(Math.random() * arr.length)];
}

function tally(votes: { vote: string }[]) {
  const counts: Record<string, number> = { guilty: 0, not_guilty: 0, everyone_wrong: 0 };
  for (const v of votes) if (v.vote in counts) counts[v.vote]++;
  const total = votes.length;
  let winner = "everyone_wrong"; let max = -1;
  for (const k of Object.keys(counts)) if (counts[k] > max) { max = counts[k]; winner = k; }
  const confidence = total ? Math.round((counts[winner] / total) * 100) : 0;
  return { counts, total, winner, confidence };
}

// ----- discord response builders -----
function trialEmbed(trial: any, voteCount: number, closesAt: Date) {
  const ts = Math.floor(closesAt.getTime() / 1000);
  const desc = trial.hide_counts
    ? `**Accused:** ${trial.accused_name}\n**Charge:** ${trial.crime_text}\n\nVerdict closes <t:${ts}:R>\nVotes are **hidden** until verdict.`
    : `**Accused:** ${trial.accused_name}\n**Charge:** ${trial.crime_text}\n\nVerdict closes <t:${ts}:R>\n**${voteCount}** vote${voteCount === 1 ? "" : "s"} cast.`;
  return {
    title: "⚖️ OBJECTION! — Trial in session",
    description: desc,
    color: 0xE11D48,
    footer: { text: "Cast your vote below" },
  };
}

function trialComponents(trialId: string) {
  return [
    { type: 1, components: [
      { type: 2, style: 4, label: "GUILTY", custom_id: `vote:guilty:${trialId}` },
      { type: 2, style: 3, label: "NOT GUILTY", custom_id: `vote:not_guilty:${trialId}` },
      { type: 2, style: 1, label: "EVERYONE IS WRONG", custom_id: `vote:everyone_wrong:${trialId}` },
    ]},
    { type: 1, components: [
      { type: 2, style: 2, label: "Close trial now", custom_id: `close:${trialId}` },
    ]},
  ];
}

function verdictEmbed(trial: any, result: string, confidence: number, sentence: string, counts: Record<string, number>, total: number) {
  return {
    title: `🔨 VERDICT: ${VOTE_LABEL[result]}`,
    description: `**Accused:** ${trial.accused_name}\n**Charge:** ${trial.crime_text}\n\n**Sentence:** ${sentence}\n**Jury confidence:** ${confidence}% (${total} vote${total === 1 ? "" : "s"})\n\nGuilty: ${counts.guilty} · Not Guilty: ${counts.not_guilty} · Everyone Wrong: ${counts.everyone_wrong}`,
    color: result === "guilty" ? 0xE11D48 : result === "not_guilty" ? 0x16A34A : 0xF59E0B,
  };
}

function verdictComponents(trial: any) {
  return [
    { type: 1, components: [
      { type: 2, style: 5, label: "Open Animated Reveal", url: `${SITE_URL}/t/${trial.slug}` },
      { type: 2, style: 4, label: "File Revenge Case", custom_id: `revenge:${trial.id}` },
      { type: 2, style: 1, label: "Start New Trial", custom_id: `new_trial` },
    ]},
  ];
}

// ----- discord REST -----
async function discordEdit(channelId: string, messageId: string, body: any) {
  return await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function discordFollowup(token: string, body: any) {
  return await fetch(`https://discord.com/api/v10/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function discordCreateFollowup(token: string, body: any) {
  return await fetch(`https://discord.com/api/v10/webhooks/${DISCORD_APPLICATION_ID}/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ----- close trial logic -----
async function closeTrial(trialId: string) {
  const { data: trial } = await supabase.from("instant_trials").select("*").eq("id", trialId).maybeSingle();
  if (!trial) return null;
  if (trial.status === "closed") return trial;

  const { data: votes } = await supabase.from("instant_votes").select("vote").eq("trial_id", trialId);
  const t = tally(votes || []);
  const sentence = pickSentence(t.winner, trial.suggested_sentence);

  await supabase.from("instant_trials").update({
    status: "closed",
    result: t.winner,
    verdict_sentence: sentence,
  }).eq("id", trialId);

  await supabase.from("verdicts").insert({
    instant_trial_id: trialId,
    result: t.winner,
    sentence,
  });

  return { ...trial, _tally: t, _sentence: sentence };
}

// ----- main handler -----
Deno.serve(async (req) => {
  const url = new URL(req.url);

  // health
  if (req.method === "GET") {
    return new Response("OBJECTION! Discord bot online", { status: 200 });
  }

  const raw = await req.text();
  if (!(await verifySignature(req, raw))) {
    return new Response("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(raw);

  // PING
  if (interaction.type === 1) {
    return Response.json({ type: 1 });
  }

  // APPLICATION_COMMAND
  if (interaction.type === 2) {
    const name = interaction.data?.name;
    if (name === "objection") {
      const opts: any[] = interaction.data.options || [];
      const accused = opts.find((o) => o.name === "accused")?.value as string;
      const crime = opts.find((o) => o.name === "crime")?.value as string;
      const minutes = (opts.find((o) => o.name === "minutes")?.value as number) || 5;
      const hide = (opts.find((o) => o.name === "hide_counts")?.value as boolean) || false;
      const sentence = opts.find((o) => o.name === "sentence")?.value as string | undefined;

      const closes = new Date(Date.now() + minutes * 60_000);
      const slug = slugify(accused);
      const guildId = interaction.guild_id || null;
      const channelId = interaction.channel_id;
      const creatorToken = `discord:${interaction.member?.user?.id ?? interaction.user?.id ?? "unknown"}`;

      const { data: trial, error } = await supabase.from("instant_trials").insert({
        accused_name: accused.slice(0, 60),
        crime_text: crime.slice(0, 500),
        slug,
        closes_at: closes.toISOString(),
        creator_browser_token: creatorToken,
        suggested_sentence: sentence?.slice(0, 200) ?? null,
        hide_counts: hide,
        discord_channel_id: channelId,
        discord_guild_id: guildId,
        status: "open",
      }).select().single();

      if (error || !trial) {
        return Response.json({ type: 4, data: { content: "Failed to create trial: " + (error?.message ?? "unknown"), flags: 64 } });
      }

      // Respond first, then patch with message_id once we know it
      const responseBody = {
        type: 4,
        data: {
          embeds: [trialEmbed(trial, 0, closes)],
          components: trialComponents(trial.id),
        },
      };

      // Fire-and-forget: fetch original message to store its id
      (async () => {
        try {
          const res = await fetch(`https://discord.com/api/v10/webhooks/${DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`, {
            headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}` },
          });
          const msg = await res.json();
          if (msg?.id) {
            await supabase.from("instant_trials").update({ discord_message_id: msg.id }).eq("id", trial.id);
          }
        } catch (_) { /* ignore */ }
      })();

      return Response.json(responseBody);
    }

    return Response.json({ type: 4, data: { content: "Unknown command.", flags: 64 } });
  }

  // MESSAGE_COMPONENT
  if (interaction.type === 3) {
    const customId: string = interaction.data.custom_id;
    const userId = interaction.member?.user?.id ?? interaction.user?.id;
    const userName = interaction.member?.user?.global_name || interaction.member?.user?.username || interaction.user?.username || "Juror";

    // ---- vote
    if (customId.startsWith("vote:")) {
      const [, vote, trialId] = customId.split(":");
      const { data: trial } = await supabase.from("instant_trials").select("*").eq("id", trialId).maybeSingle();
      if (!trial) {
        return Response.json({ type: 4, data: { content: "Trial not found.", flags: 64 } });
      }
      if (trial.status !== "open" || new Date(trial.closes_at) < new Date()) {
        return Response.json({ type: 4, data: { content: "This trial is closed.", flags: 64 } });
      }

      const token = `discord:${userId}`;
      const { data: existing } = await supabase.from("instant_votes").select("id").eq("trial_id", trialId).eq("browser_token", token).maybeSingle();
      if (existing) {
        return Response.json({ type: 4, data: { content: "You already voted on this trial.", flags: 64 } });
      }

      await supabase.from("instant_votes").insert({
        trial_id: trialId,
        vote,
        browser_token: token,
        voter_nickname: userName.slice(0, 40),
      });

      // update message with new count
      const { count } = await supabase.from("instant_votes").select("id", { count: "exact", head: true }).eq("trial_id", trialId);
      if (trial.discord_channel_id && trial.discord_message_id) {
        await discordEdit(trial.discord_channel_id, trial.discord_message_id, {
          embeds: [trialEmbed(trial, count ?? 0, new Date(trial.closes_at))],
          components: trialComponents(trial.id),
        }).catch(() => {});
      }

      return Response.json({ type: 4, data: { content: `Vote recorded: **${VOTE_LABEL[vote]}**`, flags: 64 } });
    }

    // ---- close
    if (customId.startsWith("close:")) {
      const trialId = customId.split(":")[1];
      const { data: trial } = await supabase.from("instant_trials").select("creator_browser_token").eq("id", trialId).maybeSingle();
      if (trial && trial.creator_browser_token !== `discord:${userId}`) {
        return Response.json({ type: 4, data: { content: "Only the trial creator can close it early.", flags: 64 } });
      }
      const closed = await closeTrial(trialId);
      if (!closed) return Response.json({ type: 4, data: { content: "Trial not found.", flags: 64 } });

      const t = (closed as any)._tally;
      const sentence = (closed as any)._sentence;

      // Edit original message to remove buttons
      if (closed.discord_channel_id && closed.discord_message_id) {
        await discordEdit(closed.discord_channel_id, closed.discord_message_id, {
          embeds: [{ ...trialEmbed(closed, t.total, new Date(closed.closes_at)), title: "⚖️ OBJECTION! — Trial closed" }],
          components: [],
        }).catch(() => {});
      }

      // ACK + send verdict as a public follow-up message
      const verdictMsg = {
        embeds: [verdictEmbed(closed, t.winner, t.confidence, sentence, t.counts, t.total)],
        components: verdictComponents(closed),
      };
      return Response.json({ type: 4, data: verdictMsg });
    }

    // ---- revenge (links to /?revenge=)
    if (customId.startsWith("revenge:")) {
      const trialId = customId.split(":")[1];
      const { data: trial } = await supabase.from("instant_trials").select("accused_name").eq("id", trialId).maybeSingle();
      const name = trial?.accused_name ?? "";
      const link = `${SITE_URL}/?revenge=${encodeURIComponent(name)}`;
      return Response.json({
        type: 4,
        data: { content: `🔁 File a revenge case for **${name}**:\n${link}\n\n_Or run \`/objection\` here._`, flags: 64 },
      });
    }

    // ---- new trial helper
    if (customId === "new_trial") {
      return Response.json({
        type: 4,
        data: { content: "Run `/objection accused: <name> crime: <what they did>` to start a new trial.", flags: 64 },
      });
    }

    return Response.json({ type: 4, data: { content: "Unknown action.", flags: 64 } });
  }

  return new Response("unhandled interaction type", { status: 400 });
});
