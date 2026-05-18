const KEY = "objection_browser_token";
const NICK_KEY = "objection_nickname";

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
