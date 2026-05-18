const KEY = "objection_browser_token";
const NICK_KEY = "objection_nickname";
const MY_TRIALS_KEY = "objection_my_trials";
const MY_VOTES_KEY = "objection_my_votes";
const MY_ROOMS_KEY = "objection_my_rooms";

function readSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
}
function writeSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s].slice(-200)));
}

export function markMyTrial(idOrSlug: string) {
  const s = readSet(MY_TRIALS_KEY); s.add(idOrSlug); writeSet(MY_TRIALS_KEY, s);
}
export function isMyTrial(idOrSlug: string): boolean {
  return readSet(MY_TRIALS_KEY).has(idOrSlug);
}
export function markMyVote(trialId: string) {
  const s = readSet(MY_VOTES_KEY); s.add(trialId); writeSet(MY_VOTES_KEY, s);
}
export function hasMyVote(trialId: string): boolean {
  return readSet(MY_VOTES_KEY).has(trialId);
}
export function markMyRoom(roomCode: string) {
  const s = readSet(MY_ROOMS_KEY); s.add(roomCode); writeSet(MY_ROOMS_KEY, s);
}
export function isMyRoom(roomCode: string): boolean {
  return readSet(MY_ROOMS_KEY).has(roomCode);
}


export function getBrowserToken(): string {
  let t = localStorage.getItem(KEY);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(KEY, t);
  }
  return t;
}

export function getStoredNickname(): string {
  return localStorage.getItem(NICK_KEY) || "";
}

export function setStoredNickname(n: string) {
  localStorage.setItem(NICK_KEY, n.slice(0, 30));
}

export function randomSlug(len = 6) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) s += alphabet[arr[i] % alphabet.length];
  return s;
}

export function randomRoomCode() {
  return randomSlug(4).toUpperCase();
}
