import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { View, StyleSheet } from 'react-native';
import * as THREE from 'three';
import {
    MAP_WIDTH, MAP_HEIGHT, SECTOR_POSITIONS, toWorld,
    CAMPUS_BUILDINGS, CAMPUS_GREEN_AREAS, CAMPUS_TREES, ROAD_ROUTES, CAR_COLORS
} from './ParkingData';

// ============================================================
// COMPONENTS
// ============================================================
const Ground = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[MAP_WIDTH + 4, MAP_HEIGHT + 4]} />
        <meshStandardMaterial color="#00152b" roughness={0.8} />
    </mesh>
);

const Building3D = ({ top, left, width, depth, height, rot = 0, color, roofColor }) => {
    const [x, z] = toWorld(top, left);
    return (
        <group position={[x, height / 2, z]} rotation={[0, rot, 0]}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={color} roughness={0.62} metalness={0.08} />
            </mesh>
            <mesh position={[0, height / 2 + 0.045, 0]} castShadow receiveShadow>
                <boxGeometry args={[width * 1.08, 0.09, depth * 1.08]} />
                <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.12} />
            </mesh>
        </group>
    );
};

const GreenArea3D = ({ top, left, width, depth, rot = 0, color }) => {
    const [x, z] = toWorld(top, left);
    return (
        <group position={[x, 0.018, z]} rotation={[0, rot, 0]}>
            <mesh receiveShadow>
                <boxGeometry args={[width, 0.035, depth]} />
                <meshStandardMaterial color={color} roughness={0.9} metalness={0} transparent opacity={0.78} />
            </mesh>
        </group>
    );
};

const Tree3D = ({ top, left, scale = 1 }) => {
    const [x, z] = toWorld(top, left);
    return (
        <group position={[x, 0, z]} scale={[scale, scale, scale]}>
            <mesh position={[0, 0.16, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.05, 0.32, 7]} />
                <meshStandardMaterial color="#684529" roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
                <sphereGeometry args={[0.22, 10, 8]} />
                <meshStandardMaterial color="#1f7a43" roughness={0.78} />
            </mesh>
        </group>
    );
};

const SectorMarker = ({ sector, isRecommended, node }) => {
    const groupRef = useRef();
    const [nodeX, nodeZ] = toWorld(node?.top || 50, node?.left || 50);
    const pos = [nodeX, 0.4, nodeZ];
    const occ = sector.capacidadTotal > 0 ? (sector.capacidadTotal - sector.lugaresLibres) / sector.capacidadTotal : 0;
    const baseColor = sector.lugaresLibres === 0 ? "#ff2244" : (occ > 0.7 ? "#ffaa00" : "#00ff66");
    const glowColor = isRecommended ? "#00ffff" : baseColor;

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current) groupRef.current.position.y = pos[1] + Math.sin(t * 1.5 + pos[0]) * 0.08;
    });

    return (
        <group position={pos} ref={groupRef}>
            <mesh castShadow>
                <cylinderGeometry args={[0.45, 0.55, 0.5, 6]} />
                <meshStandardMaterial color={baseColor} emissive={glowColor} emissiveIntensity={isRecommended ? 3 : 1} />
            </mesh>
            <pointLight position={[0, 0.8, 0]} color={glowColor} intensity={isRecommended ? 2 : 0.4} distance={3} />
        </group>
    );
};

export default function ParkingMap3D({ sectoresLibres = [], sectores = [], recommendedSectorId }) {
    const sectorNodes = Object.entries(SECTOR_POSITIONS).map(([id, pos]) => ({ id, label: id, ...pos }));

    return (
        <View style={styles.container}>
            <Canvas camera={{ position: [0, 8, 14], fov: 45 }}>
                <ambientLight intensity={0.28} color="#ccddff" />
                <hemisphereLight args={['#cfe9ff', '#0f1824', 0.35]} />
                <directionalLight position={[12, 25, 10]} intensity={0.95} />
                
                <Ground />

                {CAMPUS_GREEN_AREAS.map(a => <GreenArea3D key={a.id} {...a} />)}
                {CAMPUS_BUILDINGS.map(b => <Building3D key={b.id} {...b} />)}
                {CAMPUS_TREES.map(t => <Tree3D key={t.id} {...t} />)}

                {sectores.map(sector => {
                    const sectorName = sector.nombre.toLowerCase();
                    const nodeIndex = sectorNodes.findIndex((node) => sectorName.includes(node.id));
                    const node = nodeIndex >= 0 ? sectorNodes[nodeIndex] : null;
                    return (
                        <SectorMarker key={sector.id} sector={sector} node={node} isRecommended={sector.id === recommendedSectorId} />
                    );
                })}
            </Canvas>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000814',
    }
});
