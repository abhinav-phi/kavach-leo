import { useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useAppStore } from "../store";
import type { ConjunctionAlert, PositionSeries } from "../types";

const SCALE = 7000;
const point = (value: number[]) => [value[0] / SCALE, value[1] / SCALE, value[2] / SCALE] as [number, number, number];

function LowPolyRing({ rotation, radius, color, opacity, dashed = false }: { rotation: [number, number, number]; radius: number; color: string; opacity: number; dashed?: boolean }) {
  const points = useMemo(() => Array.from({ length: 97 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0] as [number, number, number];
  }), [radius]);
  return <Line points={points} rotation={rotation} color={color} lineWidth={dashed ? 0.45 : 0.8} transparent opacity={opacity} dashed={dashed} dashSize={0.045} gapSize={0.06} />;
}

function stylizeEarthTexture(source: THREE.Texture) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(source.image, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const palette = {
    ocean: [[4, 25, 41], [7, 45, 66], [12, 68, 91], [26, 101, 125]],
    green: [[30, 52, 36], [50, 76, 47], [77, 103, 60], [127, 143, 83]],
    earth: [[46, 45, 34], [76, 67, 44], [113, 92, 55], [156, 132, 76]],
  };
  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    const brightness = (red * 0.3 + green * 0.59 + blue * 0.11) / 255;
    const ocean = blue > red * 1.12 && blue > green * 1.02;
    const snowOrCloud = red > 205 && green > 205 && blue > 205;
    const landPalette = green >= red * 0.92 ? palette.green : palette.earth;
    const colors = ocean ? palette.ocean : landPalette;
    const level = Math.min(3, Math.max(0, Math.floor(brightness * 4)));
    const color = snowOrCloud ? [145, 157, 145] : colors[level];
    image.data[index] = color[0];
    image.data[index + 1] = color[1];
    image.data[index + 2] = color[2];
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function latLonPoint(latitude: number, longitude: number, radius: number) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  return [Math.cos(lat) * Math.cos(lon) * radius, Math.sin(lat) * radius, Math.cos(lat) * Math.sin(lon) * radius] as [number, number, number];
}

function CloudPuffs() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.018; });
  const clouds = useMemo(() => [
    [latLonPoint(18, 92, 0.955), [0.12, 0.045, 0.07]],
    [latLonPoint(-7, 148, 0.965), [0.1, 0.038, 0.06]],
    [latLonPoint(32, -32, 0.965), [0.13, 0.05, 0.075]],
    [latLonPoint(-33, 25, 0.96), [0.1, 0.04, 0.06]],
    [latLonPoint(44, 150, 0.97), [0.12, 0.045, 0.068]],
  ] as const, []);
  return <group ref={ref}>{clouds.map(([position, scale], index) => <group key={index} position={position}><mesh scale={scale}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#d9e5e1" transparent opacity={0.78} /></mesh><mesh position={[scale[0] * 0.5, scale[1] * 0.2, scale[2] * 0.15]} scale={[scale[0] * 0.7, scale[1] * 1.25, scale[2] * 0.9]}><icosahedronGeometry args={[1, 1]} /><meshBasicMaterial color="#eef6f1" transparent opacity={0.55} /></mesh></group>)}</group>;
}

function Earth() {
  const [surface, normal] = useLoader(THREE.TextureLoader, [
    "/textures/earth_atmos_2048.jpg",
    "/textures/earth_normal_2048.jpg",
  ]);
  const stylizedSurface = useMemo(() => stylizeEarthTexture(surface), [surface]);
  return <group rotation={[0.06, -0.72, 0.08]}>
    <mesh><icosahedronGeometry args={[0.91, 3]} /><meshStandardMaterial map={stylizedSurface} normalMap={normal} normalScale={new THREE.Vector2(0.42, 0.42)} roughness={0.78} metalness={0.06} flatShading /></mesh>
    <mesh scale={1.008}><icosahedronGeometry args={[0.91, 3]} /><meshBasicMaterial color="#78d9ee" wireframe transparent opacity={0.08} /></mesh>
    <mesh scale={1.05}><sphereGeometry args={[0.91, 32, 20]} /><meshBasicMaterial color="#3ebddd" transparent opacity={0.11} side={THREE.BackSide} blending={THREE.AdditiveBlending} /></mesh>
    <CloudPuffs />
    <LowPolyRing rotation={[0.23, 0.08, 0]} radius={1.01} color="#43bedf" opacity={0.22} />
    <LowPolyRing rotation={[Math.PI / 2 - 0.22, -0.35, 0.1]} radius={1.055} color="#ffb72d" opacity={0.22} />
  </group>;
}

function OrbitalScan() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.getElapsedTime() * 0.12;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.18) * 0.12;
  });
  return <group ref={ref}>
    <LowPolyRing rotation={[0.65, 0.2, 0]} radius={1.31} color="#78d7f7" opacity={0.19} />
    <LowPolyRing rotation={[0.65, 0.2, 0]} radius={1.39} color="#ffb020" opacity={0.1} dashed />
    <LowPolyRing rotation={[1.18, -0.55, 0.18]} radius={1.58} color="#2e6980" opacity={0.2} dashed />
  </group>;
}

function OrbitLine({ series, alert }: { series: PositionSeries; alert: boolean }) {
  const points = useMemo(() => series.eciKm.map(point), [series.eciKm]);
  return <Line points={points} color={alert ? "#ff4d4d" : "#75d9f8"} lineWidth={alert ? 2.5 : 0.8} transparent opacity={alert ? 0.94 : 0.3} dashed={alert} dashSize={0.06} gapSize={0.04} />;
}

function SatelliteModel({ position, indian, showLabel, name }: { position: [number, number, number]; indian: boolean; showLabel: boolean; name: string }) {
  return <group position={position}>
    <mesh><boxGeometry args={[0.055, 0.035, 0.035]} /><meshStandardMaterial color={indian ? "#ffb72d" : "#d6ecf5"} metalness={0.75} roughness={0.3} /></mesh>
    <mesh position={[-0.075, 0, 0]}><boxGeometry args={[0.09, 0.008, 0.05]} /><meshBasicMaterial color="#377a99" /></mesh>
    <mesh position={[0.075, 0, 0]}><boxGeometry args={[0.09, 0.008, 0.05]} /><meshBasicMaterial color="#377a99" /></mesh>
    {indian && <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.047, 0.006, 8, 24]} /><meshBasicMaterial color="#ffb72d" transparent opacity={0.9} /></mesh>}
    {showLabel && <Html distanceFactor={7} position={[0.07, 0.05, 0]}><span className="scene-marker-label">{name}</span></Html>}
  </group>;
}

function SatelliteMarker({ series, indian, showLabel }: { series: PositionSeries; indian: boolean; showLabel: boolean }) {
  return <SatelliteModel position={point(series.eciKm[0])} indian={indian} showLabel={showLabel} name={series.satelliteName} />;
}

function DemoOrbit({ rotation, color, phase, name, indian }: { rotation: [number, number, number]; color: string; phase: number; name: string; indian: boolean }) {
  const points = useMemo(() => Array.from({ length: 120 }, (_, index) => {
    const angle = (index / 119) * Math.PI * 2;
    return [Math.cos(angle) * 1.24, Math.sin(angle) * 1.24, Math.sin(angle * 2 + phase) * 0.15] as [number, number, number];
  }), [phase]);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.08;
  });
  const position = [Math.cos(phase) * 1.24, Math.sin(phase) * 1.24, Math.sin(phase * 2) * 0.15] as [number, number, number];
  return <group ref={ref} rotation={rotation}><Line points={points} color={color} lineWidth={1.15} transparent opacity={0.56} /><SatelliteModel position={position} indian={indian} showLabel name={name} /></group>;
}

function PulseMarker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.scale.setScalar(1 + (Math.sin(clock.getElapsedTime() * 3) + 1) * 0.2); });
  return <group position={position}><mesh ref={ref}><icosahedronGeometry args={[0.06, 1]} /><meshBasicMaterial color="#ff4d4d" /></mesh><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.11, 0.008, 6, 18]} /><meshBasicMaterial color="#ff4d4d" transparent opacity={0.75} /></mesh></group>;
}

function DemoConjunction() {
  const position: [number, number, number] = [0.82, 0.45, 0.18];
  return <group position={position} rotation={[0.3, -0.4, -0.5]}><PulseMarker position={[0, 0, 0]} /><mesh position={[0, -0.11, 0]}><coneGeometry args={[0.12, 0.3, 3]} /><meshBasicMaterial color="#ff343f" transparent opacity={0.34} depthWrite={false} /></mesh><mesh position={[0, 0.11, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.12, 0.3, 3]} /><meshBasicMaterial color="#ff343f" transparent opacity={0.24} depthWrite={false} /></mesh></group>;
}

function AlertHighlight({ alert, positions }: { alert: ConjunctionAlert; positions: Record<string, PositionSeries> }) {
  const a = positions[alert.satA];
  const b = positions[alert.satB];
  const index = a ? Math.max(0, a.timestamps.findIndex((time) => Math.abs(new Date(time).getTime() - new Date(alert.timeOfClosestApproach).getTime()) < 1000 * 60 * 6)) : -1;
  if (!a || !b || index < 0 || !a.eciKm[index] || !b.eciKm[index]) return null;
  const first = point(a.eciKm[index]);
  const second = point(b.eciKm[index]);
  const midpoint = new THREE.Vector3(...first).lerp(new THREE.Vector3(...second), 0.5);
  return <group><Line points={[first, second]} color="#ff4d4d" lineWidth={3} /><PulseMarker position={midpoint.toArray() as [number, number, number]} /><mesh position={first}><icosahedronGeometry args={[0.035, 1]} /><meshBasicMaterial color="#ffb72d" /></mesh><mesh position={second}><icosahedronGeometry args={[0.035, 1]} /><meshBasicMaterial color="#ffb72d" /></mesh></group>;
}

function CameraFocus({ alert, positions }: { alert: ConjunctionAlert | undefined; positions: Record<string, PositionSeries> }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!alert) return;
    const a = positions[alert.satA];
    const b = positions[alert.satB];
    if (!a || !b) return;
    const index = Math.max(0, a.timestamps.findIndex((time) => Math.abs(new Date(time).getTime() - new Date(alert.timeOfClosestApproach).getTime()) < 1000 * 60 * 6));
    if (!a.eciKm[index] || !b.eciKm[index]) return;
    const target = new THREE.Vector3(...point(a.eciKm[index])).lerp(new THREE.Vector3(...point(b.eciKm[index])), 0.5);
    camera.position.lerp(target.clone().normalize().multiplyScalar(3.1), 0.045);
    camera.lookAt(target);
  });
  return null;
}

export function OrbitScene() {
  const { positions, alerts, selectedAlertId, satellites } = useAppStore();
  const selected = alerts.find((alert) => alert.id === selectedAlertId);
  const alertedNames = new Set(selected ? [selected.satA, selected.satB] : alerts.flatMap((alert) => [alert.satA, alert.satB]));
  const indianAssets = new Set(satellites.filter((satellite) => satellite.isIndianAsset).map((satellite) => satellite.name));
  const firstIndianAsset = satellites.find((satellite) => satellite.isIndianAsset)?.name;
  const hasLiveTracks = Object.keys(positions).length > 0;
  return <div className="orbit-scene">
    <Canvas camera={{ position: [0, 0.35, 3.2], fov: 48 }} gl={{ antialias: true }}>
      <color attach="background" args={["#02070d"]} /><fog attach="fog" args={["#02070d", 5, 10]} />
      <ambientLight intensity={0.58} /><pointLight position={[3, 2, 4]} intensity={13} color="#7bd8ff" /><pointLight position={[-3, -1, 2]} intensity={5} color="#ffb72d" />
      <Stars radius={30} depth={10} count={1800} factor={1.5} saturation={0} fade speed={0.2} />
      <OrbitalScan /><Earth />
      {hasLiveTracks ? Object.values(positions).map((series) => <OrbitLine key={series.satelliteName} series={series} alert={alertedNames.has(series.satelliteName)} />) : <><DemoOrbit rotation={[0.65, 0.2, 0]} color="#1ec6bd" phase={0.5} name="STARLINK-1043" indian={false} /><DemoOrbit rotation={[0.65, 0.2, 0]} color="#ffb72d" phase={3.85} name="STARLINK-1067" indian /><DemoConjunction /><LowPolyRing rotation={[0.4, -0.8, 0.2]} radius={1.68} color="#335667" opacity={0.22} dashed /></>}
      {Object.values(positions).map((series) => <SatelliteMarker key={`${series.satelliteName}-marker`} series={series} indian={indianAssets.has(series.satelliteName)} showLabel={series.satelliteName === firstIndianAsset} />)}
      {selected && <AlertHighlight alert={selected} positions={positions} />}<CameraFocus alert={selected} positions={positions} />
      <OrbitControls enablePan={false} minDistance={1.3} maxDistance={7} autoRotate={!selected} autoRotateSpeed={0.28} enableDamping dampingFactor={0.04} />
    </Canvas>
    <div className="scene-hud"><span className="hud-pulse" />LIVE PROPAGATION <b>|</b> ECI FRAME</div><div className="scene-readout"><span>ARGUS / LEO-01</span><small>{hasLiveTracks ? "LIVE STATE VECTOR MODEL" : "REAL EARTH / ORBITAL MODEL"}</small></div>
    <div className="scene-caption"><span className="legend-dot cyan" />ORBITAL POSITION | ECI KM <span className="legend-dot red" />FLAGGED CONJUNCTION</div><div className="scene-label">ORBITAL MONITORING VIEW<br /><span>DRAG TO ROTATE | SCROLL TO ZOOM</span></div>
  </div>;
}
