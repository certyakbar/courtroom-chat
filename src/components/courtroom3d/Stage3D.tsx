import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CourtroomStageProps, StageVariant } from "./CourtroomStage";

/* ---------------- Tone ---------------- */

function useTone(p: CourtroomStageProps) {
  return useMemo(() => {
    if (p.result === "guilty")
      return { key: new THREE.Color("#ff3a2a"), intensity: 1.4, shake: 0.03, pulse: 2.4 };
    if (p.result === "not_guilty")
      return { key: new THREE.Color("#6ee7a8"), intensity: 1.1, shake: 0, pulse: 0.8 };
    if (p.result === "everyone_wrong")
      return { key: new THREE.Color("#f5b042"), intensity: 1.2, shake: 0.02, pulse: 1.8 };
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
      return {
        cameraPos: [0, 1.8, 5.4],
        cameraTarget: [0, 1.4, -2],
        fov: 32,
        fogNear: 3.8,
        fogFar: 10,
        showBench: false,
        showGavel: false,
        showPaper: true,
        showJurors: false,
      };
    case "hero":
      return {
        cameraPos: [0, 2.0, 6.5],
        cameraTarget: [0, 1.4, -2],
        fov: 30,
        fogNear: 4.5,
        fogFar: 11,
        showBench: false,
        showGavel: false,
        showPaper: true,
        showJurors: false,
      };
    case "waiting":
      return {
        cameraPos: [0, 3.0, 7.5],
        cameraTarget: [0, 1.5, -3],
        fov: 32,
        fogNear: 5,
        fogFar: 12,
        showBench: true,
        showGavel: true,
        showPaper: false,
        showJurors: true,
      };
    case "reveal":
      return {
        cameraPos: [0, 2.6, 6.8],
        cameraTarget: [0, 1.5, -2.5],
        fov: 34,
        fogNear: 4,
        fogFar: 11,
        showBench: true,
        showGavel: true,
        showPaper: false,
        showJurors: true,
      };
    case "ambient":
    default:
      return {
        cameraPos: [0, 3.2, 8.0],
        cameraTarget: [0, 1.6, -3],
        fov: 30,
        fogNear: 5.5,
        fogFar: 12,
        showBench: true,
        showGavel: false,
        showPaper: false,
        showJurors: false,
      };
  }
}

/* ---------------- Camera rig ---------------- */

function CameraRig({
  shake,
  pos,
  target,
}: {
  shake: number;
  pos: [number, number, number];
  target: [number, number, number];
}) {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const drift = Math.sin(t * 0.2) * 0.08;
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    camera.position.x = pos[0] + drift + sx;
    camera.position.y = pos[1] + sy;
    camera.position.z = pos[2];
    camera.lookAt(target[0], target[1], target[2]);
  });
  return null;
}

/* ---------------- Bench silhouette ---------------- */

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

/* ---------------- Gavel ---------------- */

function Gavel({
  variant,
  result,
  juryComplete,
  pulse,
}: {
  variant: StageVariant;
  result?: CourtroomStageProps["result"];
  juryComplete: boolean;
  pulse: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const slamStart = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!grp.current) return;
    const t = clock.elapsedTime;

    if (variant === "reveal" && result) {
      if (slamStart.current === null) slamStart.current = t;
      const dt = t - slamStart.current;
      const angle =
        dt < 0.35 ? -1.1 * (dt / 0.35) : dt < 0.7 ? -1.1 + 1.1 * ((dt - 0.35) / 0.35) : 0;
      grp.current.rotation.z = angle;
    } else {
      slamStart.current = null;
      const amp = juryComplete ? 0.04 : 0.02;
      grp.current.rotation.z = Math.sin(t * pulse) * amp;
      grp.current.position.y = 1.25 + Math.sin(t * 0.6) * 0.01;
    }
  });

  return (
    <group ref={grp} position={[1.0, 1.25, -5.0]} scale={0.55}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.9, 12]} />
        <meshStandardMaterial color="#3a2010" roughness={0.6} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.95, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.5, 16]} />
        <meshStandardMaterial
          color="#6a3a1a"
          roughness={0.45}
          emissive={juryComplete ? "#f0b366" : "#000000"}
          emissiveIntensity={juryComplete ? 0.2 : 0}
        />
      </mesh>
    </group>
  );
}

/* ---------------- Paper / Summons ---------------- */

function Paper() {
  const grp = useRef<THREE.Group>(null);
  const stamp = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!grp.current) return;
    const t = clock.elapsedTime;
    // Gentle float in place.
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

function JurorLights({ joined, voted }: { joined: number; voted: number }) {
  const count = Math.max(0, Math.min(12, joined));
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    const n = Math.max(count, 4);
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(n - 1, 1)) * Math.PI - Math.PI / 2;
      const r = 2.4;
      // Push behind the bench, slightly above floor; never near the viewport bottom.
      arr.push([Math.cos(a) * r, 1.4, Math.sin(a) * r - 4.2]);
    }
    return arr;
  }, [count]);

  return (
    <group>
      {positions.slice(0, count).map((p, i) => (
        <JurorSeat key={i} position={p} voted={i < voted} index={i} />
      ))}
    </group>
  );
}

function JurorSeat({
  position,
  voted,
  index,
}: {
  position: [number, number, number];
  voted: boolean;
  index: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    const target = voted
      ? 1.0 + Math.sin(t * 1.8 + index) * 0.18
      : 0.06 + Math.sin(t * 0.8 + index) * 0.03;
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.1;
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

/* ---------------- Spotlight (light only, no floor decal) ---------------- */

function StageSpot({ pulse, tone }: { pulse: number; tone: THREE.Color }) {
  const light = useRef<THREE.SpotLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const v = 1 + Math.sin(t * pulse) * 0.2;
    if (light.current) light.current.intensity = 1.8 * v;
  });
  return (
    <spotLight
      ref={light}
      position={[0, 6, 2]}
      angle={0.5}
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

  return (
    <>
      <color attach="background" args={["#0a0d14"]} />
      <fog attach="fog" args={["#0a0d14", cfg.fogNear, cfg.fogFar]} />

      <CameraRig shake={tone.shake} pos={cfg.cameraPos} target={cfg.cameraTarget} />

      <ambientLight intensity={0.14} color={tone.key} />
      <pointLight position={[0, 4, 3]} intensity={tone.intensity * 0.6} color={tone.key} />
      <StageSpot pulse={tone.pulse} tone={tone.key} />

      <ResponsiveGroup>
        {cfg.showBench && <Bench />}
        {cfg.showGavel && (
          <Gavel
            variant={variant}
            result={props.result}
            juryComplete={props.juryComplete}
            pulse={tone.pulse}
          />
        )}
        {cfg.showPaper && <Paper />}
        {cfg.showJurors && (
          <JurorLights joined={props.joinedCount} voted={props.votedCount} />
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
