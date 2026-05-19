import React, { Component, lazy, Suspense, useEffect, useState } from "react";
import { CourtroomStageFallback } from "./CourtroomStageFallback";
import { hasWebGL, prefersReducedMotion } from "./webglSupport";

export type Phase = "summons" | "voting" | "waiting" | "reveal";
export type Result = "guilty" | "not_guilty" | "everyone_wrong" | null;
export type StageVariant = "ambient" | "filing" | "hero" | "waiting" | "reveal";
export type RevealStep =
  | "silent"
  | "jury_locking"
  | "accused"
  | "gavel_rise"
  | "impact"
  | "sentence"
  | "settled";

export interface CourtroomStageProps {
  phase: Phase;
  result?: Result;
  joinedCount: number;
  votedCount: number;
  juryComplete: boolean;
  countdownUrgent?: boolean;
  countdownCritical?: boolean;
  variant?: StageVariant;
  revealStep?: RevealStep;
  className?: string;
}

const Stage3D = lazy(() => import("./Stage3D"));

class Stage3DBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[CourtroomStage] 3D scene failed, using CSS fallback.", err);
  }
  render() {
    if (this.state.failed) return <>{this.props.fallback}</>;
    return <>{this.props.children}</>;
  }
}

export function CourtroomStage(props: CourtroomStageProps) {
  const { className, variant = "ambient", revealStep } = props;
  const [enable3D, setEnable3D] = useState(false);

  useEffect(() => {
    setEnable3D(hasWebGL() && !prefersReducedMotion());
  }, []);

  // Reveal stage should let the 3D scene dominate during impact.
  const opacity =
    variant === "reveal"
      ? revealStep === "impact"
        ? 1
        : revealStep === "settled"
        ? 0.95
        : 1
      : variant === "waiting"
      ? 0.95
      : 0.85;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className ?? ""}`}
      style={{ position: "absolute", inset: 0, overflow: "hidden", opacity }}
    >
      {enable3D ? (
        <Stage3DBoundary fallback={<CourtroomStageFallback {...props} />}>
          <Suspense fallback={<CourtroomStageFallback {...props} />}>
            <Stage3D {...props} variant={variant} />
          </Suspense>
        </Stage3DBoundary>
      ) : (
        <CourtroomStageFallback {...props} />
      )}
      {/* Radial vignette mask: fades geometry into the page edges. Lifts during impact. */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: revealStep === "impact" ? 0.4 : 1,
          background:
            "radial-gradient(ellipse 70% 55% at 50% 38%, transparent 0%, hsl(220 35% 3% / 0.55) 65%, hsl(220 35% 3% / 0.95) 100%)",
        }}
      />
    </div>
  );
}

export default CourtroomStage;
