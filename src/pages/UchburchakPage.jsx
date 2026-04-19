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

// Uchburchak turlari
const TRIANGLE_TYPES = {
    custom: { name: "Ixtiyoriy", icon: "✏️" },
    equilateral: { name: "Teng tomonli", icon: "△" },
    isosceles: { name: "Teng yonli", icon: "▲" },
    right: { name: "To'g'ri burchakli", icon: "◢" }
};

// Burchak bo'yicha uchburchak turlari
const ANGLE_TYPES = {
    acute: { name: "O'tkir burchakli", icon: "◿", description: "Barcha burchaklar 90° dan kichik" },
    right: { name: "To'g'ri burchakli", icon: "◢", description: "Bitta burchak 90° ga teng" },
    obtuse: { name: "O'tmas burchakli", icon: "◺", description: "Bitta burchak 90° dan katta" }
};

// Rang palitra
const COLORS = {
    primary: '#10b981',
    secondary: '#6366f1',
    accent: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6'
};

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Professional Fullscreen Triangle Whiteboard
function FullscreenTriangleWhiteboard({ sideA, sideB, sideC, unitSymbol, onClose, onSizeChange }) {
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

    const triangleData = useMemo(() => {
        if (!sideA || !sideB || !sideC) return null;
        
        const cWidth = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = cWidth / 2;
        const centerY = cHeight / 2;
        
        // Calculate triangle coordinates using side lengths
        const a = sideA, b = sideB, c = sideC;
        const maxSide = Math.max(a, b, c);
        const triScale = Math.min(cWidth * 0.4, cHeight * 0.4) / maxSide;
        
        const aScaled = a * triScale;
        const bScaled = b * triScale;
        const cScaled = c * triScale;
        
        // Place A at bottom-left, B at bottom-right, C at top
        const Ax = centerX - cScaled / 2;
        const Ay = centerY + cHeight * 0.2;
        const Bx = centerX + cScaled / 2;
        const By = centerY + cHeight * 0.2;
        
        // Calculate C position using law of cosines
        const cosA = (bScaled * bScaled + cScaled * cScaled - aScaled * aScaled) / (2 * bScaled * cScaled);
        const sinA = Math.sqrt(1 - cosA * cosA);
        const Cx = Ax + bScaled * cosA;
        const Cy = Ay - bScaled * sinA;
        
        return {
            points: [
                { x: Ax, y: Ay, label: 'A' },
                { x: Bx, y: By, label: 'B' },
                { x: Cx, y: Cy, label: 'C' }
            ],
            triScale
        };
    }, [sideA, sideB, sideC, canvasSize]);

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

        if (triangleData) {
            const { points } = triangleData;

            ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
            ctx.shadowBlur = 40 / scale;

            const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
            gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.35)');

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
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
                ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
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
                if (i === 0) { lx -= 40 / scale; ly += 30 / scale; }
                else if (i === 1) { lx += 40 / scale; ly += 30 / scale; }
                else { ly -= 30 / scale; }

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
                { p1: 0, p2: 1, label: `c = ${sideC} ${unitSymbol}`, color: COLORS.secondary, offset: 35 / scale },
                { p1: 0, p2: 2, label: `b = ${sideB} ${unitSymbol}`, color: COLORS.primary, offset: -35 / scale },
                { p1: 1, p2: 2, label: `a = ${sideA} ${unitSymbol}`, color: COLORS.accent, offset: 35 / scale }
            ];
            sides.forEach((side, idx) => {
                const midX = (points[side.p1].x + points[side.p2].x) / 2;
                const midY = (points[side.p1].y + points[side.p2].y) / 2;
                
                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
                const textWidth = ctx.measureText(side.label).width + 24 / scale;
                const offsetX = idx === 1 ? -40 / scale : (idx === 2 ? 40 / scale : 0);
                const offsetY = idx === 0 ? 35 / scale : (idx === 1 ? -10 / scale : -10 / scale);
                
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
    }, [scale, offset, sideA, sideB, sideC, canvasSize, triangleData, drawings, currentPath, penColor, penSize, unitSymbol]);

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

            if (isLocked && triangleData) {
                const hitRadius = 20 / scale;
                const clickedVertexIndex = triangleData.points.findIndex(p => {
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
        } else if (draggingVertex !== null && triangleData && onSizeChange) {
            const ts = triangleData.triScale;
            const p = triangleData.points;

            const p0 = draggingVertex === 0 ? coords : p[0]; // A
            const p1 = draggingVertex === 1 ? coords : p[1]; // B
            const p2 = draggingVertex === 2 ? coords : p[2]; // C

            const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / ts;

            // Triangle sides: a=BC, b=AC, c=AB
            const newC = Math.round(dist(p0, p1) * 10) / 10; // AB
            const newB = Math.round(dist(p0, p2) * 10) / 10; // AC
            const newA = Math.round(dist(p1, p2) * 10) / 10; // BC

            if (newA < 0.5 || newA > 50 || newB < 0.5 || newB > 50 || newC < 0.5 || newC > 50) {
                return;
            }

            onSizeChange({ sideA: newA, sideB: newB, sideC: newC });
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

// Yaxshilangan Canvas komponenti
function TriangleCanvas({ a, b, c, angleA, angleB, angleC, showGrid, showAngles, showSides, showHeight, showExternalAngles, showMedian, showBisector, showIncircle, showCircumcircle, showHypotenuse, isValid }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Grid
        if (showGrid) {
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 1;
            const gridSize = 25;

            for (let x = 0; x <= width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y <= height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Katta grid
            ctx.strokeStyle = '#2a2a38';
            for (let x = 0; x <= width; x += gridSize * 4) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y <= height; y += gridSize * 4) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }

        if (!isValid) {
            // Xatolik xabari
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Uchburchak hosil bo\'lmaydi!', width / 2, height / 2 - 10);
            ctx.font = '14px Inter, sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText('Tomonlar nisbatini o\'zgartiring', width / 2, height / 2 + 20);
            return;
        }

        // Uchburchak chizish
        const centerX = width / 2;
        const centerY = height / 2 + 40;
        const maxSide = Math.max(a, b, c);
        const scale = Math.min(width * 0.7, height * 0.6) / maxSide;

        // Nuqtalar
        const x1 = 0;
        const y1 = 0;
        const x2 = c * scale;
        const y2 = 0;

        // C nuqta (A burchak va b tomon asosida)
        const angleARad = (angleA * Math.PI) / 180;
        const x3 = b * scale * Math.cos(angleARad);
        const y3 = -b * scale * Math.sin(angleARad);

        // Markazlashtirish
        const minX = Math.min(x1, x2, x3);
        const maxX = Math.max(x1, x2, x3);
        const minY = Math.min(y1, y2, y3);
        const maxY = Math.max(y1, y2, y3);

        const offsetX = centerX - (minX + maxX) / 2;
        const offsetY = centerY - (minY + maxY) / 2;

        const points = [
            { x: x1 + offsetX, y: y1 + offsetY, label: 'A', angle: angleA },
            { x: x2 + offsetX, y: y2 + offsetY, label: 'B', angle: angleB },
            { x: x3 + offsetX, y: y3 + offsetY, label: 'C', angle: angleC }
        ];

        // Shadow
        ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Gradient fill
        const gradient = ctx.createLinearGradient(
            points[0].x, points[2].y,
            points[1].x, points[0].y
        );
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.25)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Chiziqlari (glow effect)
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Balandlik (agar ko'rsatish kerak bo'lsa)
        if (showHeight) {
            // C nuqtadan AB ga balandlik
            const t = ((points[2].x - points[0].x) * (points[1].x - points[0].x) +
                (points[2].y - points[0].y) * (points[1].y - points[0].y)) /
                ((points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2);

            const hx = points[0].x + t * (points[1].x - points[0].x);
            const hy = points[0].y + t * (points[1].y - points[0].y);

            // Balandlik chizig'i (dashed)
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(points[2].x, points[2].y);
            ctx.lineTo(hx, hy);
            ctx.stroke();
            ctx.setLineDash([]);

            // Balandlik uzunligini hisoblash
            const heightLength = Math.sqrt((points[2].x - hx) ** 2 + (points[2].y - hy) ** 2);

            // Faqat balandlik 0 dan katta bo'lganda chizish
            if (heightLength > 1) {
                // Uchburchak markazini hisoblash
                const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
                const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

                // h label joylashuvi - balandlik chizig'ining o'rtasida, uchburchak tashqarisida
                const midHX = (points[2].x + hx) / 2;
                const midHY = (points[2].y + hy) / 2;

                // Balandlik chizig'iga perpendikulyar yo'nalish
                const hdx = hx - points[2].x;
                const hdy = hy - points[2].y;
                const hLen = Math.sqrt(hdx * hdx + hdy * hdy);
                let offsetX = -hdy / hLen * 20;
                let offsetY = hdx / hLen * 20;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = midHX + offsetX;
                const testY = midHY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((midHX - centroidX) ** 2 + (midHY - centroidY) ** 2);

                if (distToCentroid < distFromMid) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                const labelX = midHX + offsetX;
                const labelY = midHY + offsetY;

                // h label foni
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.font = 'bold 14px Inter, sans-serif';
                ctx.beginPath();
                ctx.roundRect(labelX - 12, labelY - 12, 24, 24, 6);
                ctx.fill();
                ctx.strokeStyle = COLORS.accent;
                ctx.lineWidth = 1;
                ctx.stroke();

                // h label matni
                ctx.fillStyle = COLORS.accent;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('h', labelX, labelY);

                // To'g'ri burchak belgisi (90° kvadrat)
                const size = 10;

                // AB tomoni yo'nalishi
                const abLen = Math.sqrt((points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2);
                const abDx = (points[1].x - points[0].x) / abLen;
                const abDy = (points[1].y - points[0].y) / abLen;

                // Balandlik yo'nalishi (H dan C ga - yuqoriga qarab)
                const hDirX = (points[2].x - hx) / hLen;
                const hDirY = (points[2].y - hy) / hLen;

                // Draw right angle mark - simple L shape
                ctx.strokeStyle = COLORS.accent;
                ctx.lineWidth = 1.5;
                ctx.beginPath();

                // Start point along AB (towards A)
                const startX = hx - abDx * size;
                const startY = hy - abDy * size;

                // Corner point (up from start towards C)
                const cornerX = startX + hDirX * size;
                const cornerY = startY + hDirY * size;

                // End point (straight up from H towards C)
                const endX = hx + hDirX * size;
                const endY = hy + hDirY * size;

                ctx.moveTo(startX, startY);
                ctx.lineTo(cornerX, cornerY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }

        // Burchak yoylari
        if (showAngles) {
            const arcRadius = 25;

            points.forEach((point, i) => {
                const prev = points[(i + 2) % 3];
                const next = points[(i + 1) % 3];

                const angle1 = Math.atan2(prev.y - point.y, prev.x - point.x);
                const angle2 = Math.atan2(next.y - point.y, next.x - point.x);

                // Burchak yoyi - to'g'ri yo'nalishni aniqlash
                // Uchburchak ichidagi burchakni chizish uchun kichik yoyni tanlash kerak
                let startAngle = angle1;
                let endAngle = angle2;

                // Burchaklar orasidagi farqni hisoblash
                let diff = endAngle - startAngle;

                // Farqni [-π, π] oralig'iga keltirish
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;

                // Agar farq musbat bo'lsa (0..180), soat yo'nalishida chizish (counterclockwise = false)
                // Agar manfiy bo'lsa (-180..0), soat yo'nalishiga qarshi chizish (counterclockwise = true)
                const counterclockwise = diff < 0;

                // Burchak yoyi gradient
                const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, arcRadius);
                gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
                gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.arc(point.x, point.y, arcRadius, startAngle, endAngle, counterclockwise);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                // Burchak qiymati - o'rta burchakni to'g'ri hisoblash
                // O'rta burchak ichki yoy markazida bo'lishi kerak
                let midAngle;
                if (counterclockwise) {
                    // Soat yo'nalishiga qarshi - startAngle dan diff/2 ni ayirish
                    midAngle = startAngle - Math.abs(diff) / 2;
                } else {
                    // Soat yo'nalishida - startAngle ga diff/2 ni qo'shish
                    midAngle = startAngle + Math.abs(diff) / 2;
                }

                const textRadius = arcRadius + 20;
                const tx = point.x + Math.cos(midAngle) * textRadius;
                const ty = point.y + Math.sin(midAngle) * textRadius;

                const angleText = `${point.angle.toFixed(1)}°`;
                ctx.font = 'bold 12px Inter, sans-serif';
                const textWidth = ctx.measureText(angleText).width + 8;

                // Background for readability
                ctx.fillStyle = 'rgba(23, 23, 31, 0.8)';
                ctx.beginPath();
                ctx.roundRect(tx - textWidth / 2, ty - 9, textWidth, 18, 4);
                ctx.fill();

                ctx.fillStyle = COLORS.purple;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(angleText, tx, ty);
            });
        }

        // Tashqi burchak yoylari
        if (showExternalAngles) {
            const extArcRadius = 35;

            points.forEach((point, i) => {
                const prev = points[(i + 2) % 3];
                const next = points[(i + 1) % 3];

                // Ichki burchak yo'nalishlari
                const angleToPrev = Math.atan2(prev.y - point.y, prev.x - point.x);
                const angleToNext = Math.atan2(next.y - point.y, next.x - point.x);

                // Tashqi burchak = 180° - ichki burchak
                const externalAngle = 180 - point.angle;

                // Tashqi burchak uchun: tomonlardan birining davomini (180° burilish) va boshqa tomon orasida
                // Tashqi burchak "prev" tomoni davomi va "next" tomoni orasida
                const extAngleStart = angleToNext;
                const extAngleEnd = angleToPrev + Math.PI; // prev tomoni davomi (180° burilgan)

                // Burchaklar orasidagi farqni hisoblash
                let diff = extAngleEnd - extAngleStart;

                // Farqni [-π, π] oralig'iga keltirish
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;

                // Kichik yoyni tanlash uchun yo'nalishni aniqlash
                // Tashqi burchak uchun bizga katta yoy kerak (180° dan katta)
                // Shuning uchun teskari yo'nalishda chizamiz
                const counterclockwise = diff < 0;

                // Tashqi burchak gradiyent rangi
                const extGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, extArcRadius);
                extGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
                extGradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.arc(point.x, point.y, extArcRadius, extAngleStart, extAngleEnd, counterclockwise);
                ctx.closePath();
                ctx.fillStyle = extGradient;
                ctx.fill();

                // Tashqi burchak yoy chizig'i
                ctx.beginPath();
                ctx.arc(point.x, point.y, extArcRadius, extAngleStart, extAngleEnd, counterclockwise);
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 2]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Tashqi burchak qiymati joylashuvi - o'rta burchakni to'g'ri hisoblash
                let midAngle;
                if (counterclockwise) {
                    // Soat yo'nalishiga qarshi chizilgan
                    midAngle = extAngleStart - Math.abs(diff) / 2;
                } else {
                    // Soat yo'nalishida chizilgan
                    midAngle = extAngleStart + Math.abs(diff) / 2;
                }

                const extTextRadius = extArcRadius + 20;
                const etx = point.x + Math.cos(midAngle) * extTextRadius;
                const ety = point.y + Math.sin(midAngle) * extTextRadius;

                // Tashqi burchak label fon
                const extLabel = `${externalAngle.toFixed(1)}°`;
                ctx.font = 'bold 11px Inter, sans-serif';
                const extTextWidth = ctx.measureText(extLabel).width + 10;
                ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
                ctx.beginPath();
                ctx.roundRect(etx - extTextWidth / 2, ety - 10, extTextWidth, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Tashqi burchak qiymati matni
                ctx.fillStyle = '#06b6d4';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(extLabel, etx, ety);
            });
        }

        // Medianlar
        if (showMedian) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Har bir cho'qqidan qarama-qarshi tomon o'rtasiga chiziq
            const medians = [
                { vertex: 0, side: [1, 2], color: '#f43f5e', label: 'mₐ' }, // A dan BC o'rtasiga
                { vertex: 1, side: [0, 2], color: '#a855f7', label: 'mᵦ' }, // B dan AC o'rtasiga
                { vertex: 2, side: [0, 1], color: '#22c55e', label: 'mᴄ' }  // C dan AB o'rtasiga
            ];

            medians.forEach(median => {
                const vertexPoint = points[median.vertex];
                // Qarama-qarshi tomon o'rtasi
                const midX = (points[median.side[0]].x + points[median.side[1]].x) / 2;
                const midY = (points[median.side[0]].y + points[median.side[1]].y) / 2;

                // Median chizig'i
                ctx.beginPath();
                ctx.moveTo(vertexPoint.x, vertexPoint.y);
                ctx.lineTo(midX, midY);
                ctx.strokeStyle = median.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                ctx.stroke();
                ctx.setLineDash([]);

                // O'rta nuqta belgisi
                ctx.beginPath();
                ctx.arc(midX, midY, 4, 0, Math.PI * 2);
                ctx.fillStyle = median.color;
                ctx.fill();

                // Median label
                const labelX = (vertexPoint.x + midX) / 2;
                const labelY = (vertexPoint.y + midY) / 2;

                // Label offset (median chizig'iga perpendikulyar)
                const dx = midX - vertexPoint.x;
                const dy = midY - vertexPoint.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let offsetX = -dy / len * 18;
                let offsetY = dx / len * 18;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = labelX + offsetX;
                const testY = labelY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromLabel = Math.sqrt((labelX - centroidX) ** 2 + (labelY - centroidY) ** 2);

                if (distToCentroid < distFromLabel) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                ctx.font = 'bold 11px Inter, sans-serif';
                const textWidth = ctx.measureText(median.label).width + 8;
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(labelX + offsetX - textWidth / 2, labelY + offsetY - 10, textWidth, 20, 4);
                ctx.fill();
                ctx.strokeStyle = median.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = median.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(median.label, labelX + offsetX, labelY + offsetY);
            });

            // Og'irlik markazi (Centroid) - medianlar kesishgan joy
            // Centroid nuqtasi
            ctx.beginPath();
            ctx.arc(centroidX, centroidY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(centroidX, centroidY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();

            // Centroid label
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(centroidX + 12, centroidY - 10, 22, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('G', centroidX + 23, centroidY);
        }

        // Bissektrisalar
        if (showBisector) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Har bir cho'qqidan burchakni ikkiga bo'luvchi chiziq
            const bisectors = [
                { vertex: 0, oppositeSide: [1, 2], color: '#ec4899', label: 'lₐ' }, // A dan
                { vertex: 1, oppositeSide: [0, 2], color: '#14b8a6', label: 'lᵦ' }, // B dan
                { vertex: 2, oppositeSide: [0, 1], color: '#f97316', label: 'lᴄ' }  // C dan
            ];

            bisectors.forEach((bisector, idx) => {
                const vertexPoint = points[bisector.vertex];
                const p1 = points[bisector.oppositeSide[0]];
                const p2 = points[bisector.oppositeSide[1]];

                // Bissektrisa qarama-qarshi tomonda qayerda kesishishini topish
                // Bissektrisa teoremasi: BD/DC = AB/AC
                // Qarama-qarshi tomon uzunliklari
                const side1Len = Math.sqrt(Math.pow(vertexPoint.x - p1.x, 2) + Math.pow(vertexPoint.y - p1.y, 2));
                const side2Len = Math.sqrt(Math.pow(vertexPoint.x - p2.x, 2) + Math.pow(vertexPoint.y - p2.y, 2));

                // Kesishish nuqtasi (p1 va p2 orasida, side1Len:side2Len nisbatida)
                const ratio = side1Len / (side1Len + side2Len);
                const intersectX = p1.x + ratio * (p2.x - p1.x);
                const intersectY = p1.y + ratio * (p2.y - p1.y);

                // Bissektrisa chizig'i
                ctx.beginPath();
                ctx.moveTo(vertexPoint.x, vertexPoint.y);
                ctx.lineTo(intersectX, intersectY);
                ctx.strokeStyle = bisector.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Kesishish nuqtasi belgisi
                ctx.beginPath();
                ctx.arc(intersectX, intersectY, 4, 0, Math.PI * 2);
                ctx.fillStyle = bisector.color;
                ctx.fill();

                // Bissektrisa label
                const labelX = (vertexPoint.x + intersectX) / 2;
                const labelY = (vertexPoint.y + intersectY) / 2;

                const dx = intersectX - vertexPoint.x;
                const dy = intersectY - vertexPoint.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let offsetX = -dy / len * 18;
                let offsetY = dx / len * 18;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = labelX + offsetX;
                const testY = labelY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromLabel = Math.sqrt((labelX - centroidX) ** 2 + (labelY - centroidY) ** 2);

                if (distToCentroid < distFromLabel) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                ctx.font = 'bold 11px Inter, sans-serif';
                const textWidth = ctx.measureText(bisector.label).width + 8;
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(labelX + offsetX - textWidth / 2, labelY + offsetY - 10, textWidth, 20, 4);
                ctx.fill();
                ctx.strokeStyle = bisector.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = bisector.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(bisector.label, labelX + offsetX, labelY + offsetY);
            });

            // Incenter (bissektrisalar kesishgan nuqta) - ichki chizilgan aylana markazi
            // Incenter koordinatalari: (a*Ax + b*Bx + c*Cx)/(a+b+c), (a*Ay + b*By + c*Cy)/(a+b+c)
            const perimeter = a + b + c;
            const incenterX = (a * points[0].x + b * points[1].x + c * points[2].x) / perimeter;
            const incenterY = (a * points[0].y + b * points[1].y + c * points[2].y) / perimeter;

            // Incenter nuqtasi
            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ec4899';
            ctx.fill();

            // Incenter label
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(incenterX + 12, incenterY - 10, 18, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ec4899';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('I', incenterX + 21, incenterY);
        }

        // Ichki aylana (Incircle)
        if (showIncircle) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Incenter koordinatalari
            const perimeter = a + b + c;
            const incenterX = (a * points[0].x + b * points[1].x + c * points[2].x) / perimeter;
            const incenterY = (a * points[0].y + b * points[1].y + c * points[2].y) / perimeter;

            // Inradius (ichki aylana radiusi) - scale bo'yicha
            const s = perimeter / 2; // yarim perimetr
            const areaSquared = s * (s - a) * (s - b) * (s - c);
            const area = Math.sqrt(areaSquared);
            const inradius = area / s;
            const inradiusScaled = inradius * scale;

            // Ichki aylana chizish
            ctx.beginPath();
            ctx.arc(incenterX, incenterY, inradiusScaled, 0, Math.PI * 2);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([]);
            ctx.stroke();

            // Aylana ichki gradient
            const incircleGradient = ctx.createRadialGradient(
                incenterX, incenterY, 0,
                incenterX, incenterY, inradiusScaled
            );
            incircleGradient.addColorStop(0, 'rgba(34, 211, 238, 0.15)');
            incircleGradient.addColorStop(1, 'rgba(34, 211, 238, 0.05)');
            ctx.fillStyle = incircleGradient;
            ctx.fill();

            // Incenter nuqtasi
            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#22d3ee';
            ctx.fill();

            // Radius chizig'i (markazdan AB tomonga perpendikulyar)
            const abDx = points[1].x - points[0].x;
            const abDy = points[1].y - points[0].y;
            const abLen = Math.sqrt(abDx * abDx + abDy * abDy);

            // Perpendikulyar yo'nalish (AB tomonga)
            let perpX = -abDy / abLen;
            let perpY = abDx / abLen;

            // Incenterdan AB tomonga perpendikulyar nuqtani topish
            // Incenterdan AB chizig'iga proyeksiya
            const t = ((incenterX - points[0].x) * abDx + (incenterY - points[0].y) * abDy) / (abLen * abLen);
            const footX = points[0].x + t * abDx;
            const footY = points[0].y + t * abDy;

            // Radius chizig'i (incenterdan AB tomon ustidagi nuqtaga)
            ctx.beginPath();
            ctx.moveTo(incenterX, incenterY);
            ctx.lineTo(footX, footY);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Radius label - radius chizig'iga perpendikulyar, tashqarida
            const rMidX = (incenterX + footX) / 2;
            const rMidY = (incenterY + footY) / 2;

            // Radius chizig'iga perpendikulyar yo'nalish
            const rDx = footX - incenterX;
            const rDy = footY - incenterY;
            const rLen = Math.sqrt(rDx * rDx + rDy * rDy);

            if (rLen > 1) {
                let rOffsetX = -rDy / rLen * 18;
                let rOffsetY = rDx / rLen * 18;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = rMidX + rOffsetX;
                const testY = rMidY + rOffsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((rMidX - centroidX) ** 2 + (rMidY - centroidY) ** 2);

                if (distToCentroid < distFromMid) {
                    rOffsetX = -rOffsetX;
                    rOffsetY = -rOffsetY;
                }

                const rLabelX = rMidX + rOffsetX;
                const rLabelY = rMidY + rOffsetY;

                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(rLabelX - 10, rLabelY - 10, 20, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#22d3ee';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('r', rLabelX, rLabelY);
            }

            // Incenter label (agar bissektrisa ko'rsatilmagan bo'lsa)
            if (!showBisector) {
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(incenterX + 10, incenterY - 18, 18, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#22d3ee';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('I', incenterX + 19, incenterY - 8);
            }
        }

        // Tashqi aylana (Circumcircle)
        if (showCircumcircle) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Circumcenter - uchburchak cho'qqilaridan teng masofada bo'lgan nuqta
            // Circumcenter formulasi
            const ax = points[0].x, ay = points[0].y;
            const bx = points[1].x, by = points[1].y;
            const cx = points[2].x, cy = points[2].y;

            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

            if (Math.abs(d) > 0.0001) {
                const circumcenterX = ((ax * ax + ay * ay) * (by - cy) +
                    (bx * bx + by * by) * (cy - ay) +
                    (cx * cx + cy * cy) * (ay - by)) / d;
                const circumcenterY = ((ax * ax + ay * ay) * (cx - bx) +
                    (bx * bx + by * by) * (ax - cx) +
                    (cx * cx + cy * cy) * (bx - ax)) / d;

                // Circumradius - markazdan cho'qqigacha masofa
                const circumradiusScaled = Math.sqrt(
                    Math.pow(circumcenterX - ax, 2) +
                    Math.pow(circumcenterY - ay, 2)
                );

                // Tashqi aylana chizish
                ctx.beginPath();
                ctx.arc(circumcenterX, circumcenterY, circumradiusScaled, 0, Math.PI * 2);
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([]);
                ctx.stroke();

                // Aylana ichki gradient (yengil)
                const circumGradient = ctx.createRadialGradient(
                    circumcenterX, circumcenterY, circumradiusScaled * 0.7,
                    circumcenterX, circumcenterY, circumradiusScaled
                );
                circumGradient.addColorStop(0, 'rgba(168, 85, 247, 0)');
                circumGradient.addColorStop(1, 'rgba(168, 85, 247, 0.08)');
                ctx.fillStyle = circumGradient;
                ctx.fill();

                // Circumcenter nuqtasi
                ctx.beginPath();
                ctx.arc(circumcenterX, circumcenterY, 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(circumcenterX, circumcenterY, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#a855f7';
                ctx.fill();

                // Radius chizig'i (markazdan A cho'qqisiga)
                ctx.beginPath();
                ctx.moveTo(circumcenterX, circumcenterY);
                ctx.lineTo(ax, ay);
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Radius label
                const rLabelMidX = (circumcenterX + ax) / 2;
                const rLabelMidY = (circumcenterY + ay) / 2;

                // Radius chizig'iga perpendikulyar yo'nalish
                const rdx = ax - circumcenterX;
                const rdy = ay - circumcenterY;
                const rLen = Math.sqrt(rdx * rdx + rdy * rdy);

                if (rLen > 1) {
                    let rOffsetX = -rdy / rLen * 18;
                    let rOffsetY = rdx / rLen * 18;

                    // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                    const testX = rLabelMidX + rOffsetX;
                    const testY = rLabelMidY + rOffsetY;
                    const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                    const distFromMid = Math.sqrt((rLabelMidX - centroidX) ** 2 + (rLabelMidY - centroidY) ** 2);

                    if (distToCentroid < distFromMid) {
                        rOffsetX = -rOffsetX;
                        rOffsetY = -rOffsetY;
                    }

                    const rLabelX = rLabelMidX + rOffsetX;
                    const rLabelY = rLabelMidY + rOffsetY;

                    ctx.font = 'bold 11px Inter, sans-serif';
                    ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(rLabelX - 12, rLabelY - 10, 24, 20, 4);
                    ctx.fill();
                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = '#a855f7';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('R', rLabelX, rLabelY);
                }

                // Circumcenter label - centroiddan teskari yo'nalishda
                let oOffsetX = 15;
                let oOffsetY = 15;

                // Circumcenterdan centroidga yo'nalish
                const toCentroidX = centroidX - circumcenterX;
                const toCentroidY = centroidY - circumcenterY;
                const toCentroidLen = Math.sqrt(toCentroidX * toCentroidX + toCentroidY * toCentroidY);

                if (toCentroidLen > 1) {
                    // Centroiddan teskari yo'nalishda label qo'yish
                    oOffsetX = -toCentroidX / toCentroidLen * 20;
                    oOffsetY = -toCentroidY / toCentroidLen * 20;
                }

                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(circumcenterX + oOffsetX - 10, circumcenterY + oOffsetY - 10, 20, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#a855f7';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('O', circumcenterX + oOffsetX, circumcenterY + oOffsetY);
            }
        }

        // Gipotenuza (to'g'ri burchakli uchburchak uchun)
        if (showHypotenuse) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // To'g'ri burchak bor-yo'qligini tekshirish
            const isRightA = Math.abs(angleA - 90) < 1;
            const isRightB = Math.abs(angleB - 90) < 1;
            const isRightC = Math.abs(angleC - 90) < 1;
            const isRightTriangle = isRightA || isRightB || isRightC;

            if (isRightTriangle) {
                // Gipotenuza - to'g'ri burchakka qarama-qarshi tomon (eng uzun tomon)
                let hypPoints, hypLabel, leg1, leg2, rightAnglePoint;

                if (isRightA) {
                    // A = 90°, gipotenuza = a (B va C orasida)
                    hypPoints = [points[1], points[2]];
                    hypLabel = 'a';
                    leg1 = 'b';
                    leg2 = 'c';
                    rightAnglePoint = points[0];
                } else if (isRightB) {
                    // B = 90°, gipotenuza = b (A va C orasida)
                    hypPoints = [points[0], points[2]];
                    hypLabel = 'b';
                    leg1 = 'a';
                    leg2 = 'c';
                    rightAnglePoint = points[1];
                } else {
                    // C = 90°, gipotenuza = c (A va B orasida)
                    hypPoints = [points[0], points[1]];
                    hypLabel = 'c';
                    leg1 = 'a';
                    leg2 = 'b';
                    rightAnglePoint = points[2];
                }

                // Gipotenuza chizig'ini ajratib ko'rsatish
                ctx.beginPath();
                ctx.moveTo(hypPoints[0].x, hypPoints[0].y);
                ctx.lineTo(hypPoints[1].x, hypPoints[1].y);
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Gipotenuza ustida yaltiroq effekt
                ctx.beginPath();
                ctx.moveTo(hypPoints[0].x, hypPoints[0].y);
                ctx.lineTo(hypPoints[1].x, hypPoints[1].y);
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
                ctx.lineWidth = 12;
                ctx.stroke();

                // To'g'ri burchak belgisi (90° uchun kvadrat)
                const sqSize = 15;
                const prev = hypPoints[0];
                const next = hypPoints[1];

                // Ikki tomon yo'nalishlari
                const dir1x = (prev.x - rightAnglePoint.x);
                const dir1y = (prev.y - rightAnglePoint.y);
                const len1 = Math.sqrt(dir1x * dir1x + dir1y * dir1y);
                const norm1x = dir1x / len1 * sqSize;
                const norm1y = dir1y / len1 * sqSize;

                const dir2x = (next.x - rightAnglePoint.x);
                const dir2y = (next.y - rightAnglePoint.y);
                const len2 = Math.sqrt(dir2x * dir2x + dir2y * dir2y);
                const norm2x = dir2x / len2 * sqSize;
                const norm2y = dir2y / len2 * sqSize;

                ctx.beginPath();
                ctx.moveTo(rightAnglePoint.x + norm1x, rightAnglePoint.y + norm1y);
                ctx.lineTo(rightAnglePoint.x + norm1x + norm2x, rightAnglePoint.y + norm1y + norm2y);
                ctx.lineTo(rightAnglePoint.x + norm2x, rightAnglePoint.y + norm2y);
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Pifagor teoremasi labeli
                const midX = (hypPoints[0].x + hypPoints[1].x) / 2;
                const midY = (hypPoints[0].y + hypPoints[1].y) / 2;

                const dx = hypPoints[1].x - hypPoints[0].x;
                const dy = hypPoints[1].y - hypPoints[0].y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let offsetX = -dy / len * 35;
                let offsetY = dx / len * 35;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = midX + offsetX;
                const testY = midY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((midX - centroidX) ** 2 + (midY - centroidY) ** 2);

                if (distToCentroid < distFromMid) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                const pythagorasText = `${hypLabel}² = ${leg1}² + ${leg2}²`;
                ctx.font = 'bold 12px Inter, sans-serif';
                const textWidth = ctx.measureText(pythagorasText).width + 16;

                ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
                ctx.beginPath();
                ctx.roundRect(midX + offsetX - textWidth / 2, midY + offsetY - 14, textWidth, 28, 6);
                ctx.fill();
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#f43f5e';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pythagorasText, midX + offsetX, midY + offsetY);
            } else {
                // To'g'ri burchakli emas - ogohlantirish
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
                ctx.beginPath();
                ctx.roundRect(20, 20, 200, 30, 6);
                ctx.fill();
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#f43f5e';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚠ To\'g\'ri burchakli emas!', 30, 35);
            }
        }

        // Nuqtalar
        points.forEach((point, i) => {
            // Outer glow
            ctx.beginPath();
            ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.fill();

            // Inner circle
            ctx.beginPath();
            ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.primary;
            ctx.fill();

            // White center
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Label
            const labelOffset = 25;
            let lx = point.x;
            let ly = point.y;

            if (i === 0) { lx -= labelOffset; ly += 5; }
            else if (i === 1) { lx += labelOffset; ly += 5; }
            else { ly -= labelOffset; }

            // Label background
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(lx - 12, ly - 12, 24, 24, 6);
            ctx.fill();
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(point.label, lx, ly);
        });

        // Tomonlar uzunligi
        if (showSides) {
            // Uchburchak markazini hisoblash (centroid)
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            const sides = [
                { p1: 1, p2: 2, label: `a = ${a}`, color: '#ef4444' },
                { p1: 0, p2: 2, label: `b = ${b}`, color: '#f59e0b' },
                { p1: 0, p2: 1, label: `c = ${c}`, color: '#10b981' }
            ];

            sides.forEach(side => {
                const midX = (points[side.p1].x + points[side.p2].x) / 2;
                const midY = (points[side.p1].y + points[side.p2].y) / 2;

                // Offset perpendicular to the side
                const dx = points[side.p2].x - points[side.p1].x;
                const dy = points[side.p2].y - points[side.p1].y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let nx = -dy / len * 25;
                let ny = dx / len * 25;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalishga o'zgartirish
                // Bu orqali label har doim uchburchak tashqarisida bo'ladi
                const testX = midX + nx;
                const testY = midY + ny;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((midX - centroidX) ** 2 + (midY - centroidY) ** 2);

                // Agar offset centroidga yaqinroq bo'lsa, teskari yo'nalishga o'zgartirish
                if (distToCentroid < distFromMid) {
                    nx = -nx;
                    ny = -ny;
                }

                const tx = midX + nx;
                const ty = midY + ny;

                // Background
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.font = 'bold 12px Inter, sans-serif';
                const textWidth = ctx.measureText(side.label).width + 16;
                ctx.beginPath();
                ctx.roundRect(tx - textWidth / 2, ty - 12, textWidth, 24, 6);
                ctx.fill();
                ctx.strokeStyle = side.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = side.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(side.label, tx, ty);
            });
        }

    }, [a, b, c, angleA, angleB, angleC, showGrid, showAngles, showSides, showHeight, showExternalAngles, showMedian, showBisector, showIncircle, showCircumcircle, showHypotenuse, isValid]);

    return (
        <canvas
            ref={canvasRef}
            width={1400}
            height={950}
            className="triangle-canvas"
            style={{ width: '100%', height: '100%', maxWidth: '100%', display: 'block' }}
        />
    );
}

export function UchburchakPage() {
    const [triangleType, setTriangleType] = useState('custom');
    const [sideA, setSideA] = useState(8);
    const [sideB, setSideB] = useState(6);
    const [sideC, setSideC] = useState(7);
    const [unit, setUnit] = useState('sm');

    const [showGrid, setShowGrid] = useState(true);
    const [showAngles, setShowAngles] = useState(true);
    const [showSides, setShowSides] = useState(true);
    const [showHeight, setShowHeight] = useState(true);
    const [showExternalAngles, setShowExternalAngles] = useState(false);
    const [showMedian, setShowMedian] = useState(false);
    const [showBisector, setShowBisector] = useState(false);
    const [showIncircle, setShowIncircle] = useState(false);
    const [showCircumcircle, setShowCircumcircle] = useState(false);
    const [showHypotenuse, setShowHypotenuse] = useState(false);
    const [resultModal, setResultModal] = useState(null);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenWhiteboard, setShowFullscreenWhiteboard] = useState(false);
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
    const fullscreenCanvasRef = useRef(null);
    
    // ESC key bilan yopish
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showFullscreenWhiteboard) {
                setShowFullscreenWhiteboard(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showFullscreenWhiteboard]);


    // Unit ga qarab slider limitleri
    const sliderLimits = useMemo(() => {
        switch (unit) {
            case 'mm': return { min: 10, max: 2000, step: 1 };
            case 'sm': return { min: 1, max: 200, step: 0.1 };
            case 'm': return { min: 0.01, max: 2, step: 0.01 };
            case 'km': return { min: 0.00001, max: 0.002, step: 0.00001 };
            default: return { min: 1, max: 200, step: 0.1 };
        }
    }, [unit]);

    // Unit konversiya koeffitsientlari (sm ga nisbatan)
    const unitToSm = { mm: 0.1, sm: 1, m: 100, km: 100000 };

    // Unit o'zgarganda - qiymatlarni konvertatsiya qilish
    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setSideA(prev => Math.round(prev * ratio * 100) / 100);
        setSideB(prev => Math.round(prev * ratio * 100) / 100);
        setSideC(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };


    // Uchburchak turiga qarab
    useEffect(() => {
        switch (triangleType) {
            case 'equilateral':
                setSideB(sideA);
                setSideC(sideA);
                break;
            case 'isosceles':
                setSideB(sideA);
                break;
            case 'right':
                setSideB(sideA * 0.75);
                setSideC(Math.sqrt(sideA * sideA + (sideA * 0.75) * (sideA * 0.75)));
                break;
            default:
                break;
        }
    }, [triangleType, sideA]);

    // Hisob-kitoblar
    const getRelativeCoords = (e) => {
        const container = fullscreenCanvasRef.current;
        if (!container) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleDrawStart = (e) => {
        if (!drawMode) return;
        if (isErasing) { const coords = getRelativeCoords(e); setEraserPosition(coords); eraseAtPosition(coords); return; }
        const coords = getRelativeCoords(e); setCurrentDrawing([coords]);
    };

    const handleDrawMove = (e) => {
        if (!drawMode) return;
        if (isErasing) { const coords = getRelativeCoords(e); setEraserPosition(coords); eraseAtPosition(coords); return; }
        if (currentDrawing.length === 0) return;
        const coords = getRelativeCoords(e); setCurrentDrawing(prev => [...prev, coords]);
    };

    const handleDrawEnd = () => {
        if (!drawMode) return;
        if (isErasing) { setEraserPosition(null); return; }
        if (currentDrawing.length < 2) return;
        setDrawings(prev => [...prev, { points: currentDrawing, color: drawColor, size: drawSize }]);
        setCurrentDrawing([]);
    };

    const eraseAtPosition = (coords) => {
        const updatedDrawings = drawings.map(drawing => {
            const { points } = drawing; const newSegments = []; let currentSegment = [];
            for (let i = 0; i < points.length; i++) {
                const point = points[i]; const dx = point.x - coords.x; const dy = point.y - coords.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance >= eraserSize) { currentSegment.push(point); } else { if (currentSegment.length >= 2) { newSegments.push({ ...drawing, points: [...currentSegment] }); } currentSegment = []; }
            }
            if (currentSegment.length >= 2) { newSegments.push({ ...drawing, points: [...currentSegment] }); }
            return newSegments;
        }).flat();
        setDrawings(updatedDrawings);
    };

    const clearAllDrawings = () => { setDrawings([]); setCurrentDrawing([]); };
    const resetView = () => { };
    const calculations = useMemo(() => {
        const a = sideA;
        const b = sideB;
        const c = sideC;

        const perimeter = a + b + c;
        const s = perimeter / 2;
        const areaSquared = s * (s - a) * (s - b) * (s - c);
        const area = areaSquared > 0 ? Math.sqrt(areaSquared) : 0;

        const cosA = (b * b + c * c - a * a) / (2 * b * c);
        const cosB = (a * a + c * c - b * b) / (2 * a * c);
        const cosC = (a * a + b * b - c * c) / (2 * a * b);

        const angleA = Math.acos(Math.max(-1, Math.min(1, cosA))) * (180 / Math.PI);
        const angleB = Math.acos(Math.max(-1, Math.min(1, cosB))) * (180 / Math.PI);
        const angleC = Math.acos(Math.max(-1, Math.min(1, cosC))) * (180 / Math.PI);

        const ha = area > 0 ? (2 * area) / a : 0;
        const hb = area > 0 ? (2 * area) / b : 0;
        const hc = area > 0 ? (2 * area) / c : 0;

        const inradius = area > 0 ? area / s : 0;
        const circumradius = area > 0 ? (a * b * c) / (4 * area) : 0;

        let type = "";
        let typeIcon = "";

        if (Math.abs(a - b) < 0.01 && Math.abs(b - c) < 0.01) {
            type = "Teng tomonli";
            typeIcon = "△";
        } else if (Math.abs(a - b) < 0.01 || Math.abs(b - c) < 0.01 || Math.abs(a - c) < 0.01) {
            type = "Teng yonli";
            typeIcon = "▲";
        } else {
            type = "Turli tomonli";
            typeIcon = "◺";
        }

        const maxAngle = Math.max(angleA, angleB, angleC);
        if (Math.abs(maxAngle - 90) < 0.5) {
            type += " • To'g'ri burchakli";
            typeIcon = "◢";
        } else if (maxAngle > 90) {
            type += " • O'tmas burchakli";
        } else {
            type += " • O'tkir burchakli";
        }

        return {
            perimeter: perimeter.toFixed(2),
            s: s.toFixed(2),
            area: area.toFixed(2),
            angleA: angleA.toFixed(1),
            angleB: angleB.toFixed(1),
            angleC: angleC.toFixed(1),
            cosA: cosA.toFixed(4),
            cosB: cosB.toFixed(4),
            cosC: cosC.toFixed(4),
            ha: ha.toFixed(2),
            hb: hb.toFixed(2),
            hc: hc.toFixed(2),
            inradius: inradius.toFixed(2),
            circumradius: circumradius.toFixed(2),
            type,
            typeIcon,
            isValid: areaSquared > 0
        };
    }, [sideA, sideB, sideC]);

    const unitSymbol = UNITS[unit].symbol;
    const isValidTriangle = calculations.isValid;

    return (
        <div className="shape-page uchburchak-page">
            {/* Header - PRO Format */}
            <header className="shape-page-header pro-page-header pro-header-enhanced">
                {/* Left Section - Back Button & Logo & Title */}
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
                            <span className="icon-glow">△</span>
                        </div>
                        <div className="pro-header-text">
                            <h1>Uchburchak</h1>
                            <p>Interaktiv modellashtirish va hisoblash</p>
                        </div>
                    </div>
                </div>


                {/* Right Section - Actions */}
                <div className="header-right-section">
                    {/* User Menu */}
                    <UserMenu />

                    {/* PRO Badge */}
                    <div className="header-pro-badge">
                        <span className="pro-crown">👑</span>
                        <span className="pro-text">PRO</span>
                    </div>
                </div>
            </header>


            <div className="shape-page-content">
                {/* Chap Panel - PRO Dizayn (Natijalar bilan bir xil) */}
                <aside className="params-panel pro-params-panel pro-settings-panel">
                    {/* Premium Header */}
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon">
                                <span className="icon-glow">⚙️</span>
                            </div>
                            <div className="pro-header-text">
                                <h2>Sozlamalar</h2>
                            </div>
                        </div>
                    </div>

                    {/* PRO Sections Container */}
                    <div className="pro-sections-container">

                        {/* ═══════════════════════════════════════════ */}
                        {/* O'LCHOV BIRLIGI BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-unit-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchov birligi</span>
                                <span className="pro-section-badge">{UNITS[unit].symbol}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-unit-grid">
                                    {Object.entries(UNITS).map(([key, value]) => (
                                        <button
                                            key={key}
                                            className={`pro-settings-btn ${unit === key ? 'active' : ''}`}
                                            onClick={() => handleUnitChange(key)}
                                        >
                                            <span className="settings-btn-icon">{value.symbol}</span>
                                            <span className="settings-btn-label">{value.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* UCHBURCHAK TURI BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-type-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">🔺</div>
                                <span className="pro-section-title">Uchburchak turi</span>
                                <span className="pro-section-badge">{TRIANGLE_TYPES[triangleType].icon}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-type-grid-settings">
                                    {Object.entries(TRIANGLE_TYPES).map(([key, value]) => (
                                        <button
                                            key={key}
                                            className={`pro-settings-btn type-btn ${triangleType === key ? 'active' : ''}`}
                                            onClick={() => setTriangleType(key)}
                                            title={value.name}
                                        >
                                            <span className="settings-btn-icon large">{value.icon}</span>
                                            <span className="settings-btn-label">{value.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* TOMONLAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">Tomonlar</span>
                                <span className="pro-section-badge">{triangleType === 'custom' || triangleType === 'scalene' ? '3 ta' : '1 ta'}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    {/* Tomon A */}
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>a</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">A tomon</span>
                                                <span className="pro-side-desc">BC qarshi</span>
                                            </div>
                                            <div className="pro-side-value">{sideA} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input
                                                type="range"
                                                min="1"
                                                max="13"
                                                step="0.1"
                                                value={sideA}
                                                onChange={(e) => setSideA(parseFloat(e.target.value))}
                                                className="pro-range"
                                                style={{ '--range-color': '#ef4444' }}
                                            />
                                        </div>
                                    </div>

                                    {(triangleType === 'custom' || triangleType === 'scalene') && (
                                        <>
                                            {/* Tomon B */}
                                            <div className="pro-side-item">
                                                <div className="pro-side-header">
                                                    <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>b</div>
                                                    <div className="pro-side-info">
                                                        <span className="pro-side-label">B tomon</span>
                                                        <span className="pro-side-desc">AC qarshi</span>
                                                    </div>
                                                    <div className="pro-side-value">{sideB} {unitSymbol}</div>
                                                </div>
                                                <div className="pro-side-controls">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="13"
                                                        step="0.1"
                                                        value={sideB}
                                                        onChange={(e) => setSideB(parseFloat(e.target.value))}
                                                        className="pro-range"
                                                        style={{ '--range-color': '#f59e0b' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Tomon C */}
                                            <div className="pro-side-item">
                                                <div className="pro-side-header">
                                                    <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>c</div>
                                                    <div className="pro-side-info">
                                                        <span className="pro-side-label">C tomon</span>
                                                        <span className="pro-side-desc">AB qarshi</span>
                                                    </div>
                                                    <div className="pro-side-value">{sideC} {unitSymbol}</div>
                                                </div>
                                                <div className="pro-side-controls">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="13"
                                                        step="0.1"
                                                        value={sideC}
                                                        onChange={(e) => setSideC(parseFloat(e.target.value))}
                                                        className="pro-range"
                                                        style={{ '--range-color': '#10b981' }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {!isValidTriangle && (
                                        <div className="pro-error-box">
                                            <div className="error-icon-wrap">⚠️</div>
                                            <div className="error-text">
                                                <strong>Uchburchak hosil bo'lmaydi!</strong>
                                                <p>Ikki tomon yig'indisi uchinchisidan katta bo'lishi kerak</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* KO'RINISH BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-view-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">👁️</div>
                                <span className="pro-section-title">Ko'rinish</span>
                                <span className="pro-section-badge">{[showGrid, showAngles, showSides, showHeight, showExternalAngles, showMedian, showBisector, showIncircle, showCircumcircle, showHypotenuse].filter(Boolean).length}/10</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                {/* Asosiy elementlar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📐 Asosiy</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button
                                            className={`pro-toggle-item ${showGrid ? 'active' : ''}`}
                                            onClick={() => setShowGrid(!showGrid)}
                                        >
                                            <span className="toggle-icon">⊞</span>
                                            <span className="toggle-label">Grid</span>
                                            <span className={`toggle-status ${showGrid ? 'on' : 'off'}`}>{showGrid ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showAngles ? 'active' : ''}`}
                                            onClick={() => setShowAngles(!showAngles)}
                                        >
                                            <span className="toggle-icon">∠</span>
                                            <span className="toggle-label">Burchaklar</span>
                                            <span className={`toggle-status ${showAngles ? 'on' : 'off'}`}>{showAngles ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showSides ? 'active' : ''}`}
                                            onClick={() => setShowSides(!showSides)}
                                        >
                                            <span className="toggle-icon">—</span>
                                            <span className="toggle-label">Tomonlar</span>
                                            <span className={`toggle-status ${showSides ? 'on' : 'off'}`}>{showSides ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showHeight ? 'active' : ''}`}
                                            onClick={() => setShowHeight(!showHeight)}
                                        >
                                            <span className="toggle-icon">↕</span>
                                            <span className="toggle-label">Balandlik</span>
                                            <span className={`toggle-status ${showHeight ? 'on' : 'off'}`}>{showHeight ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Qo'shimcha elementlar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">✨ Qo'shimcha</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button
                                            className={`pro-toggle-item ${showExternalAngles ? 'active' : ''}`}
                                            onClick={() => setShowExternalAngles(!showExternalAngles)}
                                        >
                                            <span className="toggle-icon">↗</span>
                                            <span className="toggle-label">Tashqi burchak</span>
                                            <span className={`toggle-status ${showExternalAngles ? 'on' : 'off'}`}>{showExternalAngles ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showMedian ? 'active' : ''}`}
                                            onClick={() => setShowMedian(!showMedian)}
                                        >
                                            <span className="toggle-icon">⋯</span>
                                            <span className="toggle-label">Median</span>
                                            <span className={`toggle-status ${showMedian ? 'on' : 'off'}`}>{showMedian ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showBisector ? 'active' : ''}`}
                                            onClick={() => setShowBisector(!showBisector)}
                                        >
                                            <span className="toggle-icon">∠/</span>
                                            <span className="toggle-label">Bissektrisa</span>
                                            <span className={`toggle-status ${showBisector ? 'on' : 'off'}`}>{showBisector ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showIncircle ? 'active' : ''}`}
                                            onClick={() => setShowIncircle(!showIncircle)}
                                        >
                                            <span className="toggle-icon">◎</span>
                                            <span className="toggle-label">Ichki aylana</span>
                                            <span className={`toggle-status ${showIncircle ? 'on' : 'off'}`}>{showIncircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showCircumcircle ? 'active' : ''}`}
                                            onClick={() => setShowCircumcircle(!showCircumcircle)}
                                        >
                                            <span className="toggle-icon">◯</span>
                                            <span className="toggle-label">Tashqi aylana</span>
                                            <span className={`toggle-status ${showCircumcircle ? 'on' : 'off'}`}>{showCircumcircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showHypotenuse ? 'active' : ''}`}
                                            onClick={() => setShowHypotenuse(!showHypotenuse)}
                                        >
                                            <span className="toggle-icon">┘</span>
                                            <span className="toggle-label">Gipotenuza</span>
                                            <span className={`toggle-status ${showHypotenuse ? 'on' : 'off'}`}>{showHypotenuse ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>

                    </div>
                </aside>

                {/* Markaz - Canvas */}
                <section className="canvas-panel" style={{ position: 'relative' }}>
                    <TriangleCanvas
                        a={sideA}
                        b={sideB}
                        c={sideC}
                        angleA={parseFloat(calculations.angleA)}
                        angleB={parseFloat(calculations.angleB)}
                        angleC={parseFloat(calculations.angleC)}
                        showGrid={showGrid}
                        showAngles={showAngles}
                        showSides={showSides}
                        showHeight={showHeight}
                        showExternalAngles={showExternalAngles}
                        showMedian={showMedian}
                        showBisector={showBisector}
                        showIncircle={showIncircle}
                        showCircumcircle={showCircumcircle}
                        showHypotenuse={showHypotenuse}
                        isValid={isValidTriangle}
                    />

                    {isValidTriangle && (
                        <>
                            <div className="shape-type-badge">
                                <span className="badge-icon">{calculations.typeIcon}</span>
                                {calculations.type}
                            </div>
                            <button className="fullscreen-toggle-btn" onClick={() => setShowFullscreenWhiteboard(true)} title="To'liq ekran">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                            </button>
                        </>
                    )}
                </section>

                {/* O'ng Panel - Professional Results */}
                <aside className="formulas-panel pro-results-panel" style={{ minWidth: '340px' }}>
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
                                    <polygon points="12 2 22 20 2 20" />
                                </svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Yuzasi</span>
                                <span className="pro-card-value">{calculations.area}</span>
                                <span className="pro-card-unit">{unitSymbol}²</span>
                            </div>
                            <div className="pro-card-formula">S = √(p(p-a)(p-b)(p-c))</div>
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
                            <div className="pro-card-formula">P = a + b + c</div>
                        </div>
                    </div>

                    {/* Collapsible Sections Container */}
                    <div className="pro-sections-container">

                        {/* ═══════════════════════════════════════════ */}
                        {/* BURCHAKLAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section angles-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">∠</div>
                                <span className="pro-section-title">Burchaklar</span>
                                <span className="pro-section-badge">{(parseFloat(calculations.angleA) + parseFloat(calculations.angleB) + parseFloat(calculations.angleC)).toFixed(0)}°</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                {/* Ichki burchaklar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📍 Ichki burchaklar</h4>
                                    <div className="pro-angle-grid">
                                        <div className="pro-angle-item" onClick={() => setResultModal('angleA')} style={{ cursor: 'pointer' }}>
                                            <div className="pro-angle-vertex">A</div>
                                            <div className="pro-angle-value">{calculations.angleA}°</div>
                                            <div className="pro-angle-bar" style={{ width: `${parseFloat(calculations.angleA) / 1.8}%` }}></div>
                                        </div>
                                        <div className="pro-angle-item" onClick={() => setResultModal('angleB')} style={{ cursor: 'pointer' }}>
                                            <div className="pro-angle-vertex">B</div>
                                            <div className="pro-angle-value">{calculations.angleB}°</div>
                                            <div className="pro-angle-bar" style={{ width: `${parseFloat(calculations.angleB) / 1.8}%` }}></div>
                                        </div>
                                        <div className="pro-angle-item" onClick={() => setResultModal('angleC')} style={{ cursor: 'pointer' }}>
                                            <div className="pro-angle-vertex">C</div>
                                            <div className="pro-angle-value">{calculations.angleC}°</div>
                                            <div className="pro-angle-bar" style={{ width: `${parseFloat(calculations.angleC) / 1.8}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="pro-sum-info">
                                        Σ = {(parseFloat(calculations.angleA) + parseFloat(calculations.angleB) + parseFloat(calculations.angleC)).toFixed(1)}° = 180°
                                    </div>
                                </div>

                                {/* Tashqi burchaklar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">↗ Tashqi burchaklar</h4>
                                    <div className="pro-external-angles">
                                        <div className="pro-ext-angle" onClick={() => setResultModal('extAngleA')} style={{ cursor: 'pointer' }}>
                                            <span className="ext-label">A'</span>
                                            <span className="ext-value">{(180 - parseFloat(calculations.angleA)).toFixed(1)}°</span>
                                            <span className="ext-formula">= B + C</span>
                                        </div>
                                        <div className="pro-ext-angle" onClick={() => setResultModal('extAngleB')} style={{ cursor: 'pointer' }}>
                                            <span className="ext-label">B'</span>
                                            <span className="ext-value">{(180 - parseFloat(calculations.angleB)).toFixed(1)}°</span>
                                            <span className="ext-formula">= A + C</span>
                                        </div>
                                        <div className="pro-ext-angle" onClick={() => setResultModal('extAngleC')} style={{ cursor: 'pointer' }}>
                                            <span className="ext-label">C'</span>
                                            <span className="ext-value">{(180 - parseFloat(calculations.angleC)).toFixed(1)}°</span>
                                            <span className="ext-formula">= A + B</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Uchburchak turi */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">🔺 Uchburchak turi</h4>
                                    <div className="pro-type-cards">
                                        <button className={`pro-type-btn ${parseFloat(calculations.angleA) < 90 && parseFloat(calculations.angleB) < 90 && parseFloat(calculations.angleC) < 90 ? 'active' : ''}`}>
                                            <span className="type-symbol">◿</span>
                                            <span className="type-name">O'tkir</span>
                                        </button>
                                        <button className={`pro-type-btn ${Math.abs(parseFloat(calculations.angleA) - 90) < 0.5 || Math.abs(parseFloat(calculations.angleB) - 90) < 0.5 || Math.abs(parseFloat(calculations.angleC) - 90) < 0.5 ? 'active' : ''}`}>
                                            <span className="type-symbol">◢</span>
                                            <span className="type-name">To'g'ri</span>
                                        </button>
                                        <button className={`pro-type-btn ${parseFloat(calculations.angleA) > 90 || parseFloat(calculations.angleB) > 90 || parseFloat(calculations.angleC) > 90 ? 'active' : ''}`}>
                                            <span className="type-symbol">◺</span>
                                            <span className="type-name">O'tmas</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>

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
                                {/* Balandliklar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">↕ Balandliklar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('heightA')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">hₐ</span>
                                            <span className="measure-value">{calculations.ha} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item" onClick={() => setResultModal('heightB')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">hᵦ</span>
                                            <span className="measure-value">{calculations.hb} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item" onClick={() => setResultModal('heightC')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">h꜀</span>
                                            <span className="measure-value">{calculations.hc} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Aylanalar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⭕ Aylana radiuslari</h4>
                                    <div className="pro-circles-grid">
                                        <div className="pro-circle-card incircle" onClick={() => setResultModal('inradius')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◎</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Ichki</span>
                                                <span className="circle-value">{calculations.inradius} {unitSymbol}</span>
                                            </div>
                                        </div>
                                        <div className="pro-circle-card circumcircle" onClick={() => setResultModal('circumradius')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◯</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Tashqi</span>
                                                <span className="circle-value">{calculations.circumradius} {unitSymbol}</span>
                                            </div>
                                        </div>
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
                                <span className="pro-section-badge">7 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📐 Yuza</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>S = √(p(p-a)(p-b)(p-c))</code><span>Geron</span></div>
                                        <div className="pro-formula-item"><code>S = ½ × a × h<sub>a</sub></code><span>Balandlik</span></div>
                                        <div className="pro-formula-item"><code>S = ½ × a × b × sin(C)</code><span>Sinus</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📏 Tomon</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>a² + b² = c²</code><span>Pifagor</span></div>
                                        <div className="pro-formula-item"><code>a² = b² + c² - 2bc×cos(A)</code><span>Kosinus</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">⭕ Aylana</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>r = S / p</code><span>Ichki</span></div>
                                        <div className="pro-formula-item"><code>R = abc / 4S</code><span>Tashqi</span></div>
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
            </div >

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
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>1. Yarim perimetrni topamiz (Geron):</div>
                                        <div>p = (a + b + c) / 2</div>
                                        <div style={{ color: '#10b981' }}>p = ({sideA} + {sideB} + {sideC}) / 2 = {calculations.s} {unitSymbol}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>2. Yuzani hisoblaymiz:</div>
                                        <div>S = √[p(p-a)(p-b)(p-c)]</div>
                                        <div style={{ marginTop: '10px' }}>
                                            S = √[{calculations.s} · ({calculations.s}-{sideA}) · ({calculations.s}-{sideB}) · ({calculations.s}-{sideC})]
                                        </div>
                                        <div style={{ marginTop: '5px' }}>
                                            S = √[{calculations.s} · {(calculations.s - sideA).toFixed(2)} · {(calculations.s - sideB).toFixed(2)} · {(calculations.s - sideC).toFixed(2)}]
                                        </div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            S ≈ {calculations.area} {unitSymbol}²
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
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Barcha tomonlar yig'indisi:</div>
                                        <div>P = a + b + c</div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                            P = {sideA} + {sideB} + {sideC} = {calculations.perimeter} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal.startsWith('angle') ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>∠</span>
                                    {resultModal === 'angleA' ? 'A' : resultModal === 'angleB' ? 'B' : 'C'} burchakni hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Kosinuslar teoremasi bo'yicha:</div>
                                        {resultModal === 'angleA' && (
                                            <>
                                                <div>a² = b² + c² - 2bc⋅cos(A)</div>
                                                <div style={{ marginTop: '5px', color: '#f59e0b' }}>
                                                    cos(A) = (b² + c² - a²) / 2bc
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleB' && (
                                            <>
                                                <div>b² = a² + c² - 2ac⋅cos(B)</div>
                                                <div style={{ marginTop: '5px', color: '#f59e0b' }}>
                                                    cos(B) = (a² + c² - b²) / 2ac
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleC' && (
                                            <>
                                                <div>c² = a² + b² - 2ab⋅cos(C)</div>
                                                <div style={{ marginTop: '5px', color: '#f59e0b' }}>
                                                    cos(C) = (a² + b² - c²) / 2ab
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Qiymatlarni qo'yamiz:</div>
                                        {resultModal === 'angleA' && (
                                            <>
                                                <div>cos(A) = ({sideB}² + {sideC}² - {sideA}²) / (2 · {sideB} · {sideC})</div>
                                                <div>cos(A) = ({Math.pow(sideB, 2).toFixed(2)} + {Math.pow(sideC, 2).toFixed(2)} - {Math.pow(sideA, 2).toFixed(2)}) / {(2 * sideB * sideC).toFixed(2)}</div>
                                                <div style={{ marginTop: '10px' }}>cos(A) ≈ {calculations.cosA}</div>
                                                <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                                    A = arccos({calculations.cosA}) ≈ {calculations.angleA}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleB' && (
                                            <>
                                                <div>cos(B) = ({sideA}² + {sideC}² - {sideB}²) / (2 · {sideA} · {sideC})</div>
                                                <div>cos(B) = ({Math.pow(sideA, 2).toFixed(2)} + {Math.pow(sideC, 2).toFixed(2)} - {Math.pow(sideB, 2).toFixed(2)}) / {(2 * sideA * sideC).toFixed(2)}</div>
                                                <div style={{ marginTop: '10px' }}>cos(B) ≈ {calculations.cosB}</div>
                                                <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                                    B = arccos({calculations.cosB}) ≈ {calculations.angleB}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleC' && (
                                            <>
                                                <div>cos(C) = ({sideA}² + {sideB}² - {sideC}²) / (2 · {sideA} · {sideB})</div>
                                                <div>cos(C) = ({Math.pow(sideA, 2).toFixed(2)} + {Math.pow(sideB, 2).toFixed(2)} - {Math.pow(sideC, 2).toFixed(2)}) / {(2 * sideA * sideB).toFixed(2)}</div>
                                                <div style={{ marginTop: '10px' }}>cos(C) ≈ {calculations.cosC}</div>
                                                <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                                    C = arccos({calculations.cosC}) ≈ {calculations.angleC}°
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : resultModal.startsWith('extAngle') ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>↗</span>
                                    {resultModal === 'extAngleA' ? "A'" : resultModal === 'extAngleB' ? "B'" : "C'"} tashqi burchakni hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>1-usul: Qo'shni burchak orqali</div>
                                        {resultModal === 'extAngleA' && (
                                            <>
                                                <div>A' = 180° - A</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    A' = 180° - {calculations.angleA}° = {(180 - parseFloat(calculations.angleA)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleB' && (
                                            <>
                                                <div>B' = 180° - B</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    B' = 180° - {calculations.angleB}° = {(180 - parseFloat(calculations.angleB)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleC' && (
                                            <>
                                                <div>C' = 180° - C</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    C' = 180° - {calculations.angleC}° = {(180 - parseFloat(calculations.angleC)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>2-usul: Ichki burchaklar yig'indisi orqali</div>
                                        {resultModal === 'extAngleA' && (
                                            <>
                                                <div>A' = B + C</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    A' = {calculations.angleB}° + {calculations.angleC}° = {(parseFloat(calculations.angleB) + parseFloat(calculations.angleC)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleB' && (
                                            <>
                                                <div>B' = A + C</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    B' = {calculations.angleA}° + {calculations.angleC}° = {(parseFloat(calculations.angleA) + parseFloat(calculations.angleC)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleC' && (
                                            <>
                                                <div>C' = A + B</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    C' = {calculations.angleA}° + {calculations.angleB}° = {(parseFloat(calculations.angleA) + parseFloat(calculations.angleB)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'inradius' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>◎</span>
                                    Ichki chizilgan aylana radiusi
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>r = S / p</div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>(Yuza / Yarim perimetr)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>r = {calculations.area} / {calculations.s}</div>
                                        <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            r ≈ {calculations.inradius} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'circumradius' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>◯</span>
                                    Tashqi chizilgan aylana radiusi
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>R = (a · b · c) / (4 · S)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>R = ({sideA} · {sideB} · {sideC}) / (4 · {calculations.area})</div>
                                        <div>R = {(sideA * sideB * sideC).toFixed(2)} / {(4 * parseFloat(calculations.area)).toFixed(2)}</div>
                                        <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                                            R ≈ {calculations.circumradius} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal && resultModal.startsWith('height') ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>↕</span>
                                    {resultModal === 'heightA' ? 'a' : resultModal === 'heightB' ? 'b' : 'c'} tomoniga tushirilgan balandlik
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>h = 2S / {resultModal === 'heightA' ? 'a' : resultModal === 'heightB' ? 'b' : 'c'}</div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>(2 · Yuza / Tomon)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        {resultModal === 'heightA' && (
                                            <>
                                                <div>hₐ = (2 · {calculations.area}) / {sideA}</div>
                                                <div>hₐ = {(2 * parseFloat(calculations.area)).toFixed(2)} / {sideA}</div>
                                                <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                                                    hₐ ≈ {calculations.ha} {unitSymbol}
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'heightB' && (
                                            <>
                                                <div>hᵦ = (2 · {calculations.area}) / {sideB}</div>
                                                <div>hᵦ = {(2 * parseFloat(calculations.area)).toFixed(2)} / {sideB}</div>
                                                <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                                                    hᵦ ≈ {calculations.hb} {unitSymbol}
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'heightC' && (
                                            <>
                                                <div>h_c = (2 · {calculations.area}) / {sideC}</div>
                                                <div>h_c = {(2 * parseFloat(calculations.area)).toFixed(2)} / {sideC}</div>
                                                <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                                                    h_c ≈ {calculations.hc} {unitSymbol}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )
            }

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

                        <h3 style={{ fontSize: '28px', marginBottom: '25px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '32px' }}>📖</span>
                            Uchburchak qoidalari
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { num: 1, title: 'Mavjudlik sharti', desc: 'Ikki tomon yig\'indisi uchinchidan katta bo\'lishi shart: a + b > c', color: '#10b981' },
                                { num: 2, title: 'Burchaklar yig\'indisi', desc: 'Ichki burchaklar yig\'indisi = 180°: ∠A + ∠B + ∠C = 180°', color: '#f59e0b' },
                                { num: 3, title: 'Tashqi burchak', desc: 'Tashqi burchak = Qarama-qarshi 2 ichki burchak yig\'indisi', color: '#06b6d4' },
                                { num: 4, title: 'Og\'irlik markazi (Centroid)', desc: 'Medianlar kesishuvi. Medianlarni 2:1 nisbatda bo\'ladi', color: '#8b5cf6' },
                                { num: 5, title: 'Incenter (Ichki markaz)', desc: 'Bissektrisalar kesishuvi. Ichki aylana markazi', color: '#ec4899' },
                                { num: 6, title: 'Circumcenter (Tashqi markaz)', desc: 'O\'rta perpendikulyarlar kesishuvi. Tashqi aylana markazi', color: '#3b82f6' },
                                { num: 7, title: 'Pifagor teoremasi', desc: 'To\'g\'ri burchakli uchburchakda: a² + b² = c² (c - gipotenuza)', color: '#ef4444' },
                                { num: 8, title: 'Ortocenter', desc: 'Balandliklar kesishuvi nuqtasi', color: '#6366f1' }
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

            {/* Fullscreen Whiteboard */}
            {showFullscreenWhiteboard && (
                <FullscreenTriangleWhiteboard
                    sideA={sideA}
                    sideB={sideB}
                    sideC={sideC}
                    unitSymbol={UNITS[unit].symbol}
                    onClose={() => setShowFullscreenWhiteboard(false)}
                    onSizeChange={({ sideA: newA, sideB: newB, sideC: newC }) => {
                        setSideA(Math.max(0.5, Math.min(50, newA)));
                        setSideB(Math.max(0.5, Math.min(50, newB)));
                        setSideC(Math.max(0.5, Math.min(50, newC)));
                    }}
                />
            )}

        </div >
    );
}
