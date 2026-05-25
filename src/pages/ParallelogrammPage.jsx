import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

// O'lchov birliklari
const UNITS = {
    mm: { name: 'Millimetr', symbol: 'mm', factor: 0.001 },
    sm: { name: 'Santimetr', symbol: 'sm', factor: 0.01 },
    m: { name: 'Metr', symbol: 'm', factor: 1 }
};

const COLORS = {
    primary: '#ec4899',
    secondary: '#10b981',
    accent: '#f59e0b',
    purple: '#8b5cf6'
};

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Fullscreen Parallelogram komponenti
function FullscreenParallelogram({ sideA, sideB, height, angle, unitSymbol, isValid, onClose, onSizeChange }) {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const containerRef = useRef(null);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [activeTool, setActiveTool] = useState('view');
    const [drawings, setDrawings] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#ffffff');
    const [penSize, setPenSize] = useState(3);
    const [lastPinchDistance, setLastPinchDistance] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [eraserSize, setEraserSize] = useState(20);
    const [draggingVertex, setDraggingVertex] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [parallelogramFillColor, setParallelogramFillColor] = useState('gradient');

    useEffect(() => {
        const updateSize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const parallelogramData = useMemo(() => {
        if (!isValid) return null;
        const width = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = width / 2;
        const centerY = cHeight / 2;
        const angleRad = (angle * Math.PI) / 180;
        const maxDim = Math.max(sideA, sideB);
        const pScale = Math.min(width * 0.4, cHeight * 0.4) / maxDim;

        const aScaled = sideA * pScale;
        const bScaled = sideB * pScale;
        const offset_x = bScaled * Math.cos(angleRad);
        const offset_y = bScaled * Math.sin(angleRad);

        return {
            points: [
                { x: centerX - aScaled / 2, y: centerY + offset_y / 2, label: 'A' },
                { x: centerX + aScaled / 2, y: centerY + offset_y / 2, label: 'B' },
                { x: centerX + aScaled / 2 + offset_x, y: centerY + offset_y / 2 - offset_y, label: 'C' },
                { x: centerX - aScaled / 2 + offset_x, y: centerY + offset_y / 2 - offset_y, label: 'D' }
            ],
            pScale
        };
    }, [sideA, sideB, angle, isValid, canvasSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const cHeight = canvas.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, cHeight);
        ctx.save();
        ctx.translate(width / 2, cHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2 + offset.x, -cHeight / 2 + offset.y);

        // Grid
        const gridSize = 40;
        ctx.strokeStyle = '#1a1a24';
        ctx.lineWidth = 0.5 / scale;
        for (let x = 0; x < width * 2; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x - width / 2, -cHeight);
            ctx.lineTo(x - width / 2, cHeight * 2);
            ctx.stroke();
        }
        for (let y = 0; y < cHeight * 2; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(-width, y - cHeight / 2);
            ctx.lineTo(width * 2, y - cHeight / 2);
            ctx.stroke();
        }

        if (isValid && parallelogramData) {
            const { points } = parallelogramData;

            ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
            ctx.shadowBlur = 40 / scale;

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.closePath();

            if (parallelogramFillColor === 'gradient') {
                const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
                gradient.addColorStop(0, 'rgba(236, 72, 153, 0.35)');
                gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
                gradient.addColorStop(1, 'rgba(236, 72, 153, 0.35)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = parallelogramFillColor + '80';
            }
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 4 / scale;
            ctx.stroke();

            // Height line
            ctx.setLineDash([8 / scale, 4 / scale]);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2.5 / scale;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[0].x, points[3].y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Labels
            const labels = ['A', 'B', 'C', 'D'];
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 18 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(236, 72, 153, 0.5)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 12 / scale, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.primary;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();

                let lx = point.x, ly = point.y;
                if (i === 0) { lx -= 40 / scale; ly += 10 / scale; }
                else if (i === 1) { lx += 40 / scale; ly += 10 / scale; }
                else if (i === 2) { lx += 40 / scale; ly -= 20 / scale; }
                else { lx -= 40 / scale; ly -= 20 / scale; }

                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.beginPath();
                ctx.roundRect(lx - 20 / scale, ly - 20 / scale, 40 / scale, 40 / scale, 8 / scale);
                ctx.fill();
                ctx.strokeStyle = COLORS.primary;
                ctx.lineWidth = 2 / scale;
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = `bold ${18 / scale}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(labels[i], lx, ly);
            });

            // Side labels
            const sides = [
                { p1: 0, p2: 1, label: `a = ${sideA} ${unitSymbol}`, color: COLORS.primary },
                { p1: 0, p2: 3, label: `b = ${sideB} ${unitSymbol}`, color: COLORS.purple }
            ];
            sides.forEach(side => {
                const midX = (points[side.p1].x + points[side.p2].x) / 2;
                const midY = (points[side.p1].y + points[side.p2].y) / 2 + (side.p1 === 0 && side.p2 === 1 ? 35 / scale : -35 / scale);

                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
                const textWidth = ctx.measureText(side.label).width + 24 / scale;
                ctx.beginPath();
                ctx.roundRect(midX - textWidth / 2, midY - 16 / scale, textWidth, 32 / scale, 8 / scale);
                ctx.fill();
                ctx.strokeStyle = side.color;
                ctx.lineWidth = 2 / scale;
                ctx.stroke();
                ctx.fillStyle = side.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(side.label, midX, midY);
            });
        }
        ctx.restore();


    }, [scale, offset, sideA, sideB, height, angle, isValid, canvasSize, parallelogramData, unitSymbol, parallelogramFillColor]);

    // Drawing canvas
    useEffect(() => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cWidth = canvas.width;
        const cHeight = canvas.height;

        ctx.clearRect(0, 0, cWidth, cHeight);

        // Draw paths
        drawings.forEach(d => {
            if (d.points.length < 2) return;
            ctx.save();
            ctx.translate(cWidth / 2, cHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);
            
            ctx.globalCompositeOperation = d.isEraser ? 'destination-out' : 'source-over';
            ctx.strokeStyle = d.isEraser ? 'rgba(0,0,0,1)' : d.color;
            ctx.lineWidth = d.size / scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(d.points[0].x, d.points[0].y);
            d.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        });

        if (currentPath.length > 1) {
            ctx.save();
            ctx.translate(cWidth / 2, cHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);
            
            ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : penColor;
            ctx.lineWidth = (activeTool === 'eraser' ? eraserSize : penSize) / scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        }
    }, [drawings, currentPath, scale, offset, penColor, penSize, eraserSize, activeTool, canvasSize]);

    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches?.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else { clientX = e.clientX; clientY = e.clientY; }
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return {
            x: (x - canvas.width / 2) / scale + canvas.width / 2 - offset.x,
            y: (y - canvas.height / 2) / scale + canvas.height / 2 - offset.y
        };
    };

    const getClientCoords = (e) => {
        if (e.touches?.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };

    const getPinchDistance = (e) => {
        if (e.touches?.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        return null;
    };

    const handleMouseDown = (e) => {
        if (activeTool === 'pen' || activeTool === 'eraser') {
            setIsDrawing(true);
            setCurrentPath([getCanvasCoords(e)]);
        } else if (activeTool === 'view') {
            const coords = getCanvasCoords(e);

            if (isLocked && parallelogramData) {
                const hitRadius = 20 / scale;
                const clickedVertexIndex = parallelogramData.points.findIndex(p => {
                    const dist = Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2);
                    return dist <= hitRadius;
                });

                if (clickedVertexIndex !== -1) {
                    setDraggingVertex(clickedVertexIndex);
                }
            } else if (!isLocked) {
                setIsDragging(true);
                const client = getClientCoords(e);
                setDragStart({ x: client.x - offset.x, y: client.y - offset.y });
            }
        }
    };

    const handleMouseMove = (e) => {
        const coords = getCanvasCoords(e);

        if (isDrawing && (activeTool === 'pen' || activeTool === 'eraser')) {
            setCurrentPath(prev => [...prev, coords]);
        } else if (draggingVertex !== null && parallelogramData && onSizeChange) {
            // Uchburchakdagi kabi - coords yangi cho'qqi joylashuvi
            const ts = parallelogramData.pScale;
            const p = parallelogramData.points;

            // Calculate new vertex positions
            const p0 = draggingVertex === 0 ? coords : p[0];
            const p1 = draggingVertex === 1 ? coords : p[1];
            const p2 = draggingVertex === 2 ? coords : p[2];
            const p3 = draggingVertex === 3 ? coords : p[3];

            // Distance function
            const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / ts;

            // Parallelogram sides:
            // sideA = AB distance (bottom edge)
            // sideB = AD distance (left edge)
            const newSideA = dist(p0, p1);
            const newSideB = dist(p0, p3);

            // Round values
            const roundedA = Math.round(newSideA * 10) / 10;
            const roundedB = Math.round(newSideB * 10) / 10;

            // Silent validation
            if (roundedA < 0.5 || roundedA > 50 || roundedB < 0.5 || roundedB > 50) {
                return;
            }

            onSizeChange({ sideA: roundedA, sideB: roundedB });
        } else if (isDragging && !isLocked) {
            const client = getClientCoords(e);
            setOffset({ x: client.x - dragStart.x, y: client.y - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentPath.length > 1) {
            setDrawings(prev => [...prev, { 
                points: currentPath, 
                color: penColor, 
                size: activeTool === 'eraser' ? eraserSize : penSize,
                isEraser: activeTool === 'eraser'
            }]);
        }
        setIsDrawing(false);
        setDraggingVertex(null);
        setCurrentPath([]);
        setIsDragging(false);
        setLastPinchDistance(null);
    };

    const handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            setLastPinchDistance(getPinchDistance(e));
            return;
        }
        handleMouseDown(e);
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && !isLocked) {
            const distance = getPinchDistance(e);
            if (lastPinchDistance && distance) {
                setScale(s => Math.max(0.3, Math.min(5, s * (distance / lastPinchDistance))));
                setLastPinchDistance(distance);
            }
            return;
        }
        handleMouseMove(e);
    };

    const handleWheel = (e) => {
        if (isLocked) return;
        e.preventDefault();
        setScale(s => Math.max(0.3, Math.min(5, s * (e.deltaY > 0 ? 0.9 : 1.1))));
    };

    return (
        <div className="fullscreen-whiteboard" ref={containerRef}>
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="whiteboard-main-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: activeTool === 'pen' || activeTool === 'eraser' ? (activeTool === 'eraser' ? 'cell' : 'crosshair') : (isDragging ? 'grabbing' : 'grab'), touchAction: 'none' }}
            />
            <canvas
                ref={drawingCanvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="whiteboard-drawing-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                onWheel={handleWheel}
                style={{ 
                    position: 'absolute', top: 0, left: 0, zIndex: 10,
                    pointerEvents: (activeTool === 'pen' || activeTool === 'eraser') ? 'auto' : 'none',
                    cursor: activeTool === 'eraser' ? 'cell' : 'crosshair',
                    touchAction: 'none'
                }}
            />

            <button className={`toolbar-toggle-btn ${isToolbarOpen ? 'open' : ''}`} onClick={() => setIsToolbarOpen(!isToolbarOpen)}>
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /><line x1="17" y1="17" x2="11" y2="11" /></svg>
                    </button>
                    <button className={`toolbar-btn ${isLocked ? 'active locked' : ''}`} onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Qulfni ochish" : "Qulflash"}>
                        {isLocked ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                        )}
                    </button>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-section zoom-section">
                    <button className="toolbar-btn" onClick={() => setScale(s => Math.min(5, s * 1.2))} title="Yaqinlashtirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <span className="zoom-level">{Math.round(scale * 100)}%</span>
                    <button className="toolbar-btn" onClick={() => setScale(s => Math.max(0.3, s * 0.8))} title="Uzoqlashtirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <button className="toolbar-btn" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} title="Qayta o'rnatish">
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
                    <input type="range" min="1" max="50" value={activeTool === 'eraser' ? eraserSize : penSize} onChange={(e) => activeTool === 'eraser' ? setEraserSize(parseInt(e.target.value)) : setPenSize(parseInt(e.target.value))} className="size-slider" />
                    <span className="size-value">{activeTool === 'eraser' ? eraserSize : penSize}px</span>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-section fill-section">
                    <span className="fill-label">Parallelogramm:</span>
                    <div className="fill-buttons">
                        <button className={`fill-btn ${parallelogramFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setParallelogramFillColor('gradient')} title="Gradient">
                            <span className="gradient-preview"></span>
                        </button>
                        {COLOR_PALETTE.slice(0, 5).map(color => (
                            <button key={`fill-${color}`} className={`fill-btn ${parallelogramFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setParallelogramFillColor(color)} title={`Bo'yash: ${color}`} />
                        ))}
                    </div>
                </div>
                <div className="toolbar-divider" />
                <div className="whiteboard-actions">
                    <button className="whiteboard-action-btn clear-btn" onClick={() => setDrawings([])} title="Tozalash">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                </div>
            </div>

            {/* Toast notification */}
            <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
                <span className="toast-icon">⚠️</span>
                <span className="toast-message">{toast.message}</span>
            </div>

            {/* Lock Indicator */}
            {isLocked && (
                <div className="lock-indicator">
                    🔒 Qulflangan - cho'qqilarni torting
                </div>
            )}

            {/* Save Button */}

            <button className="whiteboard-close-btn" onClick={onClose} title="Yopish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
            </button>
        </div>
    );
}

// Parallelogramm Canvas komponenti
function ParallelogramCanvas({ sideA, sideB, height, angle, showGrid, showHeight, showDiagonals, showAngles, showSides, showLabels, showCenter, showSymmetry, isValid }) {
    const canvasRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 700, height: 550 });

    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                const parent = canvasRef.current.parentElement;
                setCanvasSize({ width: parent.clientWidth, height: parent.clientHeight });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvasSize.width;
        const cHeight = canvasSize.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, cHeight);

        // Grid
        if (showGrid) {
            const gridSize = 25;
            const offsetX = (width / 2) % gridSize;
            const offsetY = (cHeight / 2) % gridSize;
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 1;
            for (let x = offsetX; x < width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cHeight); ctx.stroke();
            }
            for (let x = offsetX - gridSize; x >= 0; x -= gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cHeight); ctx.stroke();
            }
            for (let y = offsetY; y < cHeight; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
            for (let y = offsetY - gridSize; y >= 0; y -= gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
        }

        if (!isValid) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Parallelogramm hosil bo\'lmaydi!', width / 2, cHeight / 2);
            return;
        }

        const centerX = width / 2;
        const centerY = cHeight / 2 + 20;
        const maxDim = Math.max(sideA, sideB, height);
        const scale = Math.min(width * 0.6, cHeight * 0.5) / maxDim;

        const aScaled = sideA * scale;
        const bScaled = sideB * scale;
        const hScaled = height * scale;
        const angleRad = (angle * Math.PI) / 180;
        const offset = hScaled / Math.tan(angleRad);

        const points = [
            { x: centerX - aScaled / 2, y: centerY + hScaled / 2, label: 'D' },
            { x: centerX + aScaled / 2, y: centerY + hScaled / 2, label: 'C' },
            { x: centerX + aScaled / 2 - offset, y: centerY - hScaled / 2, label: 'B' },
            { x: centerX - aScaled / 2 - offset, y: centerY - hScaled / 2, label: 'A' }
        ];

        ctx.shadowColor = 'rgba(236, 72, 153, 0.3)';
        ctx.shadowBlur = 30;

        const gradient = ctx.createLinearGradient(points[3].x, points[3].y, points[1].x, points[1].y);
        gradient.addColorStop(0, 'rgba(236, 72, 153, 0.25)');
        gradient.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.25)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        if (showHeight) {
            const heightX = points[0].x + aScaled / 4;
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(heightX, points[3].y);
            ctx.lineTo(heightX, points[0].y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.beginPath();
            ctx.roundRect(heightX + 10, (points[0].y + points[3].y) / 2 - 10, 20, 20, 4);
            ctx.fill();
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = COLORS.accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('h', heightX + 20, (points[0].y + points[3].y) / 2);
        }

        if (showDiagonals) {
            ctx.setLineDash([6, 3]);
            ctx.strokeStyle = COLORS.purple;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(points[1].x, points[1].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (showAngles) {
            const arcRadius = 25;
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(points[0].x, points[0].y, arcRadius, -Math.PI / 2 - angleRad + Math.PI, 0);
            ctx.stroke();

            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(`${angle}°`, points[0].x + 35, points[0].y - 15);
        }

        // Tomonlarni ko'rsatish
        if (showSides) {
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // a tomoni (pastki)
            const midBottom = { x: (points[0].x + points[1].x) / 2, y: points[0].y + 20 };
            ctx.beginPath();
            ctx.roundRect(midBottom.x - 15, midBottom.y - 10, 30, 20, 4);
            ctx.fill();
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = COLORS.primary;
            ctx.fillText(`a=${sideA}`, midBottom.x, midBottom.y);

            // b tomoni (chap)
            const midLeft = { x: (points[0].x + points[3].x) / 2 - 25, y: (points[0].y + points[3].y) / 2 };
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(midLeft.x - 15, midLeft.y - 10, 30, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#8b5cf6';
            ctx.stroke();
            ctx.fillStyle = '#8b5cf6';
            ctx.fillText(`b=${sideB}`, midLeft.x, midLeft.y);
        }

        // Markaz nuqtani ko'rsatish
        if (showCenter) {
            const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
            const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

            ctx.beginPath();
            ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(centerX + 10, centerY - 10, 20, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('O', centerX + 20, centerY);
        }

        // Simmetriya markazi (nuqtaviy simmetriya)
        if (showSymmetry) {
            const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
            const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.moveTo(centerX - 40, centerY);
            ctx.lineTo(centerX + 40, centerY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 40);
            ctx.lineTo(centerX, centerY + 40);
            ctx.stroke();

            ctx.setLineDash([]);
        }

        // Vertex nuqtalar va labellar
        if (showLabels) {
            const labels = ['D', 'C', 'B', 'A'];
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.primary;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();

                let lx = point.x, ly = point.y;
                if (i === 0) { lx -= 20; ly += 15; }
                else if (i === 1) { lx += 20; ly += 15; }
                else if (i === 2) { lx += 20; ly -= 10; }
                else { lx -= 20; ly -= 10; }

                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(lx - 10, ly - 10, 20, 20, 4);
                ctx.fill();
                ctx.strokeStyle = COLORS.primary;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(labels[i], lx, ly);
            });
        }

    }, [sideA, sideB, height, angle, showGrid, showHeight, showDiagonals, showAngles, showSides, showLabels, showCenter, showSymmetry, isValid, canvasSize]);

    return <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="triangle-canvas" style={{ display: 'block', width: '100%', height: '100%' }} />;
}

export function ParallelogrammPage() {
    const [sideA, setSideA] = useState(10);
    const [sideB, setSideB] = useState(6);
    const [height, setHeight] = useState(5);
    const [angle, setAngle] = useState(60);
    const [unit, setUnit] = useState('sm');

    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setSideA(prev => Math.round(prev * ratio * 100) / 100);
        setSideB(prev => Math.round(prev * ratio * 100) / 100);
        setHeight(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };

    const [showGrid, setShowGrid] = useState(true);
    const [showHeight, setShowHeight] = useState(true);
    const [showDiagonals, setShowDiagonals] = useState(false);
    const [showAngles, setShowAngles] = useState(true);
    const [showSides, setShowSides] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [showCenter, setShowCenter] = useState(false);
    const [showSymmetry, setShowSymmetry] = useState(false);
    const [resultModal, setResultModal] = useState(null);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const containerRef = useRef(null);
    const unitSymbol = UNITS[unit].symbol;

    const calculations = useMemo(() => {
        const a = sideA;
        const b = sideB;
        const h = height;
        const angleRad = (angle * Math.PI) / 180;

        const area = a * h;
        const perimeter = 2 * (a + b);
        const d1 = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(angleRad));
        const d2 = Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(angleRad));
        const oppositeAngle = 180 - angle;

        const isValid = a > 0 && b > 0 && h > 0 && angle > 0 && angle < 180 && h <= b;

        return {
            area: area.toFixed(2),
            perimeter: perimeter.toFixed(2),
            diagonal1: d1.toFixed(2),
            diagonal2: d2.toFixed(2),
            oppositeAngle: oppositeAngle.toFixed(1),
            isValid
        };
    }, [sideA, sideB, height, angle]);

    // Fullscreen funksiyalari
    const enterFullscreen = () => {
        setIsFullscreen(true);
    };


    const exitFullscreen = () => {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
        setIsFullscreen(false);
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                setIsFullscreen(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    if (isFullscreen) {
        return (
            <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: '#0a0a0f' }}>
                <FullscreenParallelogram
                    sideA={sideA}
                    sideB={sideB}
                    height={height}
                    angle={angle}
                    unitSymbol={unitSymbol}
                    isValid={calculations.isValid}
                    onClose={exitFullscreen}
                    onSizeChange={({ sideA: newA, sideB: newB }) => {
                        setSideA(newA);
                        setSideB(newB);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="shape-page uchburchak-page">
            <header className="shape-page-header pro-page-header pro-header-enhanced">
                <div className="header-left-section">
                    <Link to="/2d-models" className="back-btn" title="2D shakllarga qaytish">
                        ← Orqaga
                    </Link>
                    <Link to="/" className="header-logo-link" title="Bosh sahifa">
                        <img src="/logo.png" alt="Logo" className="header-logo-img" />
                    </Link>
                    <div className="header-divider"></div>
                    <div className="pro-page-header-content">
                        <div className="pro-header-icon">
                            <span className="icon-glow" style={{ color: COLORS.primary }}>▱</span>
                        </div>
                        <div className="pro-header-text">
                            <h1>Parallelogramm</h1>
                            <p>Qarama-qarshi tomonlari parallel to'rtburchak</p>
                        </div>
                    </div>
                </div>
                <div className="header-right-section">
                    <UserMenu />
                </div>
            </header>

            <div className="shape-page-content">
                <aside className="params-panel pro-params-panel pro-settings-panel">
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon"><span className="icon-glow">⚙️</span></div>
                            <div className="pro-header-text"><h2>Sozlamalar</h2></div>
                        </div>
                    </div>

                    <div className="pro-sections-container">
                        <details className="pro-section settings-unit-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchov birligi</span>
                                <span className="pro-section-badge">{UNITS[unit].symbol}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-unit-grid">
                                    {Object.entries(UNITS).map(([key, value]) => (
                                        <button key={key} className={`pro-settings-btn ${unit === key ? 'active' : ''}`} onClick={() => handleUnitChange(key)}>
                                            <span className="settings-btn-icon">{value.symbol}</span>
                                            <span className="settings-btn-label">{value.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>

                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">O'lchamlar</span>
                                <span className="pro-section-badge">4 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>a</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Asos (a)</span>
                                                <span className="pro-side-desc">AB = CD</span>
                                            </div>
                                            <div className="pro-side-value">{sideA} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="2" max="20" step="0.5" value={sideA} onChange={(e) => setSideA(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#ec4899' }} />
                                        </div>
                                    </div>

                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>b</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Yon tomon (b)</span>
                                                <span className="pro-side-desc">AD = BC</span>
                                            </div>
                                            <div className="pro-side-value">{sideB} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="2" max="15" step="0.5" value={sideB} onChange={(e) => setSideB(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#8b5cf6' }} />
                                        </div>
                                    </div>

                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>h</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Balandlik</span>
                                                <span className="pro-side-desc">Perpendikulyar</span>
                                            </div>
                                            <div className="pro-side-value">{height} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="1" max="12" step="0.5" value={height} onChange={(e) => setHeight(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#f59e0b' }} />
                                        </div>
                                    </div>

                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}>∠</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Burchak</span>
                                                <span className="pro-side-desc">O'tkir burchak</span>
                                            </div>
                                            <div className="pro-side-value">{angle}°</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="30" max="90" step="1" value={angle} onChange={(e) => setAngle(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#22d3ee' }} />
                                        </div>
                                    </div>

                                    {!calculations.isValid && (
                                        <div className="pro-error-box">
                                            <div className="error-icon-wrap">⚠️</div>
                                            <div className="error-text">
                                                <strong>Parallelogramm hosil bo'lmaydi!</strong>
                                                <p>Balandlik yon tomondan katta bo'lmasligi kerak</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </details>

                        <details className="pro-section settings-view-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">👁️</div>
                                <span className="pro-section-title">Ko'rinish</span>
                                <span className="pro-section-badge">{[showGrid, showHeight, showDiagonals, showAngles, showSides, showLabels, showCenter, showSymmetry].filter(Boolean).length}/8</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
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
                                        <button className={`pro-toggle-item ${showSides ? 'active' : ''}`} onClick={() => setShowSides(!showSides)}>
                                            <span className="toggle-icon">—</span>
                                            <span className="toggle-label">Tomonlar</span>
                                            <span className={`toggle-status ${showSides ? 'on' : 'off'}`}>{showSides ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(!showLabels)}>
                                            <span className="toggle-icon">A</span>
                                            <span className="toggle-label">Labellar</span>
                                            <span className={`toggle-status ${showLabels ? 'on' : 'off'}`}>{showLabels ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showAngles ? 'active' : ''}`} onClick={() => setShowAngles(!showAngles)}>
                                            <span className="toggle-icon">∠</span>
                                            <span className="toggle-label">Burchaklar</span>
                                            <span className={`toggle-status ${showAngles ? 'on' : 'off'}`}>{showAngles ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showHeight ? 'active' : ''}`} onClick={() => setShowHeight(!showHeight)}>
                                            <span className="toggle-icon">↕</span>
                                            <span className="toggle-label">Balandlik</span>
                                            <span className={`toggle-status ${showHeight ? 'on' : 'off'}`}>{showHeight ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">✨ Qo'shimcha</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showDiagonals ? 'active' : ''}`} onClick={() => setShowDiagonals(!showDiagonals)}>
                                            <span className="toggle-icon">⟋</span>
                                            <span className="toggle-label">Diagonallar</span>
                                            <span className={`toggle-status ${showDiagonals ? 'on' : 'off'}`}>{showDiagonals ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showCenter ? 'active' : ''}`} onClick={() => setShowCenter(!showCenter)}>
                                            <span className="toggle-icon">⊙</span>
                                            <span className="toggle-label">Markaz</span>
                                            <span className={`toggle-status ${showCenter ? 'on' : 'off'}`}>{showCenter ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showSymmetry ? 'active' : ''}`} onClick={() => setShowSymmetry(!showSymmetry)}>
                                            <span className="toggle-icon">⊕</span>
                                            <span className="toggle-label">Simmetriya</span>
                                            <span className={`toggle-status ${showSymmetry ? 'on' : 'off'}`}>{showSymmetry ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </aside>

                <section className="canvas-panel" style={{ position: 'relative' }}>
                    <ParallelogramCanvas
                        sideA={sideA}
                        sideB={sideB}
                        height={height}
                        angle={angle}
                        showGrid={showGrid}
                        showHeight={showHeight}
                        showDiagonals={showDiagonals}
                        showAngles={showAngles}
                        showSides={showSides}
                        showLabels={showLabels}
                        showCenter={showCenter}
                        showSymmetry={showSymmetry}
                        isValid={calculations.isValid}
                    />
                    {calculations.isValid && (
                        <>
                            <div className="shape-type-badge">
                                <span className="badge-icon">▱</span>
                                Parallelogramm
                            </div>
                            <button className="fullscreen-toggle-btn" onClick={enterFullscreen} title="To'liq ekran">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                            </button>
                        </>
                    )}
                </section>

                <aside className="formulas-panel pro-results-panel" style={{ minWidth: '340px' }}>
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon"><span className="icon-glow">📊</span></div>
                            <div className="pro-header-text"><h2>Natijalar</h2></div>
                        </div>
                    </div>

                    <div className="pro-main-results">
                        <div className="pro-result-card area-card" onClick={() => setResultModal('area')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /></svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Yuzasi</span>
                                <span className="pro-card-value">{calculations.area}</span>
                                <span className="pro-card-unit">{unitSymbol}²</span>
                            </div>
                            <div className="pro-card-formula">S = a × h</div>
                        </div>

                        <div className="pro-result-card perimeter-card" onClick={() => setResultModal('perimeter')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20M12 2v20" /></svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Perimetri</span>
                                <span className="pro-card-value">{calculations.perimeter}</span>
                                <span className="pro-card-unit">{unitSymbol}</span>
                            </div>
                            <div className="pro-card-formula">P = 2(a + b)</div>
                        </div>
                    </div>

                    <div className="pro-sections-container">
                        <details className="pro-section measurements-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchovlar</span>
                                <span className="pro-section-badge">4 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⟋ Diagonallar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('diagonal1')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">d₁</span>
                                            <span className="measure-value">{calculations.diagonal1} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item" onClick={() => setResultModal('diagonal2')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">d₂</span>
                                            <span className="measure-value">{calculations.diagonal2} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">∠ Burchaklar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">α</span>
                                            <span className="measure-value">{angle}°</span>
                                        </div>
                                        <div className="pro-measure-item">
                                            <span className="measure-label">β</span>
                                            <span className="measure-value">{calculations.oppositeAngle}°</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <details className="pro-section formulas-section">
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📚</div>
                                <span className="pro-section-title">Formulalar</span>
                                <span className="pro-section-badge">5 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📐 Asosiy</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>S = a × h</code><span>Yuza</span></div>
                                        <div className="pro-formula-item"><code>P = 2(a + b)</code><span>Perimetr</span></div>
                                    </div>
                                </div>
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">⟋ Diagonallar</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>d₁ = √(a² + b² - 2ab·cos α)</code><span>Kichik</span></div>
                                        <div className="pro-formula-item"><code>d₂ = √(a² + b² + 2ab·cos α)</code><span>Katta</span></div>
                                        <div className="pro-formula-item"><code>d₁² + d₂² = 2(a² + b²)</code><span>Munosabat</span></div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <div className="pro-section rules-section" onClick={() => setShowRulesModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="pro-section-header">
                                <div className="pro-section-icon">📖</div>
                                <span className="pro-section-title">Qoidalar</span>
                                <span className="pro-section-badge">5 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {resultModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }} onClick={() => setResultModal(null)}>
                    <div style={{ backgroundColor: '#1e1e24', padding: '30px', borderRadius: '20px', maxWidth: '600px', width: '90%', border: '1px solid #2a2a35', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setResultModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        {resultModal === 'area' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#ec4899' }}>📐 Yuzasini hisoblash</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>S = a × h</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>S = {sideA} × {height}</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ec4899', marginTop: '10px' }}>S = {calculations.area} {unitSymbol}²</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'perimeter' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#8b5cf6' }}>📏 Perimetrni hisoblash</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>P = 2(a + b)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>P = 2({sideA} + {sideB})</div>
                                        <div>P = 2 × {sideA + sideB}</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', marginTop: '10px' }}>P = {calculations.perimeter} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'diagonal1' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#22d3ee' }}>⟋ Kichik diagonal (d₁)</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>d₁ = √(a² + b² - 2ab·cos α)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>d₁ = √({sideA}² + {sideB}² - 2×{sideA}×{sideB}×cos {angle}°)</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22d3ee', marginTop: '10px' }}>d₁ = {calculations.diagonal1} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'diagonal2' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981' }}>⟋ Katta diagonal (d₂)</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>d₂ = √(a² + b² + 2ab·cos α)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>d₂ = √({sideA}² + {sideB}² + 2×{sideA}×{sideB}×cos {angle}°)</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '10px' }}>d₂ = {calculations.diagonal2} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showRulesModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowRulesModal(false)}>
                    <div style={{ backgroundColor: '#1e1e24', padding: '30px', borderRadius: '24px', maxWidth: '700px', width: '90%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #2a2a35', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowRulesModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '28px', cursor: 'pointer' }}>×</button>
                        <h3 style={{ fontSize: '28px', marginBottom: '25px', color: '#ec4899' }}>📖 Parallelogramm qoidalari</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { num: 1, title: "Ta'rifi", desc: "Qarama-qarshi tomonlari parallel va teng bo'lgan to'rtburchak", color: '#ec4899' },
                                { num: 2, title: "Qarama-qarshi burchaklar", desc: "Qarama-qarshi burchaklar o'zaro teng: α = γ, β = δ", color: '#22d3ee' },
                                { num: 3, title: "Yonma-yon burchaklar", desc: "Yonma-yon burchaklar yig'indisi 180°: α + β = 180°", color: '#f59e0b' },
                                { num: 4, title: "Diagonallar", desc: "Diagonallar bir-birini yarimlab kesishadi", color: '#8b5cf6' },
                                { num: 5, title: "Yuza", desc: "S = a × h yoki S = a × b × sin α", color: '#10b981' }
                            ].map(rule => (
                                <div key={rule.num} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px', border: `1px solid ${rule.color}30` }}>
                                    <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${rule.color}40, ${rule.color}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', color: rule.color, flexShrink: 0 }}>{rule.num}</span>
                                    <div>
                                        <strong style={{ color: rule.color, fontSize: '16px', display: 'block', marginBottom: '4px' }}>{rule.title}</strong>
                                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{rule.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

