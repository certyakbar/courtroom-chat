// One-shot helper to (re)register the /objection slash command globally.
// Invoke via POST to this function URL with any body. No auth required.
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID")!;

const command = {
  name: "objection",
  description: "Put someone on trial in this channel.",
  options: [
    { name: "accused", description: "Who is on trial?", type: 3, required: true },
    { name: "crime", description: "What did they do?", type: 3, required: true },
    { name: "minutes", description: "How long voting stays open (1-30).", type: 4, required: false, min_value: 1, max_value: 30 },
    { name: "hide_counts", description: "Hide vote counts until verdict.", type: 5, required: false },
    { name: "sentence", description: "Optional preferred sentence.", type: 3, required: false },
  ],
};

Deno.serve(async () => {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`,
    {
      method: "POST",
      headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    },
  );
  const body = await res.text();
  return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
});
