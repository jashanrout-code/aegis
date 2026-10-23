import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { ZoneId, ZoneState, FSMState, ZoneResponseAction, ResponseActionType } from '../../types/simulation';

// Register native OrbitControls into React Three Fiber JSX
extend({ OrbitControls });

// Preset Camera Positions
export const CAMERA_PRESETS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  OVERVIEW: { position: [0, 24, 26], target: [0, 0, 1] },
  TOP_DOWN: { position: [0, 36, 0.1], target: [0, 0, 0] },
  ZONE_PROD: { position: [-10, 10, 8], target: [-10, 1, -5] },
  ZONE_POWER: { position: [-10, 9, 18], target: [-10, 1, 7] },
  ZONE_STORAGE: { position: [6, 11, 18], target: [6, 1, 7] },
  ZONE_CTRL: { position: [6, 9, 6], target: [6, 1, -5] },
  ZONE_UTIL: { position: [-2, 9, 11], target: [-2, 1, 1] },
  ZONE_EXIT: { position: [14, 8, 12], target: [14, 1, 1] },
};

interface CameraControllerProps {
  targetZoneId: ZoneId | null;
  cameraPreset: string;
}

function CameraController({ targetZoneId, cameraPreset }: CameraControllerProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    let preset = CAMERA_PRESETS.OVERVIEW;
    if (targetZoneId && CAMERA_PRESETS[targetZoneId]) {
      preset = CAMERA_PRESETS[targetZoneId];
    } else if (cameraPreset && CAMERA_PRESETS[cameraPreset]) {
      preset = CAMERA_PRESETS[cameraPreset];
    }

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...preset.position);
    const startTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0);
    const endTarget = new THREE.Vector3(...preset.target);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        camera.position.copy(endPos);
        if (controlsRef.current) {
          controlsRef.current.target.copy(endTarget);
          controlsRef.current.update();
        }
        clearInterval(interval);
      } else {
        camera.position.lerpVectors(startPos, endPos, progress);
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(startTarget, endTarget, progress);
          controlsRef.current.update();
        }
      }
    }, 16);

    return () => clearInterval(interval);
  }, [targetZoneId, cameraPreset, camera]);

  return (
    // @ts-ignore
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={5}
      maxDistance={60}
    />
  );
}

// Ground Grid, Concrete Floor Slab and Safety Boundary Lines
function FacilityFloor() {
  return (
    <group>
      {/* Foundation Base Slab */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[44, 0.6, 32]} />
        <meshStandardMaterial color="#0c1527" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Industrial Grid Floor */}
      <gridHelper args={[42, 42, '#00f0ff', '#1e293b']} position={[0, 0.01, 0]} />

      {/* Main Central Corridor Walkway */}
      <mesh position={[0, 0.02, 1]} receiveShadow>
        <planeGeometry args={[38, 4]} />
        <meshStandardMaterial color="#13233f" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Yellow Safety Walkway Borders */}
      <mesh position={[0, 0.025, 3]}>
        <planeGeometry args={[38, 0.2]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[0, 0.025, -1]}>
        <planeGeometry args={[38, 0.2]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>

      {/* Structural Columns & Overhead Crane Rails */}
      {[-18, -6, 6, 18].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 3.5, -14]} castShadow>
            <boxGeometry args={[0.8, 7, 0.8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x, 3.5, 14]} castShadow>
            <boxGeometry args={[0.8, 7, 0.8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x, 7, 0]}>
            <boxGeometry args={[0.6, 0.6, 28]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Overhead Gantry Crane Rail */}
      <mesh position={[0, 6.8, -5]}>
        <boxGeometry args={[38, 0.4, 0.4]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Overhead Industrial Pipes (Red Sprinkler, Yellow Gas, Blue Water) */}
      <group position={[0, 6.2, 2.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 38, 12]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 38, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 38, 12]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// 3D Equipment per Zone
function ProductionHallEquipment() {
  return (
    <group position={[-10, 0, -5]}>
      <mesh position={[-3, 1.5, -2]} castShadow>
        <boxGeometry args={[3, 3, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-3, 1.8, -0.85]}>
        <boxGeometry args={[1.5, 1.2, 0.1]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.6} roughness={0.1} />
      </mesh>

      <mesh position={[3, 1.5, -2]} castShadow>
        <boxGeometry args={[3, 3, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[3, 1.8, -0.85]}>
        <boxGeometry args={[1.5, 1.2, 0.1]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.6} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0.5, 1.5]} castShadow>
        <boxGeometry args={[8, 1, 1.2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
      </mesh>
      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 1.15, 1.5]} castShadow>
          <boxGeometry args={[0.8, 0.6, 0.8]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      <mesh position={[0, 1.2, -1.8]} castShadow>
        <cylinderGeometry args={[0.6, 0.7, 1.5, 16]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2.2, -1.4]} rotation={[0.6, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 1.6, 0.3]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function PowerRoomEquipment() {
  return (
    <group position={[-10, 0, 7]}>
      <mesh position={[-2.5, 1.8, 0]} castShadow>
        <boxGeometry args={[3.2, 3.6, 2.8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x, i) => (
        <mesh key={i} position={[-2.5 + x, 1.8, 1.45]}>
          <boxGeometry args={[0.08, 3.0, 0.3]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
      ))}
      {[-1, 0, 1].map((x, i) => (
        <mesh key={i} position={[-2.5 + x, 3.8, 0]}>
          <cylinderGeometry args={[0.15, 0.25, 0.8, 12]} />
          <meshStandardMaterial color="#b45309" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}

      <mesh position={[2.5, 1.6, 0]} castShadow>
        <boxGeometry args={[3, 3.2, 1.6]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[2.5, 2.2, 0.82]}>
        <planeGeometry args={[2.4, 0.4]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {[-0.8, -0.2, 0.4, 1.0].map((x, i) => (
        <mesh key={i} position={[2.5 + x, 2.7, 0.83]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={i === 0 ? '#10b981' : i === 1 ? '#eab308' : '#3b82f6'} />
        </mesh>
      ))}
    </group>
  );
}

function StorageAreaEquipment() {
  return (
    <group position={[6, 0, 7]}>
      {[-3, 0, 3].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[-1.2, 2.5, -1.2]}>
            <boxGeometry args={[0.15, 5, 0.15]} />
            <meshStandardMaterial color="#2563eb" metalness={0.7} />
          </mesh>
          <mesh position={[1.2, 2.5, -1.2]}>
            <boxGeometry args={[0.15, 5, 0.15]} />
            <meshStandardMaterial color="#2563eb" metalness={0.7} />
          </mesh>
          <mesh position={[-1.2, 2.5, 1.2]}>
            <boxGeometry args={[0.15, 5, 0.15]} />
            <meshStandardMaterial color="#2563eb" metalness={0.7} />
          </mesh>
          <mesh position={[1.2, 2.5, 1.2]}>
            <boxGeometry args={[0.15, 5, 0.15]} />
            <meshStandardMaterial color="#2563eb" metalness={0.7} />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[2.5, 0.1, 2.4]} />
            <meshStandardMaterial color="#ea580c" metalness={0.6} />
          </mesh>
          <mesh position={[0, 2.8, 0]}>
            <boxGeometry args={[2.5, 0.1, 2.4]} />
            <meshStandardMaterial color="#ea580c" metalness={0.6} />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <boxGeometry args={[2.5, 0.1, 2.4]} />
            <meshStandardMaterial color="#ea580c" metalness={0.6} />
          </mesh>

          <mesh position={[-0.5, 1.7, 0]} castShadow>
            <boxGeometry args={[0.9, 0.8, 0.9]} />
            <meshStandardMaterial color="#854d0e" roughness={0.8} />
          </mesh>
          <mesh position={[0.5, 1.7, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.9, 12]} />
            <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 3.3, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.9, 12]} />
            <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.1, 2.8]} castShadow>
        <boxGeometry args={[1.6, 0.2, 1.4]} />
        <meshStandardMaterial color="#a16207" roughness={0.9} />
      </mesh>
    </group>
  );
}

function ControlRoomEquipment() {
  return (
    <group position={[6, 0, -5]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[5, 0.8, 1.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.5} />
      </mesh>

      {[-1.5, 0, 1.5].map((x, i) => (
        <group key={i} position={[x, 1.6, -0.4]}>
          <mesh>
            <boxGeometry args={[1.2, 0.8, 0.08]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[1.1, 0.7]} />
            <meshBasicMaterial color={i === 1 ? '#00f0ff' : '#10b981'} />
          </mesh>
        </group>
      ))}

      {[-2, 0, 2].map((x, i) => (
        <group key={i} position={[x, 1.8, -2.8]}>
          <mesh castShadow>
            <boxGeometry args={[1.4, 3.6, 0.9]} />
            <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.5, 0.46]}>
            <planeGeometry args={[1.0, 1.8]} />
            <meshStandardMaterial color="#0284c7" emissive="#00f0ff" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}

      {[-1.2, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 0.6, 1.2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.8, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function UtilityZoneEquipment() {
  return (
    <group position={[-2, 0, 1]}>
      <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[1.2, 1.2, 4.0, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-2.0, 1.8, 0]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[2.0, 1.8, 0]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[0, 3.4, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1.5, 12]} />
        <meshStandardMaterial color="#ef4444" metalness={0.7} />
      </mesh>
      <mesh position={[1.0, 2.6, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      <mesh position={[0, 0.5, 2.2]} castShadow>
        <boxGeometry args={[2.5, 1.0, 1.6]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>
    </group>
  );
}

function EmergencyExitEquipment() {
  return (
    <group position={[14, 0, 1]}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[4.5, 5, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.3} transparent opacity={0.85} />
      </mesh>

      <mesh position={[-2.26, 1.8, 0]}>
        <boxGeometry args={[0.1, 3.4, 2.4]} />
        <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.3} />
      </mesh>

      <group position={[-2.28, 3.7, 0]}>
        <mesh>
          <boxGeometry args={[0.08, 0.45, 1.2]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>

      <mesh position={[3.5, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 24]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
    </group>
  );
}

// 3D Zone Billboard Label using standard Canvas Texture
function ZoneBillboard({
  name,
  status,
  isSelected,
  position,
  onClick,
}: {
  name: string;
  status: string;
  isSelected: boolean;
  position: [number, number, number];
  onClick: (e: any) => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = isSelected ? 'rgba(7, 11, 20, 0.95)' : 'rgba(11, 19, 36, 0.85)';
      ctx.fillRect(10, 10, 492, 108);
      ctx.strokeStyle = isSelected
        ? '#00f0ff'
        : status === 'EMERGENCY'
        ? '#ef4444'
        : status === 'WARNING'
        ? '#f59e0b'
        : '#334155';
      ctx.lineWidth = isSelected ? 8 : 4;
      ctx.strokeRect(10, 10, 492, 108);

      // Status indicator circle
      ctx.fillStyle = status === 'EMERGENCY' ? '#ef4444' : status === 'WARNING' ? '#f59e0b' : '#10b981';
      ctx.beginPath();
      ctx.arc(45, 64, 18, 0, Math.PI * 2);
      ctx.fill();

      // Name
      ctx.fillStyle = isSelected ? '#00f0ff' : '#f8fafc';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(name.slice(0, 18), 75, 75);

      // Status text
      ctx.fillStyle = status === 'EMERGENCY' ? '#ef4444' : status === 'WARNING' ? '#f59e0b' : '#10b981';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(status, 360, 75);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [name, status, isSelected]);

  return (
    <sprite position={position} scale={[5, 1.25, 1]} onClick={onClick}>
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  );
}

// Zone bounding box and interactive hover
interface ZoneMeshProps {
  zone: ZoneState;
  isSelected: boolean;
  onSelect: (zoneId: ZoneId) => void;
}

function ZoneMesh({ zone, isSelected, onSelect }: ZoneMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);

  let statusColor = '#10b981';
  let pulseSpeed = 0;
  if (zone.status === 'EMERGENCY') {
    statusColor = '#ef4444';
    pulseSpeed = 6.0;
  } else if (zone.status === 'WARNING') {
    statusColor = '#f59e0b';
    pulseSpeed = 3.0;
  } else if (zone.status === 'FAULT') {
    statusColor = '#8b5cf6';
    pulseSpeed = 2.0;
  }

  useFrame(({ clock }) => {
    if (meshRef.current && pulseSpeed > 0) {
      const opacity = 0.15 + Math.sin(clock.getElapsedTime() * pulseSpeed) * 0.1;
      (meshRef.current.material as THREE.MeshStandardMaterial).opacity = opacity;
    }
  });

  const { gridPosition, dimensions, name } = zone.config;

  return (
    <group position={gridPosition}>
      <mesh
        ref={meshRef}
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zone.config.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[dimensions[0], dimensions[2]]} />
        <meshStandardMaterial
          color={statusColor}
          transparent
          opacity={isSelected ? 0.35 : hovered ? 0.25 : 0.12}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating 3D Billboard Label */}
      <ZoneBillboard
        name={name}
        status={zone.status}
        isSelected={isSelected}
        position={[0, dimensions[1] + 1.2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(zone.config.id);
        }}
      />
    </group>
  );
}

// Simulated Smoke Particles with dynamic density scaling
function SimulatedSmokeParticles({ position, smokeLevel = 45 }: { position: [number, number, number]; smokeLevel?: number }) {
  const particlesRef = useRef<THREE.Group>(null);
  const opacity = Math.min(0.5, Math.max(0.05, (smokeLevel / 100) * 0.6));
  const scaleFactor = Math.min(1.4, Math.max(0.3, smokeLevel / 40));

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      particlesRef.current.children.forEach((child) => {
        child.position.y += 0.035;
        child.scale.multiplyScalar(1.006);
        if (child.position.y > 6.5) {
          child.position.y = 1.0;
          child.position.x = (Math.random() - 0.5) * 2;
          child.position.z = (Math.random() - 0.5) * 2;
          child.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
      });
      particlesRef.current.rotation.y = clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <group ref={particlesRef} position={position}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh key={i} position={[(i % 3 - 1) * 0.8, 1.2 + i * 0.6, (i % 2 - 0.5) * 0.8]}>
          <sphereGeometry args={[0.6 + i * 0.15, 12, 12]} />
          <meshStandardMaterial color="#475569" transparent opacity={opacity} roughness={1.0} />
        </mesh>
      ))}
    </group>
  );
}

// 3D Fire Sprinkler System with Animated Water Spray Droplets
function SprinklerSystem3D({ 
  zoneId, 
  position, 
  dimensions, 
  isActive, 
  onSelect 
}: { 
  zoneId: ZoneId; 
  position: [number, number, number]; 
  dimensions: [number, number, number]; 
  isActive: boolean; 
  onSelect?: () => void; 
}) {
  const [x, , z] = position;
  const [w, , d] = dimensions;
  const dropletsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (isActive && dropletsRef.current) {
      dropletsRef.current.children.forEach((drop: any, idx: number) => {
        drop.position.y -= 0.14 + (idx % 4) * 0.02;
        if (drop.position.y < 0.15) {
          drop.position.y = 5.1;
          drop.position.x = ((idx * 1.4) % (w - 1.5)) - (w - 1.5) / 2;
          drop.position.z = ((idx * 1.8) % (d - 1.5)) - (d - 1.5) / 2;
        }
      });
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Overhead Sprinkler Pipe & Nozzles */}
      <group 
        position={[0, 5.2, 0]} 
        onClick={(e) => { 
          e.stopPropagation(); 
          onSelect?.(); 
        }}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, w - 1.2, 10]} />
          <meshStandardMaterial color={isActive ? '#38bdf8' : '#dc2626'} metalness={0.7} roughness={0.3} />
        </mesh>
        {[-w / 3, 0, w / 3].map((nozzleX, i) => (
          <group key={i} position={[nozzleX, -0.15, 0]}>
            <mesh>
              <cylinderGeometry args={[0.05, 0.07, 0.18, 8]} />
              <meshStandardMaterial color={isActive ? '#38bdf8' : '#eab308'} metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <coneGeometry args={[0.12, 0.08, 8]} />
              <meshStandardMaterial color={isActive ? '#00f0ff' : '#ca8a04'} metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Animated Water Droplets Spray */}
      {isActive && (
        <group ref={dropletsRef}>
          {Array.from({ length: 32 }).map((_, i) => (
            <mesh key={i} position={[
              ((i * 1.4) % (w - 1.5)) - (w - 1.5) / 2, 
              0.5 + (i * 0.16) % 4.6, 
              ((i * 1.8) % (d - 1.5)) - (d - 1.5) / 2
            ]}>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.75} />
            </mesh>
          ))}
          <pointLight position={[0, 1.5, 0]} color="#38bdf8" intensity={1.8} distance={12} />
        </group>
      )}
    </group>
  );
}

// 3D Ventilation Extractor Unit with Rotating Fan Blades and Airflow
function VentilationExtractor3D({ 
  zoneId, 
  position, 
  isActive, 
  onSelect 
}: { 
  zoneId: ZoneId; 
  position: [number, number, number]; 
  isActive: boolean; 
  onSelect?: () => void; 
}) {
  const fanRef = useRef<THREE.Group>(null);
  const airflowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (fanRef.current && isActive) {
      fanRef.current.rotation.z += 0.28;
    }
    if (airflowRef.current && isActive) {
      airflowRef.current.children.forEach((p: any) => {
        p.position.y += 0.05;
        if (p.position.y > 6.6) {
          p.position.y = 4.8;
        }
      });
    }
  });

  return (
    <group 
      position={position} 
      onClick={(e) => { 
        e.stopPropagation(); 
        onSelect?.(); 
      }}
    >
      {/* Industrial Vent Ducts */}
      <mesh position={[0, 5.7, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1.2, 16]} />
        <meshStandardMaterial color={isActive ? '#0284c7' : '#1e293b'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 5.12, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.05, 16]} />
        <meshStandardMaterial color="#0f172a" wireframe />
      </mesh>

      {/* Rotating Fan Rotor Blades */}
      <group ref={fanRef} position={[0, 5.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.15, 10]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        {[0, 1, 2, 3].map((b) => (
          <mesh key={b} position={[0.38 * Math.cos(b * Math.PI / 2), 0.38 * Math.sin(b * Math.PI / 2), 0]} rotation={[0, 0, b * Math.PI / 2 + 0.3]}>
            <boxGeometry args={[0.45, 0.16, 0.03]} />
            <meshStandardMaterial color={isActive ? '#38bdf8' : '#64748b'} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Upward Airflow Indicators */}
      {isActive && (
        <group ref={airflowRef}>
          {[-0.3, 0, 0.3].map((xOffset, i) => (
            <mesh key={i} position={[xOffset, 4.8 + i * 0.4, 0]}>
              <cylinderGeometry args={[0.08, 0.04, 0.3, 8]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
            </mesh>
          ))}
          <pointLight position={[0, 5.5, 0]} color="#00f0ff" intensity={1.2} distance={8} />
        </group>
      )}
    </group>
  );
}

// 3D Industrial Cooling Chiller with Dual Cooling Fans
function CoolingChiller3D({ 
  zoneId, 
  position, 
  isActive, 
  onSelect 
}: { 
  zoneId: ZoneId; 
  position: [number, number, number]; 
  isActive: boolean; 
  onSelect?: () => void; 
}) {
  const fansRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (fansRef.current && isActive) {
      fansRef.current.children.forEach((f: any) => {
        f.rotation.z += 0.32;
      });
    }
  });

  return (
    <group 
      position={position} 
      onClick={(e) => { 
        e.stopPropagation(); 
        onSelect?.(); 
      }}
    >
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.0, 2.4, 1.2]} />
        <meshStandardMaterial color={isActive ? '#1e3a8a' : '#1e293b'} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.2, 0.62]}>
        <planeGeometry args={[1.7, 2.0]} />
        <meshStandardMaterial color={isActive ? '#38bdf8' : '#334155'} roughness={0.5} wireframe />
      </mesh>

      {/* Twin Cooling Fans */}
      <group ref={fansRef} position={[0, 1.2, 0.65]}>
        {[-0.5, 0.5].map((yOff, i) => (
          <group key={i} position={[0, yOff, 0]}>
            <mesh>
              <cylinderGeometry args={[0.35, 0.35, 0.04, 12]} />
              <meshStandardMaterial color="#0f172a" wireframe />
            </mesh>
            {[0, 1, 2, 3].map((b) => (
              <mesh key={b} position={[0.18 * Math.cos(b * Math.PI / 2), 0.18 * Math.sin(b * Math.PI / 2), 0]} rotation={[0, 0, b * Math.PI / 2]}>
                <boxGeometry args={[0.24, 0.08, 0.02]} />
                <meshStandardMaterial color={isActive ? '#60a5fa' : '#64748b'} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {isActive && (
        <pointLight position={[0, 1.2, 0.8]} color="#60a5fa" intensity={1.5} distance={7} />
      )}
    </group>
  );
}

// Rotating Emergency Red Siren Strobe Light
function EmergencySirenStrobe({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const beaconMeshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 8.0;
    if (lightRef.current) {
      lightRef.current.intensity = 2.0 + Math.sin(t) * 1.8;
    }
    if (beaconMeshRef.current) {
      beaconMeshRef.current.rotation.y = t * 1.5;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.3, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </mesh>
      <mesh ref={beaconMeshRef} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} roughness={0.1} />
      </mesh>
      <pointLight ref={lightRef} color="#ef4444" distance={16} decay={2} intensity={2.5} />
    </group>
  );
}

// 3D Evacuation Path Ribbon
function EvacuationRoute3D({ waypoints }: { waypoints: [number, number, number][] }) {
  if (!waypoints || waypoints.length < 2) return null;

  const points = waypoints.map((w) => new THREE.Vector3(w[0], 0.15, w[2]));
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.16, 8, false);

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} roughness={0.2} />
      </mesh>
      {waypoints.map((w, i) => (
        <mesh key={i} position={[w[0], 0.25, w[2]]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
          <meshBasicMaterial color={i === waypoints.length - 1 ? '#00f0ff' : '#10b981'} />
        </mesh>
      ))}
    </group>
  );
}

export interface FacilityCanvasProps {
  zones: Record<ZoneId, ZoneState>;
  responseActions?: Record<string, ZoneResponseAction>;
  fsmState: FSMState;
  selectedZoneId: ZoneId | null;
  cameraPreset: string;
  evacuationWaypoints?: [number, number, number][];
  onSelectZone: (zoneId: ZoneId) => void;
  onSelectEquipment?: (equipment: { type: ResponseActionType; zoneId: ZoneId; name: string }) => void;
}

export const FacilityCanvas: React.FC<FacilityCanvasProps> = ({
  zones,
  responseActions = {},
  fsmState,
  selectedZoneId,
  cameraPreset,
  evacuationWaypoints,
  onSelectZone,
  onSelectEquipment,
}) => {
  let ambientColor = '#38bdf8';
  let ambientIntensity = 0.5;
  if (fsmState === 'ALARM_STAGE_2') {
    ambientColor = '#ef4444';
    ambientIntensity = 0.8;
  } else if (fsmState === 'WARNING') {
    ambientColor = '#f59e0b';
    ambientIntensity = 0.6;
  }

  return (
    <div className="w-full h-full relative bg-industrial-950 overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [0, 24, 26], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#070b14']} />
        <fog attach="fog" args={['#070b14', 30, 75]} />

        <ambientLight color={ambientColor} intensity={ambientIntensity} />
        <directionalLight position={[15, 25, 20]} intensity={1.2} castShadow />
        <pointLight position={[0, 12, 0]} intensity={0.6} color="#ffffff" distance={40} />

        <CameraController targetZoneId={selectedZoneId} cameraPreset={cameraPreset} />

        <FacilityFloor />

        <ProductionHallEquipment />
        <PowerRoomEquipment />
        <StorageAreaEquipment />
        <ControlRoomEquipment />
        <UtilityZoneEquipment />
        <EmergencyExitEquipment />

        {(Object.keys(zones) as ZoneId[]).map((zoneId) => (
          <ZoneMesh
            key={zoneId}
            zone={zones[zoneId]}
            isSelected={selectedZoneId === zoneId}
            onSelect={onSelectZone}
          />
        ))}

        {/* 3D Response Equipment & Environmental Particle Systems */}
        {(Object.keys(zones) as ZoneId[]).map((zoneId) => {
          const z = zones[zoneId];
          const hasSmoke = z.sensors.smoke || z.sensors.smokeLevel > 15;
          const isEmergency = z.status === 'EMERGENCY';

          const sprinklerAction = responseActions[`ACT-SPRINKLER-${zoneId}`];
          const ventAction = responseActions[`ACT-VENT-${zoneId}`];
          const coolAction = responseActions[`ACT-COOL-${zoneId}`];
          const alarmAction = responseActions[`ACT-ALARM-${zoneId}`];

          const isSprinklerActive = sprinklerAction?.status === 'ACTIVE';
          const isVentActive = ventAction?.status === 'ACTIVE';
          const isCoolActive = coolAction?.status === 'ACTIVE';
          const isStrobeActive = isEmergency || alarmAction?.status === 'ACTIVE';

          const [zx, zy, zz] = z.config.gridPosition;

          return (
            <group key={`equipment-and-fx-${zoneId}`}>
              {/* Dynamic Fire Sprinkler Grid with Animated Water Droplets */}
              <SprinklerSystem3D
                zoneId={zoneId}
                position={z.config.gridPosition}
                dimensions={z.config.dimensions}
                isActive={isSprinklerActive}
                onSelect={() => onSelectEquipment?.({
                  type: 'SPRINKLERS',
                  zoneId,
                  name: sprinklerAction?.name || `${z.config.name} Sprinklers`
                })}
              />

              {/* High-Velocity Rooftop/Ceiling Exhaust Extractor with Spinning Blades */}
              <VentilationExtractor3D
                zoneId={zoneId}
                position={[zx, zy, zz - z.config.dimensions[2] / 4]}
                isActive={isVentActive}
                onSelect={() => onSelectEquipment?.({
                  type: 'VENTILATION',
                  zoneId,
                  name: ventAction?.name || `${z.config.name} Ventilation`
                })}
              />

              {/* Industrial Forced-Air Cooling Chiller */}
              <CoolingChiller3D
                zoneId={zoneId}
                position={[zx + z.config.dimensions[0] / 2 - 1.2, zy, zz + z.config.dimensions[2] / 2 - 1.2]}
                isActive={isCoolActive}
                onSelect={() => onSelectEquipment?.({
                  type: 'COOLING',
                  zoneId,
                  name: coolAction?.name || `${z.config.name} Cooling Chiller`
                })}
              />

              {/* Dynamic Smoke Density scaled to real sensor levels */}
              {hasSmoke && (
                <SimulatedSmokeParticles 
                  position={z.config.gridPosition} 
                  smokeLevel={z.sensors.smokeLevel}
                />
              )}

              {/* Optical Emergency Strobe Siren Beacon */}
              {isStrobeActive && (
                <EmergencySirenStrobe position={[z.config.gridPosition[0], 5.8, z.config.gridPosition[2]]} />
              )}
            </group>
          );
        })}

        {evacuationWaypoints && <EvacuationRoute3D waypoints={evacuationWaypoints} />}
      </Canvas>
    </div>
  );
};

