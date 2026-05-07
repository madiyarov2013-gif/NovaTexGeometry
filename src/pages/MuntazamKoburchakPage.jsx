import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

// O'lchov birliklari
const UNITS = {
    mm: { name: 'Millimetr', symbol: 'mm', factor: 0.001 },
    sm: { name: 'Santimetr', symbol: 'sm', factor: 0.01 },
    m: { name: 'Metr', symbol: 'm', factor: 1 }
};

// Rang palitra
const COLORS = {
    primary: '#a855f7',
    secondary: '#6366f1',
    accent: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6'
};

// Rang tanlash palitasi
const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Fullscreen Whiteboard komponenti
function FullscreenPolygonWhiteboard({
    sides, sideLength, unitSymbol, calculations, onClose, onSidesChange, onSideLengthChange
}) {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const containerRef = useRef(null);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isLocked, setIsLocked] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [toast, setToast] = useState({ show: false, message: '' });

    const [activeTool, setActiveTool] = useState('view');
    const [drawings, setDrawings] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [penColor, setPenColor] = useState('#ffffff');
    const [penSize, setPenSize] = useState(3);

    const [polygonFillColor, setPolygonFillColor] = useState('gradient');
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
    const [eraserSize, setEraserSize] = useState(20);
    const [lastPinchDistance, setLastPinchDistance] = useState(null);
    const [draggingVertex, setDraggingVertex] = useState(null); // Vertex index being dragged

    const GRID_SIZE = 40;

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Ko'pburchak nuqtalarini hisoblash
    const polygonData = useMemo(() => {
        const width = canvasSize.width;
        const height = canvasSize.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // Scale to fit screen
        const maxRadius = Math.min(width, height) * 0.35;
        const circumradius = parseFloat(calculations.circumradius) || sideLength;
        const polygonScale = maxRadius / circumradius;
        const scaledRadius = circumradius * polygonScale;

        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
            points.push({
                x: centerX + scaledRadius * Math.cos(angle),
                y: centerY + scaledRadius * Math.sin(angle),
                label: String.fromCharCode(65 + i)
            });
        }

        return { points, polygonScale, centerX, centerY, scaledRadius };
    }, [sides, sideLength, calculations, canvasSize]);

    // Main canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2 + offset.x, -height / 2 + offset.y);

        // Grid
        const gridSize = GRID_SIZE;
        const visibleLeft = -offset.x - width / 2 / scale;
        const visibleTop = -offset.y - height / 2 / scale;
        const visibleRight = -offset.x + width / 2 / scale + width;
        const visibleBottom = -offset.y + height / 2 / scale + height;

        ctx.strokeStyle = '#1a1a24';
        ctx.lineWidth = 0.5 / scale;
        for (let x = Math.floor(visibleLeft / gridSize) * gridSize; x < visibleRight; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, visibleTop);
            ctx.lineTo(x, visibleBottom);
            ctx.stroke();
        }
        for (let y = Math.floor(visibleTop / gridSize) * gridSize; y < visibleBottom; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(visibleLeft, y);
            ctx.lineTo(visibleRight, y);
            ctx.stroke();
        }

        // Draw polygon
        if (polygonData.points.length >= 3) {
            const { points, centerX, centerY, scaledRadius } = polygonData;

            ctx.shadowColor = 'rgba(168, 85, 247, 0.5)';
            ctx.shadowBlur = 40 / scale;

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();

            if (polygonFillColor === 'gradient') {
                const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, scaledRadius);
                gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
                gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
                gradient.addColorStop(1, 'rgba(139, 92, 246, 0.35)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = polygonFillColor + '80';
            }
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 4 / scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Apotema chizig'i
            const apotemaLen = parseFloat(calculations.apotema) * polygonData.polygonScale;
            ctx.beginPath();
            ctx.setLineDash([8 / scale, 4 / scale]);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5 / scale;
            ctx.moveTo(centerX, centerY);
            ctx.lineTo((points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Markaz nuqtasi
            ctx.beginPath();
            ctx.arc(centerX, centerY, 10 / scale, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();

            ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
            ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.beginPath();
            ctx.roundRect(centerX - 15 / scale, centerY + 20 / scale, 30 / scale, 24 / scale, 6 / scale);
            ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('O', centerX, centerY + 32 / scale);

            // Vertex nuqtalari
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 15 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 10 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#a855f7';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 4 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();

                // Label
                const labelDist = 35 / scale;
                const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
                const lx = point.x + Math.cos(angle) * labelDist;
                const ly = point.y + Math.sin(angle) * labelDist;

                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.beginPath();
                ctx.roundRect(lx - 16 / scale, ly - 16 / scale, 32 / scale, 32 / scale, 8 / scale);
                ctx.fill();
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2 / scale;
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = `bold ${16 / scale}px Inter, sans-serif`;
                ctx.fillText(point.label, lx, ly);
            });

            // Tomon uzunligi labeli
            const midX = (points[0].x + points[1].x) / 2;
            const midY = (points[0].y + points[1].y) / 2;
            const dx = points[1].x - points[0].x;
            const dy = points[1].y - points[0].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len * (35 / scale);
            const ny = dx / len * (35 / scale);
            const tx = midX + nx;
            const ty = midY + ny;

            const sideLabel = `a = ${sideLength} ${unitSymbol}`;
            ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
            ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
            const textWidth = ctx.measureText(sideLabel).width + 24 / scale;
            ctx.beginPath();
            ctx.roundRect(tx - textWidth / 2, ty - 16 / scale, textWidth, 32 / scale, 8 / scale);
            ctx.fill();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            ctx.fillStyle = '#10b981';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sideLabel, tx, ty);
        }

        ctx.restore();
    }, [scale, offset, sides, sideLength, calculations, canvasSize, polygonFillColor, unitSymbol, polygonData]);

    // Drawing canvas
    useEffect(() => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2 + offset.x, -canvas.height / 2 + offset.y);

        drawings.forEach(drawing => {
            if (drawing.points.length < 2) return;
            ctx.globalCompositeOperation = drawing.isEraser ? 'destination-out' : 'source-over';
            ctx.strokeStyle = drawing.isEraser ? 'rgba(0,0,0,1)' : drawing.color;
            ctx.lineWidth = (drawing.isEraser ? drawing.size : drawing.size) / scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
            for (let i = 1; i < drawing.points.length; i++) {
                ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
            }
            ctx.stroke();
        });

        if (currentPath.length > 1) {
            ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : penColor;
            ctx.lineWidth = (activeTool === 'eraser' ? eraserSize : penSize) / scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }, [drawings, currentPath, scale, offset, penColor, penSize, eraserSize, activeTool, canvasSize]);

    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const canvasX = (x - canvas.width / 2) / scale + canvas.width / 2 - offset.x;
        const canvasY = (y - canvas.height / 2) / scale + canvas.height / 2 - offset.y;
        return { x: canvasX, y: canvasY };
    };

    const handleMouseDown = (e) => {
        if (activeTool === 'pen' || activeTool === 'eraser') {
            setIsDrawing(true);
            const coords = getCanvasCoords(e);
            setCurrentPath([coords]);
        } else if (activeTool === 'view') {
            const coords = getCanvasCoords(e);

            if (isLocked) {
                // Check for vertex points to drag
                if (polygonData && polygonData.points) {
                    const hitRadius = 25 / scale;
                    const clickedVertexIndex = polygonData.points.findIndex(p => {
                        const dist = Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2);
                        return dist <= hitRadius;
                    });

                    if (clickedVertexIndex !== -1) {
                        setDraggingVertex(clickedVertexIndex);
                    }
                }
            } else {
                // Pan mode
                setIsDragging(true);
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
            }
        }
    };

    const handleMouseMove = (e) => {
        if (isDrawing && (activeTool === 'pen' || activeTool === 'eraser')) {
            const coords = getCanvasCoords(e);
            setCurrentPath(prev => [...prev, coords]);
        } else if (draggingVertex !== null && polygonData) {
            // Vertex dragging - change number of sides based on Y movement
            const coords = getCanvasCoords(e);
            const { centerY } = polygonData;

            // Y difference from center (negative = up, positive = down in canvas)
            const yDiff = centerY - coords.y; // Positive when dragging UP

            // Calculate sides based on Y position
            // Dragging UP = more sides, dragging DOWN = fewer sides
            const sensitivity = 25; // pixels per side change
            const sideDelta = Math.floor(yDiff / sensitivity);

            const newSides = Math.max(3, Math.min(12, 6 + sideDelta)); // Base is 6

            if (newSides !== sides) {
                onSidesChange(newSides);
            }

        } else if (isDragging && !isLocked) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            setOffset({
                x: clientX - dragStart.x,
                y: clientY - dragStart.y
            });
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
        setCurrentPath([]);
        setIsDragging(false);
        setDraggingVertex(null);
    };

    const handleWheel = (e) => {
        if (isLocked) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.max(0.3, Math.min(5, s * delta)));
    };

    const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };
    const clearDrawings = () => { setDrawings([]); setCurrentPath([]); };

    // Touch Event Helpers
    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const getPinchDistance = (e) => {
        if (e.touches && e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        return null;
    };

    const handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            const distance = getPinchDistance(e);
            setLastPinchDistance(distance);
            return;
        }
        handleMouseDown(e);
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && !isLocked) {
            const distance = getPinchDistance(e);
            if (lastPinchDistance !== null && distance !== null) {
                const zoomFactor = distance / lastPinchDistance;
                setScale(s => Math.max(0.3, Math.min(5, s * zoomFactor)));
                setLastPinchDistance(distance);
            }
            return;
        }
        handleMouseMove(e);
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        handleMouseUp();
        setLastPinchDistance(null);
    };

    return (
        <div className="fullscreen-whiteboard" ref={containerRef}>
            <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height}
                className="whiteboard-main-canvas"
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
                onWheel={handleWheel}
                style={{ cursor: activeTool === 'pen' || activeTool === 'eraser' ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'), touchAction: 'none' }}
            />
            <canvas ref={drawingCanvasRef} width={canvasSize.width} height={canvasSize.height}
                className="whiteboard-drawing-canvas"
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
                onWheel={handleWheel}
                style={{
                    cursor: activeTool === 'pen' || activeTool === 'eraser' ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'),
                    pointerEvents: activeTool === 'pen' || activeTool === 'eraser' ? 'auto' : 'none', touchAction: 'none'
                }}
            />

            <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
                <span className="toast-icon">🔓</span>
                <span className="toast-message">{toast.message}</span>
            </div>

            <button className={`toolbar-toggle-btn ${isToolbarOpen ? 'open' : ''}`}
                onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                title={isToolbarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}>
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
                    <button className={`toolbar-btn ${isLocked ? 'active locked' : ''}`}
                        onClick={() => {
                            if (isLocked) { setToast({ show: true, message: 'Qulfdan chiqarildi' }); setTimeout(() => setToast({ show: false, message: '' }), 3000); }
                            setIsLocked(!isLocked);
                        }} title={isLocked ? 'Qulfni ochish' : 'Qulflash'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isLocked ? <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>}
                        </svg>
                    </button>
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-section zoom-section">
                    <button className="toolbar-btn" onClick={() => setScale(s => Math.min(5, s * 1.2))} disabled={isLocked} title="Yaqinlashtirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <span className="zoom-level">{Math.round(scale * 100)}%</span>
                    <button className="toolbar-btn" onClick={() => setScale(s => Math.max(0.3, s * 0.8))} disabled={isLocked} title="Uzoqlashtirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <button className="toolbar-btn" onClick={resetView} disabled={isLocked} title="Qayta o'rnatish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-section color-section">
                    <div className="color-palette">
                        {COLOR_PALETTE.map(color => (
                            <button key={color} className={`color-btn ${penColor === color ? 'active' : ''}`}
                                style={{ backgroundColor: color }} onClick={() => setPenColor(color)} />
                        ))}
                    </div>
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-section size-section">
                    <span className="size-label">{activeTool === 'eraser' ? "O'chirgich:" : "Qalinlik:"}</span>
                    <input type="range" min="1" max={activeTool === 'eraser' ? "100" : "50"}
                        value={activeTool === 'eraser' ? eraserSize : penSize}
                        onChange={(e) => activeTool === 'eraser' ? setEraserSize(parseInt(e.target.value)) : setPenSize(parseInt(e.target.value))}
                        className="size-slider" />
                    <span className="size-value">{activeTool === 'eraser' ? eraserSize : penSize}px</span>
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-section fill-section">
                    <span className="fill-label">Ko'pburchak:</span>
                    <div className="fill-buttons">
                        <button className={`fill-btn ${polygonFillColor === 'gradient' ? 'active' : ''}`}
                            onClick={() => setPolygonFillColor('gradient')} title="Gradient">
                            <span className="gradient-preview"></span>
                        </button>
                        {COLOR_PALETTE.slice(0, 5).map(color => (
                            <button key={`fill-${color}`} className={`fill-btn ${polygonFillColor === color ? 'active' : ''}`}
                                style={{ backgroundColor: color }} onClick={() => setPolygonFillColor(color)} />
                        ))}
                    </div>
                </div>

                <div className="toolbar-divider" />

                <div className="whiteboard-actions">
                    <button className="whiteboard-action-btn clear-btn" onClick={clearDrawings} title="Chizmalarni tozalash">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                </div>
            </div>

            {isLocked && <div className="lock-indicator">🔒 Qulflangan</div>}

            <button className="whiteboard-close-btn" onClick={onClose} title="Yopish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
            </button>
        </div>
    );
}

// Polygon Canvas komponenti
function PolygonCanvas({ sides, sideLength, showGrid, showApotema, showSides, showAngles, showIncircle, showCircumcircle, calculations }) {
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
        const height = canvasSize.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Grid
        if (showGrid) {
            const gridSize = 30;
            const offsetX = (width / 2) % gridSize;
            const offsetY = (height / 2) % gridSize;
            ctx.strokeStyle = '#1a1a28';
            ctx.lineWidth = 1;
            for (let x = offsetX; x < width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let x = offsetX - gridSize; x >= 0; x -= gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = offsetY; y < height; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
            for (let y = offsetY - gridSize; y >= 0; y -= gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
        }

        const centerX = width / 2;
        const centerY = height / 2;

        const circumradius = parseFloat(calculations.circumradius) || sideLength;
        const apotema = parseFloat(calculations.apotema) || sideLength * 0.8;
        const maxRadius = Math.min(width, height) * 0.38;
        const scale = maxRadius / circumradius;
        const scaledCircumradius = circumradius * scale;
        const scaledApotema = apotema * scale;

        // Tashqi aylana
        if (showCircumcircle) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, scaledCircumradius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Ichki aylana
        if (showIncircle) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, scaledApotema, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Ko'pburchak nuqtalari
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
            points.push({
                x: centerX + scaledCircumradius * Math.cos(angle),
                y: centerY + scaledCircumradius * Math.sin(angle)
            });
        }

        // Shadow
        ctx.shadowColor = 'rgba(168, 85, 247, 0.5)';
        ctx.shadowBlur = 30;

        // Fill
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, scaledCircumradius);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Apotema
        if (showApotema) {
            const midX = (points[0].x + points[1].x) / 2;
            const midY = (points[0].y + points[1].y) / 2;
            ctx.beginPath();
            ctx.setLineDash([6, 3]);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(midX, midY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Markaz nuqtasi
        ctx.beginPath();
        ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        // Vertex nuqtalari
        points.forEach((point, i) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#a855f7';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Label
            const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
            const lx = point.x + Math.cos(angle) * 25;
            const ly = point.y + Math.sin(angle) * 25;

            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(lx - 10, ly - 10, 20, 20, 5);
            ctx.fill();
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String.fromCharCode(65 + i), lx, ly);
        });

        // Burchak ko'rsatish
        if (showAngles) {
            const interiorAngle = parseFloat(calculations.interiorAngle);
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = '#8b5cf6';

            const arcRadius = 20;
            const prev = points[points.length - 1];
            const curr = points[0];
            const next = points[1];
            const angle1 = Math.atan2(prev.y - curr.y, prev.x - curr.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);

            ctx.beginPath();
            ctx.arc(curr.x, curr.y, arcRadius, angle2, angle1);
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const midAngle = (angle1 + angle2) / 2;
            const tx = curr.x + Math.cos(midAngle) * (arcRadius + 18);
            const ty = curr.y + Math.sin(midAngle) * (arcRadius + 18);

            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(tx - 22, ty - 10, 44, 20, 4);
            ctx.fill();
            ctx.fillStyle = '#8b5cf6';
            ctx.fillText(`${interiorAngle}°`, tx, ty);
        }

        // Tomon uzunligi
        if (showSides) {
            const midX = (points[0].x + points[1].x) / 2;
            const midY = (points[0].y + points[1].y) / 2;
            const dx = points[1].x - points[0].x;
            const dy = points[1].y - points[0].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len * 25;
            const ny = dx / len * 25;

            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(midX + nx - 30, midY + ny - 10, 60, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`a = ${sideLength}`, midX + nx, midY + ny);
        }

    }, [sides, sideLength, showGrid, showApotema, showSides, showAngles, showIncircle, showCircumcircle, calculations, canvasSize]);

    return <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="triangle-canvas" style={{ display: 'block', width: '100%', height: '100%' }} />;
}

// Asosiy sahifa komponenti
export function MuntazamKoburchakPage() {
    const [sides, setSides] = useState(6);
    const [sideLength, setSideLength] = useState(5);
    const [unit, setUnit] = useState('sm');

    const [showGrid, setShowGrid] = useState(true);
    const [showAngles, setShowAngles] = useState(true);
    const [showSides, setShowSides] = useState(true);
    const [showApotema, setShowApotema] = useState(true);
    const [showIncircle, setShowIncircle] = useState(false);
    const [showCircumcircle, setShowCircumcircle] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);

    const fullscreenRef = useRef(null);

    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setSideLength(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };

    const enterFullscreen = () => {
        setIsFullscreen(true);
        setTimeout(() => {
            if (fullscreenRef.current?.requestFullscreen) {
                fullscreenRef.current.requestFullscreen();
            }
        }, 50);
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen) document.exitFullscreen();
        setIsFullscreen(false);
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Hisob-kitoblar
    const calculations = useMemo(() => {
        const n = sides;
        const a = sideLength;

        const interiorAngle = ((n - 2) * 180) / n;
        const exteriorAngle = 360 / n;
        const perimeter = n * a;
        const apotema = a / (2 * Math.tan(Math.PI / n));
        const area = (n * a * apotema) / 2;
        const circumradius = a / (2 * Math.sin(Math.PI / n));
        const diagonals = (n * (n - 3)) / 2;
        const sumAngles = (n - 2) * 180;

        return {
            interiorAngle: interiorAngle.toFixed(1),
            exteriorAngle: exteriorAngle.toFixed(1),
            perimeter: perimeter.toFixed(2),
            area: area.toFixed(2),
            apotema: apotema.toFixed(2),
            circumradius: circumradius.toFixed(2),
            diagonals: diagonals,
            sumAngles: sumAngles
        };
    }, [sides, sideLength]);

    const unitSymbol = UNITS[unit].symbol;

    // Ko'pburchak nomlari
    const polygonNames = {
        3: 'Uchburchak', 4: 'Kvadrat', 5: 'Beshburchak', 6: 'Oltiburchak',
        7: 'Yettiburchak', 8: 'Sakkizburchak', 9: "To'qqizburchak", 10: "O'nburchak",
        11: "O'n birburchak", 12: "O'n ikkiburchak"
    };

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
                            <span className="icon-glow">⬡</span>
                        </div>
                        <div className="pro-header-text">
                            <h1>Muntazam ko'pburchak</h1>
                            <p>Interaktiv modellashtirish va hisoblash</p>
                        </div>
                    </div>
                </div>
                <div className="header-right-section">
                    <UserMenu />
                    <div className="header-pro-badge">
                        <span className="pro-crown">👑</span>
                        <span className="pro-text">PRO</span>
                    </div>
                </div>
            </header>

            <div className="shape-page-content">
                {/* Chap Panel */}
                <aside className="params-panel pro-params-panel pro-settings-panel">
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon"><span className="icon-glow">⚙️</span></div>
                            <div className="pro-header-text"><h2>Sozlamalar</h2></div>
                        </div>
                    </div>

                    <div className="pro-sections-container">
                        {/* O'lchov birligi */}
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

                        {/* Burchaklar soni */}
                        <details className="pro-section settings-type-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">⬡</div>
                                <span className="pro-section-title">Burchaklar soni</span>
                                <span className="pro-section-badge">{sides}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-side-item">
                                    <div className="pro-side-header">
                                        <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #a855f7, #8b5cf6)' }}>n</div>
                                        <div className="pro-side-info">
                                            <span className="pro-side-label">{polygonNames[sides]}</span>
                                            <span className="pro-side-desc">Muntazam {sides}-burchak</span>
                                        </div>
                                        <div className="pro-side-value">{sides} ta</div>
                                    </div>
                                    <div className="pro-side-controls">
                                        <input type="range" min="3" max="12" step="1" value={sides}
                                            onChange={(e) => setSides(parseInt(e.target.value))}
                                            className="pro-range" style={{ '--range-color': '#a855f7' }} />
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Tomon uzunligi */}
                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">Tomon uzunligi</span>
                                <span className="pro-section-badge">{sideLength} {unitSymbol}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>a</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Tomon</span>
                                                <span className="pro-side-desc">Barcha tomonlar teng</span>
                                            </div>
                                            <div className="pro-side-value">{sideLength} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="1" max="20" step="0.1" value={sideLength}
                                                onChange={(e) => setSideLength(parseFloat(e.target.value))}
                                                className="pro-range" style={{ '--range-color': '#10b981' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Ko'rinish */}
                        <details className="pro-section settings-view-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">👁️</div>
                                <span className="pro-section-title">Ko'rinish</span>
                                <span className="pro-section-badge">{[showGrid, showAngles, showSides, showApotema, showIncircle, showCircumcircle].filter(Boolean).length}/6</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📐 Asosiy</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(!showGrid)}>
                                            <span className="toggle-icon">⊞</span><span className="toggle-label">Grid</span>
                                            <span className={`toggle-status ${showGrid ? 'on' : 'off'}`}>{showGrid ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showAngles ? 'active' : ''}`} onClick={() => setShowAngles(!showAngles)}>
                                            <span className="toggle-icon">∠</span><span className="toggle-label">Burchaklar</span>
                                            <span className={`toggle-status ${showAngles ? 'on' : 'off'}`}>{showAngles ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showSides ? 'active' : ''}`} onClick={() => setShowSides(!showSides)}>
                                            <span className="toggle-icon">—</span><span className="toggle-label">Tomonlar</span>
                                            <span className={`toggle-status ${showSides ? 'on' : 'off'}`}>{showSides ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showApotema ? 'active' : ''}`} onClick={() => setShowApotema(!showApotema)}>
                                            <span className="toggle-icon">↕</span><span className="toggle-label">Apotema</span>
                                            <span className={`toggle-status ${showApotema ? 'on' : 'off'}`}>{showApotema ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">✨ Qo'shimcha</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showIncircle ? 'active' : ''}`} onClick={() => setShowIncircle(!showIncircle)}>
                                            <span className="toggle-icon">◎</span><span className="toggle-label">Ichki aylana</span>
                                            <span className={`toggle-status ${showIncircle ? 'on' : 'off'}`}>{showIncircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showCircumcircle ? 'active' : ''}`} onClick={() => setShowCircumcircle(!showCircumcircle)}>
                                            <span className="toggle-icon">◯</span><span className="toggle-label">Tashqi aylana</span>
                                            <span className={`toggle-status ${showCircumcircle ? 'on' : 'off'}`}>{showCircumcircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </aside>

                {/* Markaz - Canvas */}
                <section className="canvas-panel" style={{ position: 'relative' }}>
                    <PolygonCanvas
                        sides={sides}
                        sideLength={sideLength}
                        showGrid={showGrid}
                        showApotema={showApotema}
                        showSides={showSides}
                        showAngles={showAngles}
                        showIncircle={showIncircle}
                        showCircumcircle={showCircumcircle}
                        calculations={calculations}
                    />

                    <>
                        <div className="shape-type-badge">
                            <span className="badge-icon">⬡</span>
                            {polygonNames[sides]} • {sides} tomonli
                        </div>
                        <button className="fullscreen-toggle-btn" onClick={enterFullscreen} title="To'liq ekran">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                        </button>
                    </>
                </section>

                {/* O'ng Panel - Natijalar */}
                <aside className="formulas-panel pro-results-panel" style={{ minWidth: '340px' }}>
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon"><span className="icon-glow">📊</span></div>
                            <div className="pro-header-text"><h2>Natijalar</h2></div>
                        </div>
                    </div>

                    <div className="pro-main-results">
                        <div className="pro-result-card area-card" style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 20 2 20" /></svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Yuzasi</span>
                                <span className="pro-card-value">{calculations.area}</span>
                                <span className="pro-card-unit">{unitSymbol}²</span>
                            </div>
                            <div className="pro-card-formula">S = (n × a × r) / 2</div>
                        </div>

                        <div className="pro-result-card perimeter-card" style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20M12 2v20" /></svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Perimetri</span>
                                <span className="pro-card-value">{calculations.perimeter}</span>
                                <span className="pro-card-unit">{unitSymbol}</span>
                            </div>
                            <div className="pro-card-formula">P = n × a</div>
                        </div>
                    </div>

                    <div className="pro-sections-container">
                        <details className="pro-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">∠</div>
                                <span className="pro-section-title">Burchaklar</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-results-grid">
                                    <div className="pro-result-item"><span className="result-label">Ichki burchak</span><span className="result-value">{calculations.interiorAngle}°</span></div>
                                    <div className="pro-result-item"><span className="result-label">Tashqi burchak</span><span className="result-value">{calculations.exteriorAngle}°</span></div>
                                    <div className="pro-result-item"><span className="result-label">Burchaklar yig'indisi</span><span className="result-value">{calculations.sumAngles}°</span></div>
                                </div>
                            </div>
                        </details>

                        <details className="pro-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">◎</div>
                                <span className="pro-section-title">Radiuslar</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-results-grid">
                                    <div className="pro-result-item"><span className="result-label">Apotema (r)</span><span className="result-value">{calculations.apotema} {unitSymbol}</span></div>
                                    <div className="pro-result-item"><span className="result-label">Tashqi radius (R)</span><span className="result-value">{calculations.circumradius} {unitSymbol}</span></div>
                                    <div className="pro-result-item"><span className="result-label">Diagonallar soni</span><span className="result-value">{calculations.diagonals}</span></div>
                                </div>
                            </div>
                        </details>

                        <details className="pro-section">
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📖</div>
                                <span className="pro-section-title">Formulalar</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-formulas-list">
                                    <div className="pro-formula-item"><span className="formula-name">Yuzasi:</span><span className="formula-expression">S = (n × a × r) / 2</span></div>
                                    <div className="pro-formula-item"><span className="formula-name">Perimetri:</span><span className="formula-expression">P = n × a</span></div>
                                    <div className="pro-formula-item"><span className="formula-name">Ichki burchak:</span><span className="formula-expression">α = (n-2) × 180° / n</span></div>
                                    <div className="pro-formula-item"><span className="formula-name">Apotema:</span><span className="formula-expression">r = a / (2 × tan(π/n))</span></div>
                                    <div className="pro-formula-item"><span className="formula-name">Tashqi radius:</span><span className="formula-expression">R = a / (2 × sin(π/n))</span></div>
                                    <div className="pro-formula-item"><span className="formula-name">Diagonallar:</span><span className="formula-expression">D = n(n-3) / 2</span></div>
                                </div>
                            </div>
                        </details>
                    </div>
                </aside>
            </div>

            {/* Fullscreen */}
            {isFullscreen && (
                <div ref={fullscreenRef} className="fullscreen-overlay">
                    <FullscreenPolygonWhiteboard
                        sides={sides}
                        sideLength={sideLength}
                        unitSymbol={unitSymbol}
                        calculations={calculations}
                        onClose={exitFullscreen}
                        onSidesChange={setSides}
                        onSideLengthChange={setSideLength}
                    />
                </div>
            )}
        </div>
    );
}
