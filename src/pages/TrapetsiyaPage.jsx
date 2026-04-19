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

// Trapetsiya turlari
const TRAPEZOID_TYPES = {
    custom: { name: "Ixtiyoriy", icon: "⏢" },
    isosceles: { name: "Teng yonli", icon: "⏢" },
    right: { name: "To'g'ri burchakli", icon: "⏢" }
};

const COLORS = {
    primary: '#ef4444',
    secondary: '#10b981',
    accent: '#f59e0b',
    purple: '#8b5cf6'
};

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Fullscreen Trapezoid komponenti
function FullscreenTrapezoid({ topBase, bottomBase, height, unitSymbol, isValid, onClose, onSizeChange }) {
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

    const trapezoidData = useMemo(() => {
        if (!isValid) return null;
        const width = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = width / 2;
        const centerY = cHeight / 2;
        const maxDim = Math.max(bottomBase, height);
        const trapScale = Math.min(width * 0.5, cHeight * 0.5) / maxDim;

        const bottomScaled = bottomBase * trapScale;
        const topScaled = topBase * trapScale;
        const hScaled = height * trapScale;
        const topOffset = (bottomScaled - topScaled) / 2;

        return {
            points: [
                { x: centerX - bottomScaled / 2 + topOffset, y: centerY - hScaled / 2, label: 'A' },
                { x: centerX - bottomScaled / 2 + topOffset + topScaled, y: centerY - hScaled / 2, label: 'B' },
                { x: centerX + bottomScaled / 2, y: centerY + hScaled / 2, label: 'C' },
                { x: centerX - bottomScaled / 2, y: centerY + hScaled / 2, label: 'D' }
            ],
            trapScale
        };
    }, [topBase, bottomBase, height, isValid, canvasSize]);

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

        if (isValid && trapezoidData) {
            const { points } = trapezoidData;

            ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
            ctx.shadowBlur = 40 / scale;

            const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
            gradient.addColorStop(0.5, 'rgba(249, 115, 22, 0.3)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.35)');

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

            // Height line
            const heightX = (points[0].x + points[1].x) / 2;
            ctx.setLineDash([8 / scale, 4 / scale]);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2.5 / scale;
            ctx.beginPath();
            ctx.moveTo(heightX, points[0].y);
            ctx.lineTo(heightX, points[3].y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Labels
            const labels = ['A', 'B', 'C', 'D'];
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 18 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
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
                ctx.fillText(labels[i], lx, ly);
            });

            // Side labels
            const sides = [
                { p1: 0, p2: 1, label: `a = ${topBase} ${unitSymbol}`, color: COLORS.primary },
                { p1: 3, p2: 2, label: `b = ${bottomBase} ${unitSymbol}`, color: COLORS.purple }
            ];
            sides.forEach(side => {
                const midX = (points[side.p1].x + points[side.p2].x) / 2;
                const midY = (points[side.p1].y + points[side.p2].y) / 2 + (side.p1 === 0 ? -35 / scale : 35 / scale);

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

        // Draw paths
        drawings.forEach(d => {
            if (d.points.length < 2) return;
            ctx.save();
            ctx.translate(width / 2, cHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2 + offset.x, -cHeight / 2 + offset.y);
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
            ctx.translate(width / 2, cHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-width / 2 + offset.x, -cHeight / 2 + offset.y);
            ctx.strokeStyle = penColor;
            ctx.lineWidth = penSize / scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        }
    }, [scale, offset, topBase, bottomBase, height, isValid, canvasSize, trapezoidData, drawings, currentPath, penColor, penSize, unitSymbol]);

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

            if (isLocked && trapezoidData) {
                // Check for vertex points to drag
                const hitRadius = 20 / scale;
                const clickedVertexIndex = trapezoidData.points.findIndex(p => {
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
        } else if (draggingVertex !== null && trapezoidData && onSizeChange) {
            // Uchburchakdagi kabi - coords yangi cho'qqi joylashuvi
            const ts = trapezoidData.trapScale;
            const p = trapezoidData.points;

            // Calculate new vertex positions
            const p0 = draggingVertex === 0 ? coords : p[0]; // A (top-left)
            const p1 = draggingVertex === 1 ? coords : p[1]; // B (top-right)
            const p2 = draggingVertex === 2 ? coords : p[2]; // C (bottom-right)
            const p3 = draggingVertex === 3 ? coords : p[3]; // D (bottom-left)

            // Distance function
            const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / ts;

            // Trapezoid dimensions:
            // topBase = AB distance (top edge)
            // bottomBase = CD distance (bottom edge)
            // height = vertical distance between top and bottom
            const newTopBase = dist(p0, p1);
            const newBottomBase = dist(p3, p2);
            const newHeight = Math.abs(p3.y - p0.y) / ts;

            // Round values
            const roundedTop = Math.round(newTopBase * 10) / 10;
            const roundedBottom = Math.round(newBottomBase * 10) / 10;
            const roundedHeight = Math.round(newHeight * 10) / 10;

            // Silent validation
            if (roundedTop < 0.5 || roundedTop > 50 || roundedBottom < 0.5 || roundedBottom > 50 || roundedHeight < 0.5 || roundedHeight > 50) {
                return;
            }

            onSizeChange({ topBase: roundedTop, bottomBase: roundedBottom, height: roundedHeight });
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

// Trapetsiya Canvas komponenti
function TrapezoidCanvas({ topBase, bottomBase, height, leftLeg, rightLeg, showGrid, showHeight, showDiagonals, showMiddleLine, showAngles, isValid }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const cHeight = canvas.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, cHeight);

        if (showGrid) {
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 1;
            const gridSize = 25;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, cHeight);
                ctx.stroke();
            }
            for (let y = 0; y < cHeight; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            ctx.strokeStyle = '#2a2a38';
            for (let x = 0; x < width; x += gridSize * 4) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, cHeight);
                ctx.stroke();
            }
            for (let y = 0; y < cHeight; y += gridSize * 4) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }

        if (!isValid) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Trapetsiya hosil bo\'lmaydi!', width / 2, cHeight / 2);
            return;
        }

        const centerX = width / 2;
        const centerY = cHeight / 2 + 20;
        const maxDim = Math.max(bottomBase, height);
        const scale = Math.min(width * 0.7, cHeight * 0.6) / maxDim;

        const bottomScaled = bottomBase * scale;
        const topScaled = topBase * scale;
        const hScaled = height * scale;
        const topOffset = (bottomScaled - topScaled) / 2;

        const points = [
            { x: centerX - bottomScaled / 2 + topOffset, y: centerY - hScaled / 2, label: 'A' },
            { x: centerX - bottomScaled / 2 + topOffset + topScaled, y: centerY - hScaled / 2, label: 'B' },
            { x: centerX + bottomScaled / 2, y: centerY + hScaled / 2, label: 'C' },
            { x: centerX - bottomScaled / 2, y: centerY + hScaled / 2, label: 'D' }
        ];

        ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
        ctx.shadowBlur = 30;

        const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
        gradient.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.25)');

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
            const heightX = (points[0].x + points[1].x) / 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(heightX, points[0].y);
            ctx.lineTo(heightX, points[3].y);
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

        if (showMiddleLine) {
            const midLeftX = (points[0].x + points[3].x) / 2;
            const midLeftY = (points[0].y + points[3].y) / 2;
            const midRightX = (points[1].x + points[2].x) / 2;
            const midRightY = (points[1].y + points[2].y) / 2;

            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(midLeftX, midLeftY);
            ctx.lineTo(midRightX, midRightY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.font = 'bold 11px Inter, sans-serif';
            const mLabelX = (midLeftX + midRightX) / 2;
            const mLabelY = (midLeftY + midRightY) / 2 - 15;
            ctx.beginPath();
            ctx.roundRect(mLabelX - 12, mLabelY - 10, 24, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#22d3ee';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('m', mLabelX, mLabelY);
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

        const labels = ['A', 'B', 'C', 'D'];
        points.forEach((point, i) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
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
            if (i === 0) { lx -= 20; ly -= 10; }
            else if (i === 1) { lx += 20; ly -= 10; }
            else if (i === 2) { lx += 20; ly += 15; }
            else { lx -= 20; ly += 15; }

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

    }, [topBase, bottomBase, height, leftLeg, rightLeg, showGrid, showHeight, showDiagonals, showMiddleLine, showAngles, isValid]);

    return <canvas ref={canvasRef} width={700} height={550} className="triangle-canvas" />;
}

export function TrapetsiyaPage() {
    const [trapType, setTrapType] = useState('custom');
    const [topBase, setTopBase] = useState(6);
    const [bottomBase, setBottomBase] = useState(10);
    const [height, setHeight] = useState(5);
    const [unit, setUnit] = useState('sm');

    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setTopBase(prev => Math.round(prev * ratio * 100) / 100);
        setBottomBase(prev => Math.round(prev * ratio * 100) / 100);
        setHeight(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };

    const [showGrid, setShowGrid] = useState(true);
    const [showHeight, setShowHeight] = useState(true);
    const [showDiagonals, setShowDiagonals] = useState(false);
    const [showMiddleLine, setShowMiddleLine] = useState(false);
    const [showAngles, setShowAngles] = useState(true);
    const [resultModal, setResultModal] = useState(null);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);
    const [drawMode, setDrawMode] = useState(false);
    const [drawings, setDrawings] = useState([]);
    const [currentDrawing, setCurrentDrawing] = useState([]);
    const [drawColor, setDrawColor] = useState('#6366f1');
    const [drawSize, setDrawSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(15);
    const [isErasing, setIsErasing] = useState(false);
    const [rotateSpeed, setRotateSpeed] = useState(2);
    const [eraserPosition, setEraserPosition] = useState(null);
    const fullscreenRef = useRef(null);

    const containerRef = useRef(null);

    const unitSymbol = UNITS[unit].symbol;

    // Chizish funksiyalari
    const getRelativeCoords = (e) => { const container = fullscreenRef.current; if (!container) return { x: 0, y: 0 }; const rect = container.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; };
    const handleDrawStart = (e) => { if (!drawMode) return; if (isErasing) { const coords = getRelativeCoords(e); setEraserPosition(coords); eraseAtPosition(coords); return; } const coords = getRelativeCoords(e); setCurrentDrawing([coords]); };
    const handleDrawMove = (e) => { if (!drawMode) return; if (isErasing) { const coords = getRelativeCoords(e); setEraserPosition(coords); eraseAtPosition(coords); return; } if (currentDrawing.length === 0) return; const coords = getRelativeCoords(e); setCurrentDrawing(prev => [...prev, coords]); };
    const handleDrawEnd = () => { if (!drawMode) return; if (isErasing) { setEraserPosition(null); return; } if (currentDrawing.length < 2) return; setDrawings(prev => [...prev, { points: currentDrawing, color: drawColor, size: drawSize }]); setCurrentDrawing([]); };
    const eraseAtPosition = (coords) => { const updatedDrawings = drawings.map(drawing => { const { points } = drawing; const newSegments = []; let currentSegment = []; for (let i = 0; i < points.length; i++) { const point = points[i]; const dx = point.x - coords.x; const dy = point.y - coords.y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance >= eraserSize) { currentSegment.push(point); } else { if (currentSegment.length >= 2) { newSegments.push({ ...drawing, points: [...currentSegment] }); } currentSegment = []; } } if (currentSegment.length >= 2) { newSegments.push({ ...drawing, points: [...currentSegment] }); } return newSegments; }).flat(); setDrawings(updatedDrawings); };
    const clearAllDrawings = () => { setDrawings([]); setCurrentDrawing([]); };
    const resetView = () => { };

    useEffect(() => {
        if (trapType === 'isosceles') {
            // Teng yonli
        } else if (trapType === 'right') {
            // To'g'ri burchakli
        }
    }, [trapType, topBase, bottomBase, height]);

    const calculations = useMemo(() => {
        const a = topBase;
        const b = bottomBase;
        const h = height;

        const area = ((a + b) * h) / 2;
        const legLength = Math.sqrt(Math.pow((b - a) / 2, 2) + Math.pow(h, 2));
        const perimeter = a + b + 2 * legLength;
        const middleLine = (a + b) / 2;
        const diagonal = Math.sqrt(Math.pow(legLength, 2) + a * b);

        const isValid = a > 0 && b > 0 && h > 0 && b > a;

        return {
            area: area.toFixed(2),
            perimeter: perimeter.toFixed(2),
            legLength: legLength.toFixed(2),
            middleLine: middleLine.toFixed(2),
            diagonal: diagonal.toFixed(2),
            isValid
        };
    }, [topBase, bottomBase, height]);

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
                <FullscreenTrapezoid
                    topBase={topBase}
                    bottomBase={bottomBase}
                    height={height}
                    unitSymbol={unitSymbol}
                    isValid={calculations.isValid}
                    onClose={exitFullscreen}
                    onSizeChange={({ topBase: newTop, bottomBase: newBottom, height: newHeight }) => {
                        setTopBase(newTop);
                        setBottomBase(newBottom);
                        setHeight(newHeight);
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
                        <img src="/src/logo/logo.png" alt="Logo" className="header-logo-img" />
                    </Link>
                    <div className="header-divider"></div>
                    <div className="pro-page-header-content">
                        <div className="pro-header-icon">
                            <span className="icon-glow" style={{ color: COLORS.primary }}>⏢</span>
                        </div>
                        <div className="pro-header-text">
                            <h1>Trapetsiya</h1>
                            <p>Ikki tomoni parallel to'rtburchak</p>
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

                        <details className="pro-section settings-type-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">⏢</div>
                                <span className="pro-section-title">Trapetsiya turi</span>
                                <span className="pro-section-badge">{TRAPEZOID_TYPES[trapType].icon}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-type-grid-settings">
                                    {Object.entries(TRAPEZOID_TYPES).map(([key, value]) => (
                                        <button key={key} className={`pro-settings-btn type-btn ${trapType === key ? 'active' : ''}`} onClick={() => setTrapType(key)}>
                                            <span className="settings-btn-icon large">{value.icon}</span>
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
                                <span className="pro-section-badge">3 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>a</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Tepa asos</span>
                                                <span className="pro-side-desc">AB</span>
                                            </div>
                                            <div className="pro-side-value">{topBase} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="1" max="15" step="0.5" value={topBase} onChange={(e) => setTopBase(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#ef4444' }} />
                                        </div>
                                    </div>

                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>b</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Pastki asos</span>
                                                <span className="pro-side-desc">CD</span>
                                            </div>
                                            <div className="pro-side-value">{bottomBase} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="2" max="20" step="0.5" value={bottomBase} onChange={(e) => setBottomBase(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#8b5cf6' }} />
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
                                            <input type="range" min="1" max="15" step="0.5" value={height} onChange={(e) => setHeight(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#f59e0b' }} />
                                        </div>
                                    </div>

                                    {!calculations.isValid && (
                                        <div className="pro-error-box">
                                            <div className="error-icon-wrap">⚠️</div>
                                            <div className="error-text">
                                                <strong>Trapetsiya hosil bo'lmaydi!</strong>
                                                <p>Pastki asos tepadan katta bo'lishi kerak</p>
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
                                <span className="pro-section-badge">{[showGrid, showHeight, showDiagonals, showMiddleLine, showAngles].filter(Boolean).length}/5</span>
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
                                        <button className={`pro-toggle-item ${showHeight ? 'active' : ''}`} onClick={() => setShowHeight(!showHeight)}>
                                            <span className="toggle-icon">↕</span>
                                            <span className="toggle-label">Balandlik</span>
                                            <span className={`toggle-status ${showHeight ? 'on' : 'off'}`}>{showHeight ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showAngles ? 'active' : ''}`} onClick={() => setShowAngles(!showAngles)}>
                                            <span className="toggle-icon">∠</span>
                                            <span className="toggle-label">Burchaklar</span>
                                            <span className={`toggle-status ${showAngles ? 'on' : 'off'}`}>{showAngles ? 'ON' : 'OFF'}</span>
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
                                        <button className={`pro-toggle-item ${showMiddleLine ? 'active' : ''}`} onClick={() => setShowMiddleLine(!showMiddleLine)}>
                                            <span className="toggle-icon">—</span>
                                            <span className="toggle-label">O'rta chiziq</span>
                                            <span className={`toggle-status ${showMiddleLine ? 'on' : 'off'}`}>{showMiddleLine ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </aside>

                <section className="canvas-panel" style={{ position: 'relative' }}>
                    <TrapezoidCanvas
                        topBase={topBase}
                        bottomBase={bottomBase}
                        height={height}
                        leftLeg={parseFloat(calculations.legLength)}
                        rightLeg={parseFloat(calculations.legLength)}
                        showGrid={showGrid}
                        showHeight={showHeight}
                        showDiagonals={showDiagonals}
                        showMiddleLine={showMiddleLine}
                        showAngles={showAngles}
                        isValid={calculations.isValid}
                    />
                    {calculations.isValid && (
                        <>
                            <div className="shape-type-badge">
                                <span className="badge-icon">⏢</span>
                                {trapType === 'isosceles' ? 'Teng yonli trapetsiya' : trapType === 'right' ? "To'g'ri burchakli trapetsiya" : 'Trapetsiya'}
                            </div>
                            <button className="fullscreen-toggle-btn" onClick={() => setIsFullscreen(true)} title="To'liq ekran">
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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 18L8 6h8l4 12H4z" /></svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Yuzasi</span>
                                <span className="pro-card-value">{calculations.area}</span>
                                <span className="pro-card-unit">{unitSymbol}²</span>
                            </div>
                            <div className="pro-card-formula">S = (a + b) × h / 2</div>
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
                            <div className="pro-card-formula">P = a + b + c + d</div>
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
                                    <h4 className="pro-subsection-title">📏 Asosiy o'lchamlar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('middleLine')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">m</span>
                                            <span className="measure-value">{calculations.middleLine} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item" onClick={() => setResultModal('legLength')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">c</span>
                                            <span className="measure-value">{calculations.legLength} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item" onClick={() => setResultModal('diagonal')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">d</span>
                                            <span className="measure-value">{calculations.diagonal} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">↕ Balandlik</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">h</span>
                                            <span className="measure-value">{height} {unitSymbol}</span>
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
                                        <div className="pro-formula-item"><code>S = (a + b) × h / 2</code><span>Yuza</span></div>
                                        <div className="pro-formula-item"><code>m = (a + b) / 2</code><span>O'rta chiziq</span></div>
                                        <div className="pro-formula-item"><code>P = a + b + c + d</code><span>Perimetr</span></div>
                                    </div>
                                </div>
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📏 Yon tomon</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>c = √((b-a)²/4 + h²)</code><span>Teng yonli</span></div>
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
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#ef4444' }}>📐 Yuzasini hisoblash</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>S = (a + b) × h / 2</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>S = ({topBase} + {bottomBase}) × {height} / 2</div>
                                        <div>S = {topBase + bottomBase} × {height} / 2</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginTop: '10px' }}>S = {calculations.area} {unitSymbol}²</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'perimeter' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#8b5cf6' }}>📏 Perimetrni hisoblash</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div>P = a + b + 2c</div>
                                    <div>P = {topBase} + {bottomBase} + 2 × {calculations.legLength}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', marginTop: '10px' }}>P = {calculations.perimeter} {unitSymbol}</div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'middleLine' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#22d3ee' }}>➖ O'rta chiziq (m)</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>m = (a + b) / 2</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>m = ({topBase} + {bottomBase}) / 2</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22d3ee', marginTop: '10px' }}>m = {calculations.middleLine} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'legLength' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981' }}>↗ Yon tomon (c)</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula (teng yonli trapetsiya):</div>
                                        <div>c = √[((b - a) / 2)² + h²]</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>c = √[(({bottomBase} - {topBase}) / 2)² + {height}²]</div>
                                        <div>c = √[{((bottomBase - topBase) / 2).toFixed(2)}² + {height}²]</div>
                                        <div>c = √[{(Math.pow((bottomBase - topBase) / 2, 2)).toFixed(2)} + {Math.pow(height, 2).toFixed(2)}]</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '10px' }}>c = {calculations.legLength} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'diagonal' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#8b5cf6' }}>⟋ Diagonal (d)</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula (teng yonli trapetsiya):</div>
                                        <div>d = √[c² + a × b]</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>d = √[{calculations.legLength}² + {topBase} × {bottomBase}]</div>
                                        <div>d = √[{(Math.pow(parseFloat(calculations.legLength), 2)).toFixed(2)} + {(topBase * bottomBase).toFixed(2)}]</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', marginTop: '10px' }}>d = {calculations.diagonal} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showRulesModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowRulesModal(false)}>
                    <div style={{ backgroundColor: '#1e1e24', padding: '30px', borderRadius: '24px', maxWidth: '700px', width: '90%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #2a2a35' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowRulesModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '28px', cursor: 'pointer' }}>×</button>
                        <h3 style={{ fontSize: '28px', marginBottom: '25px', color: '#ef4444' }}>📖 Trapetsiya qoidalari</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { num: 1, title: "Ta'rifi", desc: "Faqat ikkita tomoni parallel bo'lgan to'rtburchak", color: '#ef4444' },
                                { num: 2, title: "O'rta chiziq", desc: "Yon tomonlar o'rtalarini birlashtiruvchi chiziq, m = (a+b)/2", color: '#22d3ee' },
                                { num: 3, title: "Yuza formulasi", desc: "S = (a + b) × h / 2 yoki S = m × h", color: '#f59e0b' },
                                { num: 4, title: "Teng yonli trapetsiya", desc: "Yon tomonlari teng, diagonallari teng", color: '#8b5cf6' },
                                { num: 5, title: "Burchaklar", desc: "Bir asosga yopishgan burchaklar yig'indisi 180°", color: '#10b981' }
                            ].map(rule => (
                                <div key={rule.num} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px', border: `1px solid ${rule.color}30` }}>
                                    <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${rule.color}40, ${rule.color}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', color: rule.color }}>{rule.num}</span>
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

            {/* Fullscreen Modal */}
            {isFullscreen && (
                <div className="fullscreen-3d-modal">
                    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
                        <button onClick={() => setIsFullscreen(false)} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', fontSize: '18px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}>✕</button>
                    </div>
                    <div style={{ position: 'absolute', top: 20, left: 80, zIndex: 100, background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '10px', color: '#10b981', fontSize: '14px', fontWeight: '600' }}>⏢ Trapetsiya - To'liq ekran</div>
                    <TrapezoidCanvas topBase={topBase} bottomBase={bottomBase} height={height} leftLeg={parseFloat(calculations.legLength)} rightLeg={parseFloat(calculations.legLength)} showGrid={showGrid} showHeight={showHeight} showDiagonals={showDiagonals} showMiddleLine={showMiddleLine} showAngles={showAngles} isValid={calculations.isValid} />
                </div>
            )}
        </div>
    );
}
