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
      // user dismissed
      return false;
    }
  }
  await copyText(fallbackText || opts.text || opts.url || "", "Copied to clipboard");
  return false;
}

export function trialShareText(accused: string, crime: string, url: string) {
  return `⚖️ OBJECTION!\n\n${accused} is on trial.\n\nCrime: ${crime}\n\nThe group chat must decide: Guilty / Not Guilty / Everyone Is Wrong\n\nVote here: ${url}`;
}

export function verdictShareText(caseTitle: string, accused: string, verdict: string, sentence: string, confidence: number, url: string) {
  return `⚖️ VERDICT DELIVERED\n\nCase: ${caseTitle}\nAccused: ${accused}\nVerdict: ${verdict}\nSentence: ${sentence}\nJury confidence: ${confidence}%\n\nStart your own trial: ${url}`;
}

export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
