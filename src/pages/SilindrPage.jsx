import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera, Line, Text, Html } from '@react-three/drei';
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

// 3D Silindr komponenti
function Silindr3D({ radius, height, tiltAngle, showWireframe }) {
    const geometry = useMemo(() => {
        return new THREE.CylinderGeometry(radius, radius, height, 64, 1);
    }, [radius, height]);

    // Og'ish burchagi (radianlar)
    const tiltRad = (tiltAngle * Math.PI) / 180;

    return (
        <group rotation={[tiltRad, 0, 0]}>
            {/* Solid mesh */}
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color="#f59e0b"
                    transparent
                    opacity={showWireframe ? 0.15 : 0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Wireframe overlay */}
            <mesh geometry={geometry}>
                <meshBasicMaterial color="#fcd34d" wireframe />
            </mesh>
        </group>
    );
}

export function SilindrPage() {
    // Parametrlar
    const [radius, setRadius] = useState(4);
    const [height, setHeight] = useState(8);
    const [tiltAngle, setTiltAngle] = useState(0);
    const [unit, setUnit] = useState('sm');

    // Birlik o'zgartirish funksiyasi
    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setRadius(prev => Math.round(prev * ratio * 100) / 100);
        setHeight(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };

    // Vizualizatsiya sozlamalari
    const [showWireframe, setShowWireframe] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [showAxes, setShowAxes] = useState(true);

    // Hisob-kitoblar modali
    const [showCalcModal, setShowCalcModal] = useState(false);
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
    const canvasContainerRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const controlsRef = useRef(null);
    const scenePanelRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
    const drawMode = activeTool === 'pen' || activeTool === 'eraser';

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Chizish funksiyalari
    useEffect(() => {
        const updateSize = () => {
            if (canvasContainerRef.current) {
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

    // Hisob-kitoblar
    const calculations = useMemo(() => {
        const r = radius;
        const h = height;

        // Asos yuzasi (doira)
        const baseArea = Math.PI * r * r;

        // Asos perimetri (aylana uzunligi)
        const perimeter = 2 * Math.PI * r;

        // Yon sirt maydoni
        const lateralArea = 2 * Math.PI * r * h;

        // To'liq sirt maydoni
        const totalArea = 2 * baseArea + lateralArea;

        // Hajm
        const volume = baseArea * h;

        // Diametr
        const diameter = 2 * r;

        // Diagonal (yon sirt bo'ylab)
        const diagonal = Math.sqrt(Math.pow(diameter, 2) + Math.pow(h, 2));

        return {
            baseArea: baseArea.toFixed(2),
            perimeter: perimeter.toFixed(2),
            lateralArea: lateralArea.toFixed(2),
            totalArea: totalArea.toFixed(2),
            volume: volume.toFixed(2),
            diameter: diameter.toFixed(2),
            diagonal: diagonal.toFixed(2)
        };
    }, [radius, height]);

    // Birlik o'zgartirish
    const unitSymbol = UNITS[unit].symbol;
    const renderScale = UNITS[unit].factor / UNITS['sm'].factor;

    return (
        <div className="prizma-page">
            {/* Header */}
            <header className="prizma-header">
                <Link to="/3d-models" className="back-btn">
                    ← Orqaga
                </Link>
                <div className="header-title">
                    <h1>◎ Silindr</h1>
                    <p>To'g'ri silindr - professional modellashtirish</p>
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

                    {/* Radius */}
                    <div className="param-group">
                        <label>Radius (r)</label>
                        <div className="input-with-unit">
                            <input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.1"
                                value={radius}
                                onChange={(e) => setRadius(parseFloat(e.target.value) || 0.1)}
                            />
                            <span className="unit-label">{unitSymbol}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={radius}
                            onChange={(e) => setRadius(parseFloat(e.target.value))}
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

                    {/* Vizualizatsiya */}
                    <div className="param-group viz-options">
                        <label>Vizualizatsiya</label>
                        <div className="toggle-group">
                            <label className="toggle-item">
                                <input
                                    type="checkbox"
                                    checked={showWireframe}
                                    onChange={(e) => setShowWireframe(e.target.checked)}
                                />
                                <span>Wireframe</span>
                            </label>
                            <label className="toggle-item">
                                <input
                                    type="checkbox"
                                    checked={showGrid}
                                    onChange={(e) => setShowGrid(e.target.checked)}
                                />
                                <span>Grid</span>
                            </label>
                            <label className="toggle-item">
                                <input
                                    type="checkbox"
                                    checked={showAxes}
                                    onChange={(e) => setShowAxes(e.target.checked)}
                                />
                                <span>O'qlar</span>
                            </label>
                        </div>
                    </div>
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
                            <Silindr3D
                                radius={radius}
                                height={height}
                                tiltAngle={tiltAngle}
                                showWireframe={showWireframe}
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

                {/* Fullscreen Modal */}
                {isFullscreen && (
                    <div className="fullscreen-3d-modal" ref={canvasContainerRef}>
                        {/* 2D Whiteboard Toolbar */}
                        {/* Image-Based Custom Toolbar */}
                        <div className={`prizma-pro-toolbar ${isToolbarOpen ? 'open' : ''}`}>
                            <button className={`toolbar-toggle-btn ${isToolbarOpen ? 'open' : ''}`} onClick={() => setIsToolbarOpen(!isToolbarOpen)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    {isToolbarOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>}
                                </svg>
                            </button>
                            
                            <div className="prizma-toolbar-inner">
                                <div className="p-toolbar-section p-tools-row">
                                    <button className={`p-tool-btn ${activeTool === 'view' && !isLocked ? 'active' : ''}`} onClick={() => setActiveTool('view')} title="Ko'rish">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    </button>
                                    <button className={`p-tool-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Qalam">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg>
                                    </button>
                                    <button className={`p-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="O'chirgich">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /></svg>
                                    </button>
                                    <button className={`p-tool-btn ${isLocked ? 'active' : ''}`} onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Qulfni ochish" : "Qulflash"}>
                                        {isLocked ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                                        )}
                                    </button>
                                </div>

                                <div className="p-toolbar-section p-zoom-row">
                                    <button className="p-tool-btn p-zoom-btn" onClick={() => { if(controlsRef.current) { controlsRef.current.dollyIn(1.2); controlsRef.current.update(); } }} title="Yaqinlashtirish">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                                    </button>
                                    <div className="p-zoom-badge">100%</div>
                                    <button className="p-tool-btn p-zoom-btn" onClick={() => { if(controlsRef.current) { controlsRef.current.dollyOut(1.2); controlsRef.current.update(); } }} title="Uzoqlashtirish">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                                    </button>
                                    <button className="p-tool-btn p-refresh-btn" onClick={resetToInitial} title="Boshlang'ich holatga">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" /></svg>
                                    </button>
                                </div>

                                <div className="p-toolbar-section p-color-palette">
                                    {COLOR_PALETTE.slice(0, 10).map(color => (
                                        <button key={color} className={`p-color-dot ${penColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setPenColor(color)} />
                                    ))}
                                </div>

                                <div className="p-toolbar-section p-slider-section">
                                    <div className="p-slider-label">QALINLIK:</div>
                                    <input type="range" min="1" max="50" value={activeTool === 'eraser' ? eraserSize : penSize} onChange={(e) => activeTool === 'eraser' ? setEraserSize(parseInt(e.target.value)) : setPenSize(parseInt(e.target.value))} className="p-slider-input" />
                                    <div className="p-slider-value">{activeTool === 'eraser' ? eraserSize : penSize}px</div>
                                </div>
                            </div>

                            <div className="p-floating-actions">
                                <button className="p-action-btn p-clear-btn" onClick={clearAllDrawings} title="Tozalash"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                                <button className="p-action-btn p-save-btn" onClick={() => alert('Chizma saqlandi!')} title="Saqlash"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg></button>
                                <button className="p-action-btn p-exit-btn" onClick={() => setIsFullscreen(false)} title="Chiqish"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg></button>
                            </div>
                        </div>

                        
                        <canvas
                                ref={drawingCanvasRef}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                className="whiteboard-drawing-canvas"
                                onMouseDown={handleDrawStart}
                                onMouseMove={handleDrawMove}
                                onMouseUp={handleDrawEnd}
                                onMouseLeave={handleDrawEnd}
                                onTouchStart={(e) => { e.preventDefault(); handleDrawStart(e); }}
                                onTouchMove={(e) => { e.preventDefault(); handleDrawMove(e); }}
                                onTouchEnd={handleDrawEnd}
                                onTouchCancel={handleDrawEnd}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    zIndex: 5,
                                    pointerEvents: drawMode ? 'auto' : 'none',
                                    cursor: drawMode ? 'crosshair' : 'default',
                                    touchAction: 'none'
                                }}
                            />
                        <Canvas shadows style={{ background: 'transparent' }}>
                            <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />
                            <ambientLight intensity={0.4} />
                            <directionalLight position={[10, 15, 5]} intensity={1} castShadow />
                            <pointLight position={[-10, -10, -10]} intensity={0.3} color="#60a5fa" />
                            <Environment preset="city" />
                            <group scale={renderScale}><Silindr3D radius={radius} height={height} tiltAngle={tiltAngle} showWireframe={showWireframe} /></group>
                            {showGrid && (<Grid infiniteGrid fadeDistance={50} fadeStrength={5} cellSize={1} cellColor="#404040" sectionSize={5} sectionColor="#606060" />)}
                            {showAxes && <axesHelper args={[10]} />}
                            <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={5} maxDistance={150}  autoRotate={autoRotate && !isLocked && !drawMode} autoRotateSpeed={rotateSpeed} enableZoom={!isLocked && !drawMode} enableRotate={!isLocked && !drawMode} enablePan={!isLocked && !drawMode} />
                        </Canvas>
                        
                        <div className="fullscreen-top-bar">
                            <div className="top-bar-left"><span className="brand-text">○ Silindr 3D</span></div>
                            <div className="top-bar-center">
                                {autoRotate && !isLocked && !drawMode && (<span className="status-badge rotating">🔄 Auto-aylanish</span>)}
                                {drawMode && !(activeTool === 'eraser') && (<span className="status-badge drawing">🎨 Chizish rejimi</span>)}
                                {drawMode && (activeTool === 'eraser') && (<span className="status-badge erasing">🧹 O'chirish - {eraserSize}px</span>)}
                                {isLocked && (<span className="status-badge locked">🔒 Qulflangan</span>)}
                            </div>
                            <button className="close-btn" onClick={() => setIsFullscreen(false)}>✕</button>
                        </div>
                        <div className="fullscreen-right-panel">
                            <div className="panel-header"><span className="panel-icon">⚙️</span><span className="panel-title">Boshqaruv</span></div>
                            <div className="panel-content">
                                <div className="panel-section">
                                    <h4 className="section-title">🎮 3D Boshqaruv</h4>
                                    <button className="control-card" onClick={resetCamera}>
                                        <div className="card-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg></div>
                                        <div className="card-content"><span className="card-label">Kamerani reset</span><span className="card-status">Default</span></div>
                                        <div className="card-indicator"></div>
                                    </button>
                                    <button className={`control-card ${autoRotate ? 'active' : ''}`} onClick={() => setAutoRotate(!autoRotate)}>
                                        <div className="card-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" /></svg></div>
                                        <div className="card-content"><span className="card-label">Auto-aylanish</span><span className="card-status">{autoRotate ? 'ON' : 'OFF'}</span></div>
                                        <div className="card-indicator"></div>
                                    </button>
                                    <button className={`control-card ${isLocked ? 'active locked' : ''}`} onClick={() => setIsLocked(!isLocked)}>
                                        <div className="card-icon-wrap">{isLocked ? (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>) : (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>)}</div>
                                        <div className="card-content"><span className="card-label">Qulflash</span><span className="card-status">{isLocked ? 'Qulf' : 'Ochish'}</span></div>
                                        <div className="card-indicator"></div>
                                    </button>
                                </div>
                                <div className="panel-section">
                                    <h4 className="section-title">⚡ Animatsiya tezligi</h4>
                                    <div className="slider-control">
                                        <div className="slider-header"><span className="slider-label">Tezlik</span><span className="slider-value">{rotateSpeed.toFixed(1)}x</span></div>
                                        <input type="range" min="0.5" max="10" step="0.5" value={rotateSpeed} onChange={(e) => setRotateSpeed(parseFloat(e.target.value))} className="pro-slider" />
                                    </div>
                                </div>
                                <div className="panel-section">
                                    <h4 className="section-title">✏️ Chizish</h4>
                                    <button className={`control-card ${drawMode ? 'active drawing' : ''}`} onClick={() => { activeTool === 'pen' ? setActiveTool('view') : setActiveTool('pen'); }}>
                                        <div className="card-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg></div>
                                        <div className="card-content"><span className="card-label">Chizish</span><span className="card-status">{drawMode ? 'Faol' : 'O\'chirilgan'}</span></div>
                                        <div className="card-indicator"></div>
                                    </button>
                                </div>
                                <div className="panel-section">
                                    <h4 className="section-title">📐 Parametrlar</h4>
                                    <div className="param-cards">
                                        <div className="param-mini"><span className="param-icon">r</span><span className="param-val">{radius}{unitSymbol}</span></div>
                                        <div className="param-mini"><span className="param-icon">h</span><span className="param-val">{height}{unitSymbol}</span></div>
                                    </div>
                                </div>
                                <div className="panel-section">
                                    <h4 className="section-title">📊 Hisob-kitoblar</h4>
                                    <div className="calc-mini-grid">
                                        <div className="calc-mini-item"><span className="calc-mini-label">Hajm (V)</span><span className="calc-mini-value">{calculations.volume} {unitSymbol}³</span></div>
                                        <div className="calc-mini-item"><span className="calc-mini-label">To'liq sirt</span><span className="calc-mini-value">{calculations.totalArea} {unitSymbol}²</span></div>
                                        <div className="calc-mini-item"><span className="calc-mini-label">Asos yuzasi</span><span className="calc-mini-value">{calculations.baseArea} {unitSymbol}²</span></div>
                                        <div className="calc-mini-item"><span className="calc-mini-label">Yon sirt</span><span className="calc-mini-value">{calculations.lateralArea} {unitSymbol}²</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* O'ng Panel - Formulalar */}
                <aside className="formulas-panel">
                    <h2>📐 Matematik Ma'lumotlar</h2>

                    {/* Joriy qiymatlar */}
                    <div className="calc-section">
                        <h3>Hisob-kitoblar</h3>
                        <div className="calc-grid">
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Hajmi (V)', value: `${calculations.volume} ${unitSymbol}³`, formula: 'V = πr²h', description: `V = π × ${radius}² × ${height} = ${calculations.volume} ${unitSymbol}³` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Hajmi (V)</span>
                                <span className="calc-value">{calculations.volume} {unitSymbol}³</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: "To'liq sirt (S)", value: `${calculations.totalArea} ${unitSymbol}²`, formula: 'S = 2πr² + 2πrh', description: `S = 2×${calculations.baseArea} + ${calculations.lateralArea} = ${calculations.totalArea} ${unitSymbol}²` }); setShowCalcModal(true); }}>
                                <span className="calc-label">To'liq sirt (S)</span>
                                <span className="calc-value">{calculations.totalArea} {unitSymbol}²</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Asos yuzasi', value: `${calculations.baseArea} ${unitSymbol}²`, formula: 'S = πr²', description: `S = π × ${radius}² = ${calculations.baseArea} ${unitSymbol}²` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Asos yuzasi</span>
                                <span className="calc-value">{calculations.baseArea} {unitSymbol}²</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Yon sirt', value: `${calculations.lateralArea} ${unitSymbol}²`, formula: 'S_yon = 2πrh', description: `S = 2 × π × ${radius} × ${height} = ${calculations.lateralArea} ${unitSymbol}²` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Yon sirt</span>
                                <span className="calc-value">{calculations.lateralArea} {unitSymbol}²</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Aylana uzunligi', value: `${calculations.perimeter} ${unitSymbol}`, formula: 'C = 2πr', description: `C = 2 × π × ${radius} = ${calculations.perimeter} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Aylana uzunligi</span>
                                <span className="calc-value">{calculations.perimeter} {unitSymbol}</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Diametr', value: `${calculations.diameter} ${unitSymbol}`, formula: 'd = 2r', description: `d = 2 × ${radius} = ${calculations.diameter} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Diametr</span>
                                <span className="calc-value">{calculations.diameter} {unitSymbol}</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Diagonal', value: `${calculations.diagonal} ${unitSymbol}`, formula: 'D = √(d² + h²)', description: `D = √(${calculations.diameter}² + ${height}²) = ${calculations.diagonal} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Diagonal</span>
                                <span className="calc-value">{calculations.diagonal} {unitSymbol}</span>
                            </div>
                        </div>
                    </div>

                    {/* Formulalar */}
                    <div className="formulas-section">
                        <h3>Formulalar</h3>

                        <div className="formula-card">
                            <div className="formula-title">Hajm</div>
                            <div className="formula-eq">V = πr²h</div>
                            <div className="formula-desc">
                                V = π × {radius}² × {height} = {calculations.volume} {unitSymbol}³
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Asos yuzasi (doira)</div>
                            <div className="formula-eq">S = πr²</div>
                            <div className="formula-desc">
                                S = π × {radius}² = {calculations.baseArea} {unitSymbol}²
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Yon sirt maydoni</div>
                            <div className="formula-eq">S<sub>yon</sub> = 2πrh</div>
                            <div className="formula-desc">
                                S = 2 × π × {radius} × {height} = {calculations.lateralArea} {unitSymbol}²
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">To'liq sirt maydoni</div>
                            <div className="formula-eq">S<sub>to'liq</sub> = 2πr² + 2πrh</div>
                            <div className="formula-desc">
                                S = 2×{calculations.baseArea} + {calculations.lateralArea} = {calculations.totalArea} {unitSymbol}²
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Aylana uzunligi</div>
                            <div className="formula-eq">C = 2πr</div>
                            <div className="formula-desc">
                                C = 2 × π × {radius} = {calculations.perimeter} {unitSymbol}
                            </div>
                        </div>
                    </div>

                    {/* Xossalar */}
                    <div className="properties-section">
                        <h3>Xossalar</h3>
                        <ul className="properties-list">
                            <li>Asoslari parallel va teng doiralar</li>
                            <li>Yon sirti - to'g'ri to'rtburchak (yoyilganda)</li>
                            <li>Barcha hosil qiluvchilar parallel va teng</li>
                            <li>O'q - asoslar markazlarini birlashtiruvchi to'g'ri chiziq</li>
                            <li>Aylantirish jismi - to'g'ri to'rtburchakni aylantirishda hosil bo'ladi</li>
                        </ul>
                    </div>
                </aside>
            </div>


            {/* Hisob-kitoblar Modal */}
            {showCalcModal && selectedCalc && (
                <div className="calc-modal-overlay" onClick={() => setShowCalcModal(false)}>
                    <div className="calc-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="calc-modal-close" onClick={() => setShowCalcModal(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="calc-modal-icon">📊</div>
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
