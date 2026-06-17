import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera, Text, Line, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// O'lchov birliklari
const UNITS = {
    mm: { name: 'Millimetr', symbol: 'mm', factor: 0.001 },
    sm: { name: 'Santimetr', symbol: 'sm', factor: 0.01 }
};

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// 3D Piramida komponenti
function Piramida3D({
    sides,
    sideLength,
    height,
    tiltAngle,
    showWireframe,
    showDimensions,
    fillColor,
    showAngles,
    showHeight,
    showApothem,
    showBaseDiagonals,
    showMedians,
    unitSymbol
}) {
    const radius = sideLength / (2 * Math.sin(Math.PI / sides));
    const apothem = radius * Math.cos(Math.PI / sides);

    const baseVertices = useMemo(() => {
        const verts = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            verts.push({ x, y: z });
        }
        return verts;
    }, [sides, radius]);

    const geometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        // Asos cho'qqilari
        for (let i = 0; i < sides; i++) {
            vertices.push(baseVertices[i].x, 0, baseVertices[i].y);
        }

        // Cho'qqi (apex)
        const apexIndex = sides;
        vertices.push(0, height, 0);

        // Asos indekslari (fan triangulation)
        for (let i = 1; i < sides - 1; i++) {
            indices.push(0, i, i + 1);
        }

        // Yon yuzalar (har bir uchburchak)
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            indices.push(i, next, apexIndex);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
    }, [sides, height, baseVertices]);

    // Og'ish burchagi (radianlar)
    const tiltRad = (tiltAngle * Math.PI) / 180;

    // Material color based on fill type
    const materialColor = fillColor === 'gradient' ? '#10b981' : fillColor;

    return (
        <group rotation={[tiltRad, 0, 0]}>
            {/* Solid mesh */}
            <mesh
                geometry={geometry}
                position={[0, -height / 2, 0]}
            >
                <meshStandardMaterial
                    color={materialColor}
                    transparent
                    opacity={showWireframe ? 0.15 : 0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Wireframe overlay */}
            <mesh
                geometry={geometry}
                position={[0, -height / 2, 0]}
            >
                <meshBasicMaterial color="#34d399" wireframe />
            </mesh>

            {/* Height Line */}
            {showHeight && (
                <group>
                    <Line
                        points={[[0, -height/2, 0], [0, height/2, 0]]}
                        color="#f59e0b"
                        lineWidth={2}
                        transparent
                        opacity={0.8}
                        dashScale={2}
                    />
                    <Billboard position={[0, 0, 0]}>
                        <Text
                            fontSize={0.4}
                            color="#f59e0b"
                            anchorX="center"
                            anchorY="middle"
                        >
                            h = {height} {unitSymbol}
                        </Text>
                    </Billboard>
                </group>
            )}

            {/* Base Diagonals */}
            {showBaseDiagonal && (
                <group>
                    {baseVertices.map((vertex, i) => {
                        const diagonals = [];
                        for (let j = i + 2; j < sides; j++) {
                            if (i === 0 && j === sides - 1) continue;
                            const target = baseVertices[j];
                            diagonals.push(
                                <Line
                                    key={`diag-base-${i}-${j}`}
                                    points={[
                                        [vertex.x, -height/2, vertex.y],
                                        [target.x, -height/2, target.y]
                                    ]}
                                    color="#ec4899"
                                    lineWidth={2}
                                    transparent
                                    opacity={0.6}
                                    dashScale={3}
                                />
                            );
                        }
                        return <group key={`base-diagonals-${i}`}>{diagonals}</group>;
                    })}
                </group>
            )}

            {/* Apothem */}
            {showApothem && (
                <group>
                    {baseVertices.map((vertex, i) => {
                        const nextVertex = baseVertices[(i + 1) % sides];
                        const midX = (vertex.x + nextVertex.x) / 2;
                        const midY = (vertex.y + nextVertex.y) / 2;

                        return (
                            <group key={`apothem-${i}`}>
                                <Line
                                    points={[[0, -height/2, 0], [midX, -height/2, midY]]}
                                    color="#06b6d4"
                                    lineWidth={2}
                                    transparent
                                    opacity={0.8}
                                    dashScale={2}
                                />
                                {/* Slant height (Apotema piramida) */}
                                <Line
                                    points={[[0, height/2, 0], [midX, -height/2, midY]]}
                                    color="#3b82f6"
                                    lineWidth={2}
                                    transparent
                                    opacity={0.8}
                                    dashScale={2}
                                />
                            </group>
                        );
                    })}
                </group>
            )}

            {/* Medians */}
            {showMedians && (
                <group>
                    {baseVertices.map((vertex, i) => (
                        <group key={`median-${i}`}>
                            <Line
                                points={[
                                    [vertex.x, -height/2, vertex.y],
                                    [0, -height/2, 0]
                                ]}
                                color="#22c55e"
                                lineWidth={2}
                                transparent
                                opacity={0.7}
                                dashScale={2}
                            />
                        </group>
                    ))}
                </group>
            )}

            {/* Angles */}
            {showAngles && (
                <group>
                    {baseVertices.map((vertex, i) => {
                        const nextVertex = baseVertices[(i + 1) % sides];
                        const anglePos = [
                            (vertex.x + nextVertex.x) * 0.4,
                            -height/2,
                            (vertex.y + nextVertex.y) * 0.4
                        ];
                        return (
                            <Billboard key={`angle-${i}`} position={anglePos}>
                                <Text
                                    fontSize={0.25}
                                    color="#8b5cf6"
                                    anchorX="center"
                                    anchorY="middle"
                                >
                                    {(180 * (sides - 2) / sides).toFixed(0)}°
                                </Text>
                            </Billboard>
                        );
                    })}
                </group>
            )}
        </group>
    );
}

export function PiramidaPage() {
    // Parametrlar
    const [sides, setSides] = useState(4);
    const [sideLength, setSideLength] = useState(6);
    const [height, setHeight] = useState(8);
    const [tiltAngle, setTiltAngle] = useState(0);
    const [unit, setUnit] = useState('sm');

    // Birlik o'zgartirish funksiyasi
    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setSideLength(prev => Math.round(prev * ratio * 100) / 100);
        setHeight(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };

    // Vizualizatsiya sozlamalari
    const [showWireframe, setShowWireframe] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [showAxes, setShowAxes] = useState(true);
    const [showAngles, setShowAngles] = useState(false);
    const [showHeight, setShowHeight] = useState(false);
    const [showApothem, setShowApothem] = useState(false);
    const [showBaseDiagonal, setShowBaseDiagonal] = useState(false);
    const [showSpaceDiagonal, setShowSpaceDiagonal] = useState(false);
    const [showMedians, setShowMedians] = useState(false);

    // Hisob-kitoblar modali
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [calcModalClosing, setCalcModalClosing] = useState(false);
    // Modalni yopilish animatsiyasi bilan yopadi (260ms exit, keyin unmount)
    const closeCalcModal = () => {
        if (calcModalClosing) return;
        setCalcModalClosing(true);
        setTimeout(() => { setCalcModalClosing(false); setShowCalcModal(false); }, 260);
    };
    const [selectedCalc, setSelectedCalc] = useState(null);

    // Fullscreen
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);
    const [activeTool, setActiveTool] = useState('view');
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [drawings, setDrawings] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [penColor, setPenColor] = useState('#6366f1');
    const [penSize, setPenSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(15);
    const [isDrawing, setIsDrawing] = useState(false);
    const [rotateSpeed, setRotateSpeed] = useState(2);
    const [piramidaFillColor, setPiramidaFillColor] = useState('gradient');
    const [toast, setToast] = useState({ show: false, message: '' });
    const canvasContainerRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const controlsRef = useRef(null);
    const scenePanelRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState(() =>
        typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : { width: 1200, height: 800 }
    );
    const drawMode = activeTool === 'pen' || activeTool === 'eraser';

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showCalcModal) {
                    setShowCalcModal(false);
                    return;
                }
                if (isFullscreen) {
                    setIsFullscreen(false);
                    return;
                }
            }
            // Pro Shortcuts
            if (isFullscreen) {
                if (e.key.toLowerCase() === 'v') setActiveTool('view');
                if (e.key.toLowerCase() === 'p') setActiveTool('pen');
                if (e.key.toLowerCase() === 'e') setActiveTool('eraser');
                if (e.key.toLowerCase() === 'l') setIsLocked(prev => !prev);
                if (e.key.toLowerCase() === 'r') resetCamera();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, showCalcModal]);

    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    // Chizish funksiyalari
    useEffect(() => {
        const updateSize = () => {
            if (isFullscreen) {
                setCanvasSize({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            } else if (canvasContainerRef.current) {
                setCanvasSize({
                    width: canvasContainerRef.current.clientWidth,
                    height: canvasContainerRef.current.clientHeight
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [isFullscreen]);

    useEffect(() => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        
        drawings.forEach(d => {
            if (d.points.length < 2) return;
            if (d.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = d.size;
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = d.color;
                ctx.lineWidth = d.size;
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(d.points[0].x, d.points[0].y);
            d.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        });

        if (currentPath.length > 1) {
            if (activeTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = eraserSize;
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = penColor;
                ctx.lineWidth = penSize;
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
        ctx.restore();
    }, [drawings, currentPath, penColor, penSize, eraserSize, activeTool]);

    const getRelativeCoords = (e) => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches?.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches?.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleDrawStart = (e) => {
        if (activeTool === 'pen' || activeTool === 'eraser') {
            setIsDrawing(true);
            const coords = getRelativeCoords(e);
            setCurrentPath([coords]);
        }
    };

    const handleDrawMove = (e) => {
        if (isDrawing && (activeTool === 'pen' || activeTool === 'eraser')) {
            const coords = getRelativeCoords(e);
            setCurrentPath(prev => [...prev, coords]);
        }
    };

    const handleDrawEnd = () => {
        if (isDrawing && currentPath.length > 1) {
            setDrawings(prev => [...prev, { 
                points: currentPath, 
                color: penColor, 
                size: activeTool === 'eraser' ? eraserSize : penSize, 
                isEraser: activeTool === 'eraser' 
            }]);
        }
        setIsDrawing(false);
        setCurrentPath([]);
    };
    
    const clearAllDrawings = () => {
        setDrawings([]);
        setCurrentPath([]);
    };

    const resetToInitial = () => {
        setActiveTool('view');
        setIsLocked(false);
        setDrawings([]);
        setCurrentPath([]);
        setPenColor('#6366f1');
        setPenSize(3);
        setIsToolbarOpen(false);
    };

    const resetCamera = () => { if (controlsRef.current) { controlsRef.current.reset(); } };

    const saveDrawing = () => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = `piramida-chizma-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        alert('Chizma rasm sifatida saqlandi!');
    };

    // Hisob-kitoblar
    const calculations = useMemo(() => {
        const n = sides;
        const a = sideLength;
        const h = height;

        // Asos radiusi (circumradius)
        const r = a / (2 * Math.sin(Math.PI / n));

        // Apotema (asos markazidan tomon o'rtasigacha)
        const apothem = r * Math.cos(Math.PI / n);

        // Asos yuzasi
        const baseArea = (n * a * apothem) / 2;

        // Asos perimetri
        const perimeter = n * a;

        // Yon qirra uzunligi (cho'qqidan asos cho'qqisigacha)
        const lateralEdge = Math.sqrt(h * h + r * r);

        // Apotema piramida (cho'qqidan tomon o'rtasigacha - yon yuz balandligi)
        const slantHeight = Math.sqrt(h * h + apothem * apothem);

        // Yon sirt maydoni
        const lateralArea = (perimeter * slantHeight) / 2;

        // To'liq sirt maydoni
        const totalArea = baseArea + lateralArea;

        // Hajm
        const volume = (baseArea * h) / 3;

        return {
            baseArea: baseArea.toFixed(2),
            perimeter: perimeter.toFixed(2),
            lateralArea: lateralArea.toFixed(2),
            totalArea: totalArea.toFixed(2),
            volume: volume.toFixed(2),
            lateralEdge: lateralEdge.toFixed(2),
            slantHeight: slantHeight.toFixed(2),
            apothem: apothem.toFixed(2),
            radius: r.toFixed(2)
        };
    }, [sides, sideLength, height]);

    // Birlik o'zgartirish
    const unitSymbol = UNITS[unit].symbol;
    const renderScale = UNITS[unit].factor / UNITS['sm'].factor;

    return (
        <div className="prizma-page piramida-page">
            {/* Header */}
            <header className="prizma-header">
                <Link to="/3d-models" className="back-btn">
                    ← Orqaga
                </Link>
                <div className="header-title">
                    <h1>△ Piramida</h1>
                    <p>To'g'ri piramida - professional modellashtirish</p>
                </div>
                <UserMenu />
            </header>

            {/* Main Content */}
            <div className="prizma-content">
                {/* Chap Panel - Parametrlar */}
                <aside className="params-panel">
                    <h2>📏 Parametrlar</h2>

                    {/* O'lchov birligi */}
                    <div className="param-group">
                        <label>O'lchov birligi</label>
                        <div className="unit-selector">
                            {Object.entries(UNITS).map(([key, value]) => (
                                <button
                                    key={key}
                                    className={`unit-btn ${unit === key ? 'active' : ''}`}
                                    onClick={() => handleUnitChange(key)}
                                >
                                    {value.symbol}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Burchaklar soni */}
                    <div className="param-group">
                        <label>Burchaklar soni (n)</label>
                        <div className="input-with-visual">
                            <input
                                type="range"
                                min="3"
                                max="12"
                                value={sides}
                                onChange={(e) => setSides(parseInt(e.target.value))}
                            />
                            <div className="input-display">
                                <input
                                    type="number"
                                    min="3"
                                    max="12"
                                    value={sides}
                                    onChange={(e) => setSides(Math.max(3, Math.min(12, parseInt(e.target.value) || 3)))}
                                />
                                <span className="shape-preview">
                                    {sides === 3 ? '△' : sides === 4 ? '□' : sides === 5 ? '⬠' : sides === 6 ? '⬡' : null}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tomon uzunligi */}
                    <div className="param-group">
                        <label>Tomon uzunligi (a)</label>
                        <div className="input-with-unit">
                            <input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.1"
                                value={sideLength}
                                onChange={(e) => setSideLength(parseFloat(e.target.value) || 0.1)}
                            />
                            <span className="unit-label">{unitSymbol}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={sideLength}
                            onChange={(e) => setSideLength(parseFloat(e.target.value))}
                        />
                    </div>

                    {/* Balandlik */}
                    <div className="param-group">
                        <label>Balandlik (h)</label>
                        <div className="input-with-unit">
                            <input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.1"
                                value={height}
                                onChange={(e) => setHeight(parseFloat(e.target.value) || 0.1)}
                            />
                            <span className="unit-label">{unitSymbol}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={height}
                            onChange={(e) => setHeight(parseFloat(e.target.value))}
                        />
                    </div>

                    {/* Og'ish burchagi */}
                    <div className="param-group">
                        <label>Og'ish burchagi (α)</label>
                        <div className="input-with-unit">
                            <input
                                type="number"
                                min="-90"
                                max="90"
                                step="1"
                                value={tiltAngle}
                                onChange={(e) => setTiltAngle(parseFloat(e.target.value) || 0)}
                            />
                            <span className="unit-label">°</span>
                        </div>
                        <input
                            type="range"
                            min="-90"
                            max="90"
                            step="1"
                            value={tiltAngle}
                            onChange={(e) => setTiltAngle(parseFloat(e.target.value))}
                        />
                    </div>

                    {/* Ko'rinish - Professional UI */}
                    <details className="pro-section settings-view-section" open>
                        <summary className="pro-section-header">
                            <div className="pro-section-icon">👁️</div>
                            <span className="pro-section-title">Ko'rinish</span>
                            <span className="pro-section-badge">{[showWireframe, showGrid, showAxes, showAngles, showHeight, showApothem, showBaseDiagonal, showSpaceDiagonal, showMedians].filter(Boolean).length}/9</span>
                            <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </summary>
                        <div className="pro-section-content">
                            <div className="pro-subsection">
                                <h4 className="pro-subsection-title">📐 Asosiy</h4>
                                <div className="pro-toggle-grid-settings">
                                    <button className={`pro-toggle-item ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(!showGrid)}>
                                        <span className="toggle-icon">⊞</span>
                                        <span className="toggle-label">Grid</span>
                                        <span className={`toggle-status ${showGrid ? 'on' : 'off'}`}>{showGrid ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button className={`pro-toggle-item ${showWireframe ? 'active' : ''}`} onClick={() => setShowWireframe(!showWireframe)}>
                                        <span className="toggle-icon">🧊</span>
                                        <span className="toggle-label">Wireframe</span>
                                        <span className={`toggle-status ${showWireframe ? 'on' : 'off'}`}>{showWireframe ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button className={`pro-toggle-item ${showAxes ? 'active' : ''}`} onClick={() => setShowAxes(!showAxes)}>
                                        <span className="toggle-icon">➕</span>
                                        <span className="toggle-label">O'qlar</span>
                                        <span className={`toggle-status ${showAxes ? 'on' : 'off'}`}>{showAxes ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button className={`pro-toggle-item ${showAngles ? 'active' : ''}`} onClick={() => setShowAngles(!showAngles)}>
                                        <span className="toggle-icon">∠</span>
                                        <span className="toggle-label">Burchaklar</span>
                                        <span className={`toggle-status ${showAngles ? 'on' : 'off'}`}>{showAngles ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button className={`pro-toggle-item ${showHeight ? 'active' : ''}`} onClick={() => setShowHeight(!showHeight)}>
                                        <span className="toggle-icon">↕️</span>
                                        <span className="toggle-label">Balandlik</span>
                                        <span className={`toggle-status ${showHeight ? 'on' : 'off'}`}>{showHeight ? 'ON' : 'OFF'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pro-subsection" style={{ marginTop: '16px' }}>
                                <h4 className="pro-subsection-title">✨ Qo'shimcha</h4>
                                <div className="pro-toggle-grid-settings">
                                    <button className={`pro-toggle-item ${showApothem ? 'active' : ''}`} onClick={() => setShowApothem(!showApothem)}>
                                        <span className="toggle-icon">✏️</span>
                                        <span className="toggle-label">Apotema</span>
                                        <span className={`toggle-status ${showApothem ? 'on' : 'off'}`}>{showApothem ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button className={`pro-toggle-item ${showBaseDiagonal ? 'active' : ''}`} onClick={() => setShowBaseDiagonal(!showBaseDiagonal)}>
                                        <span className="toggle-icon">⤡</span>
                                        <span className="toggle-label">Asos diagonali</span>
                                        <span className={`toggle-status ${showBaseDiagonal ? 'on' : 'off'}`}>{showBaseDiagonal ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button className={`pro-toggle-item ${showSpaceDiagonal ? 'active' : ''}`} onClick={() => setShowSpaceDiagonal(!showSpaceDiagonal)}>
                                        <span className="toggle-icon">🔮</span>
                                        <span className="toggle-label">Fazoviy diagonal</span>
                                        <span className={`toggle-status ${showSpaceDiagonal ? 'on' : 'off'}`}>{showSpaceDiagonal ? 'ON' : 'OFF'}</span>
                                    </button>
                                    <button className={`pro-toggle-item ${showMedians ? 'active' : ''}`} onClick={() => setShowMedians(!showMedians)}>
                                        <span className="toggle-icon">📐</span>
                                        <span className="toggle-label">Medianlar</span>
                                        <span className={`toggle-status ${showMedians ? 'on' : 'off'}`}>{showMedians ? 'ON' : 'OFF'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </details>
                </aside>

                {/* Markaz - 3D Sahna */}
                <section className="scene-panel" ref={scenePanelRef} style={{ position: 'relative' }}>
                    <Canvas shadows>
                        <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />

                        <ambientLight intensity={0.4} />
                        <directionalLight position={[10, 15, 5]} intensity={1} castShadow />
                        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#60a5fa" />

                        <Environment preset="city" />

                        <group scale={renderScale}>
                            <Piramida3D
                                sides={sides}
                                sideLength={sideLength}
                                height={height}
                                tiltAngle={tiltAngle}
                                showWireframe={showWireframe}
                                showDimensions={true}
                                fillColor={piramidaFillColor}
                                showAngles={showAngles}
                                showHeight={showHeight}
                                showApothem={showApothem}
                                showBaseDiagonals={showBaseDiagonals}
                                showMedians={showMedians}
                                unitSymbol={unitSymbol}
                            />
                        </group>

                        {showGrid && (
                            <Grid
                                infiniteGrid
                                fadeDistance={50}
                                fadeStrength={5}
                                cellSize={1}
                                cellColor="#404040"
                                sectionSize={5}
                                sectionColor="#606060"
                            />
                        )}

                        {showAxes && <axesHelper args={[10]} />}

                        <OrbitControls
                            enableDamping
                            dampingFactor={0.05}
                            minDistance={5}
                            maxDistance={100}
                        />
                    </Canvas>

                    <button className="fullscreen-toggle-btn" onClick={() => setIsFullscreen(true)} title="To'liq ekran">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    </button>
                </section>

                {/* Fullscreen - 2D Whiteboard Style */}
                {isFullscreen && (
                    <div className="fullscreen-whiteboard" ref={canvasContainerRef}>
                        {/* 3D Canvas - Background */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                            <Canvas shadows>
                                <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />
                                <ambientLight intensity={0.4} />
                                <directionalLight position={[10, 15, 5]} intensity={1} castShadow />
                                <pointLight position={[-10, -10, -10]} intensity={0.3} color="#60a5fa" />
                                <Environment preset="city" />
                                <group scale={renderScale}>
                                    <Piramida3D
                                        sides={sides}
                                        sideLength={sideLength}
                                        height={height}
                                        tiltAngle={tiltAngle}
                                        showWireframe={showWireframe}
                                        showDimensions={true}
                                        fillColor={piramidaFillColor}
                                        showAngles={showAngles}
                                        showHeight={showHeight}
                                        showApothem={showApothem}
                                        showBaseDiagonals={showBaseDiagonals}
                                        showMedians={showMedians}
                                        unitSymbol={unitSymbol}
                                    />
                                </group>
                                {showGrid && (
                                    <Grid infiniteGrid fadeDistance={50} fadeStrength={5} cellSize={1} cellColor="#404040" sectionSize={5} sectionColor="#606060" />
                                )}
                                {showAxes && <axesHelper args={[10]} />}
                                <OrbitControls
                                    ref={controlsRef}
                                    enableDamping
                                    dampingFactor={0.05}
                                    minDistance={5}
                                    maxDistance={150}
                                    autoRotate={autoRotate && !isLocked && !drawMode}
                                    autoRotateSpeed={rotateSpeed}
                                    enableZoom={!isLocked && !drawMode}
                                    enableRotate={!isLocked && !drawMode}
                                    enablePan={!isLocked && !drawMode}
                                />
                            </Canvas>
                        </div>

                        {/* Drawing Canvas Overlay - Foreground */}
                        <canvas
                            ref={drawingCanvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            className="whiteboard-drawing-canvas"
                            onMouseDown={handleDrawStart}
                            onMouseMove={handleDrawMove}
                            onMouseUp={handleDrawEnd}
                            onMouseLeave={handleDrawEnd}
                            onTouchStart={handleDrawStart}
                            onTouchMove={handleDrawMove}
                            onTouchEnd={handleDrawEnd}
                            onTouchCancel={handleDrawEnd}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                zIndex: 10,
                                pointerEvents: drawMode ? 'auto' : 'none',
                                cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'eraser' ? 'cell' : 'default',
                                touchAction: 'none'
                            }}
                        />

                        {/* Toast Notification */}
                        <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
                            <span className="toast-icon">&#128276;</span>
                            <span className="toast-message">{toast.message}</span>
                        </div>

                        {/* Toolbar Toggle Button */}
                        <button className={`toolbar-toggle-btn ${isToolbarOpen ? 'open' : ''}`} onClick={() => setIsToolbarOpen(!isToolbarOpen)} title={isToolbarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {isToolbarOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>}
                            </svg>
                        </button>

                        {/* 2D Whiteboard Toolbar - O'ng tomonda */}
                        <div className={`whiteboard-toolbar ${isToolbarOpen ? 'open' : ''}`}>
                            <div className="toolbar-section tools-row">
                                <button className={`toolbar-btn ${activeTool === 'view' ? 'active' : ''}`} onClick={() => setActiveTool('view')} title="Ko'rish">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                                <button className={`toolbar-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Qalam">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg>
                                </button>
                                <button className={`toolbar-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="O'chirgich">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /></svg>
                                </button>
                                <button className={`toolbar-btn ${isLocked ? 'active locked' : ''}`} onClick={() => { setIsLocked(!isLocked); setToast({ show: true, message: isLocked ? 'Qulfdan chiqarildi' : "Qulflandi" }); setTimeout(() => setToast({ show: false, message: '' }), 2000); }} title={isLocked ? 'Qulfni ochish' : 'Qulflash'}>
                                    {isLocked ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                                    )}
                                </button>
                            </div>

                            <div className="toolbar-divider" />

                            <div className="toolbar-section zoom-section">
                                <button className="toolbar-btn" onClick={() => { if(controlsRef.current) { controlsRef.current.dollyIn(1.2); controlsRef.current.update(); } }} disabled={isLocked} title="Yaqinlashtirish">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                                </button>
                                <span className="zoom-level">100%</span>
                                <button className="toolbar-btn" onClick={() => { if(controlsRef.current) { controlsRef.current.dollyOut(1.2); controlsRef.current.update(); } }} disabled={isLocked} title="Uzoqlashtirish">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                                </button>
                                <button className="toolbar-btn" onClick={resetToInitial} disabled={isLocked} title="Qayta o'rnatish">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                </button>
                            </div>

                            <div className="toolbar-divider" />

                            <div className="toolbar-section color-section">
                                <div className="color-palette">
                                    {COLOR_PALETTE.map(color => (
                                        <button key={color} className={`color-btn ${penColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setPenColor(color)} title={`Rang: ${color}`} />
                                    ))}
                                </div>
                            </div>

                            <div className="toolbar-divider" />

                            <div className="toolbar-section size-section">
                                <span className="size-label">{activeTool === 'eraser' ? "O'chirgich:" : "Qalinlik:"}</span>
                                <input type="range" min="1" max={activeTool === 'eraser' ? "100" : "50"} value={activeTool === 'eraser' ? eraserSize : penSize} onChange={(e) => activeTool === 'eraser' ? setEraserSize(parseInt(e.target.value)) : setPenSize(parseInt(e.target.value))} className="size-slider" />
                                <span className="size-value">{activeTool === 'eraser' ? eraserSize : penSize}px</span>
                            </div>

                            <div className="toolbar-divider" />

                            <div className="toolbar-section fill-section">
                                <span className="fill-label">Piramida:</span>
                                <div className="fill-buttons">
                                    <button className={`fill-btn ${piramidaFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setPiramidaFillColor('gradient')} title="Gradient">
                                        <span className="gradient-preview"></span>
                                    </button>
                                    {COLOR_PALETTE.slice(0, 5).map(color => (
                                        <button key={`fill-${color}`} className={`fill-btn ${piramidaFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setPiramidaFillColor(color)} title={`Bo'yash: ${color}`} />
                                    ))}
                                </div>
                            </div>

                            <div className="toolbar-divider" />

                            <div className="whiteboard-actions">
                                <button className="whiteboard-action-btn clear-btn" onClick={clearAllDrawings} title="Tozalash">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                                <button className="whiteboard-action-btn refresh-btn" onClick={resetToInitial} title="Boshlang'ich holatga">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Lock Indicator */}
                        {isLocked && <div className="lock-indicator">&#128274; Qulfli rejim</div>}

                        {/* Close Button */}
                        <button className="whiteboard-close-btn" onClick={() => setIsFullscreen(false)} title="Yopish">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
                        </button>
                    </div>
                )}

                {/* O'ng Panel - Formulalar */}
                <aside className="formulas-panel">
                    <h2>&#128208; Matematik Ma'lumotlar</h2>

                    {/* Joriy qiymatlar */}
                    <div className="calc-section">
                        <h3>Hisob-kitoblar</h3>
                        <div className="calc-grid">
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Hajmi (V)', value: `${calculations.volume} ${unitSymbol}\u00B3`, formula: 'V = (S_asos \u00D7 h) / 3', description: `V = (${calculations.baseArea} \u00D7 ${height}) / 3 = ${calculations.volume} ${unitSymbol}\u00B3` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Hajmi (V)</span>
                                <span className="calc-value">{calculations.volume} {unitSymbol}&sup3;</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: "To'liq sirt (S)", value: `${calculations.totalArea} ${unitSymbol}\u00B2`, formula: 'S = S_asos + S_yon', description: `S = ${calculations.baseArea} + ${calculations.lateralArea} = ${calculations.totalArea} ${unitSymbol}\u00B2` }); setShowCalcModal(true); }}>
                                <span className="calc-label">To'liq sirt (S)</span>
                                <span className="calc-value">{calculations.totalArea} {unitSymbol}&sup2;</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Asos yuzasi', value: `${calculations.baseArea} ${unitSymbol}\u00B2`, formula: 'S = (n \u00D7 a \u00D7 apotema) / 2', description: `S = (${sides} \u00D7 ${sideLength} \u00D7 ${calculations.apothem}) / 2 = ${calculations.baseArea} ${unitSymbol}\u00B2` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Asos yuzasi</span>
                                <span className="calc-value">{calculations.baseArea} {unitSymbol}&sup2;</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Yon sirt', value: `${calculations.lateralArea} ${unitSymbol}\u00B2`, formula: 'S_yon = (P \u00D7 l) / 2', description: `S = (${calculations.perimeter} \u00D7 ${calculations.slantHeight}) / 2 = ${calculations.lateralArea} ${unitSymbol}\u00B2` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Yon sirt</span>
                                <span className="calc-value">{calculations.lateralArea} {unitSymbol}&sup2;</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Perimetr', value: `${calculations.perimeter} ${unitSymbol}`, formula: 'P = n \u00D7 a', description: `P = ${sides} \u00D7 ${sideLength} = ${calculations.perimeter} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Perimetr</span>
                                <span className="calc-value">{calculations.perimeter} {unitSymbol}</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Apotema', value: `${calculations.apothem} ${unitSymbol}`, formula: 'a = R \u00D7 cos(\u03C0/n)', description: `a = ${calculations.radius} \u00D7 cos(\u03C0/${sides}) = ${calculations.apothem} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Apotema</span>
                                <span className="calc-value">{calculations.apothem} {unitSymbol}</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Yon qirra', value: `${calculations.lateralEdge} ${unitSymbol}`, formula: 'l = \u221A(h\u00B2 + R\u00B2)', description: `l = \u221A(${height}\u00B2 + ${calculations.radius}\u00B2) = ${calculations.lateralEdge} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Yon qirra</span>
                                <span className="calc-value">{calculations.lateralEdge} {unitSymbol}</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Apotema (piramida)', value: `${calculations.slantHeight} ${unitSymbol}`, formula: 'l = \u221A(h\u00B2 + a\u00B2)', description: `l = \u221A(${height}\u00B2 + ${calculations.apothem}\u00B2) = ${calculations.slantHeight} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Apotema (piramida)</span>
                                <span className="calc-value">{calculations.slantHeight} {unitSymbol}</span>
                            </div>
                        </div>
                    </div>

                    {/* Formulalar */}
                    <div className="formulas-section">
                        <h3>Formulalar</h3>

                        <div className="formula-card">
                            <div className="formula-title">Hajm</div>
                            <div className="formula-eq">V = (S<sub>asos</sub> &times; h) / 3</div>
                            <div className="formula-desc">
                                V = ({calculations.baseArea} &times; {height}) / 3 = {calculations.volume} {unitSymbol}&sup3;
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Asos yuzasi (muntazam {sides}-burchak)</div>
                            <div className="formula-eq">S = (n &times; a &times; apotema) / 2</div>
                            <div className="formula-desc">
                                S = ({sides} &times; {sideLength} &times; {calculations.apothem}) / 2 = {calculations.baseArea} {unitSymbol}&sup2;
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Yon sirt maydoni</div>
                            <div className="formula-eq">S<sub>yon</sub> = (P &times; l) / 2</div>
                            <div className="formula-desc">
                                S = ({calculations.perimeter} &times; {calculations.slantHeight}) / 2 = {calculations.lateralArea} {unitSymbol}&sup2;
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">To'liq sirt maydoni</div>
                            <div className="formula-eq">S<sub>to'liq</sub> = S<sub>asos</sub> + S<sub>yon</sub></div>
                            <div className="formula-desc">
                                S = {calculations.baseArea} + {calculations.lateralArea} = {calculations.totalArea} {unitSymbol}&sup2;
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Yon qirra uzunligi</div>
                            <div className="formula-eq">l = &radic;(h&sup2; + R&sup2;)</div>
                            <div className="formula-desc">
                                l = &radic;({height}&sup2; + {calculations.radius}&sup2;) = {calculations.lateralEdge} {unitSymbol}
                            </div>
                        </div>
                    </div>

                    {/* Xossalar */}
                    <div className="properties-section">
                        <h3>Xossalar</h3>
                        <ul className="properties-list">
                            <li>Asosi &mdash; muntazam {sides}-burchak</li>
                            <li>Yon yuzalar &mdash; {sides} ta teng yonli uchburchak</li>
                            <li>Cho'qqi &mdash; barcha yon qirralar kesishadi</li>
                            <li>{sides === 3 ? "Uchburchakli piramida \u2014 tetraedr" : sides === 4 ? "To'rtburchakli piramida" : `${sides}-burchakli piramida`}</li>
                        </ul>
                    </div>
                </aside>
            </div>


            {/* Hisob-kitoblar Modal */}
            {showCalcModal && selectedCalc && (
                <div className={`calc-modal-overlay${calcModalClosing ? ' closing' : ''}`} onClick={closeCalcModal}>
                    <div className={`calc-modal${calcModalClosing ? ' closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                        <button className="calc-modal-close" onClick={closeCalcModal}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="calc-modal-icon">&#128202;</div>
                        <h3 className="calc-modal-title">{selectedCalc.label}</h3>
                        <div className="calc-modal-value">{selectedCalc.value}</div>
                        <div className="calc-modal-formula">
                            <span className="formula-label">Formula:</span>
                            <span className="formula-text">{selectedCalc.formula}</span>
                        </div>
                        <div className="calc-modal-description">
                            <span className="desc-label">Hisoblash:</span>
                            <span className="desc-text">{selectedCalc.description}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


