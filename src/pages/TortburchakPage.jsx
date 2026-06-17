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

// ===== Ko'rinish elementlari animatsiyasi =====
// Har bir boolean flag uchun 0..1 oralig'idagi animatsiya progressini qaytaradi.
// Flag yoqilganda progress 1 ga (easeOutCubic) o'sadi, o'chirilganda 0 ga qaytadi.
// Shu progressni chizish funksiyasi ishlatib, elementlar yumshoq paydo bo'ladi/yo'qoladi.
function useFeatureAnimation(flags) {
    const [animProgress, setAnimProgress] = useState(() => {
        const init = {};
        Object.keys(flags).forEach(k => { init[k] = flags[k] ? 1 : 0; });
        return init;
    });
    const progressRef = useRef(null);
    progressRef.current = animProgress;
    const prevFlagsRef = useRef(null);
    const animFramesRef = useRef({});

    // Har renderda flaglarni solishtiramiz — o'zgargan kalit uchun animatsiya boshlaymiz
    useEffect(() => {
        if (!prevFlagsRef.current) {
            prevFlagsRef.current = { ...flags };
            return;
        }
        Object.entries(flags).forEach(([key, value]) => {
            const wasOn = prevFlagsRef.current[key];
            prevFlagsRef.current[key] = value;
            if (wasOn === value) return;

            // ON → 1 ga o'sadi, OFF → 0 ga qaytadi (teskari animatsiya)
            if (animFramesRef.current[key]) cancelAnimationFrame(animFramesRef.current[key]);
            const from = progressRef.current[key];
            const to = value ? 1 : 0;
            if (from === to) return;
            // Yarim yo'lda almashtirilsa, qolgan masofaga proporsional davomiylik
            const duration = (value ? 850 : 600) * Math.abs(to - from);
            const start = performance.now();

            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
                setAnimProgress(p => ({ ...p, [key]: from + (to - from) * eased }));
                if (t < 1) animFramesRef.current[key] = requestAnimationFrame(step);
            };
            animFramesRef.current[key] = requestAnimationFrame(step);
        });
    });

    useEffect(() => () => {
        Object.values(animFramesRef.current).forEach(id => cancelAnimationFrame(id));
    }, []);

    return animProgress;
}

// ===== Animatsion raqam — qiymat o'zgarganda eski qiymatdan yangisiga yumshoq "sanab" o'tadi =====
// Natija kartalaridagi sonlar (yuza, perimetr, diagonal, burchaklar, radius) sakramaydi,
// balki easeOutCubic bilan yangi qiymatga oqib o'tadi.
function AnimatedNumber({ value, decimals = 2, duration = 600 }) {
    const [display, setDisplay] = useState(() => Number(value) || 0);
    const displayRef = useRef(Number(value) || 0);
    const rafRef = useRef(null);

    useEffect(() => {
        const to = Number(value);
        if (!isFinite(to)) { displayRef.current = to; setDisplay(to); return; }
        const from = displayRef.current;
        if (from === to) return;
        const start = performance.now();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            const cur = from + (to - from) * eased;
            displayRef.current = cur;
            setDisplay(cur);
            if (t < 1) rafRef.current = requestAnimationFrame(step);
            else { displayRef.current = to; setDisplay(to); rafRef.current = null; }
        };
        rafRef.current = requestAnimationFrame(step);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [value, duration]);

    return Number(display).toFixed(decimals);
}

// Professional Fullscreen Rectangle Whiteboard
function FullscreenRectangleWhiteboard({ width, height, unitSymbol, onClose, onSizeChange }) {
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
    const [rectangleFillColor, setRectangleFillColor] = useState('gradient');

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

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.closePath();

            if (rectangleFillColor === 'gradient') {
                const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
                gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
                gradient.addColorStop(1, 'rgba(99, 102, 241, 0.35)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = rectangleFillColor + '80';
            }
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
    }, [scale, offset, width, height, canvasSize, rectangleData, unitSymbol, rectangleFillColor]);

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
                    <span className="fill-label">To'rtburchak:</span>
                    <div className="fill-buttons">
                        <button className={`fill-btn ${rectangleFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setRectangleFillColor('gradient')} title="Gradient">
                            <span className="gradient-preview"></span>
                        </button>
                        {COLOR_PALETTE.slice(0, 5).map(color => (
                            <button key={`fill-${color}`} className={`fill-btn ${rectangleFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setRectangleFillColor(color)} title={`Bo'yash: ${color}`} />
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
                <span className="toast-icon">✅</span>
                <span className="toast-message">{toast.message}</span>
            </div>

            {/* Lock Indicator */}
            {isLocked && (
                <div className="lock-indicator">
                    ?? Qulflangan - cho'qqilarni torting
                </div>
            )}

            {/* Save Button */}

            <button className="whiteboard-close-btn" onClick={onClose} title="Yopish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
            </button>
        </div>
    );
}



function RectangleCanvas({
    width, height, unitSymbol, showGrid, showDiagonals, showCenter,
    showSides, showAngles, showDimensions, showSymmetry, showIncircle, showCircumcircle,
    showAreaFill, onResize, minSize = 1, maxSize = 50
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    // Zoom/Pan state
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 40, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Drag-to-resize state
    const [activeHandle, setActiveHandle] = useState(null); // 'e' | 'w' | 'n' | 's' | corner combos
    const [hoverHandle, setHoverHandle] = useState(null);
    const resizeRef = useRef(null); // { id, baseScale, left, right, top, bottom, cWidth, cHeight }
    // Sudrab o'lchamni o'zgartirganda shakl markazdan emas, qarama-qarshi burchak/tomon
    // qotib turgan holda o'zgaradi. Buning uchun "qo'lda joylashuv" — qotirilgan masshtab
    // va markaz siljishi. null bo'lsa — odatdagi markazlashtirilgan, ekranga moslashuvchi holat.
    const [manualGeom, setManualGeom] = useState(null); // null | { scale, offsetX, offsetY }

    // Ko'rinish elementlari animatsiyasi (uchburchakdagi kabi yumshoq paydo bo'lish/yo'qolish)
    const anim = useFeatureAnimation({
        grid: showGrid,
        diagonals: showDiagonals,
        center: showCenter,
        sides: showSides,
        angles: showAngles,
        dimensions: showDimensions,
        symmetry: showSymmetry,
        incircle: showIncircle,
        circumcircle: showCircumcircle,
        areaFill: showAreaFill
    });

    // Geometriyani bir joyda hisoblaymiz (chizish ham, handle ham ishlatadi)
    const computeGeometry = () => {
        const cWidth = canvasSize.width;
        const cHeight = canvasSize.height;
        // Sudrash natijasida qo'lda joylashuv bo'lsa — qotirilgan masshtab + siljish
        if (manualGeom) {
            const bs = manualGeom.scale;
            const wScaled = width * bs;
            const hScaled = height * bs;
            const cx = cWidth / 2 + manualGeom.offsetX;
            const cy = cHeight / 2 + manualGeom.offsetY;
            return { baseScale: bs, wScaled, hScaled, cx, cy, x: cx - wScaled / 2, y: cy - hScaled / 2 };
        }
        // Odatdagi holat — markazlashtirilgan, ekranga moslashuvchi
        const maxDim = Math.max(width, height);
        const baseScale = Math.min(cWidth, cHeight) * 0.5 / Math.max(1, maxDim);
        const wScaled = width * baseScale;
        const hScaled = height * baseScale;
        const cx = cWidth / 2;
        const cy = cHeight / 2;
        return { baseScale, wScaled, hScaled, cx, cy, x: cx - wScaled / 2, y: cy - hScaled / 2 };
    };

    // Local (chizilgan) koordinatani ekran pikseliga aylantirish
    const worldToScreen = (px, py) => {
        const cW = canvasSize.width, cH = canvasSize.height;
        return {
            x: cW / 2 + scale * (px - cW / 2 + offset.x),
            y: cH / 2 + scale * (py - cH / 2 + offset.y)
        };
    };
    const screenToWorld = (sx, sy) => {
        const cW = canvasSize.width, cH = canvasSize.height;
        return {
            x: (sx - cW / 2) / scale + cW / 2 - offset.x,
            y: (sy - cH / 2) / scale + cH / 2 - offset.y
        };
    };

    // 8 ta handle pozitsiyasi (local koordinatada)
    const getHandles = () => {
        const g = computeGeometry();
        const { x, y, wScaled, hScaled } = g;
        return [
            { id: 'nw', x: x, y: y },
            { id: 'n', x: x + wScaled / 2, y: y },
            { id: 'ne', x: x + wScaled, y: y },
            { id: 'e', x: x + wScaled, y: y + hScaled / 2 },
            { id: 'se', x: x + wScaled, y: y + hScaled },
            { id: 's', x: x + wScaled / 2, y: y + hScaled },
            { id: 'sw', x: x, y: y + hScaled },
            { id: 'w', x: x, y: y + hScaled / 2 }
        ];
    };

    const hitTestHandle = (sx, sy) => {
        if (!onResize) return null;
        const handles = getHandles();
        for (const h of handles) {
            const s = worldToScreen(h.x, h.y);
            if (Math.hypot(s.x - sx, s.y - sy) <= 16) return h.id;
        }
        return null;
    };

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

    // O'lcham SUDRASHDAN tashqari sabab bilan o'zgarsa (slayder, preset, oyna o'lchami) —
    // qo'lda joylashuvni bekor qilib, shaklni markazga qaytaramiz. Sudrash paytida
    // (activeHandle bor) qayta markazlashtirmaymiz, aks holda sudralayotgan burchak sakraydi.
    useEffect(() => {
        if (!activeHandle) setManualGeom(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, canvasSize]);

    // Yozuv "chip" — fonli, ramkali (chizishdan oldin e'lon qilinadi)
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
    };

    // Drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const cWidth = canvas.width;
        const cHeight = canvas.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, cWidth, cHeight);

        // ===== Animatsiya yordamchilari =====
        const clamp01 = (v) => Math.max(0, Math.min(1, v));
        // Bir nechta elementni birin-ketin (stagger) chiqarish uchun
        const stagger = (p, i, step = 0.18, span = 0.7) => clamp01((p - i * step) / span);

        // Grid (fade animatsiya bilan yonadi/o'chadi)
        if (anim.grid > 0.001) {
            ctx.save();
            ctx.globalAlpha = anim.grid;
            const gridSize = 25;
            const offsetX = (cWidth / 2) % gridSize;
            const offsetY = (cHeight / 2) % gridSize;
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 1;
            for (let x = offsetX; x < cWidth; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cHeight); ctx.stroke();
            }
            for (let x = offsetX - gridSize; x >= 0; x -= gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cHeight); ctx.stroke();
            }
            for (let y = offsetY; y < cHeight; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cWidth, y); ctx.stroke();
            }
            for (let y = offsetY - gridSize; y >= 0; y -= gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cWidth, y); ctx.stroke();
            }
            ctx.restore();
        }

        ctx.save();

        // Transform
        ctx.translate(cWidth / 2, cHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);

        // Rect geometriyasi — markazlashtirilgan (auto-fit) yoki sudrashdan keyingi
        // qo'lda joylashuv. computeGeometry ikkalasini ham boshqaradi.
        const { baseScale, wScaled, hScaled, cx, cy, x, y } = computeGeometry();

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

        // ===== Yuza katakchalari (1×1 birlik kataklar) =====
        // Bola "nega 60" ekanini ko'zi bilan ko'radi: a × b ta katak
        if (anim.areaFill > 0.001) {
            const aProg = anim.areaFill;
            const cell = baseScale; // 1 birlik = baseScale piksel
            ctx.save();
            // Faqat to'rtburchak ichini chizamiz
            ctx.beginPath();
            ctx.rect(x, y, wScaled, hScaled);
            ctx.clip();

            const cols = Math.ceil(width);
            const rows = Math.ceil(height);
            // Kataklar diagonal to'lqin bilan birin-ketin to'ladi
            const maxDiag = cols + rows;
            for (let gy = 0; gy < rows; gy++) {
                for (let gx = 0; gx < cols; gx++) {
                    const cellProg = clamp01((aProg - ((gx + gy) / maxDiag) * 0.5) / 0.5);
                    if (cellProg <= 0) continue;
                    const cw = Math.min(1, width - gx) * cell;
                    const ch = Math.min(1, height - gy) * cell;
                    const px = x + gx * cell;
                    const py = y + gy * cell;
                    const full = (width - gx >= 1) && (height - gy >= 1);
                    const even = (gx + gy) % 2 === 0;
                    ctx.globalAlpha = cellProg;
                    ctx.fillStyle = full
                        ? (even ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.16)')
                        : 'rgba(16, 185, 129, 0.08)';
                    ctx.fillRect(px, py, cw, ch);
                }
            }
            ctx.globalAlpha = aProg;

            // Katak chiziqlari
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
            ctx.lineWidth = 1 / scale;
            for (let gx = 1; gx < cols; gx++) {
                const px = x + gx * cell;
                ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + hScaled); ctx.stroke();
            }
            for (let gy = 1; gy < rows; gy++) {
                const py = y + gy * cell;
                ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + wScaled, py); ctx.stroke();
            }
            ctx.restore();

            // Katak soni / yuza yozuvi (kataklar to'lgach paydo bo'ladi)
            ctx.save();
            ctx.globalAlpha = clamp01((aProg - 0.6) / 0.4);
            const isWhole = Number.isInteger(width) && Number.isInteger(height);
            const areaVal = +(width * height).toFixed(2);
            const fillText = isWhole
                ? `${width} × ${height} = ${areaVal} ta katak`
                : `S = ${width} × ${height} = ${areaVal} ${unitSymbol}²`;
            renderLabel(ctx, fillText, cx, y + hScaled + 48 / scale, scale, COLORS.secondary);
            ctx.restore();
        }

        // Draw Diagonals (har biri o'z burchagidan birin-ketin o'sib chiqadi)
        if (anim.diagonals > 0.001) {
            const dProg = anim.diagonals;
            ctx.save();
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2 / scale;
            ctx.setLineDash([8 / scale, 4 / scale]);

            // Diagonal AC (A→C) — birinchi
            const p0 = stagger(dProg, 0, 0.25, 0.75);
            if (p0 > 0) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + wScaled * p0, y + hScaled * p0);
                ctx.stroke();
            }
            // Diagonal BD (B→D) — ikkinchi
            const p1 = stagger(dProg, 1, 0.25, 0.75);
            if (p1 > 0) {
                ctx.beginPath();
                ctx.moveTo(x + wScaled, y);
                ctx.lineTo(x + wScaled - wScaled * p1, y + hScaled * p1);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Diagonal yozuvi (chiziqlar chizilib bo'lgach paydo bo'ladi)
            ctx.globalAlpha = clamp01((dProg - 0.7) / 0.3);
            const diagLen = Math.sqrt(width * width + height * height).toFixed(1);
            renderLabel(ctx, `d = ${diagLen} ${unitSymbol}`, x + wScaled / 2 + 30 / scale, y + hScaled / 2 - 15 / scale, scale, COLORS.accent);
            ctx.restore();
        }

        // Draw Center point (kichikdan kattalashib paydo bo'ladi)
        if (anim.center > 0.001) {
            const cProg = anim.center;
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;
            ctx.save();
            ctx.globalAlpha = cProg;

            // Glow effect
            ctx.beginPath();
            ctx.arc(centerX, centerY, (15 / scale) * cProg, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.fill();

            // Center dot
            ctx.beginPath();
            ctx.arc(centerX, centerY, (6 / scale) * cProg, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.secondary;
            ctx.fill();

            // Center label (nuqta paydo bo'lgach)
            ctx.globalAlpha = clamp01((cProg - 0.6) / 0.4);
            ctx.fillStyle = COLORS.secondary;
            ctx.font = `bold ${12 / scale}px Inter, sans-serif`;
            ctx.fillText('O', centerX, centerY - 20 / scale);
            ctx.restore();
        }

        // Draw Symmetry axes (markazdan tashqariga o'sadi)
        if (anim.symmetry > 0.001) {
            const sProg = anim.symmetry;
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;

            ctx.save();
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 1.5 / scale;
            ctx.setLineDash([6 / scale, 4 / scale]);

            // Vertical axis (markazdan yuqori va pastga o'sadi)
            const pv = stagger(sProg, 0, 0.2, 0.8);
            if (pv > 0) {
                const topY = y - 30 / scale, botY = y + hScaled + 30 / scale;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - (centerY - topY) * pv);
                ctx.lineTo(centerX, centerY + (botY - centerY) * pv);
                ctx.stroke();
            }

            // Horizontal axis (markazdan chap va o'ngga o'sadi)
            const ph = stagger(sProg, 1, 0.2, 0.8);
            if (ph > 0) {
                const leftX = x - 30 / scale, rightX = x + wScaled + 30 / scale;
                ctx.beginPath();
                ctx.moveTo(centerX - (centerX - leftX) * ph, centerY);
                ctx.lineTo(centerX + (rightX - centerX) * ph, centerY);
                ctx.stroke();
            }

            ctx.setLineDash([]);
            ctx.restore();
        }

        // Draw Incircle (ichki doira - yuqoridan sweep bilan aylanib chiziladi)
        if (anim.incircle > 0.001) {
            const inProg = anim.incircle;
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;
            const inRadius = Math.min(wScaled, hScaled) / 2;
            ctx.save();

            // Ichki to'ldirish (asta paydo bo'ladi)
            ctx.globalAlpha = inProg;
            ctx.beginPath();
            ctx.arc(centerX, centerY, inRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
            ctx.fill();

            // Aylana yuqoridan sweep bilan chiziladi
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, inRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * inProg);
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            // Radius chizig'i (aylana yarmidan oshgach markazdan tegadigan tomonga o'sadi)
            const rProg = clamp01((inProg - 0.45) / 0.45);
            const radVert = hScaled <= wScaled; // qaysi tomonga tegishi
            const footX = centerX + (radVert ? 0 : inRadius);
            const footY = centerY + (radVert ? inRadius : 0);
            if (rProg > 0) {
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + (footX - centerX) * rProg, centerY + (footY - centerY) * rProg);
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 1.5 / scale;
                ctx.setLineDash([3 / scale, 3 / scale]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Radius yozuvi (animatsiya oxirida paydo bo'ladi)
            ctx.globalAlpha = clamp01((inProg - 0.75) / 0.25);
            const rLabel = (Math.min(width, height) / 2).toFixed(1);
            renderLabel(ctx, `r = ${rLabel} ${unitSymbol}`, centerX + inRadius / 2, centerY - 10 / scale, scale, '#06b6d4');
            ctx.restore();
        }

        // Draw Circumcircle (tashqi doira - yuqoridan sweep bilan aylanib chiziladi)
        if (anim.circumcircle > 0.001) {
            const ccProg = anim.circumcircle;
            const centerX = x + wScaled / 2;
            const centerY = y + hScaled / 2;
            const circumRadius = Math.sqrt(wScaled * wScaled + hScaled * hScaled) / 2;
            ctx.save();

            // Ichki to'ldirish (asta paydo bo'ladi)
            ctx.globalAlpha = ccProg;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circumRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
            ctx.fill();

            // Aylana yuqoridan sweep bilan chiziladi
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circumRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ccProg);
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            // Radius chizig'i (markazdan B cho'qqisiga, aylana yarmidan oshgach o'sadi)
            const ccrProg = clamp01((ccProg - 0.45) / 0.45);
            const cornerX = x + wScaled, cornerY = y;
            if (ccrProg > 0) {
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + (cornerX - centerX) * ccrProg, centerY + (cornerY - centerY) * ccrProg);
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1.5 / scale;
                ctx.setLineDash([3 / scale, 3 / scale]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Radius yozuvi (animatsiya oxirida paydo bo'ladi)
            ctx.globalAlpha = clamp01((ccProg - 0.75) / 0.25);
            const RLabel = (Math.sqrt(width * width + height * height) / 2).toFixed(1);
            renderLabel(ctx, `R = ${RLabel} ${unitSymbol}`, centerX + circumRadius * 0.7, centerY - circumRadius * 0.7, scale, '#a855f7');
            ctx.restore();
        }

        // Right angles (90° belgilar — to'rt burchak birin-ketin paydo bo'ladi)
        if (anim.angles > 0.001) {
            const aProg = anim.angles;
            const mSize = 15 / scale;
            ctx.save();
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2 / scale;
            const corners = [
                () => { ctx.moveTo(x, y + mSize); ctx.lineTo(x + mSize, y + mSize); ctx.lineTo(x + mSize, y); },                                                              // TL
                () => { ctx.moveTo(x + wScaled - mSize, y); ctx.lineTo(x + wScaled - mSize, y + mSize); ctx.lineTo(x + wScaled, y + mSize); },                                   // TR
                () => { ctx.moveTo(x + wScaled, y + hScaled - mSize); ctx.lineTo(x + wScaled - mSize, y + hScaled - mSize); ctx.lineTo(x + wScaled - mSize, y + hScaled); },     // BR
                () => { ctx.moveTo(x + mSize, y + hScaled); ctx.lineTo(x + mSize, y + hScaled - mSize); ctx.lineTo(x, y + hScaled - mSize); }                                    // BL
            ];
            corners.forEach((draw, i) => {
                const p = stagger(aProg, i, 0.14, 0.6);
                if (p <= 0) return;
                ctx.globalAlpha = p;
                ctx.beginPath();
                draw();
                ctx.stroke();
            });
            ctx.restore();
        }

        // Labels (umumiy matn sozlamalari)
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Side labels (o'lchamlar — birin-ketin paydo bo'ladi)
        if (anim.dimensions > 0.001) {
            const dimProg = anim.dimensions;
            const dimLabels = [
                { t: `a = ${width} ${unitSymbol}`, lx: x + wScaled / 2, ly: y - 25 / scale, c: COLORS.primary },        // a (Top)
                { t: `b = ${height} ${unitSymbol}`, lx: x - 35 / scale, ly: y + hScaled / 2, c: COLORS.purple },        // b (Left)
                { t: `b = ${height} ${unitSymbol}`, lx: x + wScaled + 35 / scale, ly: y + hScaled / 2, c: COLORS.purple }, // b (Right)
                { t: `a = ${width} ${unitSymbol}`, lx: x + wScaled / 2, ly: y + hScaled + 25 / scale, c: COLORS.primary }  // a (Bottom)
            ];
            dimLabels.forEach((d, i) => {
                const p = stagger(dimProg, i, 0.12, 0.6);
                if (p <= 0) return;
                ctx.save();
                ctx.globalAlpha = p;
                renderLabel(ctx, d.t, d.lx, d.ly, scale, d.c);
                ctx.restore();
            });
        }

        // Vertices A, B, C, D (cho'qqilar — kichikdan kattalashib paydo bo'ladi)
        if (anim.sides > 0.001) {
            const sProg = anim.sides;
            const pts = [
                { x: x, y: y, l: 'A' }, { x: x + wScaled, y: y, l: 'B' },
                { x: x + wScaled, y: y + hScaled, l: 'C' }, { x: x, y: y + hScaled, l: 'D' }
            ];

            pts.forEach((p, i) => {
                const pr = stagger(sProg, i, 0.12, 0.6);
                if (pr <= 0) return;
                ctx.save();
                ctx.globalAlpha = pr;
                // Glow
                ctx.beginPath(); ctx.arc(p.x, p.y, (10 / scale) * pr, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99, 102, 241, 0.4)'; ctx.fill();
                // Dot
                ctx.beginPath(); ctx.arc(p.x, p.y, (5 / scale) * pr, 0, Math.PI * 2);
                ctx.fillStyle = '#fff'; ctx.fill();

                // Label letter (cho'qqi paydo bo'lgach)
                ctx.globalAlpha = clamp01((pr - 0.5) / 0.5);
                const off = 20 / scale;
                const lx = p.x < cx ? p.x - off : p.x + off;
                const ly = p.y < cy ? p.y - off : p.y + off;
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fillText(p.l, lx, ly);
                ctx.restore();
            });
        }

        // ===== Drag handle'lar (sudrab o'lchamni o'zgartirish) =====
        if (onResize) {
            const handles = [
                { x: x, y: y }, { x: x + wScaled / 2, y: y }, { x: x + wScaled, y: y },
                { x: x + wScaled, y: y + hScaled / 2 }, { x: x + wScaled, y: y + hScaled },
                { x: x + wScaled / 2, y: y + hScaled }, { x: x, y: y + hScaled }, { x: x, y: y + hScaled / 2 }
            ];
            handles.forEach((h, idx) => {
                const isActive = activeHandle && getHandles()[idx] && getHandles()[idx].id === activeHandle;
                const isHover = hoverHandle && getHandles()[idx] && getHandles()[idx].id === hoverHandle;
                const r = (isActive || isHover ? 9 : 7) / scale;
                ctx.beginPath();
                ctx.arc(h.x, h.y, r + 3 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
                ctx.fillStyle = (isActive || isHover) ? COLORS.accent : '#fff';
                ctx.fill();
                ctx.lineWidth = 2 / scale;
                ctx.strokeStyle = COLORS.accent;
                ctx.stroke();
            });
        }

        ctx.restore();
    }, [width, height, unitSymbol, anim, manualGeom, showGrid, showDiagonals, showCenter, showSides, showAngles, showDimensions, showSymmetry, showIncircle, showCircumcircle, showAreaFill, onResize, activeHandle, hoverHandle, canvasSize, scale, offset]);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.max(0.2, Math.min(5, s * delta)));
    };

    // Sichqoncha hodisasidan canvas-ichki piksel koordinata
    const getLocal = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX);
        const cy = (e.touches ? e.touches[0].clientY : e.clientY);
        return {
            x: (cx - rect.left) * (canvas.width / rect.width),
            y: (cy - rect.top) * (canvas.height / rect.height)
        };
    };

    const applyResize = (id, wx, wy) => {
        const ref = resizeRef.current;
        if (!ref) return;
        const { baseScale, left, right, top, bottom, cWidth, cHeight } = ref;
        const minPx = minSize * baseScale;

        // Sudralayotgan tomon sichqonchaga ergashadi, QARAMA-QARSHI tomon qotib turadi
        let nLeft = left, nRight = right, nTop = top, nBottom = bottom;
        if (id.includes('w')) nLeft = Math.min(wx, right - minPx);   // chap tomon (o'ng qotgan)
        if (id.includes('e')) nRight = Math.max(wx, left + minPx);   // o'ng tomon (chap qotgan)
        if (id.includes('n')) nTop = Math.min(wy, bottom - minPx);   // yuqori tomon (past qotgan)
        if (id.includes('s')) nBottom = Math.max(wy, top + minPx);   // past tomon (yuqori qotgan)

        // Yangi o'lchamlar (birlik) — 0.5 gacha yaxlitlab, chegaralab
        const newW = Math.max(minSize, Math.min(maxSize, Math.round(((nRight - nLeft) / baseScale) * 2) / 2));
        const newH = Math.max(minSize, Math.min(maxSize, Math.round(((nBottom - nTop) / baseScale) * 2) / 2));

        // Chegaralangan qiymatni qayta piksellarga o'tkazib, qotgan tomonni aniq joyida saqlaymiz
        const wPx = newW * baseScale;
        const hPx = newH * baseScale;
        const finalLeft = id.includes('w') ? (right - wPx) : left;   // 'w' bo'lsa o'ng tomon qotgan
        const finalTop = id.includes('n') ? (bottom - hPx) : top;    // 'n' bo'lsa past tomon qotgan

        const cx = finalLeft + wPx / 2;
        const cy = finalTop + hPx / 2;
        setManualGeom({ scale: baseScale, offsetX: cx - cWidth / 2, offsetY: cy - cHeight / 2 });
        onResize(newW, newH);
    };

    const handleMouseDown = (e) => {
        const loc = getLocal(e);
        const hit = hitTestHandle(loc.x, loc.y);
        if (hit) {
            const g = computeGeometry();
            // Sudrash boshida tomonlarni va masshtabni "qotiramiz" (qarama-qarshi tomon shu yerda turadi)
            resizeRef.current = {
                id: hit, baseScale: g.baseScale,
                left: g.x, right: g.x + g.wScaled, top: g.y, bottom: g.y + g.hScaled,
                cWidth: canvasSize.width, cHeight: canvasSize.height
            };
            setActiveHandle(hit);
            return;
        }
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e) => {
        if (activeHandle) {
            const loc = getLocal(e);
            const w = screenToWorld(loc.x, loc.y);
            applyResize(activeHandle, w.x, w.y);
            return;
        }
        if (isDragging) {
            setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            return;
        }
        // Hover holati (kursor uchun)
        if (onResize) {
            const loc = getLocal(e);
            const hit = hitTestHandle(loc.x, loc.y);
            if (hit !== hoverHandle) setHoverHandle(hit);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setActiveHandle(null);
        resizeRef.current = null;
    };

    // Touch (mobil/planshet) — sudrab o'lcham o'zgartirish
    const handleTouchStart = (e) => {
        if (!onResize || !e.touches || e.touches.length !== 1) return;
        const loc = getLocal(e);
        const hit = hitTestHandle(loc.x, loc.y);
        if (hit) {
            e.preventDefault();
            const g = computeGeometry();
            resizeRef.current = {
                id: hit, baseScale: g.baseScale,
                left: g.x, right: g.x + g.wScaled, top: g.y, bottom: g.y + g.hScaled,
                cWidth: canvasSize.width, cHeight: canvasSize.height
            };
            setActiveHandle(hit);
        }
    };
    const handleTouchMove = (e) => {
        if (!activeHandle || !e.touches || e.touches.length !== 1) return;
        e.preventDefault();
        const loc = getLocal(e);
        const w = screenToWorld(loc.x, loc.y);
        applyResize(activeHandle, w.x, w.y);
    };
    const handleTouchEnd = () => {
        setActiveHandle(null);
        resizeRef.current = null;
    };

    const cursorFor = (id) => {
        if (!id) return isDragging ? 'grabbing' : 'grab';
        if (id === 'n' || id === 's') return 'ns-resize';
        if (id === 'e' || id === 'w') return 'ew-resize';
        if (id === 'ne' || id === 'sw') return 'nesw-resize';
        return 'nwse-resize';
    };

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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ cursor: cursorFor(activeHandle || hoverHandle), touchAction: 'none' }}
            />
            {onResize && (
                <div style={{
                    position: 'absolute', bottom: 14, left: 14,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 10,
                    background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#f59e0b', fontSize: 12, fontWeight: 600, pointerEvents: 'none', backdropFilter: 'blur(4px)'
                }}>
                    <span style={{ fontSize: 14 }}>✋</span> Burchaklarni sudrab o'lchamni o'zgartiring
                </div>
            )}
        </div>
    );
}

// ===== 3D'ga ko'tarish (extrude) — to'g'ri burchakli parallelepiped =====
function Prism3DModal({ a, b, h, unitSymbol, setDepth, onClose }) {
    const boxRef = useRef(null);
    const netRef = useRef(null);

    const V = +(a * b * h).toFixed(2);
    const Sfull = +(2 * (a * b + b * h + a * h)).toFixed(2);
    const Slat = +(2 * h * (a + b)).toFixed(2);
    const edges = +(4 * (a + b + h)).toFixed(2);

    // Izometrik quti
    useEffect(() => {
        const canvas = boxRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.fillStyle = '#0d0d16'; ctx.fillRect(0, 0, W, H);
        const ang = Math.PI / 6, cos = Math.cos(ang), sin = Math.sin(ang);
        const proj = (x, y, z) => ({ X: (x - z) * cos, Y: -y + (x + z) * sin });
        const verts = {
            A: proj(0, 0, 0), B: proj(a, 0, 0), C: proj(a, 0, h), D: proj(0, 0, h),
            E: proj(0, b, 0), F: proj(a, b, 0), G: proj(a, b, h), Hh: proj(0, b, h)
        };
        const pts = Object.values(verts);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(p => { minX = Math.min(minX, p.X); maxX = Math.max(maxX, p.X); minY = Math.min(minY, p.Y); maxY = Math.max(maxY, p.Y); });
        const pad = 70;
        const s = Math.min((W - pad) / (maxX - minX || 1), (H - pad) / (maxY - minY || 1));
        const ox = (W - (maxX + minX) * s) / 2, oy = (H - (maxY + minY) * s) / 2;
        const T = (p) => ({ x: p.X * s + ox, y: p.Y * s + oy });
        const P = {}; for (const k in verts) P[k] = T(verts[k]);
        const face = (keys, fill) => {
            ctx.beginPath();
            keys.forEach((k, i) => { const p = P[k]; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
            ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
        };
        face(['E', 'F', 'G', 'Hh'], 'rgba(99,102,241,0.5)');   // ust
        face(['A', 'B', 'F', 'E'], 'rgba(99,102,241,0.32)');   // old
        face(['B', 'C', 'G', 'F'], 'rgba(139,92,246,0.34)');   // o'ng
        const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
        const lbl = (p, q, t, c) => {
            const m = mid(p, q);
            ctx.font = 'bold 15px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const tw = ctx.measureText(t).width + 12;
            ctx.fillStyle = 'rgba(13,13,22,0.85)';
            ctx.beginPath(); ctx.roundRect(m.x - tw / 2, m.y - 11, tw, 22, 6); ctx.fill();
            ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = c; ctx.fillText(t, m.x, m.y);
        };
        lbl(P.A, P.B, `a = ${a}`, '#a5b4fc');
        lbl(P.B, P.F, `b = ${b}`, '#c4b5fd');
        lbl(P.F, P.G, `h = ${h}`, '#fcd34d');
    }, [a, b, h]);

    // Yoyilma (razvyortka)
    useEffect(() => {
        const canvas = netRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.fillStyle = '#0d0d16'; ctx.fillRect(0, 0, W, H);
        const totalW = a + 2 * h, totalH = 2 * b + 2 * h;
        const pad = 40;
        const u = Math.min((W - pad) / totalW, (H - pad) / totalH);
        const ox = (W - totalW * u) / 2, oy = (H - totalH * u) / 2;
        const rect = (gx, gy, gw, gh, fill, label) => {
            const px = ox + gx * u, py = oy + gy * u, pw = gw * u, ph = gh * u;
            ctx.fillStyle = fill; ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(px, py, pw, ph);
            ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, px + pw / 2, py + ph / 2);
        };
        const c1 = 'rgba(99,102,241,0.32)', c2 = 'rgba(139,92,246,0.32)', c3 = 'rgba(16,185,129,0.30)';
        rect(h, 0, a, b, c1, `orqa ${a}×${b}`);
        rect(h, b, a, h, c2, `ust ${a}×${h}`);
        rect(0, b + h, h, b, c3, `chap ${h}×${b}`);
        rect(h, b + h, a, b, c1, `old ${a}×${b}`);
        rect(h + a, b + h, h, b, c3, `o'ng ${h}×${b}`);
        rect(h, 2 * b + h, a, h, c2, `tag ${a}×${h}`);
    }, [a, b, h]);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onClose}>
            <div style={{ background: '#1e1e24', padding: 28, borderRadius: 22, maxWidth: 820, width: '92%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #2a2a35', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 26, cursor: 'pointer' }}>×</button>
                <h3 style={{ fontSize: 24, marginBottom: 6, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>📦</span> 3D'ga ko'tarish — To'g'ri burchakli parallelepiped
                </h3>
                <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 0, marginBottom: 18 }}>To'rtburchakka <b style={{ color: '#fcd34d' }}>h</b> balandlik bersak — hajmli jismga aylanadi.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <div style={{ color: '#a5b4fc', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hajmli ko'rinish</div>
                        <canvas ref={boxRef} width={380} height={300} style={{ width: '100%', borderRadius: 12, background: '#0d0d16' }} />
                    </div>
                    <div>
                        <div style={{ color: '#34d399', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Yoyilma (razvyortka)</div>
                        <canvas ref={netRef} width={380} height={300} style={{ width: '100%', borderRadius: 12, background: '#0d0d16' }} />
                    </div>
                </div>

                {/* h balandlik slayderi */}
                <div style={{ marginTop: 18, background: '#13131a', padding: '14px 18px', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#fcd34d', fontWeight: 600 }}>Balandlik (h)</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>{h} {unitSymbol}</span>
                    </div>
                    <input type="range" min="1" max="50" step="0.5" value={h} onChange={e => setDepth(Number(e.target.value))} className="pro-range" style={{ '--range-color': '#f59e0b', width: '100%' }} />
                </div>

                {/* Formulalar */}
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {[
                        { t: 'Hajm', f: 'V = a · b · h', val: V, u: `${unitSymbol}³`, c: '#6366f1', calc: `${a} · ${b} · ${h}` },
                        { t: "To'liq sirt", f: 'S = 2(ab + bh + ah)', val: Sfull, u: `${unitSymbol}²`, c: '#10b981', calc: `2(${a}·${b} + ${b}·${h} + ${a}·${h})` },
                        { t: 'Yon sirt', f: 'S_yon = 2h(a + b)', val: Slat, u: `${unitSymbol}²`, c: '#8b5cf6', calc: `2·${h}·(${a}+${b})` },
                        { t: 'Qirralar yig\'indisi', f: 'L = 4(a + b + h)', val: edges, u: unitSymbol, c: '#f59e0b', calc: `4(${a}+${b}+${h})` }
                    ].map(card => (
                        <div key={card.t} style={{ background: '#13131a', border: `1px solid ${card.c}40`, borderRadius: 12, padding: 14 }}>
                            <div style={{ color: card.c, fontWeight: 700, fontSize: 15 }}>{card.t}</div>
                            <code style={{ color: '#cbd5e1', fontSize: 13, display: 'block', margin: '6px 0' }}>{card.f}</code>
                            <div style={{ color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>= {card.calc}</div>
                            <div style={{ color: card.c, fontWeight: 800, fontSize: 20, marginTop: 4 }}>{card.val} {card.u}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ===== Solishtirish rejimi — ikkita to'rtburchakni yonma-yon =====
function CompareModal({ a1, b1, w2, h2, setW2, setH2, unitSymbol, onClose }) {
    const cmpRef = useRef(null);

    useEffect(() => {
        const canvas = cmpRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.fillStyle = '#0d0d16'; ctx.fillRect(0, 0, W, H);
        const maxDim = Math.max(a1, b1, w2, h2);
        const u = (Math.min(W / 2, H) * 0.62) / maxDim; // ikkala to'rtburchak bir xil masshtabda
        const drawRect = (cx, w, hh, color, label) => {
            const pw = w * u, ph = hh * u;
            const x = cx - pw / 2, y = H / 2 - ph / 2;
            ctx.fillStyle = color + '40'; ctx.fillRect(x, y, pw, ph);
            ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(x, y, pw, ph);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(label, cx, y - 14);
            ctx.font = '12px Inter, sans-serif'; ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`${w} × ${hh}`, cx, y + ph + 20);
        };
        drawRect(W * 0.27, a1, b1, '#6366f1', '1-shakl');
        drawRect(W * 0.73, w2, h2, '#10b981', '2-shakl');
    }, [a1, b1, w2, h2]);

    const A1 = a1 * b1, P1 = 2 * (a1 + b1);
    const A2 = w2 * h2, P2 = 2 * (w2 + h2);
    const row = (label, v1, v2, u) => {
        const eq = Math.abs(v1 - v2) < 0.01;
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2a2a35' }}>
                <span style={{ color: '#a5b4fc', fontWeight: 700, textAlign: 'right' }}>{v1.toFixed(2)} {u}</span>
                <span style={{ color: eq ? '#10b981' : '#f59e0b', fontSize: 12, fontWeight: 700, minWidth: 70, textAlign: 'center' }}>{label}<br />{eq ? '=' : v1 > v2 ? '>' : '<'}</span>
                <span style={{ color: '#6ee7b7', fontWeight: 700 }}>{v2.toFixed(2)} {u}</span>
            </div>
        );
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onClose}>
            <div style={{ background: '#1e1e24', padding: 28, borderRadius: 22, maxWidth: 760, width: '92%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #2a2a35', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 26, cursor: 'pointer' }}>×</button>
                <h3 style={{ fontSize: 24, marginBottom: 6, color: '#10b981', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>⚖️</span> Solishtirish rejimi
                </h3>
                <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 0, marginBottom: 16 }}>Perimetr bir xil bo'lsa ham, yuza har xil bo'lishi mumkin!</p>

                <canvas ref={cmpRef} width={680} height={260} style={{ width: '100%', borderRadius: 12, background: '#0d0d16' }} />

                {/* 2-shakl boshqaruvi */}
                <div style={{ marginTop: 14, background: '#13131a', padding: '14px 18px', borderRadius: 12 }}>
                    <div style={{ color: '#6ee7b7', fontWeight: 600, marginBottom: 10 }}>2-shaklni o'zgartiring</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ color: '#9ca3af', width: 60 }}>a = {w2}</span>
                        <input type="range" min="1" max="50" step="0.5" value={w2} onChange={e => setW2(Number(e.target.value))} className="pro-range" style={{ '--range-color': '#10b981', flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: '#9ca3af', width: 60 }}>b = {h2}</span>
                        <input type="range" min="1" max="50" step="0.5" value={h2} onChange={e => setH2(Number(e.target.value))} className="pro-range" style={{ '--range-color': '#10b981', flex: 1 }} />
                    </div>
                </div>

                {/* Taqqoslash jadvali */}
                <div style={{ marginTop: 16, background: '#13131a', padding: '8px 18px 16px', borderRadius: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, padding: '8px 0', color: '#6b7280', fontSize: 12, fontWeight: 700 }}>
                        <span style={{ textAlign: 'right', color: '#a5b4fc' }}>1-shakl</span>
                        <span style={{ minWidth: 70, textAlign: 'center' }}>—</span>
                        <span style={{ color: '#6ee7b7' }}>2-shakl</span>
                    </div>
                    {row('Yuza', A1, A2, `${unitSymbol}²`)}
                    {row('Perimetr', P1, P2, unitSymbol)}
                </div>
            </div>
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
    const [modalClosing, setModalClosing] = useState(false);
    // Modalni yopilish animatsiyasi bilan yopadi: avval "closing" holatiga o'tkazadi,
    // exit animatsiyasi tugagach (260ms) haqiqatan unmount qiladi.
    const closeResultModal = () => {
        if (modalClosing) return;
        setModalClosing(true);
        setTimeout(() => { setModalClosing(false); setResultModal(null); }, 260);
    };
    const [showFullscreen, setShowFullscreen] = useState(false);

    const [showRulesModal, setShowRulesModal] = useState(false);

    // Yangi funksiyalar uchun holatlar
    const [showAreaFill, setShowAreaFill] = useState(false);   // Yuza katakchalari
    const [enableDrag, setEnableDrag] = useState(true);         // Sudrab o'lcham o'zgartirish
    const [show3D, setShow3D] = useState(false);                // 3D'ga ko'tarish modali
    const [depth, setDepth] = useState(4);                      // 3D balandlik (h)
    const [showCompare, setShowCompare] = useState(false);      // Solishtirish modali
    const [compareW, setCompareW] = useState(8);
    const [compareH, setCompareH] = useState(8);
    const [challenge, setChallenge] = useState(null);           // Faol topshiriq
    const presetAnimRef = useRef(null);                         // Preset o'lcham animatsiyasi (rAF)

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

    // Komponent yo'qolganda preset animatsiyasini to'xtatamiz
    useEffect(() => () => {
        if (presetAnimRef.current) cancelAnimationFrame(presetAnimRef.current);
    }, []);





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

    // ===== Real hayot misollari (presetlar) =====
    const REAL_LIFE = [
        { icon: '🏫', name: 'Sinf xonasi', w: 8, h: 6, unit: 'm' },
        { icon: '⚽', name: 'Futbol maydoni', w: 105, h: 68, unit: 'm' },
        { icon: '📄', name: 'A4 varaq', w: 21, h: 29.7, unit: 'sm' },
        { icon: '🚪', name: 'Eshik', w: 90, h: 200, unit: 'sm' },
        { icon: '📱', name: 'Telefon', w: 7, h: 15, unit: 'sm' },
        { icon: '📺', name: 'Televizor', w: 120, h: 70, unit: 'sm' }
    ];
    // Joriy o'lchamdan nishon o'lchamga yumshoq morf (easeOutCubic) — to'rtburchak
    // asta o'sib/kichrayadi, yuza/perimetr raqamlari ham asta o'zgaradi.
    // Ham presetlar, ham topshiriq rejimi shu yordamchidan foydalanadi.
    const tweenSize = (rawW, rawH) => {
        if (presetAnimRef.current) cancelAnimationFrame(presetAnimRef.current);
        const startW = width, startH = height;
        const targetW = Math.max(1, Math.min(50, rawW));
        const targetH = Math.max(1, Math.min(50, rawH));
        if (startW === targetW && startH === targetH) {
            setWidth(targetW); setHeight(targetH);
            return;
        }
        const duration = 650;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            if (t < 1) {
                // Oraliq qiymatlarni 0.1 gacha yaxlitlaymiz (slayder/yozuvlar tinch ko'rinadi)
                setWidth(Math.round((startW + (targetW - startW) * eased) * 10) / 10);
                setHeight(Math.round((startH + (targetH - startH) * eased) * 10) / 10);
                presetAnimRef.current = requestAnimationFrame(step);
            } else {
                // Oxirida aniq nishon qiymatga o'rnatamiz
                setWidth(targetW);
                setHeight(targetH);
                presetAnimRef.current = null;
            }
        };
        presetAnimRef.current = requestAnimationFrame(step);
    };
    const applyPreset = (p) => {
        // unit ni to'g'ridan-to'g'ri o'rnatamiz (handleUnitChange qiymatni qayta hisoblaydi, bu yerda kerak emas)
        setUnit(p.unit);
        tweenSize(p.w, p.h);
    };

    // ===== Topshiriqlar (test rejimi) =====
    const CHALLENGES = [
        { id: 'a1', type: 'area', target: 24, text: 'Yuza 24 bo‘lishi uchun a va b ni o‘zgartir' },
        { id: 'a2', type: 'area', target: 60, text: 'Yuza 60 bo‘lsin (masalan 10 × 6)' },
        { id: 'p1', type: 'perimeter', target: 32, text: 'Perimetri 32 bo‘lishi uchun tomonlarni o‘zgartir' },
        { id: 'p2', type: 'perimeter', target: 20, text: 'Perimetri 20 bo‘lsin' },
        { id: 's1', type: 'square', target: 0, text: 'Kvadrat hosil qil (a = b)' },
        { id: 'a3', type: 'area', target: 100, text: 'Yuza 100 bo‘lsin (kvadrat ham bo‘lishi mumkin)' }
    ];
    const newChallenge = () => {
        const pool = challenge ? CHALLENGES.filter(c => c.id !== challenge.id) : CHALLENGES;
        const pick = pool[Math.floor((Date.now() / 7) % pool.length)];
        setChallenge(pick);
        // Topshiriq doimo toza, kichik o'lchamdan boshlansin — aks holda katta
        // preset (masalan Futbol 50×50) qolib, kichik nishonni (Yuza 100 / Perimetr 20)
        // sudrab topish deyarli imkonsiz bo'lib qoladi. 8×5 hech bir nishonga teng emas.
        tweenSize(8, 5);
    };
    const challengeStatus = useMemo(() => {
        if (!challenge) return null;
        const area = width * height;
        const perim = 2 * (width + height);
        let current, ok;
        if (challenge.type === 'area') { current = +area.toFixed(2); ok = Math.abs(area - challenge.target) < 0.01; }
        else if (challenge.type === 'perimeter') { current = +perim.toFixed(2); ok = Math.abs(perim - challenge.target) < 0.01; }
        else { current = calculations.isSquare ? 'a = b' : 'a ≠ b'; ok = calculations.isSquare; }
        return { current, ok };
    }, [challenge, width, height, calculations.isSquare]);

    return (
        <div className="shape-page tortburchak-page">
            {/* Header */}
            <header className="shape-page-header pro-page-header pro-header-enhanced">
                <div className="header-left-section">
                    <Link to="/2d-models" className="back-btn" title="2D shakllarga qaytish">
                        ← Orqaga
                    </Link>
                    <Link to="/" className="header-logo-link">
                        <img src="/logo.png" alt="Logo" className="header-logo-img" />
                    </Link>
                    <div className="header-divider"></div>
                    <div className="pro-page-header-content">
                        <div className="pro-header-icon"><span className="icon-glow">▭</span></div>
                        <div className="pro-header-text">
                            <h1>To'rtburchak</h1>
                            <p>Interaktiv modellashtirish</p>
                        </div>
                    </div>
                </div>
                <div className="header-right-section">
                    <UserMenu />
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
                                    <h4 className="pro-subsection-title">📌 Asosiy</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid(!showGrid)}>
                                            <span className="toggle-icon">⊞</span>
                                            <span className="toggle-label">Grid</span>
                                            <span className={`toggle-status ${showGrid ? 'on' : 'off'}`}>{showGrid ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showSides ? 'active' : ''}`} onClick={() => setShowSides(!showSides)}>
                                            <span className="toggle-icon">◉</span>
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
                                    <h4 className="pro-subsection-title">⚡ Qo'shimcha</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showDiagonals ? 'active' : ''}`} onClick={() => setShowDiagonals(!showDiagonals)}>
                                            <span className="toggle-icon">╳</span>
                                            <span className="toggle-label">Diagonallar</span>
                                            <span className={`toggle-status ${showDiagonals ? 'on' : 'off'}`}>{showDiagonals ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showCenter ? 'active' : ''}`} onClick={() => setShowCenter(!showCenter)}>
                                            <span className="toggle-icon">⊙</span>
                                            <span className="toggle-label">Markaz</span>
                                            <span className={`toggle-status ${showCenter ? 'on' : 'off'}`}>{showCenter ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showSymmetry ? 'active' : ''}`} onClick={() => setShowSymmetry(!showSymmetry)}>
                                            <span className="toggle-icon">⇄</span>
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

                        {/* Interaktiv o'rganish */}
                        <details className="pro-section settings-view-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">🎓</div>
                                <span className="pro-section-title">Interaktiv o'rganish</span>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-subsection">
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showAreaFill ? 'active' : ''}`} onClick={() => setShowAreaFill(!showAreaFill)}>
                                            <span className="toggle-icon">▦</span>
                                            <span className="toggle-label">Yuza kataklari</span>
                                            <span className={`toggle-status ${showAreaFill ? 'on' : 'off'}`}>{showAreaFill ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${enableDrag ? 'active' : ''}`} onClick={() => setEnableDrag(!enableDrag)}>
                                            <span className="toggle-icon">✋</span>
                                            <span className="toggle-label">Sudrab o'lchash</span>
                                            <span className={`toggle-status ${enableDrag ? 'on' : 'off'}`}>{enableDrag ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">🧩 Rejimlar</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <button className="pro-settings-btn" style={{ justifyContent: 'flex-start', gap: 10, borderColor: 'rgba(99,102,241,0.4)' }} onClick={() => { if (!challenge) newChallenge(); else setChallenge(null); }}>
                                            <span className="settings-btn-icon">🎯</span>
                                            <span className="settings-btn-label">{challenge ? 'Topshiriqni yopish' : 'Topshiriq rejimi'}</span>
                                        </button>
                                        <button className="pro-settings-btn" style={{ justifyContent: 'flex-start', gap: 10, borderColor: 'rgba(245,158,11,0.4)' }} onClick={() => { setDepth(Math.max(1, Math.min(width, height))); setShow3D(true); }}>
                                            <span className="settings-btn-icon">📦</span>
                                            <span className="settings-btn-label">3D'ga ko'tarish</span>
                                        </button>
                                        <button className="pro-settings-btn" style={{ justifyContent: 'flex-start', gap: 10, borderColor: 'rgba(16,185,129,0.4)' }} onClick={() => { setCompareW(width); setCompareH(height); setShowCompare(true); }}>
                                            <span className="settings-btn-icon">⚖️</span>
                                            <span className="settings-btn-label">Solishtirish rejimi</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">🌍 Real hayot misollari</h4>
                                    <div className="pro-toggle-grid-settings">
                                        {REAL_LIFE.map(p => (
                                            <button key={p.name} className="pro-toggle-item" onClick={() => applyPreset(p)} title={`${p.w} × ${p.h} ${p.unit}`}>
                                                <span className="toggle-icon">{p.icon}</span>
                                                <span className="toggle-label">{p.name}</span>
                                                <span className="toggle-status off" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>{p.w}×{p.h}</span>
                                            </button>
                                        ))}
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
                        showAreaFill={showAreaFill}
                        onResize={enableDrag ? ((w, h) => { setWidth(w); setHeight(h); }) : undefined}
                    />
                    <div className="shape-type-badge" style={calculations.isSquare ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(6,182,212,0.9))' } : undefined}>
                        <span className="badge-icon">{calculations.isSquare ? '⬛' : '▭'}</span>
                        {calculations.isSquare ? 'Bu kvadrat! (a = b)' : "To'g'ri to'rtburchak"}
                    </div>
                    <button className="fullscreen-toggle-btn" onClick={() => setShowFullscreen(true)} title="To'liq ekran">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    </button>

                    {/* Topshiriq banneri */}
                    {challenge && challengeStatus && (
                        <div style={{
                            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                            minWidth: 300, maxWidth: '90%',
                            background: challengeStatus.ok ? 'rgba(16,185,129,0.16)' : 'rgba(30,30,40,0.92)',
                            border: `1.5px solid ${challengeStatus.ok ? '#10b981' : 'rgba(99,102,241,0.5)'}`,
                            borderRadius: 14, padding: '12px 16px', backdropFilter: 'blur(8px)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 20
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 22 }}>{challengeStatus.ok ? '✅' : '🎯'}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{challenge.text}</div>
                                    <div style={{ color: challengeStatus.ok ? '#10b981' : '#9ca3af', fontSize: 12, marginTop: 2 }}>
                                        {challengeStatus.ok
                                            ? "Barakalla! To'g'ri bajarding 🎉"
                                            : `Hozir: ${challengeStatus.current}${challenge.type === 'area' ? ` ${unitSymbol}²` : challenge.type === 'perimeter' ? ` ${unitSymbol}` : ''}`}
                                    </div>
                                </div>
                                <button onClick={newChallenge} title="Keyingi topshiriq" style={{
                                    background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc',
                                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                                }}>↻</button>
                                <button onClick={() => setChallenge(null)} title="Yopish" style={{
                                    background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18
                                }}>×</button>
                            </div>
                        </div>
                    )}
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
                                <span className="pro-card-value"><AnimatedNumber value={Number(calculations.area)} decimals={2} /></span>
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
                                <span className="pro-card-value"><AnimatedNumber value={Number(calculations.perimeter)} decimals={2} /></span>
                                <span className="pro-card-unit">{unitSymbol}</span>
                            </div>
                            <div className="pro-card-formula">P = 2(a + b)</div>
                        </div>
                    </div>

                    {/* Collapsible Sections Container */}
                    <div className="pro-sections-container">

                        {/* =========================================== */}
                        {/* O'LCHOVLAR BO'LIMI */}
                        {/* =========================================== */}
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
                                            <span className="measure-value"><AnimatedNumber value={Number(calculations.diagonal)} decimals={2} /> {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Yarim perimetr */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">½ Yarim perimetr</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">p</span>
                                            <span className="measure-value"><AnimatedNumber value={Number(calculations.semiPerimeter)} decimals={2} /> {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Diagonal burchaklari */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">∠ Diagonal burchaklari</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">α</span>
                                            <span className="measure-value"><AnimatedNumber value={Number(calculations.diagonalAngle)} decimals={1} />°</span>
                                        </div>
                                        <div className="pro-measure-item">
                                            <span className="measure-label">β</span>
                                            <span className="measure-value"><AnimatedNumber value={Number(calculations.diagonalAngle2)} decimals={1} />°</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Aylana radiuslari */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">◎ Aylana radiuslari</h4>
                                    <div className="pro-circles-grid">
                                        <div className="pro-circle-card incircle" onClick={() => setResultModal('incircle')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◎</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Ichki</span>
                                                <span className="circle-value">{calculations.isSquare ? <AnimatedNumber value={Number(calculations.incircleRadius)} decimals={2} /> : '—'} {calculations.isSquare ? unitSymbol : ''}</span>
                                            </div>
                                        </div>
                                        <div className="pro-circle-card circumcircle" onClick={() => setResultModal('circumcircle')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◯</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Tashqi</span>
                                                <span className="circle-value"><AnimatedNumber value={Number(calculations.circumcircleRadius)} decimals={2} /> {unitSymbol}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tomonlar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📏 Tomonlar</h4>
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

                        {/* =========================================== */}
                        {/* FORMULALAR BO'LIMI */}
                        {/* =========================================== */}
                        <details className="pro-section formulas-section">
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">🧮</div>
                                <span className="pro-section-title">Formulalar</span>
                                <span className="pro-section-badge">4 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">?? Yuza</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>S = a × b</code><span>Asosiy</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">?? Perimetr</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>P = 2(a + b)</code><span>Asosiy</span></div>
                                        <div className="pro-formula-item"><code>P = 2a + 2b</code><span>Ochiq</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">? Diagonal</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>d = √(a² + b²)</code><span>Pifagor</span></div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* =========================================== */}
                        {/* QOIDALAR BO'LIMI */}
                        {/* =========================================== */}
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
                    backdropFilter: 'blur(5px)',
                    animation: modalClosing ? 'ntgModalOverlayOut 0.26s ease-in forwards' : 'ntgModalOverlayIn 0.22s ease-out'
                }} onClick={closeResultModal}>
                    {/* Modal ochilish/yopilish animatsiyasi (fon — fade, karta — pastdan kichikdan ochiladi/yopiladi) */}
                    <style>{`
                        @keyframes ntgModalOverlayIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes ntgModalOverlayOut { from { opacity: 1; } to { opacity: 0; } }
                        @keyframes ntgModalPopIn {
                            from { opacity: 0; transform: translateY(18px) scale(0.9); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        @keyframes ntgModalPopOut {
                            from { opacity: 1; transform: translateY(0) scale(1); }
                            to { opacity: 0; transform: translateY(18px) scale(0.9); }
                        }
                    `}</style>
                    <div style={{
                        backgroundColor: '#1e1e24',
                        padding: '30px',
                        borderRadius: '20px',
                        maxWidth: '600px',
                        width: '90%',
                        border: '1px solid #2a2a35',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        animation: modalClosing ? 'ntgModalPopOut 0.26s cubic-bezier(0.4, 0, 1, 1) forwards' : 'ntgModalPopIn 0.34s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={closeResultModal}
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
                                    <span style={{ fontSize: '28px' }}>▦</span>
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
                                        <div>d = v{(width * width + height * height).toFixed(2)}</div>
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

            {/* 3D'ga ko'tarish modali */}
            {show3D && (
                <Prism3DModal
                    a={width}
                    b={height}
                    h={depth}
                    unitSymbol={unitSymbol}
                    setDepth={(v) => setDepth(Math.max(1, Math.min(50, v)))}
                    onClose={() => setShow3D(false)}
                />
            )}

            {/* Solishtirish modali */}
            {showCompare && (
                <CompareModal
                    a1={width}
                    b1={height}
                    w2={compareW}
                    h2={compareH}
                    setW2={setCompareW}
                    setH2={setCompareH}
                    unitSymbol={unitSymbol}
                    onClose={() => setShowCompare(false)}
                />
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

