import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CourtroomStageProps } from "./CourtroomStage";

/* ---------------- Tone ---------------- */

function useTone(p: CourtroomStageProps) {
  return useMemo(() => {
    if (p.result === "guilty")
      return { key: new THREE.Color("#ff3a2a"), intensity: 1.6, shake: 0.04, pulse: 2.4 };
    if (p.result === "not_guilty")
      return { key: new THREE.Color("#6ee7a8"), intensity: 1.2, shake: 0.0, pulse: 0.8 };
    if (p.result === "everyone_wrong")
      return { key: new THREE.Color("#f5b042"), intensity: 1.3, shake: 0.025, pulse: 1.8 };
    if (p.countdownCritical)
      return { key: new THREE.Color("#ff5a3a"), intensity: 1.3, shake: 0.015, pulse: 2.2 };
    if (p.countdownUrgent)
      return { key: new THREE.Color("#ff8a4a"), intensity: 1.1, shake: 0.0, pulse: 1.6 };
    return { key: new THREE.Color("#f0b366"), intensity: 0.95, shake: 0.0, pulse: 0.6 };
  }, [p.result, p.countdownCritical, p.countdownUrgent]);
}

/* ---------------- Camera rig ---------------- */

function CameraRig({ shake }: { shake: number }) {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const drift = Math.sin(t * 0.25) * 0.15;
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    camera.position.x = drift + sx;
    camera.position.y = 2.2 + sy;
    camera.position.z = 6.2;
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}

/* ---------------- Floor & bench ---------------- */

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#1a1410" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function Bench() {
  return (
    <group position={[0, 0, -2.4]}>
      {/* Bench body */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[5.5, 1.8, 1.2]} />
        <meshStandardMaterial color="#3a2418" roughness={0.7} />
      </mesh>
      {/* Bench top */}
      <mesh position={[0, 1.85, 0.1]}>
        <boxGeometry args={[5.8, 0.12, 1.4]} />
        <meshStandardMaterial color="#5a3a24" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ---------------- Gavel ---------------- */

function Gavel({ phase, result, juryComplete, pulse }: {
  phase: CourtroomStageProps["phase"];
  result?: CourtroomStageProps["result"];
  juryComplete: boolean;
  pulse: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const slamStart = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!grp.current) return;
    const t = clock.elapsedTime;

    if (phase === "reveal" && result) {
      if (slamStart.current === null) slamStart.current = t;
      const dt = t - slamStart.current;
      // 0..0.4s slam down, 0.4..0.8s rebound, then idle
      const angle = dt < 0.4 ? -1.2 * (dt / 0.4) : dt < 0.8 ? -1.2 + 1.2 * ((dt - 0.4) / 0.4) : 0;
      grp.current.rotation.z = angle;
    } else {
      slamStart.current = null;
      const amp = juryComplete ? 0.08 : 0.04;
      grp.current.rotation.z = Math.sin(t * pulse) * amp;
      grp.current.position.y = 1.95 + Math.sin(t * 0.6) * 0.02;
    }
  });

  return (
    <group ref={grp} position={[1.8, 1.95, -1.8]}>
      {/* handle */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.9, 12]} />
        <meshStandardMaterial color="#3a2010" roughness={0.6} />
      </mesh>
      {/* head */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.95, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.5, 16]} />
        <meshStandardMaterial color="#6a3a1a" roughness={0.45} emissive={juryComplete ? "#f0b366" : "#000000"} emissiveIntensity={juryComplete ? 0.25 : 0} />
      </mesh>
    </group>
  );
}

/* ---------------- Paper / Summons ---------------- */

function Paper({ phase }: { phase: CourtroomStageProps["phase"] }) {
  const grp = useRef<THREE.Group>(null);
  const stamp = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!grp.current) return;
    const t = clock.elapsedTime;
    if (phase === "summons") {
      const z = Math.min(1, t * 0.7);
      grp.current.position.z = -1 + z * 1.2;
      grp.current.rotation.x = -0.5 + z * 0.4;
    } else {
      grp.current.position.z = 0.2;
      grp.current.rotation.x = -0.1;
    }
    if (stamp.current) {
      const ss = phase === "summons" && t > 1.2 ? Math.min(1, (t - 1.2) * 4) : 1;
      stamp.current.scale.setScalar(ss < 0.05 ? 0.05 : ss);
    }
  });

  return (
    <group ref={grp} position={[-1.6, 1.95, 0.2]}>
      <mesh>
        <boxGeometry args={[1.2, 0.04, 0.9]} />
        <meshStandardMaterial color="#f1e6cc" roughness={0.9} />
      </mesh>
      <mesh ref={stamp} position={[0.3, 0.04, 0.2]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <ringGeometry args={[0.12, 0.18, 24]} />
        <meshStandardMaterial color="#b22a1a" emissive="#b22a1a" emissiveIntensity={0.6} />
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
      const a = (i / n) * Math.PI - Math.PI / 2; // front arc
      const r = 3.6;
      arr.push([Math.cos(a) * r, 0.6, Math.sin(a) * r + 0.8]);
    }
    return arr;
  }, [count]);

  return (
    <group>
      {positions.slice(0, count).map((p, i) => {
        const isVoted = i < voted;
        return (
          <JurorSeat key={i} position={p} voted={isVoted} index={i} />
        );
      })}
    </group>
  );
}

function JurorSeat({ position, voted, index }: { position: [number, number, number]; voted: boolean; index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    const target = voted ? 1.2 + Math.sin(t * 1.8 + index) * 0.2 : 0.08 + Math.sin(t * 0.8 + index) * 0.04;
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.1;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.18, 16, 12]} />
      <meshStandardMaterial
        color={voted ? "#7af0b8" : "#3a2a1c"}
        emissive={voted ? "#6ee7a8" : "#f0b366"}
        emissiveIntensity={0.08}
        roughness={0.4}
      />
    </mesh>
  );
}

/* ---------------- Accused spotlight ---------------- */

function AccusedSpotlight({ pulse, tone }: { pulse: number; tone: THREE.Color }) {
  const light = useRef<THREE.SpotLight>(null);
  const disc = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const v = 1 + Math.sin(t * pulse) * 0.25;
    if (light.current) light.current.intensity = 2.4 * v;
    if (disc.current) {
      const mat = disc.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 * v;
    }
  });
  return (
    <group>
      <spotLight
        ref={light}
        position={[0, 6, 2.5]}
        angle={0.45}
        penumbra={0.5}
        intensity={2.4}
        color={tone}
        target-position={[0, 0, 1.8]}
      />
      <mesh ref={disc} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.8]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#1a1410" emissive={tone} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/* ---------------- Scene ---------------- */

function Scene(props: CourtroomStageProps) {
  const tone = useTone(props);
  return (
    <>
      <color attach="background" args={["#0a0d14"]} />
      <fog attach="fog" args={["#0a0d14", 8, 18]} />

      <CameraRig shake={tone.shake} />

      <ambientLight intensity={0.18} color={tone.key} />
      <pointLight position={[0, 4, 4]} intensity={tone.intensity * 0.8} color={tone.key} />
      <AccusedSpotlight pulse={tone.pulse} tone={tone.key} />

      <Floor />
      <Bench />
      <Gavel
        phase={props.phase}
        result={props.result}
        juryComplete={props.juryComplete}
        pulse={tone.pulse}
      />
      <Paper phase={props.phase} />
      <JurorLights joined={props.joinedCount} voted={props.votedCount} />
    </>
  );
}

/* ---------------- Default export ---------------- */

export default function Stage3D(props: CourtroomStageProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.2, 6.2], fov: 42 }}
      gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
