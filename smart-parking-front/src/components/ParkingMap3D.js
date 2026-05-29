import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
    MAP_WIDTH, MAP_HEIGHT, SECTOR_POSITIONS, toWorld, toMapPercent,
    getTrafficLevel, getCarCount, GRAPH_EDGES, ROAD_ROUTES,
    CAR_COLORS, PARKED_CARS, CAMPUS_BUILDINGS, CAMPUS_GREEN_AREAS, CAMPUS_TREES,
    PARKED_CARS_ALIGNED
} from './ParkingData';

// ============================================================
// GROUND
// ============================================================
const Ground = ({ editorMode, onEditorMapClick, textureUrl = '/mapa-texture.jpg' }) => {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1536;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00152b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const canvasTexture = new THREE.CanvasTexture(canvas);
        canvasTexture.colorSpace = THREE.SRGBColorSpace;
        canvasTexture.anisotropy = 8;
        canvasTexture.minFilter = THREE.LinearFilter;
        canvasTexture.magFilter = THREE.LinearFilter;
        canvasTexture.dispose = () => {};
        return canvasTexture;
    }, []);

    useEffect(() => {
        const canvas = texture.image;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00152b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        texture.needsUpdate = true;

        if (!textureUrl) return;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            texture.needsUpdate = true;
        };
        image.src = textureUrl;
    }, [texture, textureUrl]);

    const handleClick = (event) => {
        if (!editorMode || !onEditorMapClick) return;
        event.stopPropagation();
        onEditorMapClick(toMapPercent(event.point.x, event.point.z));
    };

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
                <planeGeometry args={[MAP_WIDTH + 4, MAP_HEIGHT + 4]} />
                <meshBasicMaterial color="#00152b" side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]} onClick={handleClick}>
                <planeGeometry args={[MAP_WIDTH, MAP_HEIGHT]} />
                <meshBasicMaterial map={texture} color="#ffffff" side={THREE.DoubleSide} dispose={null} />
            </mesh>
        </group>
    );
};

// ============================================================
// NEON GRID
// ============================================================
const NeonGrid = () => {
    const gridRef = useRef();
    useFrame((state) => {
        if (gridRef.current) {
            gridRef.current.material.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 0.5) * 0.04;
        }
    });
    return (
        <gridHelper ref={gridRef} args={[MAP_WIDTH + 10, 40, '#0088ff', '#003366']}
            position={[0, -0.02, 0]} material-transparent={true} material-opacity={0.1} />
    );
};

// ============================================================
// CAMPUS 3D: edificios, arboles y areas verdes
// ============================================================
const SelectionHalo = ({ width = 0.9, depth = 0.9 }) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[Math.max(width, depth) * 0.48, Math.max(width, depth) * 0.56, 48]} />
        <meshBasicMaterial color="#27e98a" transparent opacity={0.82} side={THREE.DoubleSide} />
    </mesh>
);
const Building3D = ({ top, left, width, depth, height, rot = 0, color, roofColor, label, editorMeta, onSelect, selected, showLabels }) => {
    const [x, z] = toWorld(top, left);
    const windowColor = '#bfeeff';
    const handleClick = (event) => {
        if (!onSelect || !editorMeta) return;
        event.stopPropagation();
        onSelect(editorMeta);
    };

    return (
        <group position={[x, height / 2, z]} rotation={[0, rot, 0]} onClick={handleClick}>
            {selected && <SelectionHalo width={width} depth={depth} />}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={selected ? '#e6c36a' : color} roughness={0.62} metalness={0.08} />
            </mesh>
            <mesh position={[0, height / 2 + 0.045, 0]} castShadow receiveShadow>
                <boxGeometry args={[width * 1.08, 0.09, depth * 1.08]} />
                <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.12} />
            </mesh>
            {[-0.32, 0, 0.32].map((offset, index) => (
                <React.Fragment key={index}>
                    <mesh position={[-width / 2 - 0.011, 0.05, depth * offset]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[0.22, 0.16]} />
                        <meshBasicMaterial color={windowColor} transparent opacity={0.52} />
                    </mesh>
                    <mesh position={[width / 2 + 0.011, 0.05, depth * offset]} rotation={[0, -Math.PI / 2, 0]}>
                        <planeGeometry args={[0.22, 0.16]} />
                        <meshBasicMaterial color={windowColor} transparent opacity={0.42} />
                    </mesh>
                </React.Fragment>
            ))}
            {showLabels && label && (
                <Html position={[0, height / 2 + 0.2, 0]} center style={{ pointerEvents: 'none' }}>
                    <div style={{
                        background: 'rgba(0,10,25,0.85)', color: '#fff', padding: '3px 8px',
                        borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap',
                        border: `1px solid ${roofColor || color}`, backdropFilter: 'blur(4px)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.5)', fontFamily: "'Segoe UI', sans-serif"
                    }}>
                        {label}
                    </div>
                </Html>
            )}
        </group>
    );
};

const GreenArea3D = ({ top, left, width, depth, rot = 0, color, editorMeta, onSelect, selected }) => {
    const [x, z] = toWorld(top, left);
    const handleClick = (event) => {
        if (!onSelect || !editorMeta) return;
        event.stopPropagation();
        onSelect(editorMeta);
    };
    return (
        <group position={[x, 0.018, z]} rotation={[0, rot, 0]} onClick={handleClick}>
            {selected && <SelectionHalo width={width} depth={depth} />}
            <mesh receiveShadow>
                <boxGeometry args={[width, 0.035, depth]} />
                <meshStandardMaterial color={color} roughness={0.9} metalness={0} transparent opacity={0.78} />
            </mesh>
            <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.min(width, depth) * 0.38, Math.min(width, depth) * 0.41, 40]} />
                <meshBasicMaterial color="#d7ffd7" transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

const Zone3D = ({ top, left, width, depth, rot = 0, color, blocked, editorMeta, onSelect, selected }) => {
    const [x, z] = toWorld(top, left);
    const handleClick = (event) => {
        if (!onSelect || !editorMeta) return;
        event.stopPropagation();
        onSelect(editorMeta);
    };
    return (
        <group position={[x, 0.04, z]} rotation={[0, rot, 0]} onClick={handleClick}>
            {selected && <SelectionHalo width={width} depth={depth} />}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width, depth]} />
                <meshBasicMaterial color={color} transparent opacity={blocked ? 0.24 : 0.18} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.min(width, depth) * 0.42, Math.min(width, depth) * 0.45, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

const Tree3D = ({ top, left, scale = 1, editorMeta, onSelect, selected }) => {
    const [x, z] = toWorld(top, left);
    const handleClick = (event) => {
        if (!onSelect || !editorMeta) return;
        event.stopPropagation();
        onSelect(editorMeta);
    };
    return (
        <group position={[x, 0, z]} scale={[scale, scale, scale]} onClick={handleClick}>
            {selected && <SelectionHalo width={0.7} depth={0.7} />}
            <mesh position={[0, 0.16, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.05, 0.32, 7]} />
                <meshStandardMaterial color="#684529" roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
                <sphereGeometry args={[0.22, 10, 8]} />
                <meshStandardMaterial color="#1f7a43" roughness={0.78} />
            </mesh>
            <mesh position={[0.04, 0.58, -0.03]} castShadow>
                <sphereGeometry args={[0.17, 10, 8]} />
                <meshStandardMaterial color="#2ca65d" roughness={0.82} />
            </mesh>
        </group>
    );
};

const isSelected = (selectedItem, group, index) => selectedItem?.group === group && selectedItem?.index === index;

const Campus3DLayer = ({ buildings, greenAreas, trees, driveZones, blockedZones, onEditorSelect, selectedEditorItem, showLabels }) => (
    <group>
        {greenAreas.map((area, index) => <GreenArea3D key={area.id} {...area}
            editorMeta={{ group: 'greenAreas', index }} onSelect={onEditorSelect}
            selected={isSelected(selectedEditorItem, 'greenAreas', index)} />)}
        {driveZones.map((zone, index) => <Zone3D key={zone.id} {...zone}
            editorMeta={{ group: 'driveZones', index }} onSelect={onEditorSelect}
            selected={isSelected(selectedEditorItem, 'driveZones', index)} />)}
        {blockedZones.map((zone, index) => <Zone3D key={zone.id} {...zone} blocked
            editorMeta={{ group: 'blockedZones', index }} onSelect={onEditorSelect}
            selected={isSelected(selectedEditorItem, 'blockedZones', index)} />)}
        {buildings.map((building, index) => <Building3D key={building.id} {...building}
            editorMeta={{ group: 'buildings', index }} onSelect={onEditorSelect}
            selected={isSelected(selectedEditorItem, 'buildings', index)}
            showLabels={showLabels} />)}
        {trees.map((tree, index) => <Tree3D key={tree.id} {...tree}
            editorMeta={{ group: 'trees', index }} onSelect={onEditorSelect}
            selected={isSelected(selectedEditorItem, 'trees', index)} />)}
    </group>
);

const EditorRouteLayer = ({ roadRoutes }) => (
    <group>
        {roadRoutes.map((route, routeIndex) => {
            const points = route.map((point) => {
                const [x, z] = toWorld(point.top, point.left);
                return new THREE.Vector3(x, 0.12, z);
            });
            const geometry = points.length > 1 ? new THREE.BufferGeometry().setFromPoints(points) : null;
            return (
                <group key={`route-${routeIndex}`}>
                    {geometry && (
                        <line geometry={geometry}>
                            <lineBasicMaterial color="#27e98a" transparent opacity={0.8} />
                        </line>
                    )}
                    {points.map((point, index) => (
                        <mesh key={index} position={point}>
                            <sphereGeometry args={[0.08, 10, 10]} />
                            <meshBasicMaterial color={index === route.length - 1 ? '#ffffff' : '#27e98a'} />
                        </mesh>
                    ))}
                </group>
            );
        })}
    </group>
);

// ============================================================
// GRAPH EDGES + DATA PULSES
// ============================================================
const GraphEdge = ({ from, to }) => {
    const lineRef = useRef();
    const [fromX, fromZ] = toWorld(from.top, from.left);
    const [toX, toZ] = toWorld(to.top, to.left);

    const geometry = useMemo(() => {
        const pts = [];
        for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            pts.push(new THREE.Vector3(
                fromX + (toX - fromX) * t,
                0.15 + Math.sin(t * Math.PI) * 0.6,
                fromZ + (toZ - fromZ) * t
            ));
        }
        return new THREE.BufferGeometry().setFromPoints(pts);
    }, [fromX, fromZ, toX, toZ]);

    useFrame((state) => {
        if (lineRef.current) lineRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    });

    return (
        <line ref={lineRef} geometry={geometry}>
            <lineBasicMaterial color="#00ccff" transparent opacity={0.4} />
        </line>
    );
};

const DataPulse = ({ from, to, speed, delay }) => {
    const meshRef = useRef();
    const [fromX, fromZ] = toWorld(from.top, from.left);
    const [toX, toZ] = toWorld(to.top, to.left);

    useFrame((state) => {
        if (meshRef.current) {
            const t = ((state.clock.elapsedTime * speed + delay) % 3) / 3;
            meshRef.current.position.set(
                fromX + (toX - fromX) * t,
                0.15 + Math.sin(t * Math.PI) * 0.6,
                fromZ + (toZ - fromZ) * t
            );
            meshRef.current.material.opacity = Math.sin(t * Math.PI);
        }
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
    );
};

const GraphLayer = ({ sectorPositions, graphEdges }) => {
    const edgesToRender = graphEdges || GRAPH_EDGES;
    return (
    <group>
        {edgesToRender.map(([fk, tk], i) => {
            const f = sectorPositions[fk] || SECTOR_POSITIONS[fk], t = sectorPositions[tk] || SECTOR_POSITIONS[tk];
            if (!f || !t) return null;
            return (
                <React.Fragment key={i}>
                    <GraphEdge from={f} to={t} />
                    <DataPulse from={f} to={t} speed={0.4 + i * 0.05} delay={i * 0.7} />
                    <DataPulse from={t} to={f} speed={0.35 + i * 0.04} delay={i * 0.5 + 1.5} />
                </React.Fragment>
            );
        })}
    </group>
    );
};

// ============================================================
// CAR MESH (reutilizable para móviles y estacionados)
// ============================================================
const CarBody = ({ color }) => (
    <group>
        <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.32, 0.16, 0.55]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.24, -0.02]} castShadow>
            <boxGeometry args={[0.26, 0.12, 0.28]} />
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} transparent opacity={0.85} />
        </mesh>
        {[[-0.17, 0.04, 0.17], [0.17, 0.04, 0.17], [-0.17, 0.04, -0.17], [0.17, 0.04, -0.17]].map((p, i) => (
            <mesh key={i} position={p} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 0.05, 8]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
        ))}
        <mesh position={[0.11, 0.12, -0.28]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#ff0000" /></mesh>
        <mesh position={[-0.11, 0.12, -0.28]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#ff0000" /></mesh>
        <mesh position={[0.11, 0.12, 0.28]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#ffffaa" /></mesh>
        <mesh position={[-0.11, 0.12, 0.28]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#ffffaa" /></mesh>
    </group>
);

// ============================================================
// MOVING CAR (sigue una ruta por las calles)
// ============================================================
const MovingCar = ({ route, speed, offset, color }) => {
    const groupRef = useRef();

    const worldRoute = useMemo(() =>
        route.map(p => { const [x, z] = toWorld(p.top, p.left); return new THREE.Vector3(x, 0.15, z); }),
    [route]);

    useFrame((state) => {
        if (!groupRef.current || worldRoute.length < 2) return;
        const totalLen = worldRoute.length;
        const raw = ((state.clock.elapsedTime * speed + offset) % totalLen);
        const idx = Math.floor(raw);
        const frac = raw - idx;
        const from = worldRoute[idx % totalLen];
        const to = worldRoute[(idx + 1) % totalLen];

        groupRef.current.position.lerpVectors(from, to, frac);
        const dir = new THREE.Vector3().subVectors(to, from).normalize();
        if (dir.length() > 0.001) {
            groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
        }
    });

    return (
        <group ref={groupRef}>
            <CarBody color={color} />
            <pointLight position={[0, 0.3, 0.35]} intensity={0.15} distance={1.5} color="#ffffcc" />
        </group>
    );
};

const Explosion = ({ position, onDone }) => {
    const groupRef = useRef();
    const startRef = useRef(null);
    const doneRef = useRef(false);
    const particles = useMemo(() => Array.from({ length: 22 }, (_, index) => {
        const angle = (index / 22) * Math.PI * 2;
        return {
            angle,
            speed: 0.45 + (index % 4) * 0.2,
            lift: 0.22 + (index % 5) * 0.1,
            color: index % 3 === 0 ? '#ffcc33' : (index % 3 === 1 ? '#ff5b23' : '#1c1c1c'),
        };
    }), []);

    useFrame((state) => {
        if (startRef.current === null) startRef.current = state.clock.elapsedTime;
        const age = state.clock.elapsedTime - startRef.current;
        if (groupRef.current) {
            const pulse = Math.max(0, 1 - age / 2.8);
            groupRef.current.scale.setScalar(1 + age * 1.25);
            groupRef.current.children.forEach((child) => {
                if (child.material) child.material.opacity = Math.max(0, pulse);
            });
        }
        if (age > 3 && !doneRef.current) {
            doneRef.current = true;
            onDone?.();
        }
    });

    return (
        <group position={position} ref={groupRef}>
            <pointLight color="#ff6b1a" intensity={5} distance={6} />
            <mesh position={[0, 0.25, 0]}>
                <sphereGeometry args={[0.5, 18, 18]} />
                <meshBasicMaterial color="#ff8c1a" transparent opacity={0.85} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                <ringGeometry args={[0.55, 0.9, 48]} />
                <meshBasicMaterial color="#ffdd55" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
            {particles.map((particle, index) => (
                <mesh
                    key={index}
                    position={[
                        Math.cos(particle.angle) * particle.speed,
                        particle.lift,
                        Math.sin(particle.angle) * particle.speed,
                    ]}
                    rotation={[particle.angle, particle.angle * 0.4, particle.angle * 0.7]}
                >
                    <boxGeometry args={[0.11, 0.07, 0.16]} />
                    <meshBasicMaterial color={particle.color} transparent opacity={0.9} />
                </mesh>
            ))}
        </group>
    );
};

const FlyingCrashCars = ({ center }) => {
    const startRef = useRef(null);
    const carARef = useRef();
    const carBRef = useRef();

    useFrame((state) => {
        if (startRef.current === null) startRef.current = state.clock.elapsedTime;
        const age = state.clock.elapsedTime - startRef.current;
        const throwA = new THREE.Vector3(-1.6 - age * 0.75, 0.35 + age * 0.35, -0.75 - age * 0.2);
        const throwB = new THREE.Vector3(1.55 + age * 0.65, 0.42 + age * 0.42, 0.75 + age * 0.24);
        if (carARef.current) {
            carARef.current.position.copy(center).add(throwA);
            carARef.current.rotation.set(age * 4.5, Math.PI / 2 + age * 3.6, age * 5.2);
        }
        if (carBRef.current) {
            carBRef.current.position.copy(center).add(throwB);
            carBRef.current.rotation.set(-age * 4.2, -Math.PI / 2 - age * 3.2, -age * 4.8);
        }
    });

    return (
        <>
            <group ref={carARef}>
                <CarBody color="#e33d2e" />
            </group>
            <group ref={carBRef}>
                <CarBody color="#1d5bd6" />
            </group>
        </>
    );
};

const DemoCrash = () => {
    const [phase, setPhase] = useState('waiting');
    const [eventId, setEventId] = useState(0);
    const phaseRef = useRef('waiting');
    const nextCrashAtRef = useRef(null);
    const firstCrashDoneRef = useRef(false);
    const carARef = useRef();
    const carBRef = useRef();

    const crashPath = useMemo(() => {
        const [ax, az] = toWorld(84, 3);
        const [bx, bz] = toWorld(58, 25);
        const [cx, cz] = toWorld(71, 14);
        return {
            aStart: new THREE.Vector3(ax, 0.18, az),
            bStart: new THREE.Vector3(bx, 0.18, bz),
            center: new THREE.Vector3(cx, 0.22, cz),
        };
    }, []);

    const scheduleNext = (now) => {
        const guaranteedDelay = firstCrashDoneRef.current ? 16 + Math.random() * 26 : 20;
        nextCrashAtRef.current = now + guaranteedDelay;
        phaseRef.current = 'waiting';
        setPhase('waiting');
    };

    const finishCrash = () => {
        nextCrashAtRef.current = null;
        phaseRef.current = 'waiting';
        setPhase('waiting');
    };

    useFrame((state) => {
        const now = state.clock.elapsedTime;
        if (nextCrashAtRef.current === null) scheduleNext(now);

        if (phaseRef.current === 'waiting' && now >= nextCrashAtRef.current) {
            if (!firstCrashDoneRef.current || Math.random() < 0.42) {
                phaseRef.current = 'driving';
                setPhase('driving');
                setEventId((id) => id + 1);
                return;
            }
            nextCrashAtRef.current = now + 8 + Math.random() * 14;
        }

        if (phaseRef.current !== 'driving') return;
        const elapsed = now - nextCrashAtRef.current;
        const t = Math.min(1, elapsed / 2.2);
        const eased = t * t * (3 - 2 * t);
        carARef.current?.position.lerpVectors(crashPath.aStart, crashPath.center, eased);
        carBRef.current?.position.lerpVectors(crashPath.bStart, crashPath.center, eased);
        if (carARef.current) carARef.current.rotation.y = Math.PI * 0.75;
        if (carBRef.current) carBRef.current.rotation.y = -Math.PI * 0.25;

        if (t >= 1) {
            firstCrashDoneRef.current = true;
            phaseRef.current = 'boom';
            setPhase('boom');
        }
    });

    return (
        <group key={eventId}>
            {phase === 'driving' && (
                <>
                    <group ref={carARef} position={crashPath.aStart}>
                        <CarBody color="#e33d2e" />
                    </group>
                    <group ref={carBRef} position={crashPath.bStart}>
                        <CarBody color="#1d5bd6" />
                    </group>
                </>
            )}
            {phase === 'boom' && (
                <>
                    <FlyingCrashCars center={crashPath.center} />
                    <Explosion
                        position={[crashPath.center.x, 0.3, crashPath.center.z]}
                        onDone={finishCrash}
                    />
                </>
            )}
        </group>
    );
};

// ============================================================
// PARKED CAR (estático en la playa)
// ============================================================
const ParkedCar = ({ top, left, rot, color, editorMeta, onSelect, selected }) => {
    const [x, z] = toWorld(top, left);
    const handleClick = (event) => {
        if (!onSelect || !editorMeta) return;
        event.stopPropagation();
        onSelect(editorMeta);
    };
    return (
        <group position={[x, 0.15, z]} rotation={[0, rot || 0, 0]} onClick={handleClick}>
            {selected && <SelectionHalo width={0.75} depth={0.75} />}
            <CarBody color={color} />
        </group>
    );
};

// ============================================================
// TRAFFIC + PARKED LAYER
// ============================================================
const TrafficLayer = ({ roadRoutes, parkedCars, editorMode, onEditorSelect, selectedEditorItem, mostrarAutos = 'reducido' }) => {
    const actualModo = editorMode ? 'completo' : mostrarAutos;
    const carCount = useMemo(() => {
        const defaultCount = getCarCount();
        if (actualModo === 'ninguno') return 0;
        if (actualModo === 'reducido') return Math.max(4, Math.ceil(defaultCount * 0.3));
        return defaultCount;
    }, [actualModo]);
    const visibleParkedCars = useMemo(() => {
        const sourceCars = (parkedCars && parkedCars.length > 0) ? parkedCars : PARKED_CARS_ALIGNED;
        if (actualModo === 'ninguno') return [];
        if (actualModo === 'reducido') {
            return sourceCars.filter((_, idx) => idx % 3 === 0);
        }
        return sourceCars;
    }, [parkedCars, actualModo]);

    const movingCars = useMemo(() => {
        const result = [];
        if (!roadRoutes.length) return result;
        for (let i = 0; i < carCount; i++) {
            const routeIdx = i % roadRoutes.length;
            const route = roadRoutes[routeIdx];
            result.push({
                id: i, route,
                speed: 0.12 + (i * 0.015),
                offset: (i * route.length / carCount) % route.length,
                color: CAR_COLORS[i % CAR_COLORS.length],
            });
        }
        return result;
    }, [carCount, roadRoutes]);

    return (
        <group>
            {movingCars.map(car => <MovingCar key={car.id} {...car} />)}
            {!editorMode && actualModo !== 'ninguno' && <DemoCrash />}
            {visibleParkedCars.map((car, i) => <ParkedCar key={`p${i}`} {...car}
                editorMeta={editorMode ? { group: 'parkedCars', index: i } : null}
                onSelect={onEditorSelect}
                selected={isSelected(selectedEditorItem, 'parkedCars', i)} />)}
        </group>
    );
};

// ============================================================
// SECTOR NODE MARKER
// ============================================================
const SectorMarker = ({ sector, onEstacionar, isRecommended, positionOverride, editorMode, editorMeta, onEditorSelect, selected }) => {
    const groupRef = useRef();
    const ringRef = useRef();
    const glowRef = useRef();
    const [hovered, setHover] = useState(false);

    const estaLleno = sector.lugaresLibres === 0;
    const [nodeX, nodeZ] = toWorld(positionOverride?.top || 50, positionOverride?.left || 50);
    const pos = [nodeX, positionOverride?.height ?? 0.4, nodeZ];
    const occ = sector.capacidadTotal > 0 ? (sector.capacidadTotal - sector.lugaresLibres) / sector.capacidadTotal : 0;
    const baseColor = estaLleno ? "#ff2244" : (occ > 0.7 ? "#ffaa00" : "#00ff66");
    const glowColor = isRecommended ? "#00ffff" : baseColor;

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current) groupRef.current.position.y = pos[1] + Math.sin(t * 1.5 + pos[0]) * 0.08;
        if (ringRef.current) {
            ringRef.current.rotation.z = t * (isRecommended ? 2 : 0.5);
            const s = isRecommended ? 1.3 + Math.sin(t * 4) * 0.2 : 1;
            ringRef.current.scale.set(s, s, s);
        }
        if (glowRef.current) {
            glowRef.current.material.opacity = 0.15 + Math.sin(t * 3) * 0.1;
            const gs = (hovered ? 2.5 : 1.8) + Math.sin(t * 2) * 0.3;
            glowRef.current.scale.set(gs, gs, gs);
        }
    });

    return (
        <group position={pos}>
            <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <circleGeometry args={[1, 32]} />
                <meshBasicMaterial color={glowColor} transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.65, 0.75, 32]} />
                <meshBasicMaterial color={glowColor} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
            <group ref={groupRef}>
                <mesh onClick={(event) => {
                    event.stopPropagation();
                    if (editorMode && onEditorSelect && editorMeta) {
                        onEditorSelect(editorMeta);
                        return;
                    }
                    if (!estaLleno) onEstacionar(sector.id);
                }}
                    onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)} castShadow>
                    <cylinderGeometry args={[0.45, 0.55, 0.5, 6]} />
                    <meshStandardMaterial color={baseColor} emissive={glowColor}
                        emissiveIntensity={selected ? 4 : (isRecommended ? 3 : (hovered ? 2 : 1))}
                        transparent opacity={0.92} roughness={0.15} metalness={0.9} />
                </mesh>
                <mesh position={[0, 0.26, 0]}>
                    <cylinderGeometry args={[0.35, 0.45, 0.04, 6]} />
                    <meshStandardMaterial color="#ffffff" emissive={glowColor}
                        emissiveIntensity={1.5} transparent opacity={0.5} roughness={0.1} metalness={1} />
                </mesh>
            </group>
            <pointLight position={[0, 0.8, 0]} color={glowColor}
                intensity={isRecommended ? 2 : (hovered ? 1.2 : 0.4)} distance={3} />
            <Html position={[0, 1.4, 0]} center style={{ pointerEvents: 'none' }}>
                <div style={{
                    background: 'rgba(0,4,20,0.85)', backdropFilter: 'blur(8px)', color: 'white',
                    padding: '6px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: 'bold',
                    whiteSpace: 'nowrap', fontFamily: "'Segoe UI', sans-serif",
                    border: `1px solid ${glowColor}`,
                    boxShadow: `0 0 12px ${glowColor}40, 0 0 30px ${glowColor}20`,
                    transform: hovered || isRecommended ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
                }}>
                    <span style={{ fontSize: '16px', marginRight: '4px' }}>
                        {estaLleno ? '🔴' : (occ > 0.7 ? '🟡' : '🟢')}
                    </span>
                    {sector.lugaresLibres}/{sector.capacidadTotal}
                    {isRecommended && <span style={{ marginLeft: '6px', fontSize: '14px' }}>⭐</span>}
                </div>
                <div style={{ color: '#8fbfff', fontSize: '10px', textAlign: 'center', marginTop: '3px',
                    textShadow: '0 0 8px rgba(0,136,255,0.5)' }}>
                    {sector.nombre}
                </div>
            </Html>
        </group>
    );
};

// ============================================================
// TRAFFIC HUD
// ============================================================
const TrafficHud = ({ parkedCount }) => {
    const level = getTrafficLevel();
    const h = new Date().getHours(), m = new Date().getMinutes();
    const colors = { ALTO: '#ff3344', MEDIO: '#ffaa00', BAJO: '#00ff66' };
    const labels = { ALTO: 'HORA PICO', MEDIO: 'TRÁFICO MODERADO', BAJO: 'TRÁFICO BAJO' };

    return (
        <Html position={[MAP_WIDTH / 2 - 1, 8, -MAP_HEIGHT / 2 + 1]} center style={{ pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(0,4,20,0.8)', backdropFilter: 'blur(10px)',
                padding: '10px 18px', borderRadius: '12px', border: `1px solid ${colors[level]}`,
                boxShadow: `0 0 20px ${colors[level]}30`, fontFamily: "'Segoe UI', sans-serif",
                textAlign: 'center', minWidth: '140px' }}>
                <div style={{ color: colors[level], fontWeight: '900', fontSize: '13px', letterSpacing: '2px' }}>{labels[level]}</div>
                <div style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '4px 0' }}>
                    {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
                </div>
                <div style={{ color: '#aaa', fontSize: '10px' }}>Autos: {getCarCount()} en transito · {parkedCount} estacionados</div>
            </div>
        </Html>
    );
};

// ============================================================
// CAMERA FOCUS CONTROLLER
// ============================================================
const CameraFocus = ({ recommendedSectorId, sectores, sectorNodes, controlsRef }) => {
    const { camera } = useThree();
    const [targetPos, setTargetPos] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (recommendedSectorId && sectores.length > 0) {
            const sector = sectores.find(s => s.id === recommendedSectorId);
            if (sector) {
                const sectorName = String(sector.nombre || sector.id || '').toLowerCase();
                const nodeIndex = sectorNodes.findIndex(n => {
                    const nid = String(n.id || '').toLowerCase();
                    return sectorName.includes(nid) || nid.includes(sectorName);
                });
                const node = nodeIndex >= 0 ? sectorNodes[nodeIndex] : null;
                if (node) {
                    const [x, z] = toWorld(node.top || 50, node.left || 50);
                    setTargetPos(new THREE.Vector3(x, 0, z));
                    setIsAnimating(true);
                }
            }
        } else {
            setIsAnimating(false);
        }
    }, [recommendedSectorId, sectores, sectorNodes]);

    useEffect(() => {
        const controls = controlsRef.current;
        if (controls) {
            const cancelAnim = () => setIsAnimating(false);
            controls.addEventListener('start', cancelAnim);
            return () => controls.removeEventListener('start', cancelAnim);
        }
    }, [controlsRef]);

    useFrame(() => {
        if (isAnimating && targetPos && controlsRef.current) {
            controlsRef.current.target.lerp(targetPos, 0.06);
            const idealCamPos = new THREE.Vector3(targetPos.x, 9, targetPos.z + 14);
            camera.position.lerp(idealCamPos, 0.04);
            
            if (controlsRef.current.target.distanceTo(targetPos) < 0.1 && camera.position.distanceTo(idealCamPos) < 0.1) {
                setIsAnimating(false);
            }
        }
    });
    return null;
};

// ============================================================
// EXPORT
// ============================================================
export const ParkingMap3D = ({
    sectores,
    onEstacionar,
    recommendedSectorId,
    editorMode = false,
    editorState = {},
    onEditorMapClick,
    onEditorSelect,
    selectedEditorItem,
    showLabels,
    textureUrl = '/mapa-texture.jpg',
    mostrarAutos = 'reducido',
}) => {
    const buildings = editorState.buildings || CAMPUS_BUILDINGS;
    const greenAreas = editorState.greenAreas || CAMPUS_GREEN_AREAS;
    const trees = editorState.trees || CAMPUS_TREES;
    const roadRoutes = editorState.roadRoutes || ROAD_ROUTES;
    const parkedCars = editorState.parkedCars || PARKED_CARS;
    const driveZones = editorState.driveZones || [];
    const blockedZones = editorState.blockedZones || [];
    const sectorNodes = editorState.sectorNodes || Object.entries(SECTOR_POSITIONS).map(([id, pos]) => ({ id, label: id, ...pos }));
    const sectorPositions = sectorNodes.reduce((acc, node) => ({ ...acc, [node.id]: node }), {});
    
    const controlsRef = useRef();

    return (
        <>
            <ambientLight intensity={0.28} color="#ccddff" />
            <hemisphereLight args={['#cfe9ff', '#0f1824', 0.35]} />
            <directionalLight position={[12, 25, 10]} intensity={0.95} castShadow
                shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <pointLight position={[-12, 12, -12]} intensity={0.4} color="#0055ff" />
            <pointLight position={[12, 8, 12]} intensity={0.3} color="#ff4400" />
            <fog attach="fog" args={['#000814', 20, 50]} />

            <Ground editorMode={editorMode} onEditorMapClick={onEditorMapClick} textureUrl={textureUrl} />
            <Campus3DLayer
                buildings={buildings}
                greenAreas={greenAreas}
                trees={trees}
                driveZones={editorMode ? driveZones : []}
                blockedZones={editorMode ? blockedZones : []}
                onEditorSelect={editorMode ? onEditorSelect : null}
                selectedEditorItem={selectedEditorItem}
                showLabels={showLabels}
            />
            <NeonGrid />
            <GraphLayer sectorPositions={sectorPositions} />
            {editorMode && <EditorRouteLayer roadRoutes={roadRoutes} />}
            <TrafficLayer
                roadRoutes={roadRoutes}
                parkedCars={parkedCars}
                editorMode={editorMode}
                onEditorSelect={onEditorSelect}
                selectedEditorItem={selectedEditorItem}
                mostrarAutos={mostrarAutos}
            />

            {sectores.map(sector => {
                const sectorName = String(sector.nombre || sector.id || '').toLowerCase();
                const nodeIndex = sectorNodes.findIndex((node) => {
                    const nid = String(node.id || '').toLowerCase();
                    return sectorName.includes(nid) || nid.includes(sectorName);
                });
                const node = nodeIndex >= 0 ? sectorNodes[nodeIndex] : null;
                return (
                    <SectorMarker key={sector.id} sector={sector}
                        positionOverride={node}
                        editorMode={editorMode}
                        editorMeta={node ? { group: 'sectorNodes', index: nodeIndex } : null}
                        onEditorSelect={onEditorSelect}
                        selected={isSelected(selectedEditorItem, 'sectorNodes', nodeIndex)}
                        onEstacionar={editorMode ? () => {} : onEstacionar}
                        isRecommended={sector.id === recommendedSectorId} />
                );
            })}

            <TrafficHud parkedCount={parkedCars.length} />

            <CameraFocus recommendedSectorId={recommendedSectorId} sectores={sectores} sectorNodes={sectorNodes} controlsRef={controlsRef} />

            <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate
                minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.3}
                minDistance={5} maxDistance={40} enableDamping dampingFactor={0.05} />
        </>
    );
};
