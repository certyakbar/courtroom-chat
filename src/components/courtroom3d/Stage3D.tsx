import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CourtroomStageProps, RevealStep, StageVariant } from "./CourtroomStage";

/* ---------------- Tone ---------------- */

function useTone(p: CourtroomStageProps) {
  return useMemo(() => {
    if (p.result === "guilty")
      return { key: new THREE.Color("#ff3a2a"), intensity: 1.6, shake: 0.04, pulse: 2.6 };
    if (p.result === "not_guilty")
      return { key: new THREE.Color("#6ee7a8"), intensity: 1.2, shake: 0, pulse: 0.9 };
    if (p.result === "everyone_wrong")
      return { key: new THREE.Color("#f5b042"), intensity: 1.3, shake: 0.03, pulse: 1.9 };
    if (p.countdownCritical)
      return { key: new THREE.Color("#ff5a3a"), intensity: 1.15, shake: 0.012, pulse: 2.0 };
    if (p.countdownUrgent)
      return { key: new THREE.Color("#ff8a4a"), intensity: 1.0, shake: 0, pulse: 1.5 };
    return { key: new THREE.Color("#f0b366"), intensity: 0.85, shake: 0, pulse: 0.6 };
  }, [p.result, p.countdownCritical, p.countdownUrgent]);
}

/* ---------------- Variant config ---------------- */

type VariantCfg = {
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  fov: number;
  fogNear: number;
  fogFar: number;
  showBench: boolean;
  showGavel: boolean;
  showPaper: boolean;
  showJurors: boolean;
};

function variantConfig(v: StageVariant): VariantCfg {
  switch (v) {
    case "filing":
      return { cameraPos: [0, 1.8, 5.4], cameraTarget: [0, 1.4, -2], fov: 32, fogNear: 3.8, fogFar: 10,
        showBench: false, showGavel: false, showPaper: true, showJurors: false };
    case "hero":
      return { cameraPos: [0, 2.0, 6.5], cameraTarget: [0, 1.4, -2], fov: 30, fogNear: 4.5, fogFar: 11,
        showBench: false, showGavel: false, showPaper: true, showJurors: false };
    case "waiting":
      return { cameraPos: [0, 3.0, 7.5], cameraTarget: [0, 1.5, -3], fov: 32, fogNear: 5, fogFar: 12,
        showBench: true, showGavel: true, showPaper: false, showJurors: true };
    case "reveal":
      return { cameraPos: [0, 2.4, 6.2], cameraTarget: [0, 1.5, -2.5], fov: 36, fogNear: 4, fogFar: 11,
        showBench: true, showGavel: true, showPaper: false, showJurors: true };
    case "ambient":
    default:
      return { cameraPos: [0, 3.2, 8.0], cameraTarget: [0, 1.6, -3], fov: 30, fogNear: 5.5, fogFar: 12,
        showBench: true, showGavel: false, showPaper: false, showJurors: false };
  }
}

/* ---------------- Reveal helpers ---------------- */

function stepLevel(s?: RevealStep): number {
  switch (s) {
    case "silent": return 0;
    case "jury_locking": return 1;
    case "accused": return 2;
    case "gavel_rise": return 3;
    case "impact": return 4;
    case "sentence": return 5;
    case "settled": return 6;
    default: return -1;
  }
}

/* ---------------- Camera rig ---------------- */

function CameraRig({
  shake,
  pos,
  target,
  revealStep,
}: {
  shake: number;
  pos: [number, number, number];
  target: [number, number, number];
  revealStep?: RevealStep;
}) {
  const impactStart = useRef<number | null>(null);
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;

    // Impact = big one-shot shake on top of base.
    let impactShake = 0;
    if (revealStep === "impact") {
      if (impactStart.current === null) impactStart.current = t;
      const dt = t - impactStart.current;
      impactShake = dt < 0.9 ? (1 - dt / 0.9) * 0.18 : 0;
    } else if (revealStep !== "sentence" && revealStep !== "settled") {
      impactStart.current = null;
    }

    const baseShake = shake + impactShake;
    const drift = Math.sin(t * 0.2) * 0.08;
    const sx = baseShake ? (Math.random() - 0.5) * baseShake : 0;
    const sy = baseShake ? (Math.random() - 0.5) * baseShake : 0;

    // Push camera closer on accused/gavel_rise/impact for drama.
    const lvl = stepLevel(revealStep);
    const zoom = lvl === 2 ? -0.5 : lvl === 3 ? -0.8 : lvl === 4 ? -1.1 : lvl === 5 ? -0.3 : 0;

    camera.position.x = pos[0] + drift + sx;
    camera.position.y = pos[1] + sy + (lvl === 4 ? -0.2 : 0);
    camera.position.z = pos[2] + zoom;
    camera.lookAt(target[0], target[1], target[2]);
  });
  return null;
}

/* ---------------- Bench ---------------- */

function Bench() {
  return (
    <group position={[0, 0.4, -5.5]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3.2, 1.0, 0.7]} />
        <meshStandardMaterial color="#2a1a12" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 1.05, 0.05]}>
        <boxGeometry args={[3.4, 0.08, 0.85]} />
        <meshStandardMaterial color="#3a2418" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ---------------- Toy Gavel (3D) ---------------- */

function Gavel({
  variant,
  result,
  juryComplete,
  pulse,
  revealStep,
}: {
  variant: StageVariant;
  result?: CourtroomStageProps["result"];
  juryComplete: boolean;
  pulse: number;
  revealStep?: RevealStep;
}) {
  const grp = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const slamStart = useRef<number | null>(null);
  const riseStart = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!grp.current) return;
    const t = clock.elapsedTime;
    const lvl = stepLevel(revealStep);

    // Reset timers when leaving reveal flow.
    if (variant !== "reveal") {
      slamStart.current = null;
      riseStart.current = null;
    }

    // gavel_rise: lift the gavel high above bench, anticipation.
    if (variant === "reveal" && lvl === 3) {
      if (riseStart.current === null) riseStart.current = t;
      const dt = Math.min(1, (t - riseStart.current) / 0.9);
      const eased = 1 - Math.pow(1 - dt, 3);
      grp.current.position.y = 1.25 + eased * 1.8;
      grp.current.rotation.z = -0.2 - eased * 0.9;
      grp.current.position.x = 1.0 - eased * 1.0;
      slamStart.current = null;
    } else if (variant === "reveal" && lvl >= 4 && result) {
      // impact and after: SLAM down.
      if (slamStart.current === null) slamStart.current = t;
      const dt = t - slamStart.current;
      // Drop in 0.18s, recoil, settle.
      let y = 0, rot = -0.2;
      if (dt < 0.18) {
        const k = dt / 0.18;
        y = 1.8 * (1 - k * k);
        rot = -1.1 + k * 0.9;
      } else if (dt < 0.32) {
        const k = (dt - 0.18) / 0.14;
        y = -0.05 + k * 0.25;
        rot = -0.2 - k * 0.15;
      } else if (dt < 0.55) {
        const k = (dt - 0.32) / 0.23;
        y = 0.2 - k * 0.2;
        rot = -0.35 + k * 0.15;
      } else {
        y = 0;
        rot = -0.2 + Math.sin((t - slamStart.current) * 4) * 0.03 * Math.max(0, 1 - (dt - 0.55));
      }
      grp.current.position.y = 1.25 + y;
      grp.current.position.x = 0;
      grp.current.rotation.z = rot;
    } else {
      // Idle hover.
      slamStart.current = null;
      riseStart.current = null;
      const amp = juryComplete ? 0.04 : 0.02;
      grp.current.rotation.z = Math.sin(t * pulse) * amp;
      grp.current.position.x = 1.0;
      grp.current.position.y = 1.25 + Math.sin(t * 0.6) * 0.01;
    }

    // Head glow on impact.
    if (headRef.current) {
      const mat = headRef.current.material as THREE.MeshStandardMaterial;
      const want = lvl === 3 ? 0.5 : lvl === 4 ? 1.4 : lvl >= 5 ? 0.5 : juryComplete ? 0.25 : 0.05;
      mat.emissiveIntensity += (want - mat.emissiveIntensity) * 0.18;
    }
  });

  // Toy proportions: chunky head, stubby handle.
  return (
    <group ref={grp} position={[1.0, 1.25, -5.0]} scale={0.9}>
      {/* Handle */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 1.1, 16]} />
        <meshStandardMaterial color="#3a2010" roughness={0.55} />
      </mesh>
      {/* Grip ring */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.05, 0, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.16, 16]} />
        <meshStandardMaterial color="#1f1208" roughness={0.8} />
      </mesh>
      {/* Head — chunky cylinder, toy-like */}
      <mesh ref={headRef} rotation={[0, 0, Math.PI / 2]} position={[1.15, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.62, 24]} />
        <meshStandardMaterial
          color="#7a3f1a"
          roughness={0.35}
          metalness={0.1}
          emissive="#f0b366"
          emissiveIntensity={0.05}
        />
      </mesh>
      {/* End caps for toy look */}
      <mesh position={[1.48, 0, 0]}>
        <sphereGeometry args={[0.34, 20, 14]} />
        <meshStandardMaterial color="#5a2a14" roughness={0.5} />
      </mesh>
      <mesh position={[0.82, 0, 0]}>
        <sphereGeometry args={[0.34, 20, 14]} />
        <meshStandardMaterial color="#5a2a14" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ---------------- Strike block (the thing the gavel hits) ---------------- */

function StrikeBlock({ revealStep }: { revealStep?: RevealStep }) {
  const ref = useRef<THREE.Mesh>(null);
  const startedAt = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    if (revealStep === "impact" || revealStep === "sentence") {
      if (startedAt.current === null) startedAt.current = t;
      const dt = t - startedAt.current;
      const flash = dt < 0.45 ? 1.6 * (1 - dt / 0.45) : 0;
      mat.emissiveIntensity = 0.1 + flash;
      ref.current.scale.y = 1 + (dt < 0.15 ? (1 - dt / 0.15) * 0.5 : 0);
    } else {
      startedAt.current = null;
      mat.emissiveIntensity += (0.05 - mat.emissiveIntensity) * 0.1;
      ref.current.scale.y += (1 - ref.current.scale.y) * 0.2;
    }
  });
  return (
    <mesh ref={ref} position={[0, 1.12, -4.9]}>
      <boxGeometry args={[0.6, 0.16, 0.5]} />
      <meshStandardMaterial color="#3a2418" roughness={0.6} emissive="#f5b042" emissiveIntensity={0.05} />
    </mesh>
  );
}

/* ---------------- Paper / Summons ---------------- */

function Paper() {
  const grp = useRef<THREE.Group>(null);
  const stamp = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!grp.current) return;
    const t = clock.elapsedTime;
    grp.current.position.y = 1.4 + Math.sin(t * 0.7) * 0.05;
    grp.current.rotation.z = Math.sin(t * 0.4) * 0.04;
    if (stamp.current) {
      const ss = t > 0.8 ? Math.min(1, (t - 0.8) * 3) : 0.05;
      stamp.current.scale.setScalar(ss);
      const mat = stamp.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(t * 1.4) * 0.15;
    }
  });

  return (
    <group ref={grp} position={[0, 1.4, -2.5]} rotation={[-0.15, 0, 0]} scale={0.7}>
      <mesh>
        <boxGeometry args={[1.2, 0.04, 0.9]} />
        <meshStandardMaterial color="#f1e6cc" roughness={0.9} />
      </mesh>
      <mesh ref={stamp} position={[0.28, 0.04, 0.22]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <ringGeometry args={[0.1, 0.16, 24]} />
        <meshStandardMaterial color="#b22a1a" emissive="#b22a1a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ---------------- Juror lights ---------------- */

function JurorLights({
  joined,
  voted,
  revealStep,
}: {
  joined: number;
  voted: number;
  revealStep?: RevealStep;
}) {
  const count = Math.max(0, Math.min(12, Math.max(joined, voted)));
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    const n = Math.max(count, 4);
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(n - 1, 1)) * Math.PI - Math.PI / 2;
      const r = 2.4;
      arr.push([Math.cos(a) * r, 1.4, Math.sin(a) * r - 4.2]);
    }
    return arr;
  }, [count]);

  // During reveal: all jurors are "voted/locked" once we pass jury_locking.
  const lvl = stepLevel(revealStep);
  const lockedCount = lvl >= 1 ? count : voted;

  return (
    <group>
      {positions.slice(0, count).map((p, i) => (
        <JurorSeat key={i} position={p} voted={i < lockedCount} index={i} revealStep={revealStep} />
      ))}
    </group>
  );
}

function JurorSeat({
  position,
  voted,
  index,
  revealStep,
}: {
  position: [number, number, number];
  voted: boolean;
  index: number;
  revealStep?: RevealStep;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    const boost = revealStep === "impact" ? 0.8 : revealStep === "jury_locking" ? 0.5 : 0;
    const target = voted
      ? 1.0 + Math.sin(t * 1.8 + index) * 0.18 + boost
      : 0.06 + Math.sin(t * 0.8 + index) * 0.03;
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.12;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 14, 10]} />
      <meshStandardMaterial
        color={voted ? "#7af0b8" : "#3a2a1c"}
        emissive={voted ? "#6ee7a8" : "#f0b366"}
        emissiveIntensity={0.06}
        roughness={0.4}
      />
    </mesh>
  );
}

/* ---------------- Spotlight ---------------- */

function StageSpot({
  pulse,
  tone,
  revealStep,
}: {
  pulse: number;
  tone: THREE.Color;
  revealStep?: RevealStep;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const flashStart = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!light.current) return;
    const t = clock.elapsedTime;
    const lvl = stepLevel(revealStep);

    // Lights down on silent; intensify accused/gavel; FLASH at impact.
    let base = 1.8;
    if (lvl === 0) base = 0.6;
    else if (lvl === 1) base = 1.4;
    else if (lvl === 2) base = 2.6;
    else if (lvl === 3) base = 3.0;
    else if (lvl === 4) base = 4.2;
    else if (lvl >= 5) base = 2.4;

    let flash = 0;
    if (lvl === 4) {
      if (flashStart.current === null) flashStart.current = t;
      const dt = t - flashStart.current;
      flash = dt < 0.25 ? 6 * (1 - dt / 0.25) : 0;
    } else {
      flashStart.current = null;
    }

    const v = 1 + Math.sin(t * pulse) * 0.18;
    light.current.intensity = (base + flash) * v;
    light.current.color.copy(tone);
  });
  return (
    <spotLight
      ref={light}
      position={[0, 6, 2]}
      angle={0.55}
      penumbra={0.7}
      intensity={1.8}
      color={tone}
      target-position={[0, 1, -3]}
    />
  );
}

/* ---------------- Responsive scale ---------------- */

function ResponsiveGroup({ children }: { children: React.ReactNode }) {
  const { size } = useThree();
  const scale = size.width < 640 ? 0.78 : size.width < 1024 ? 0.9 : 1;
  return <group scale={scale}>{children}</group>;
}

/* ---------------- Scene ---------------- */

function Scene(props: CourtroomStageProps) {
  const tone = useTone(props);
  const variant: StageVariant = props.variant ?? "ambient";
  const cfg = variantConfig(variant);
  const revealStep = props.revealStep;

  return (
    <>
      <color attach="background" args={["#0a0d14"]} />
      <fog attach="fog" args={["#0a0d14", cfg.fogNear, cfg.fogFar]} />

      <CameraRig
        shake={tone.shake}
        pos={cfg.cameraPos}
        target={cfg.cameraTarget}
        revealStep={revealStep}
      />

      <ambientLight intensity={revealStep === "silent" ? 0.05 : 0.14} color={tone.key} />
      <pointLight position={[0, 4, 3]} intensity={tone.intensity * 0.6} color={tone.key} />
      <StageSpot pulse={tone.pulse} tone={tone.key} revealStep={revealStep} />

      <ResponsiveGroup>
        {cfg.showBench && <Bench />}
        {cfg.showGavel && <StrikeBlock revealStep={revealStep} />}
        {cfg.showGavel && (
          <Gavel
            variant={variant}
            result={props.result}
            juryComplete={props.juryComplete}
            pulse={tone.pulse}
            revealStep={revealStep}
          />
        )}
        {cfg.showPaper && <Paper />}
        {cfg.showJurors && (
          <JurorLights
            joined={props.joinedCount}
            voted={props.votedCount}
            revealStep={revealStep}
          />
        )}
      </ResponsiveGroup>
    </>
  );
}

/* ---------------- Default export ---------------- */

export default function Stage3D(props: CourtroomStageProps) {
  const cfg = variantConfig(props.variant ?? "ambient");
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: cfg.cameraPos, fov: cfg.fov }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
