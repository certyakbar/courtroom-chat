export type VoteValue = "guilty" | "not_guilty" | "everyone_wrong";

export const VOTE_LABEL: Record<VoteValue, string> = {
  guilty: "GUILTY",
  not_guilty: "NOT GUILTY",
  everyone_wrong: "EVERYONE IS WRONG",
};

export const VOTE_SHORT: Record<VoteValue, string> = {
  guilty: "Guilty",
  not_guilty: "Not Guilty",
  everyone_wrong: "Everyone Is Wrong",
};

export function tallyVotes(votes: { vote: string }[]) {
  const counts = { guilty: 0, not_guilty: 0, everyone_wrong: 0 } as Record<VoteValue, number>;
  for (const v of votes) {
    if (v.vote in counts) counts[v.vote as VoteValue]++;
  }
  const total = votes.length || 0;
  let winner: VoteValue = "everyone_wrong";
  let max = -1;
  (Object.keys(counts) as VoteValue[]).forEach((k) => {
    if (counts[k] > max) { max = counts[k]; winner = k; }
  });
  const confidence = total ? Math.round((counts[winner] / total) * 100) : 0;
  return { counts, total, winner, confidence };
}

const fallbackSentences: Record<VoteValue, string[]> = {
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

export function pickSentence(result: VoteValue, provided?: string | null) {
  if (provided && provided.trim()) return provided.trim();
  const arr = fallbackSentences[result];
  return arr[Math.floor(Math.random() * arr.length)];
}
