import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera } from '@react-three/drei';
import { Shape3D } from './shapes/Shapes';

export function Scene3D({ shapeType, params, color }) {
    return (
        <div className="scene-container">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[15, 10, 15]} fov={50} />

                {/* Yorug'lik */}
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={1}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#60a5fa" />

                {/* Environment */}
                <Environment preset="city" />

                {/* 3D Shakl */}
                <Shape3D type={shapeType} params={params} color={color} />

                {/* Grid */}
                <Grid
                    infiniteGrid
                    fadeDistance={50}
                    fadeStrength={5}
                    cellSize={1}
                    cellColor="#404040"
                    sectionSize={5}
                    sectionColor="#606060"
                />

                {/* Koordinata o'qlari */}
                <axesHelper args={[10]} />

                {/* Boshqaruv */}
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={50}
                />
            </Canvas>
        </div>
    );
}
