import React, { useState, useRef, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

export function CustomShapeBuilder() {
    const [mode, setMode] = useState('2d'); // '2d' or '3d'
    const [shapeType, setShapeType] = useState('rect'); // 'rect', 'circle', 'triangle'
    const [dimA, setDimA] = useState(10); // Width / Base / Radius
    const [dimB, setDimB] = useState(10); // Height
    const [dimC, setDimC] = useState(10); // Depth (for 3D)
    
    // Fullscreen and Whiteboard State
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
    const [theme, setTheme] = useState('dark');
    const [shapeFillColor, setShapeFillColor] = useState('gradient');
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
                if (isFullscreen) {
                    setIsFullscreen(false);
                    return;
                }
            }
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
    }, [isFullscreen]);

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
        link.download = `shakl-chizma-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        alert('Chizma rasm sifatida saqlandi!');
    };

    // Hisob-kitoblar
    let area = 0;
    let perimeter = 0;
    let volume = 0;
    let surfaceArea = 0;

    if (mode === '2d') {
        if (shapeType === 'rect') {
            area = dimA * dimB;
            perimeter = 2 * (dimA + dimB);
        } else if (shapeType === 'circle') {
            area = Math.PI * Math.pow(dimA, 2);
            perimeter = 2 * Math.PI * dimA;
        } else if (shapeType === 'triangle') {
            area = 0.5 * dimA * dimB;
            const side = Math.sqrt(Math.pow(dimA / 2, 2) + Math.pow(dimB, 2));
            perimeter = dimA + 2 * side;
        }
    } else {
        if (shapeType === 'rect') {
            volume = dimA * dimB * dimC;
            surfaceArea = 2 * (dimA * dimB + dimA * dimC + dimB * dimC);
        } else if (shapeType === 'circle') {
            volume = Math.PI * Math.pow(dimA, 2) * dimB;
            surfaceArea = 2 * Math.PI * dimA * dimB + 2 * Math.PI * Math.pow(dimA, 2);
        } else if (shapeType === 'triangle') {
            const baseArea = 0.5 * dimA * dimB;
            volume = baseArea * dimC;
            const side = Math.sqrt(Math.pow(dimA / 2, 2) + Math.pow(dimB, 2));
            surfaceArea = 2 * baseArea + (dimA + 2 * side) * dimC;
        }
    }

    const renderShape = () => {
        const matColor = shapeFillColor === 'gradient' ? (mode === '3d' ? "#8b5cf6" : "#ec4899") : shapeFillColor;
        const material = <meshPhysicalMaterial color={matColor} roughness={0.2} metalness={0.1} transmission={0.2} thickness={0.5} />;
        const material2d = <meshBasicMaterial color={matColor} side={THREE.DoubleSide} />;
        
        if (mode === '2d') {
            if (shapeType === 'rect') {
                return (
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[dimA / 10, dimB / 10]} />
                        {material2d}
                    </mesh>
                );
            } else if (shapeType === 'circle') {
                return (
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[dimA / 10, 64]} />
                        {material2d}
                    </mesh>
                );
            } else if (shapeType === 'triangle') {
                const shape = new THREE.Shape();
                shape.moveTo(-dimA / 20, -dimB / 20);
                shape.lineTo(dimA / 20, -dimB / 20);
                shape.lineTo(0, dimB / 20);
                shape.lineTo(-dimA / 20, -dimB / 20);
                return (
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <shapeGeometry args={[shape]} />
                        {material2d}
                    </mesh>
                );
            }
        } else {
            if (shapeType === 'rect') {
                return (
                    <mesh position={[0, dimB / 20, 0]}>
                        <boxGeometry args={[dimA / 10, dimB / 10, dimC / 10]} />
                        {material}
                    </mesh>
                );
            } else if (shapeType === 'circle') {
                return (
                    <mesh position={[0, dimB / 20, 0]}>
                        <cylinderGeometry args={[dimA / 10, dimA / 10, dimB / 10, 64]} />
                        {material}
                    </mesh>
                );
            } else if (shapeType === 'triangle') {
                const shape = new THREE.Shape();
                shape.moveTo(-dimA / 20, 0);
                shape.lineTo(dimA / 20, 0);
                shape.lineTo(0, dimB / 10);
                shape.lineTo(-dimA / 20, 0);
                
                const extrudeSettings = { depth: dimC / 10, bevelEnabled: false };
                return (
                    <mesh position={[0, 0, -dimC / 20]} rotation={[-Math.PI / 2, 0, 0]}>
                        <extrudeGeometry args={[shape, extrudeSettings]} />
                        {material}
                    </mesh>
                );
            }
        }
    };

    return (
        <div className="custom-shape-builder">
            <div className="builder-header">
                <h2>Erkin Shakl Yaratish</h2>
                <div className="mode-toggle">
                    <button 
                        className={mode === '2d' ? 'active' : ''} 
                        onClick={() => setMode('2d')}
                    >
                        2D Shakl
                    </button>
                    <button 
                        className={mode === '3d' ? 'active' : ''} 
                        onClick={() => setMode('3d')}
                    >
                        3D Shakl
                    </button>
                </div>
            </div>

            <div className="builder-content">
                <div className="builder-controls">
                    <div className="control-group">
                        <label>Shakl turi:</label>
                        <div className="shape-selector">
                            <button 
                                className={`shape-btn ${shapeType === 'rect' ? 'active' : ''}`}
                                onClick={() => setShapeType('rect')}
                            >
                                <span className="icon">{mode === '2d' ? '⬛' : '📦'}</span>
                                {mode === '2d' ? "To'rtburchak" : "Parallelepiped"}
                            </button>
                            <button 
                                className={`shape-btn ${shapeType === 'circle' ? 'active' : ''}`}
                                onClick={() => setShapeType('circle')}
                            >
                                <span className="icon">{mode === '2d' ? '🔴' : '🛢️'}</span>
                                {mode === '2d' ? "Doira" : "Silindr"}
                            </button>
                            <button 
                                className={`shape-btn ${shapeType === 'triangle' ? 'active' : ''}`}
                                onClick={() => setShapeType('triangle')}
                            >
                                <span className="icon">{mode === '2d' ? '🔺' : '⛺'}</span>
                                {mode === '2d' ? "Uchburchak" : "Prizma"}
                            </button>
                        </div>
                    </div>

                    <div className="control-group">
                        <label>{shapeType === 'circle' ? 'Radius:' : 'Kenglik / Asos:'}</label>
                        <div className="input-wrapper">
                            <input 
                                type="number" 
                                className="modern-input"
                                value={dimA} 
                                onChange={(e) => setDimA(Number(e.target.value) || 0)} 
                                min="1"
                            />
                            <span className="unit">sm</span>
                        </div>
                    </div>

                    {shapeType !== 'circle' || mode === '3d' ? (
                        <div className="control-group">
                            <label>Balandlik:</label>
                            <div className="input-wrapper">
                                <input 
                                    type="number" 
                                    className="modern-input"
                                    value={dimB} 
                                    onChange={(e) => setDimB(Number(e.target.value) || 0)} 
                                    min="1"
                                />
                                <span className="unit">sm</span>
                            </div>
                        </div>
                    ) : null}

                    {mode === '3d' && shapeType !== 'circle' && (
                        <div className="control-group">
                            <label>Qalinlik:</label>
                            <div className="input-wrapper">
                                <input 
                                    type="number" 
                                    className="modern-input"
                                    value={dimC} 
                                    onChange={(e) => setDimC(Number(e.target.value) || 0)} 
                                    min="1"
                                />
                                <span className="unit">sm</span>
                            </div>
                        </div>
                    )}

                    <div className="calculations-card">
                        <h3>Hisob-kitoblar</h3>
                        {mode === '2d' ? (
                            <>
                                <p><strong>Yuzasi (S):</strong> <span>{area.toFixed(2)} sm²</span></p>
                                <p><strong>Perimetri (P):</strong> <span>{perimeter.toFixed(2)} sm</span></p>
                            </>
                        ) : (
                            <>
                                <p><strong>Hajmi (V):</strong> <span>{volume.toFixed(2)} sm³</span></p>
                                <p><strong>To'la sirti (S):</strong> <span>{surfaceArea.toFixed(2)} sm²</span></p>
                            </>
                        )}
                    </div>
                </div>

                <div className="builder-canvas" ref={scenePanelRef} style={{ position: 'relative' }}>
                    <button className="fullscreen-toggle-btn" onClick={() => setIsFullscreen(true)} title="To'liq ekran">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    </button>
                    
                    <Canvas shadows>
                        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
                        <Suspense fallback={null}>
                            {renderShape()}
                            <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={20} blur={2} far={10} />
                            <Environment preset="city" />
                        </Suspense>
                        <OrbitControls 
                            enableDamping 
                            enablePan={true} 
                            enableZoom={true} 
                            minPolarAngle={0} 
                            maxPolarAngle={Math.PI / 2} 
                        />
                        <gridHelper args={[20, 20, 0x444444, 0x222222]} />
                        <axesHelper args={[5]} />
                    </Canvas>
                </div>
            </div>

            {/* Fullscreen - 2D Whiteboard Style */}
            {isFullscreen && (
                <div className="fullscreen-whiteboard" ref={canvasContainerRef}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                        <Canvas shadows>
                            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />
                            <ambientLight intensity={theme === 'dark' ? 0.4 : 0.6} />
                            <directionalLight position={[10, 15, 5]} intensity={theme === 'dark' ? 1 : 0.8} castShadow />
                            <pointLight position={[-10, -10, -10]} intensity={theme === 'dark' ? 0.3 : 0.2} color="#60a5fa" />
                            <Environment preset="city" />
                            <Suspense fallback={null}>
                                {renderShape()}
                            </Suspense>
                            <Grid infiniteGrid fadeDistance={50} fadeStrength={5} cellSize={1} cellColor={theme === 'dark' ? "#404040" : "#cccccc"} sectionSize={5} sectionColor={theme === 'dark' ? "#606060" : "#999999"} />
                            <axesHelper args={[10]} />
                            <OrbitControls
                                ref={controlsRef}
                                enableDamping
                                dampingFactor={0.05}
                                autoRotate={autoRotate && !isLocked && !drawMode}
                                autoRotateSpeed={rotateSpeed}
                                enableZoom={!isLocked && !drawMode}
                                enableRotate={!isLocked && !drawMode}
                                enablePan={!isLocked && !drawMode}
                            />
                        </Canvas>
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

                    <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
                        <span className="toast-icon">&#128276;</span>
                        <span className="toast-message">{toast.message}</span>
                    </div>

                    <button className="fullscreen-close-btn" onClick={() => setIsFullscreen(false)} title="Kichraytirish (To'liq ekrandan chiqish)" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100, background: '#ef4444', border: 'none', color: 'white', width: '56px', height: '56px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#dc2626'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ef4444'; }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                    </button>

                    <button className={`toolbar-toggle-btn ${isToolbarOpen ? 'open' : ''}`} onClick={() => setIsToolbarOpen(!isToolbarOpen)} title={isToolbarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isToolbarOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>}
                        </svg>
                    </button>

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
                            <span className="fill-label">Shakl rangi:</span>
                            <div className="fill-buttons">
                                <button className={`fill-btn ${shapeFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setShapeFillColor('gradient')} title="Gradient">
                                    <span className="gradient-preview"></span>
                                </button>
                                {COLOR_PALETTE.slice(0, 5).map(color => (
                                    <button key={`fill-${color}`} className={`fill-btn ${shapeFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setShapeFillColor(color)} title={`Bo'yash: ${color}`} />
                                ))}
                            </div>
                        </div>

                        <div className="toolbar-divider" />

                        <div className="whiteboard-actions">
                            <button className="action-btn clear-btn" onClick={clearAllDrawings}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                Tozalash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


