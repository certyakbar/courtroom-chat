import { toast } from "sonner";

export async function copyText(text: string, label = "Copied!") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't copy. Long-press to copy manually.");
  }
}

export async function nativeShare(opts: { title?: string; text?: string; url?: string }, fallbackText?: string) {
  if (navigator.share) {
    try {
      await navigator.share(opts);
      return true;
    } catch {
      return false;
    }
  }
  await copyText(fallbackText || opts.text || opts.url || "", "Copied to clipboard");
  return false;
}

/* ============================================================
 * TRIAL SHARE MESSAGES
 * ============================================================ */

// Plain — works anywhere, no platform formatting
export function trialMessagePlain(url: string) {
  return `⚖️ OBJECTION!

You've been summoned to vote.

The group chat has a case waiting.

Enter the courtroom:
${url}`;
}

// WhatsApp — supports *bold* and _italic_
export function trialMessageWhatsApp(url: string) {
  return `⚖️ *OBJECTION!*

*You've been summoned to vote.*

The group chat has a case waiting.

Enter the courtroom:
${url}`;
}

// Discord — supports **bold**, *italic*, > quotes, and embedded link suppression with <url>
export function trialMessageDiscord(url: string) {
  return `⚖️ **OBJECTION!**

**You've been summoned to vote.**

The group chat has a case waiting.

Enter the courtroom:
${url}`;
}

/* ============================================================
 * VERDICT SHARE MESSAGES
 * ============================================================ */

export function verdictMessagePlain(
  caseTitle: string,
  accused: string,
  verdict: string,
  sentence: string,
  confidence: number,
  url: string,
) {
  return `⚖️ VERDICT DELIVERED

Case:
${caseTitle}

Accused:
${accused}

Verdict:
${verdict}

Sentence:
${sentence}

Jury confidence:
${confidence}%

Start your own trial:
${url}`;
}

export function verdictMessageWhatsApp(
  caseTitle: string,
  accused: string,
  verdict: string,
  sentence: string,
  confidence: number,
  url: string,
) {
  return `⚖️ *VERDICT DELIVERED*

*Case:* ${caseTitle}
*Accused:* ${accused}
*Verdict:* *${verdict}*
*Sentence:* ${sentence}
*Jury confidence:* ${confidence}%

Start your own trial:
${url}`;
}

export function verdictMessageDiscord(
  caseTitle: string,
  accused: string,
  verdict: string,
  sentence: string,
  confidence: number,
  url: string,
) {
  return `⚖️ **VERDICT DELIVERED**

> **Case:** ${caseTitle}
> **Accused:** ${accused}

**Verdict: ${verdict}**
*Sentence:* ${sentence}
*Jury confidence:* ${confidence}%

Start your own trial: ${url}`;
}

/* ============================================================
 * LEGACY / BACKWARDS COMPAT
 * ============================================================ */

export const trialShareText = trialMessagePlain;
export const verdictShareText = verdictMessagePlain;

export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
