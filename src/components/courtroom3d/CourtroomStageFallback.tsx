import type { CourtroomStageProps } from "./CourtroomStage";

/**
 * 2.5D CSS fallback rendered behind UI when WebGL is unavailable,
 * the 3D chunk errors, or the user prefers reduced motion.
 */
export function CourtroomStageFallback({
  phase,
  result,
  countdownUrgent,
  countdownCritical,
}: CourtroomStageProps) {
  const tone =
    result === "guilty"
      ? "from-[hsl(0_84%_30%/0.55)]"
      : result === "not_guilty"
      ? "from-[hsl(142_60%_28%/0.45)]"
      : result === "everyone_wrong"
      ? "from-[hsl(38_92%_32%/0.45)]"
      : countdownCritical
      ? "from-[hsl(0_84%_30%/0.4)]"
      : countdownUrgent
      ? "from-[hsl(20_84%_32%/0.35)]"
      : "from-[hsl(38_60%_30%/0.28)]";

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Warm spotlight from above */}
      <div
        className={`absolute inset-0 bg-gradient-radial ${tone} to-transparent`}
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, var(--tw-gradient-from), transparent 70%)`,
        }}
      />
      {/* Floor gradient */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[hsl(220_35%_3%)] to-transparent" />
      {/* Subtle pulsing vignette */}
      <div
        className={`absolute inset-0 ${
          phase === "reveal" || countdownCritical ? "animate-urgent-pulse" : "animate-breathe"
        }`}
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 35%, hsl(var(--stamp)/0.10), transparent 70%)",
        }}
      />
    </div>
  );
}
