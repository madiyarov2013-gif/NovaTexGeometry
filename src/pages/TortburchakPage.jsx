import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

// O'lchov birliklari
const UNITS = {
    mm: { name: 'Millimetr', symbol: 'mm', factor: 0.001 },
    sm: { name: 'Santimetr', symbol: 'sm', factor: 0.01 },
    m: { name: 'Metr', symbol: 'm', factor: 1 },
    km: { name: 'Kilometr', symbol: 'km', factor: 1000 }
};

const COLORS = {
    primary: '#6366f1', // Indigo for rectangle
    secondary: '#10b981', // Emerald
    accent: '#f59e0b', // Amber
    danger: '#ef4444',
    purple: '#8b5cf6'
};

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Professional Fullscreen Rectangle Whiteboard
function FullscreenRectangleWhiteboard({ width, height, unitSymbol, onClose, onSizeChange }) {
    const canvasRef = useRef(null);
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

    useEffect(() => {
        const updateSize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const rectangleData = useMemo(() => {
        if (!width || !height) return null;
        const cWidth = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = cWidth / 2;
        const centerY = cHeight / 2;
        const maxDim = Math.max(width, height);
        const rectScale = Math.min(cWidth * 0.5, cHeight * 0.5) / maxDim;

        const wScaled = width * rectScale;
        const hScaled = height * rectScale;

        return {
            points: [
                { x: centerX - wScaled / 2, y: centerY - hScaled / 2, label: 'A' },
                { x: centerX + wScaled / 2, y: centerY - hScaled / 2, label: 'B' },
                { x: centerX + wScaled / 2, y: centerY + hScaled / 2, label: 'C' },
                { x: centerX - wScaled / 2, y: centerY + hScaled / 2, label: 'D' }
            ],
            rectScale
        };
    }, [width, height, canvasSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cWidth = canvas.width;
        const cHeight = canvas.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, cWidth, cHeight);
        ctx.save();
        ctx.translate(cWidth / 2, cHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);

        // Grid
        const gridSize = 40;
        ctx.strokeStyle = '#1a1a24';
        ctx.lineWidth = 0.5 / scale;
        for (let x = 0; x < cWidth * 2; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x - cWidth / 2, -cHeight);
            ctx.lineTo(x - cWidth / 2, cHeight * 2);
            ctx.stroke();
        }
        for (let y = 0; y < cHeight * 2; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(-cWidth, y - cHeight / 2);
            ctx.lineTo(cWidth * 2, y - cHeight / 2);
            ctx.stroke();
        }

        if (rectangleData) {
            const { points } = rectangleData;

            ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
            ctx.shadowBlur = 40 / scale;

            const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
            gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.35)');

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
            ctx.lineWidth = 4 / scale;
            ctx.stroke();

            // Labels
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 18 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
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
                if (i === 0) { lx -= 40 / scale; ly -= 10 / scale; }
                else if (i === 1) { lx += 40 / scale; ly -= 10 / scale; }
                else if (i === 2) { lx += 40 / scale; ly += 20 / scale; }
                else { lx -= 40 / scale; ly += 20 / scale; }

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
                ctx.fillText(point.label, lx, ly);
            });

            // Side labels
            const sides = [
                { p1: 0, p2: 1, label: `w = ${width} ${unitSymbol}`, color: COLORS.primary },
                { p1: 1, p2: 2, label: `h = ${height} ${unitSymbol}`, color: COLORS.purple }
            ];
            sides.forEach(side => {
                const midX = (points[side.p1].x + points[side.p2].x) / 2;
                const midY = (points[side.p1].y + points[side.p2].y) / 2;
                let offsetX = 0, offsetY = 0;
                if (side.p1 === 0) offsetY = -35 / scale;
                else if (side.p1 === 1) offsetX = 35 / scale;

                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
                const textWidth = ctx.measureText(side.label).width + 24 / scale;
                ctx.beginPath();
                ctx.roundRect(midX + offsetX - textWidth / 2, midY + offsetY - 16 / scale, textWidth, 32 / scale, 8 / scale);
                ctx.fill();
                ctx.strokeStyle = side.color;
                ctx.lineWidth = 2 / scale;
                ctx.stroke();
                ctx.fillStyle = side.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(side.label, midX + offsetX, midY + offsetY);
            });
        }
        ctx.restore();

        // Draw paths
        drawings.forEach(d => {
            if (d.points.length < 2) return;
            ctx.save();
            ctx.translate(cWidth / 2, cHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);
            ctx.strokeStyle = d.color;
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
            ctx.strokeStyle = penColor;
            ctx.lineWidth = penSize / scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        }
    }, [scale, offset, width, height, canvasSize, rectangleData, drawings, currentPath, penColor, penSize, unitSymbol]);

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

            if (isLocked && rectangleData) {
                const hitRadius = 20 / scale;
                const clickedVertexIndex = rectangleData.points.findIndex(p => {
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
        } else if (draggingVertex !== null && rectangleData && onSizeChange) {
            const rs = rectangleData.rectScale;
            const p = rectangleData.points;

            const p0 = draggingVertex === 0 ? coords : p[0];
            const p1 = draggingVertex === 1 ? coords : p[1];
            const p2 = draggingVertex === 2 ? coords : p[2];
            const p3 = draggingVertex === 3 ? coords : p[3];

            const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / rs;

            // Rectangle dimensions from vertices
            const newWidth = Math.round(dist(p0, p1) * 10) / 10;
            const newHeight = Math.round(dist(p1, p2) * 10) / 10;

            if (newWidth < 0.5 || newWidth > 50 || newHeight < 0.5 || newHeight > 50) {
                return;
            }

            onSizeChange({ width: newWidth, height: newHeight });
        } else if (isDragging && !isLocked) {
            const client = getClientCoords(e);
            setOffset({ x: client.x - dragStart.x, y: client.y - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentPath.length > 1) {
            setDrawings(prev => [...prev, { points: currentPath, color: penColor, size: penSize }]);
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
                style={{ cursor: activeTool === 'pen' ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'), touchAction: 'none' }}
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
            <button className="whiteboard-save-btn" title="Saqlash">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                </svg>
            </button>

            <button className="whiteboard-close-btn" onClick={onClose} title="Yopish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
            </button>
        </div>
    );
}



function RectangleCanvas({
    width, height, unitSymbol, showGrid, showDiagonals, showCenter,
    showSides, showAngles, showDimensions, showSymmetry, showIncircle, showCircumcircle
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    // Zoom/Pan state
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 40, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setCanvasSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const cWidth = canvas.width;
        const cHeight = canvas.height;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, cWidth, cHeight);

        ctx.save();

        // Transform
        ctx.translate(cWidth / 2, cHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);

        // Grid
        if (showGrid) {
            const gridSize = 40;
            const visibleLeft = -offset.x - cWidth / 2 / scale;
            const visibleTop = -offset.y - cHeight / 2 / scale;
            const visibleRight = -offset.x + cWidth / 2 / scale + cWidth;
            const visibleBottom = -offset.y + cHeight / 2 / scale + cHeight;

            const startX = Math.floor(visibleLeft / gridSize) * gridSize;
            const startY = Math.floor(visibleTop / gridSize) * gridSize;

            // Minor
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 0.5 / scale;
            for (let x = startX; x < visibleRight; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, visibleTop); ctx.lineTo(x, visibleBottom); ctx.stroke();
            }
            for (let y = startY; y < visibleBottom; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(visibleLeft, y); ctx.lineTo(visibleRight, y); ctx.stroke();
            }

            // Major
            ctx.strokeStyle = '#2a2a38';
            ctx.lineWidth = 1 / scale;
            for (let x = startX; x < visibleRight; x += gridSize * 4) {
                ctx.beginPath(); ctx.moveTo(x, visibleTop); ctx.lineTo(x, visibleBottom); ctx.stroke();
            }
            for (let y = startY; y < visibleBottom; y += gridSize * 4) {
                ctx.beginPath(); ctx.moveTo(visibleLeft, y); ctx.lineTo(visibleRight, y); ctx.stroke();
            }
        }

        // Calculate Rect geometry
        const maxDim = Math.max(width, height);
        // Fit to view factor (approx 60% of min canvas dimension)
        const baseScale = Math.min(cWidth, cHeight) * 0.5 / Math.max(1, maxDim);

        const wScaled = width * baseScale;
        const hScaled = height * baseScale;

        const cx = cWidth / 2;
        const cy = cHeight / 2;

        const x = cx - wScaled / 2;
        const y = cy - hScaled / 2;

        // Draw Rectangle
        // Shadow
        ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
        ctx.shadowBlur = 30 / scale;

        ctx.beginPath();
        ctx.rect(x, y, wScaled, hScaled);

        // Gradient
        const grad = ctx.createLinearGradient(x, y, x + wScaled, y + hScaled);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
        grad.addColorStop(1, 'rgba(139, 92, 246, 0.25)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 3 / scale;
        ctx.stroke();

        // Draw Diagonals
        if (showDiagonals) {
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2 / scale;
            ctx.setLineDash([8 / scale, 4 / scale]);

            // Diagonal AC (from A to C)
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + wScaled, y + hScaled);
            ctx.stroke();

            // Diagonal BD (from B to D)
            ctx.beginPath();
            ctx.moveTo(x + wScaled, y);
            ctx.lineTo(x, y + hScaled);
            ctx.stroke();

            ctx.setLineDash([]);

            // Diagonal labels
            const diagLen = Math.sqrt(width * width + height * height).toFixed(1);
            renderLabel(ctx, `d = ${diagLen} ${unitSymbol}`, x + wScaled / 2 + 30 / scale, y + hScaled / 2 - 15 / scale, scale, COLORS.accent);
        }

        // Draw Center point
        if (showCenter) {
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;

            // Glow effect
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15 / scale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.fill();

            // Center dot
            ctx.beginPath();
            ctx.arc(centerX, centerY, 6 / scale, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.secondary;
            ctx.fill();

            // Center label
            ctx.fillStyle = COLORS.secondary;
            ctx.font = `bold ${12 / scale}px Inter, sans-serif`;
            ctx.fillText('O', centerX, centerY - 20 / scale);
        }

        // Draw Symmetry axes
        if (showSymmetry) {
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;

            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 1.5 / scale;
            ctx.setLineDash([6 / scale, 4 / scale]);

            // Vertical axis
            ctx.beginPath();
            ctx.moveTo(centerX, y - 30 / scale);
            ctx.lineTo(centerX, y + hScaled + 30 / scale);
            ctx.stroke();

            // Horizontal axis
            ctx.beginPath();
            ctx.moveTo(x - 30 / scale, centerY);
            ctx.lineTo(x + wScaled + 30 / scale, centerY);
            ctx.stroke();

            ctx.setLineDash([]);
        }

        // Draw Incircle (ichki doira - to'rtburchak ichiga joylashgan eng katta doira)
        if (showIncircle) {
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;
            const inRadius = Math.min(wScaled, hScaled) / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, inRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
            ctx.fill();

            // Radius label
            const rLabel = (Math.min(width, height) / 2).toFixed(1);
            renderLabel(ctx, `r = ${rLabel} ${unitSymbol}`, centerX + inRadius / 2, centerY - 10 / scale, scale, '#06b6d4');
        }

        // Draw Circumcircle (tashqi doira - to'rtburchak atrofidagi doira)
        if (showCircumcircle) {
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;
            const circumRadius = Math.sqrt(wScaled * wScaled + hScaled * hScaled) / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, circumRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
            ctx.fill();

            // Radius label
            const RLabel = (Math.sqrt(width * width + height * height) / 2).toFixed(1);
            renderLabel(ctx, `R = ${RLabel} ${unitSymbol}`, centerX + circumRadius * 0.7, centerY - circumRadius * 0.7, scale, '#a855f7');
        }

        // Right angles (show only if showAngles is true)
        if (showAngles) {
            const mSize = 15 / scale;
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2 / scale;
            // TL
            ctx.beginPath(); ctx.moveTo(x, y + mSize); ctx.lineTo(x + mSize, y + mSize); ctx.lineTo(x + mSize, y); ctx.stroke();
            // TR
            ctx.beginPath(); ctx.moveTo(x + wScaled - mSize, y); ctx.lineTo(x + wScaled - mSize, y + mSize); ctx.lineTo(x + wScaled, y + mSize); ctx.stroke();
            // BR
            ctx.beginPath(); ctx.moveTo(x + wScaled, y + hScaled - mSize); ctx.lineTo(x + wScaled - mSize, y + hScaled - mSize); ctx.lineTo(x + wScaled - mSize, y + hScaled); ctx.stroke();
            // BL
            ctx.beginPath(); ctx.moveTo(x + mSize, y + hScaled); ctx.lineTo(x + mSize, y + hScaled - mSize); ctx.lineTo(x, y + hScaled - mSize); ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Side labels (only if showDimensions is true)
        if (showDimensions) {
            // a (Top)
            renderLabel(ctx, `a = ${width} ${unitSymbol}`, x + wScaled / 2, y - 25 / scale, scale, COLORS.primary);
            // b (Left)
            renderLabel(ctx, `b = ${height} ${unitSymbol}`, x - 35 / scale, y + hScaled / 2, scale, COLORS.purple);
            // b (Right) - o'ng tomon
            renderLabel(ctx, `b = ${height} ${unitSymbol}`, x + wScaled + 35 / scale, y + hScaled / 2, scale, COLORS.purple);
            // a (Bottom) - pastki tomon
            renderLabel(ctx, `a = ${width} ${unitSymbol}`, x + wScaled / 2, y + hScaled + 25 / scale, scale, COLORS.primary);
        }

        // Vertices A, B, C, D (show if showSides is true)
        if (showSides) {
            const pts = [
                { x: x, y: y, l: 'A' }, { x: x + wScaled, y: y, l: 'B' },
                { x: x + wScaled, y: y + hScaled, l: 'C' }, { x: x, y: y + hScaled, l: 'D' }
            ];

            pts.forEach(p => {
                // Glow
                ctx.beginPath(); ctx.arc(p.x, p.y, 10 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99, 102, 241, 0.4)'; ctx.fill();
                // Dot
                ctx.beginPath(); ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#fff'; ctx.fill();

                // Label letter
                const off = 20 / scale;
                const lx = p.x < cx ? p.x - off : p.x + off;
                const ly = p.y < cy ? p.y - off : p.y + off;
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fillText(p.l, lx, ly);
            });
        }

        ctx.restore();
    }, [width, height, unitSymbol, showGrid, showDiagonals, showCenter, showSides, showAngles, showDimensions, showSymmetry, showIncircle, showCircumcircle, canvasSize, scale, offset]);

    const renderLabel = (ctx, text, x, y, scale, color) => {
        const padding = 8 / scale;
        const fontSize = 14 / scale;
        const w = ctx.measureText(text).width + padding * 2;
        const h = fontSize + padding * 2;

        ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, 6 / scale);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / scale;
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.max(0.2, Math.min(5, s * delta)));
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            />
        </div>
    );
}

export function TortburchakPage() {
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(6);
    const [unit, setUnit] = useState('sm');

    // Birlik o'zgartirish funksiyasi
    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setWidth(prev => Math.round(prev * ratio * 100) / 100);
        setHeight(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };
    const [showGrid, setShowGrid] = useState(true);
    const [showDiagonals, setShowDiagonals] = useState(false);
    const [showCenter, setShowCenter] = useState(false);
    const [showSides, setShowSides] = useState(true);
    const [showAngles, setShowAngles] = useState(false);
    const [showDimensions, setShowDimensions] = useState(true);
    const [showSymmetry, setShowSymmetry] = useState(false);
    const [showIncircle, setShowIncircle] = useState(false);
    const [showCircumcircle, setShowCircumcircle] = useState(false);
    const [resultModal, setResultModal] = useState(null);
    const [showFullscreen, setShowFullscreen] = useState(false);

    const [showRulesModal, setShowRulesModal] = useState(false);
    
    // ESC key bilan yopish
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showFullscreen) {
                setShowFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showFullscreen]);





    const unitSymbol = UNITS[unit].symbol;

    // Hisoblashlar
    const calculations = useMemo(() => {
        const area = (width * height).toFixed(2);
        const perimeter = (2 * (width + height)).toFixed(2);
        const diagonal = Math.sqrt(width * width + height * height).toFixed(2);
        const semiPerimeter = (width + height).toFixed(2);
        // Diagonal kesishuvi burchagi (diagonal va yon tomon orasidagi burchak)
        const diagonalAngle = (Math.atan(height / width) * 180 / Math.PI).toFixed(1);
        const diagonalAngle2 = (90 - parseFloat(diagonalAngle)).toFixed(1);

        // Ichki doira radiusi (faqat kvadrat uchun)
        const isSquare = Math.abs(width - height) < 0.01;
        const incircleRadius = isSquare ? (width / 2).toFixed(2) : Math.min(width, height) / 2;

        // Tashqi doira radiusi (markazdan cho'qqigacha)
        const circumcircleRadius = (Math.sqrt(width * width + height * height) / 2).toFixed(2);

        return {
            area,
            perimeter,
            diagonal,
            semiPerimeter,
            diagonalAngle,
            diagonalAngle2,
            incircleRadius,
            circumcircleRadius,
            isSquare
        };
    }, [width, height]);

    return (
        <div className="shape-page tortburchak-page">
            {/* Header */}
            <header className="shape-page-header pro-page-header pro-header-enhanced">
                <div className="header-left-section">
                    <Link to="/2d-models" className="back-btn" title="2D shakllarga qaytish">
                        ← Orqaga
                    </Link>
                    <Link to="/" className="header-logo-link">
                        <img src="/src/logo/logo.png" alt="Logo" className="header-logo-img" />
                    </Link>
                    <div className="header-divider"></div>
                    <div className="pro-page-header-content">
                        <div className="pro-header-icon"><span className="icon-glow">□</span></div>
                        <div className="pro-header-text">
                            <h1>To'rtburchak</h1>
                            <p>Interaktiv modellashtirish</p>
                        </div>
                    </div>
                </div>
                <div className="header-right-section">
                    {/* User Menu */}
                    <UserMenu />

                    <div className="header-pro-badge">
                        <span className="pro-crown">👑</span>
                        <span className="pro-text">PRO</span>
                    </div>
                </div>
            </header>

            <div className="shape-page-content" style={{ display: 'grid', gridTemplateColumns: '280px 1fr 340px', gap: '0' }}>
                {/* Left Sidebar - Settings */}
                <aside className="params-panel pro-params-panel pro-settings-panel">
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon"><span className="icon-glow">⚙️</span></div>
                            <div className="pro-header-text"><h2>Sozlamalar</h2></div>
                        </div>
                    </div>

                    <div className="pro-sections-container">
                        {/* Unit Section */}
                        <details className="pro-section settings-unit-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchov birligi</span>
                                <span className="pro-section-badge">{UNITS[unit].symbol}</span>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-unit-grid">
                                    {Object.entries(UNITS).map(([k, v]) => (
                                        <button key={k} className={`pro-settings-btn ${unit === k ? 'active' : ''}`} onClick={() => handleUnitChange(k)}>
                                            <span className="settings-btn-icon">{v.symbol}</span>
                                            <span className="settings-btn-label">{v.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>

                        {/* Dimensions Section */}
                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">O'lchamlar</span>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: COLORS.primary }}>a</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Eni (a)</span>
                                            </div>
                                            <div className="pro-side-value">{width} {UNITS[unit].symbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="1" max="50" step="0.5" value={width} onChange={e => setWidth(Number(e.target.value))} className="pro-range" style={{ '--range-color': COLORS.primary }} />
                                        </div>
                                    </div>

                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: COLORS.purple }}>b</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Bo'yi (b)</span>
                                            </div>
                                            <div className="pro-side-value">{height} {UNITS[unit].symbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="1" max="50" step="0.5" value={height} onChange={e => setHeight(Number(e.target.value))} className="pro-range" style={{ '--range-color': COLORS.purple }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* View Section */}
                        <details className="pro-section settings-view-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">👁️</div>
                                <span className="pro-section-title">Ko'rinish</span>
                            </summary>
                            <div className="pro-section-content">
                                {/* Asosiy */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">🔷 Asosiy</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(!showGrid)}>
                                            <span className="toggle-icon">⊞</span>
                                            <span className="toggle-label">Grid</span>
                                            <span className={`toggle-status ${showGrid ? 'on' : 'off'}`}>{showGrid ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showSides ? 'active' : ''}`} onClick={() => setShowSides(!showSides)}>
                                            <span className="toggle-icon">🔤</span>
                                            <span className="toggle-label">Cho'qqilar</span>
                                            <span className={`toggle-status ${showSides ? 'on' : 'off'}`}>{showSides ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showDimensions ? 'active' : ''}`} onClick={() => setShowDimensions(!showDimensions)}>
                                            <span className="toggle-icon">📏</span>
                                            <span className="toggle-label">O'lchamlar</span>
                                            <span className={`toggle-status ${showDimensions ? 'on' : 'off'}`}>{showDimensions ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showAngles ? 'active' : ''}`} onClick={() => setShowAngles(!showAngles)}>
                                            <span className="toggle-icon">∠</span>
                                            <span className="toggle-label">Burchaklar</span>
                                            <span className={`toggle-status ${showAngles ? 'on' : 'off'}`}>{showAngles ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Tez kuda */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⚡ Tez kuda</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showDiagonals ? 'active' : ''}`} onClick={() => setShowDiagonals(!showDiagonals)}>
                                            <span className="toggle-icon">↗</span>
                                            <span className="toggle-label">Diagonallar</span>
                                            <span className={`toggle-status ${showDiagonals ? 'on' : 'off'}`}>{showDiagonals ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showCenter ? 'active' : ''}`} onClick={() => setShowCenter(!showCenter)}>
                                            <span className="toggle-icon">⊙</span>
                                            <span className="toggle-label">Markaz</span>
                                            <span className={`toggle-status ${showCenter ? 'on' : 'off'}`}>{showCenter ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showSymmetry ? 'active' : ''}`} onClick={() => setShowSymmetry(!showSymmetry)}>
                                            <span className="toggle-icon">⟷</span>
                                            <span className="toggle-label">Simmetriya</span>
                                            <span className={`toggle-status ${showSymmetry ? 'on' : 'off'}`}>{showSymmetry ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showIncircle ? 'active' : ''}`} onClick={() => setShowIncircle(!showIncircle)}>
                                            <span className="toggle-icon">◎</span>
                                            <span className="toggle-label">Ichki doira</span>
                                            <span className={`toggle-status ${showIncircle ? 'on' : 'off'}`}>{showIncircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showCircumcircle ? 'active' : ''}`} onClick={() => setShowCircumcircle(!showCircumcircle)}>
                                            <span className="toggle-icon">◯</span>
                                            <span className="toggle-label">Tashqi doira</span>
                                            <span className={`toggle-status ${showCircumcircle ? 'on' : 'off'}`}>{showCircumcircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </aside>

                {/* Canvas */}
                <section className="canvas-panel" style={{ position: 'relative' }}>
                    <RectangleCanvas
                        width={width}
                        height={height}
                        unitSymbol={UNITS[unit].symbol}
                        showGrid={showGrid}
                        showDiagonals={showDiagonals}
                        showCenter={showCenter}
                        showSides={showSides}
                        showAngles={showAngles}
                        showDimensions={showDimensions}
                        showSymmetry={showSymmetry}
                        showIncircle={showIncircle}
                        showCircumcircle={showCircumcircle}
                    />
                    <div className="shape-type-badge">
                        <span className="badge-icon">□</span>
                        To'g'ri to'rtburchak
                    </div>
                    <button className="fullscreen-toggle-btn" onClick={() => setShowFullscreen(true)} title="To'liq ekran">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    </button>
                </section>

                {/* O'ng Panel - Professional Results */}
                <aside className="formulas-panel pro-results-panel" style={{ minWidth: 0 }}>
                    {/* Header */}
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon">
                                <span className="icon-glow">📊</span>
                            </div>
                            <div className="pro-header-text">
                                <h2>Natijalar</h2>
                            </div>
                        </div>
                    </div>

                    {/* Asosiy natijalar - Premium Cards */}
                    <div className="pro-main-results">
                        <div className="pro-result-card area-card" onClick={() => setResultModal('area')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                </svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Yuzasi</span>
                                <span className="pro-card-value">{calculations.area}</span>
                                <span className="pro-card-unit">{unitSymbol}²</span>
                            </div>
                            <div className="pro-card-formula">S = a × b</div>
                        </div>

                        <div className="pro-result-card perimeter-card" onClick={() => setResultModal('perimeter')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 12h20M12 2v20" />
                                </svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Perimetri</span>
                                <span className="pro-card-value">{calculations.perimeter}</span>
                                <span className="pro-card-unit">{unitSymbol}</span>
                            </div>
                            <div className="pro-card-formula">P = 2(a + b)</div>
                        </div>
                    </div>

                    {/* Collapsible Sections Container */}
                    <div className="pro-sections-container">

                        {/* ═══════════════════════════════════════════ */}
                        {/* O'LCHOVLAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section measurements-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchovlar</span>
                                <span className="pro-section-badge">5 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                {/* Diagonal */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">↗ Diagonal</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('diagonal')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">d</span>
                                            <span className="measure-value">{calculations.diagonal} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Yarim perimetr */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📐 Yarim perimetr</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">p</span>
                                            <span className="measure-value">{calculations.semiPerimeter} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Diagonal burchaklari */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">∠ Diagonal burchaklari</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">α</span>
                                            <span className="measure-value">{calculations.diagonalAngle}°</span>
                                        </div>
                                        <div className="pro-measure-item">
                                            <span className="measure-label">β</span>
                                            <span className="measure-value">{calculations.diagonalAngle2}°</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Aylana radiuslari */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⭕ Aylana radiuslari</h4>
                                    <div className="pro-circles-grid">
                                        <div className="pro-circle-card incircle" onClick={() => setResultModal('incircle')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◎</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Ichki</span>
                                                <span className="circle-value">{calculations.isSquare ? calculations.incircleRadius : '—'} {calculations.isSquare ? unitSymbol : ''}</span>
                                            </div>
                                        </div>
                                        <div className="pro-circle-card circumcircle" onClick={() => setResultModal('circumcircle')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◯</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Tashqi</span>
                                                <span className="circle-value">{calculations.circumcircleRadius} {unitSymbol}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tomonlar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📐 Tomonlar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">a</span>
                                            <span className="measure-value">{width} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item">
                                            <span className="measure-label">b</span>
                                            <span className="measure-value">{height} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Burchaklar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">∠ Burchaklar</h4>
                                    <div className="pro-angle-grid">
                                        <div className="pro-angle-item">
                                            <div className="pro-angle-vertex">A</div>
                                            <div className="pro-angle-value">90°</div>
                                            <div className="pro-angle-bar" style={{ width: '50%' }}></div>
                                        </div>
                                        <div className="pro-angle-item">
                                            <div className="pro-angle-vertex">B</div>
                                            <div className="pro-angle-value">90°</div>
                                            <div className="pro-angle-bar" style={{ width: '50%' }}></div>
                                        </div>
                                        <div className="pro-angle-item">
                                            <div className="pro-angle-vertex">C</div>
                                            <div className="pro-angle-value">90°</div>
                                            <div className="pro-angle-bar" style={{ width: '50%' }}></div>
                                        </div>
                                        <div className="pro-angle-item">
                                            <div className="pro-angle-vertex">D</div>
                                            <div className="pro-angle-value">90°</div>
                                            <div className="pro-angle-bar" style={{ width: '50%' }}></div>
                                        </div>
                                    </div>
                                    <div className="pro-sum-info">
                                        Σ = 360° (barcha burchaklar 90°)
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* FORMULALAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section formulas-section">
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📚</div>
                                <span className="pro-section-title">Formulalar</span>
                                <span className="pro-section-badge">4 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📐 Yuza</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>S = a × b</code><span>Asosiy</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📏 Perimetr</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>P = 2(a + b)</code><span>Asosiy</span></div>
                                        <div className="pro-formula-item"><code>P = 2a + 2b</code><span>Ochiq</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">↗ Diagonal</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>d = √(a² + b²)</code><span>Pifagor</span></div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* QOIDALAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <div className="pro-section rules-section" onClick={() => setShowRulesModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="pro-section-header">
                                <div className="pro-section-icon">📖</div>
                                <span className="pro-section-title">Qoidalar</span>
                                <span className="pro-section-badge">8 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        </div>

                    </div>
                </aside>
            </div>

            {/* Result Details Modal */}
            {resultModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setResultModal(null)}>
                    <div style={{
                        backgroundColor: '#1e1e24',
                        padding: '30px',
                        borderRadius: '20px',
                        maxWidth: '600px',
                        width: '90%',
                        border: '1px solid #2a2a35',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setResultModal(null)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'transparent',
                                border: 'none',
                                color: '#9ca3af',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2a2a35'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                        >
                            ×
                        </button>

                        {resultModal === 'area' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>📐</span>
                                    Yuzasini hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>S = a × b</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>S = {width} × {height}</div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            S = {calculations.area} {unitSymbol}²
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'perimeter' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>📏</span>
                                    Perimetrni hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>P = 2(a + b)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>P = 2({width} + {height})</div>
                                        <div>P = 2 × {width + height}</div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                            P = {calculations.perimeter} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'diagonal' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>↗</span>
                                    Diagonalni hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Pifagor teoremasi bo'yicha:</div>
                                        <div>d = √(a² + b²)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>d = √({width}² + {height}²)</div>
                                        <div>d = √({(width * width).toFixed(2)} + {(height * height).toFixed(2)})</div>
                                        <div>d = √{(width * width + height * height).toFixed(2)}</div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                            d ≈ {calculations.diagonal} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'incircle' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>◎</span>
                                    Ichki doira radiusi
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    {calculations.isSquare ? (
                                        <>
                                            <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                                <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula (kvadrat uchun):</div>
                                                <div>r = a / 2</div>
                                            </div>
                                            <div>
                                                <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                                <div>r = {width} / 2</div>
                                                <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                                    r = {calculations.incircleRadius} {unitSymbol}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ color: '#f59e0b', padding: '15px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚠️ Eslatma</div>
                                                <div style={{ fontSize: '14px' }}>To'g'ri to'rtburchakda faqat tashqi chizilgan doira mavjud. Ichki chizilgan doira faqat kvadratda (a = b bo'lganda) mavjud.</div>
                                            </div>
                                            <div style={{ marginTop: '15px' }}>
                                                <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Kichik tomon asosida radiusi:</div>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                                                    r ≈ {(Math.min(width, height) / 2).toFixed(2)} {unitSymbol}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : resultModal === 'circumcircle' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>◯</span>
                                    Tashqi doira radiusi
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>R = d / 2 = √(a² + b²) / 2</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>R = √({width}² + {height}²) / 2</div>
                                        <div>R = √({(width * width).toFixed(2)} + {(height * height).toFixed(2)}) / 2</div>
                                        <div>R = {calculations.diagonal} / 2</div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                                            R ≈ {calculations.circumcircleRadius} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Rules Modal */}
            {showRulesModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }} onClick={() => setShowRulesModal(false)}>
                    <div style={{
                        backgroundColor: '#1e1e24',
                        padding: '30px',
                        borderRadius: '24px',
                        maxWidth: '700px',
                        width: '90%',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        border: '1px solid #2a2a35',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowRulesModal(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'transparent',
                                border: 'none',
                                color: '#9ca3af',
                                fontSize: '28px',
                                cursor: 'pointer',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2a2a35'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                        >
                            ×
                        </button>

                        <h3 style={{ fontSize: '28px', marginBottom: '25px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '32px' }}>📖</span>
                            To'rtburchak qoidalari
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { num: 1, title: 'Barcha burchaklar 90°', desc: 'To\'g\'ri to\'rtburchakning barcha ichki burchaklari to\'g\'ri burchak (90°) ga teng', color: '#10b981' },
                                { num: 2, title: 'Qarama-qarshi tomonlar teng', desc: 'Qarama-qarshi tomonlar o\'zaro teng va parallel: AB = CD, AD = BC', color: '#f59e0b' },
                                { num: 3, title: 'Diagonallar teng', desc: 'Diagonallarning uzunliklari teng: AC = BD', color: '#06b6d4' },
                                { num: 4, title: 'Diagonallar yarimlatadi', desc: 'Diagonallar bir-birini yarimlatadi (ikki teng qismga bo\'ladi)', color: '#8b5cf6' },
                                { num: 5, title: 'Pifagor teoremasi', desc: 'Diagonal uzunligi: d = √(a² + b²), bu yerda a va b tomonlar', color: '#ef4444' },
                                { num: 6, title: 'Yuza formulasi', desc: 'Yuza = a × b (eni ko\'paytir bo\'yi)', color: '#ec4899' },
                                { num: 7, title: 'Perimetr formulasi', desc: 'Perimetr = 2(a + b) yoki 2a + 2b', color: '#3b82f6' },
                                { num: 8, title: 'Simmetriya o\'qlari', desc: 'To\'rtburchakda 2 ta simmetriya o\'qi mavjud (gorizontal va vertikal)', color: '#6366f1' }
                            ].map(rule => (
                                <div key={rule.num} style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '16px',
                                    border: `1px solid ${rule.color}30`,
                                    transition: 'all 0.2s'
                                }}>
                                    <span style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: `linear-gradient(135deg, ${rule.color}40, ${rule.color}20)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '16px',
                                        color: rule.color,
                                        flexShrink: 0
                                    }}>{rule.num}</span>
                                    <div>
                                        <strong style={{ color: rule.color, fontSize: '16px', display: 'block', marginBottom: '4px' }}>{rule.title}</strong>
                                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>{rule.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Modal */}
            {showFullscreen && (
                <FullscreenRectangleWhiteboard
                    width={width}
                    height={height}
                    unitSymbol={UNITS[unit].symbol}
                    onClose={() => setShowFullscreen(false)}
                    onSizeChange={({ width: newWidth, height: newHeight }) => {
                        setWidth(Math.max(0.5, Math.min(50, newWidth)));
                        setHeight(Math.max(0.5, Math.min(50, newHeight)));
                    }}
                />
            )}

        </div>
    );
}
