import React, { Component, lazy, Suspense, useEffect, useState } from "react";
import { CourtroomStageFallback } from "./CourtroomStageFallback";
import { hasWebGL, prefersReducedMotion } from "./webglSupport";

export type Phase = "summons" | "voting" | "waiting" | "reveal";
export type Result = "guilty" | "not_guilty" | "everyone_wrong" | null;

export interface CourtroomStageProps {
  phase: Phase;
  result?: Result;
  joinedCount: number;
  votedCount: number;
  juryComplete: boolean;
  countdownUrgent?: boolean;
  countdownCritical?: boolean;
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
    // Log once; UI gracefully falls back.
    // eslint-disable-next-line no-console
    console.warn("[CourtroomStage] 3D scene failed, using CSS fallback.", err);
  }
  render() {
    if (this.state.failed) return <>{this.props.fallback}</>;
    return <>{this.props.children}</>;
  }
}

export function CourtroomStage(props: CourtroomStageProps) {
  const { className } = props;
  const [enable3D, setEnable3D] = useState(false);

  useEffect(() => {
    setEnable3D(hasWebGL() && !prefersReducedMotion());
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className ?? ""}`}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      {enable3D ? (
        <Stage3DBoundary fallback={<CourtroomStageFallback {...props} />}>
          <Suspense fallback={<CourtroomStageFallback {...props} />}>
            <Stage3D {...props} />
          </Suspense>
        </Stage3DBoundary>
      ) : (
        <CourtroomStageFallback {...props} />
      )}
    </div>
  );
}

export default CourtroomStage;
