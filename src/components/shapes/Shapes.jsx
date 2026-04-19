import { useMemo } from 'react';
import * as THREE from 'three';

// Prizma komponenti
export function Prism({ sides = 6, radius = 3, height = 5, color = "#4f46e5" }) {
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        shape.closePath();

        const extrudeSettings = {
            steps: 1,
            depth: height,
            bevelEnabled: false
        };

        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, [sides, radius, height]);

    return (
        <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2, 0]}>
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>
    );
}

// Piramida komponenti
export function Pyramid({ sides = 4, radius = 3, height = 5, color = "#10b981" }) {
    const geometry = useMemo(() => {
        const geo = new THREE.ConeGeometry(radius, height, sides);
        return geo;
    }, [sides, radius, height]);

    return (
        <mesh geometry={geometry} position={[0, 0, 0]}>
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>
    );
}

// Silindr komponenti
export function Cylinder({ radius = 3, height = 5, color = "#f59e0b" }) {
    return (
        <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[radius, radius, height, 32]} />
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>
    );
}

// Konus komponenti
export function Cone({ radius = 3, height = 5, color = "#ef4444" }) {
    return (
        <mesh position={[0, 0, 0]}>
            <coneGeometry args={[radius, height, 32]} />
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>
    );
}

// Shar komponenti
export function Sphere({ radius = 3, color = "#8b5cf6" }) {
    return (
        <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>
    );
}

// Shaklni tanlash uchun wrapper komponent
export function Shape3D({ type, params, color }) {
    const components = {
        prism: Prism,
        pyramid: Pyramid,
        cylinder: Cylinder,
        cone: Cone,
        sphere: Sphere
    };

    const Component = components[type];

    if (!Component) return null;

    return <Component {...params} color={color} />;
}
