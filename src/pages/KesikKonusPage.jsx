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

// 3D Kesik Konus komponenti
function KesikKonus3D({ radiusBottom, radiusTop, height, tiltAngle, showWireframe, fillColor }) {
    const geometry = useMemo(() => {
        return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 64, 1);
    }, [radiusTop, radiusBottom, height]);

    // Og'ish burchagi (radianlar)
    const tiltRad = (tiltAngle * Math.PI) / 180;

    // Material color based on fill type
    const materialColor = fillColor === 'gradient' ? '#ec4899' : fillColor;

    return (
        <group rotation={[tiltRad, 0, 0]}>
            {/* Solid mesh */}
            <mesh geometry={geometry}>
                <meshStandardMaterial
                    color={materialColor}
                    transparent
                    opacity={showWireframe ? 0.15 : 0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Wireframe overlay */}
            <mesh geometry={geometry}>
                <meshBasicMaterial color="#f9a8d4" wireframe />
            </mesh>
        </group>
    );
}

export function KesikKonusPage() {
    // Parametrlar
    const [radiusBottom, setRadiusBottom] = useState(5);
    const [radiusTop, setRadiusTop] = useState(2.5);
    const [height, setHeight] = useState(7);
    const [tiltAngle, setTiltAngle] = useState(0);
    const [unit, setUnit] = useState('sm');

    // Birlik o'zgartirish funksiyasi
    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setRadiusBottom(prev => Math.round(prev * ratio * 100) / 100);
        setRadiusTop(prev => Math.round(prev * ratio * 100) / 100);
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
    const [kesikKonusFillColor, setKesikKonusFillColor] = useState('gradient');
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
        link.download = `kesik-konus-chizma-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        setToast({ show: true, message: 'Chizma saqlandi!' });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);
    };

    // Hisob-kitoblar
    const calculations = useMemo(() => {
        const R = radiusBottom; // Katta asos radiusi
        const r = radiusTop;    // Kichik asos radiusi
        const h = height;

        // Katta asos yuzasi
        const baseAreaBottom = Math.PI * R * R;

        // Kichik asos yuzasi
        const baseAreaTop = Math.PI * r * r;

        // Katta asos perimetri
        const perimeterBottom = 2 * Math.PI * R;

        // Kichik asos perimetri
        const perimeterTop = 2 * Math.PI * r;

        // Apotema (yon sirt hosil qiluvchisi)
        const slantHeight = Math.sqrt(h * h + Math.pow(R - r, 2));

        // Yon sirt maydoni
        const lateralArea = Math.PI * (R + r) * slantHeight;

        // To'liq sirt maydoni
        const totalArea = baseAreaBottom + baseAreaTop + lateralArea;

        // Hajm
        const volume = (Math.PI * h / 3) * (R * R + R * r + r * r);

        // Katta diametr
        const diameterBottom = 2 * R;

        // Kichik diametr
        const diameterTop = 2 * r;

        return {
            baseAreaBottom: baseAreaBottom.toFixed(2),
            baseAreaTop: baseAreaTop.toFixed(2),
            perimeterBottom: perimeterBottom.toFixed(2),
            perimeterTop: perimeterTop.toFixed(2),
            lateralArea: lateralArea.toFixed(2),
            totalArea: totalArea.toFixed(2),
            volume: volume.toFixed(2),
            slantHeight: slantHeight.toFixed(2),
            diameterBottom: diameterBottom.toFixed(2),
            diameterTop: diameterTop.toFixed(2)
        };
    }, [radiusBottom, radiusTop, height]);

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
                    <h1>⏺ Kesik Konus</h1>
                    <p>Kesik konus - professional modellashtirish</p>
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

                    {/* Katta asos radiusi */}
                    <div className="param-group">
                        <label>Katta asos radiusi (R)</label>
                        <div className="input-with-unit">
                            <input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.1"
                                value={radiusBottom}
                                onChange={(e) => setRadiusBottom(parseFloat(e.target.value) || 0.1)}
                            />
                            <span className="unit-label">{unitSymbol}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={radiusBottom}
                            onChange={(e) => setRadiusBottom(parseFloat(e.target.value))}
                        />
                    </div>

                    {/* Kichik asos radiusi */}
                    <div className="param-group">
                        <label>Kichik asos radiusi (r)</label>
                        <div className="input-with-unit">
                            <input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.1"
                                value={radiusTop}
                                onChange={(e) => setRadiusTop(parseFloat(e.target.value) || 0.1)}
                            />
                            <span className="unit-label">{unitSymbol}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={radiusTop}
                            onChange={(e) => setRadiusTop(parseFloat(e.target.value))}
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
                            <KesikKonus3D
                                radiusBottom={radiusBottom}
                                radiusTop={radiusTop}
                                height={height}
                                tiltAngle={tiltAngle}
                                showWireframe={showWireframe}
                                fillColor={kesikKonusFillColor}
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
                                    <KesikKonus3D radiusBottom={radiusBottom} radiusTop={radiusTop} height={height} tiltAngle={tiltAngle} showWireframe={showWireframe} fillColor={kesikKonusFillColor} />
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

                        {/* Drawing Canvas Overlay */}
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

                        {/* Whiteboard Toolbar */}
                        <div className={`whiteboard-toolbar ${isToolbarOpen ? 'open' : ''}`}>
                            <div className="toolbar-section tools-row">
                                <button className={`toolbar-btn ${activeTool === 'view' ? 'active' : ''}`} onClick={() => setActiveTool('view')} title="Ko'rish (V)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                                <button className={`toolbar-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Qalam (P)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg>
                                </button>
                                <button className={`toolbar-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="O'chirgich (E)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /></svg>
                                </button>
                                <button className={`toolbar-btn ${isLocked ? 'active locked' : ''}`} onClick={() => { setIsLocked(!isLocked); setToast({ show: true, message: isLocked ? 'Qulfdan chiqarildi' : "Qulflandi" }); setTimeout(() => setToast({ show: false, message: '' }), 2000); }} title="Qulflash (L)">
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
                                        <button key={color} className={`color-btn ${penColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setPenColor(color)} />
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
                                <span className="fill-label">Kesik Konus:</span>
                                <div className="fill-buttons">
                                    <button className={`fill-btn ${kesikKonusFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setKesikKonusFillColor('gradient')} title="Gradient">
                                        <span className="gradient-preview"></span>
                                    </button>
                                    {COLOR_PALETTE.slice(0, 5).map(color => (
                                        <button key={`fill-${color}`} className={`fill-btn ${kesikKonusFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setKesikKonusFillColor(color)} />
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
                    <h2>📐 Matematik Ma'lumotlar</h2>

                    {/* Joriy qiymatlar */}
                    <div className="calc-section">
                        <h3>Hisob-kitoblar</h3>
                        <div className="calc-grid">
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Hajmi (V)', value: `${calculations.volume} ${unitSymbol}³`, formula: 'V = (πh/3)(R² + Rr + r²)', description: `V = (π×${height}/3)(${radiusBottom}² + ${radiusBottom}×${radiusTop} + ${radiusTop}²) = ${calculations.volume} ${unitSymbol}³` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Hajmi (V)</span>
                                <span className="calc-value">{calculations.volume} {unitSymbol}³</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: "To'liq sirt (S)", value: `${calculations.totalArea} ${unitSymbol}²`, formula: 'S = πR² + πr² + π(R+r)l', description: `S = ${calculations.baseAreaBottom} + ${calculations.baseAreaTop} + ${calculations.lateralArea} = ${calculations.totalArea} ${unitSymbol}²` }); setShowCalcModal(true); }}>
                                <span className="calc-label">To'liq sirt (S)</span>
                                <span className="calc-value">{calculations.totalArea} {unitSymbol}²</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Katta asos yuzasi', value: `${calculations.baseAreaBottom} ${unitSymbol}²`, formula: 'S = πR²', description: `S = π × ${radiusBottom}² = ${calculations.baseAreaBottom} ${unitSymbol}²` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Katta asos yuzasi</span>
                                <span className="calc-value">{calculations.baseAreaBottom} {unitSymbol}²</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Kichik asos yuzasi', value: `${calculations.baseAreaTop} ${unitSymbol}²`, formula: 's = πr²', description: `s = π × ${radiusTop}² = ${calculations.baseAreaTop} ${unitSymbol}²` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Kichik asos yuzasi</span>
                                <span className="calc-value">{calculations.baseAreaTop} {unitSymbol}²</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Yon sirt', value: `${calculations.lateralArea} ${unitSymbol}²`, formula: 'S_yon = π(R + r)l', description: `S = π(${radiusBottom} + ${radiusTop}) × ${calculations.slantHeight} = ${calculations.lateralArea} ${unitSymbol}²` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Yon sirt</span>
                                <span className="calc-value">{calculations.lateralArea} {unitSymbol}²</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Apotema (l)', value: `${calculations.slantHeight} ${unitSymbol}`, formula: 'l = √(h² + (R-r)²)', description: `l = √(${height}² + (${radiusBottom}-${radiusTop})²) = ${calculations.slantHeight} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Apotema (l)</span>
                                <span className="calc-value">{calculations.slantHeight} {unitSymbol}</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Katta diametr', value: `${calculations.diameterBottom} ${unitSymbol}`, formula: 'D = 2R', description: `D = 2 × ${radiusBottom} = ${calculations.diameterBottom} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Katta diametr</span>
                                <span className="calc-value">{calculations.diameterBottom} {unitSymbol}</span>
                            </div>
                            <div className="calc-item clickable" onClick={() => { setSelectedCalc({ label: 'Kichik diametr', value: `${calculations.diameterTop} ${unitSymbol}`, formula: 'd = 2r', description: `d = 2 × ${radiusTop} = ${calculations.diameterTop} ${unitSymbol}` }); setShowCalcModal(true); }}>
                                <span className="calc-label">Kichik diametr</span>
                                <span className="calc-value">{calculations.diameterTop} {unitSymbol}</span>
                            </div>
                        </div>
                    </div>

                    {/* Formulalar */}
                    <div className="formulas-section">
                        <h3>Formulalar</h3>

                        <div className="formula-card">
                            <div className="formula-title">Hajm</div>
                            <div className="formula-eq">V = (πh/3)(R² + Rr + r²)</div>
                            <div className="formula-desc">
                                V = (π×{height}/3)({radiusBottom}² + {radiusBottom}×{radiusTop} + {radiusTop}²) = {calculations.volume} {unitSymbol}³
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Apotema (hosil qiluvchi)</div>
                            <div className="formula-eq">l = √(h² + (R-r)²)</div>
                            <div className="formula-desc">
                                l = √({height}² + ({radiusBottom}-{radiusTop})²) = {calculations.slantHeight} {unitSymbol}
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Yon sirt maydoni</div>
                            <div className="formula-eq">S<sub>yon</sub> = π(R + r)l</div>
                            <div className="formula-desc">
                                S = π({radiusBottom} + {radiusTop}) × {calculations.slantHeight} = {calculations.lateralArea} {unitSymbol}²
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">To'liq sirt maydoni</div>
                            <div className="formula-eq">S = πR² + πr² + π(R+r)l</div>
                            <div className="formula-desc">
                                S = {calculations.baseAreaBottom} + {calculations.baseAreaTop} + {calculations.lateralArea} = {calculations.totalArea} {unitSymbol}²
                            </div>
                        </div>

                        <div className="formula-card">
                            <div className="formula-title">Asos yuzalari</div>
                            <div className="formula-eq">S = πR², s = πr²</div>
                            <div className="formula-desc">
                                Katta: π×{radiusBottom}² = {calculations.baseAreaBottom} {unitSymbol}², Kichik: π×{radiusTop}² = {calculations.baseAreaTop} {unitSymbol}²
                            </div>
                        </div>
                    </div>

                    {/* Xossalar */}
                    <div className="properties-section">
                        <h3>Xossalar</h3>
                        <ul className="properties-list">
                            <li>Ikki asos — parallel doiralar</li>
                            <li>Yon sirti — kesik konus yon sirti</li>
                            <li>Konusni parallel tekislik bilan kesish natijasi</li>
                            <li>R = r bo'lganda silindrga aylanadi</li>
                            <li>Aylantirish jismi — trapetsiyani aylantirishda hosil bo'ladi</li>
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


