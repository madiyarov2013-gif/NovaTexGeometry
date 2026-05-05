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
    primary: '#14b8a6',
    secondary: '#10b981',
    accent: '#f59e0b',
    purple: '#8b5cf6'
};

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Fullscreen Rhombus komponenti
function FullscreenRhombus({ diagonal1, diagonal2, side, unitSymbol, isValid, onClose, onSizeChange }) {
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
    const [rhombusFillColor, setRhombusFillColor] = useState('gradient');

    useEffect(() => {
        const updateSize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const rhombusData = useMemo(() => {
        if (!isValid) return null;
        const width = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = width / 2;
        const centerY = cHeight / 2;
        const maxDim = Math.max(diagonal1, diagonal2);
        const rScale = Math.min(width * 0.4, cHeight * 0.4) / maxDim;

        const d1Scaled = diagonal1 * rScale;
        const d2Scaled = diagonal2 * rScale;

        return {
            points: [
                { x: centerX, y: centerY - d1Scaled / 2, label: 'A' },
                { x: centerX + d2Scaled / 2, y: centerY, label: 'B' },
                { x: centerX, y: centerY + d1Scaled / 2, label: 'C' },
                { x: centerX - d2Scaled / 2, y: centerY, label: 'D' }
            ],
            rScale
        };
    }, [diagonal1, diagonal2, isValid, canvasSize]);

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

        if (isValid && rhombusData) {
            const { points } = rhombusData;

            ctx.shadowColor = 'rgba(20, 184, 166, 0.5)';
            ctx.shadowBlur = 40 / scale;

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.closePath();

            if (rhombusFillColor === 'gradient') {
                const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
                gradient.addColorStop(0, 'rgba(20, 184, 166, 0.35)');
                gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.3)');
                gradient.addColorStop(1, 'rgba(20, 184, 166, 0.35)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = rhombusFillColor + '80';
            }
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 4 / scale;
            ctx.stroke();

            // Diagonals
            ctx.setLineDash([8 / scale, 4 / scale]);
            ctx.strokeStyle = COLORS.purple;
            ctx.lineWidth = 2.5 / scale;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.stroke();
            ctx.strokeStyle = COLORS.accent;
            ctx.beginPath();
            ctx.moveTo(points[1].x, points[1].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Labels
            const labels = ['A', 'B', 'C', 'D'];
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 18 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(20, 184, 166, 0.5)';
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
                if (i === 0) { ly -= 40 / scale; }
                else if (i === 1) { lx += 40 / scale; }
                else if (i === 2) { ly += 40 / scale; }
                else { lx -= 40 / scale; }

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

            // Side and diagonal labels
            const centerX = (points[0].x + points[2].x) / 2;
            const centerY = (points[0].y + points[2].y) / 2;

            // Side label
            const sideMidX = (points[0].x + points[1].x) / 2 + 30 / scale;
            const sideMidY = (points[0].y + points[1].y) / 2;
            ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
            ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
            const sideLabel = `a = ${side} ${unitSymbol}`;
            const textWidth = ctx.measureText(sideLabel).width + 24 / scale;
            ctx.beginPath();
            ctx.roundRect(sideMidX - textWidth / 2, sideMidY - 16 / scale, textWidth, 32 / scale, 8 / scale);
            ctx.fill();
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
            ctx.fillStyle = COLORS.primary;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sideLabel, sideMidX, sideMidY);
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
    }, [scale, offset, diagonal1, diagonal2, side, isValid, canvasSize, rhombusData, drawings, currentPath, penColor, penSize, unitSymbol, rhombusFillColor]);

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

            if (isLocked && rhombusData) {
                const hitRadius = 20 / scale;
                const clickedVertexIndex = rhombusData.points.findIndex(p => {
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
        } else if (draggingVertex !== null && rhombusData && onSizeChange) {
            // Uchburchakdagi kabi - coords yangi cho'qqi joylashuvi
            const ts = rhombusData.rScale;
            const p = rhombusData.points;

            // Calculate new vertex positions
            // Points: A(top), B(right), C(bottom), D(left)
            const p0 = draggingVertex === 0 ? coords : p[0]; // A (top)
            const p1 = draggingVertex === 1 ? coords : p[1]; // B (right)  
            const p2 = draggingVertex === 2 ? coords : p[2]; // C (bottom)
            const p3 = draggingVertex === 3 ? coords : p[3]; // D (left)

            // Distance function
            const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / ts;

            // Romb diagonals:
            // d1 = AC distance (vertical diagonal from top to bottom)
            // d2 = BD distance (horizontal diagonal from right to left)
            const newDiagonal1 = dist(p0, p2);
            const newDiagonal2 = dist(p1, p3);

            // Round values
            const roundedD1 = Math.round(newDiagonal1 * 10) / 10;
            const roundedD2 = Math.round(newDiagonal2 * 10) / 10;

            // Silent validation
            if (roundedD1 < 0.5 || roundedD1 > 50 || roundedD2 < 0.5 || roundedD2 > 50) {
                return;
            }

            onSizeChange({ diagonal1: roundedD1, diagonal2: roundedD2 });
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
                <div className="toolbar-section fill-section">
                    <span className="fill-label">Romb:</span>
                    <div className="fill-buttons">
                        <button className={`fill-btn ${rhombusFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setRhombusFillColor('gradient')} title="Gradient">
                            <span className="gradient-preview"></span>
                        </button>
                        {COLOR_PALETTE.slice(0, 5).map(color => (
                            <button key={`fill-${color}`} className={`fill-btn ${rhombusFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setRhombusFillColor(color)} title={`Bo'yash: ${color}`} />
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

// Romb Canvas komponenti
function RombCanvas({ side, diagonal1, diagonal2, showGrid, showDiagonals, showAngles, showSides, showLabels, showCenter, showSymmetry, isValid }) {
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
            ctx.fillText('⚠️ Romb hosil bo\'lmaydi!', width / 2, cHeight / 2);
            return;
        }

        const centerX = width / 2;
        const centerY = cHeight / 2;
        const maxDim = Math.max(diagonal1, diagonal2);
        const scale = Math.min(width * 0.6, cHeight * 0.5) / maxDim;

        const d1Scaled = diagonal1 * scale;
        const d2Scaled = diagonal2 * scale;

        // Romb nuqtalari (diagonallar bo'ylab)
        const points = [
            { x: centerX, y: centerY - d2Scaled / 2, label: 'A' },      // Yuqori
            { x: centerX + d1Scaled / 2, y: centerY, label: 'B' },      // O'ng
            { x: centerX, y: centerY + d2Scaled / 2, label: 'C' },      // Pastki
            { x: centerX - d1Scaled / 2, y: centerY, label: 'D' }       // Chap
        ];

        ctx.shadowColor = 'rgba(20, 184, 166, 0.3)';
        ctx.shadowBlur = 30;

        const gradient = ctx.createLinearGradient(points[3].x, points[0].y, points[1].x, points[2].y);
        gradient.addColorStop(0, 'rgba(20, 184, 166, 0.25)');
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
        gradient.addColorStop(1, 'rgba(20, 184, 166, 0.25)');

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

        // Diagonallarni ko'rsatish
        if (showDiagonals) {
            ctx.setLineDash([6, 3]);
            ctx.strokeStyle = COLORS.purple;
            ctx.lineWidth = 2;
            // d1 - gorizontal diagonal
            ctx.beginPath();
            ctx.moveTo(points[3].x, points[3].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.stroke();
            // d2 - vertikal diagonal
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Diagonal labellar
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.font = 'bold 11px Inter, sans-serif';

            // d1 label
            ctx.beginPath();
            ctx.roundRect(centerX + d1Scaled / 4, centerY - 25, 30, 20, 4);
            ctx.fill();
            ctx.strokeStyle = COLORS.purple;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = COLORS.purple;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`d₁`, centerX + d1Scaled / 4 + 15, centerY - 15);

            // d2 label
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(centerX + 10, centerY - d2Scaled / 4 - 10, 30, 20, 4);
            ctx.fill();
            ctx.strokeStyle = COLORS.accent;
            ctx.stroke();
            ctx.fillStyle = COLORS.accent;
            ctx.fillText(`d₂`, centerX + 25, centerY - d2Scaled / 4);
        }

        // Burchaklarni ko'rsatish
        if (showAngles) {
            const arcRadius = 25;
            // Hisoblash: sin(α/2) = (d2/2) / a, cos(α/2) = (d1/2) / a
            const halfD1 = diagonal1 / 2;
            const halfD2 = diagonal2 / 2;
            const acuteAngle = 2 * Math.atan2(halfD2, halfD1) * (180 / Math.PI);
            const obtuseAngle = 180 - acuteAngle;

            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;

            // Yuqori burchak (o'tkir)
            ctx.beginPath();
            ctx.arc(points[0].x, points[0].y, arcRadius, Math.PI / 2 - 0.4, Math.PI / 2 + 0.4);
            ctx.stroke();
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.fillText(`${acuteAngle.toFixed(0)}°`, points[0].x + 5, points[0].y + 40);

            // O'ng burchak (o'tmas)
            ctx.beginPath();
            ctx.arc(points[1].x, points[1].y, arcRadius, Math.PI - 0.4, Math.PI + 0.4);
            ctx.stroke();
            ctx.fillText(`${obtuseAngle.toFixed(0)}°`, points[1].x - 45, points[1].y + 5);
        }

        // Tomonlarni ko'rsatish
        if (showSides) {
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // a tomoni (yuqori o'ng)
            const midTop = {
                x: (points[0].x + points[1].x) / 2 + 15,
                y: (points[0].y + points[1].y) / 2 - 15
            };
            ctx.beginPath();
            ctx.roundRect(midTop.x - 15, midTop.y - 10, 35, 20, 4);
            ctx.fill();
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = COLORS.primary;
            ctx.fillText(`a=${side}`, midTop.x + 2, midTop.y);
        }

        // Markaz nuqtani ko'rsatish
        if (showCenter) {
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

        // Simmetriya o'qlari (rombda 2 ta simmetriya o'qi bor - diagonallar bo'ylab)
        if (showSymmetry) {
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;

            // Gorizontal simmetriya o'qi
            ctx.beginPath();
            ctx.moveTo(centerX - d1Scaled / 2 - 20, centerY);
            ctx.lineTo(centerX + d1Scaled / 2 + 20, centerY);
            ctx.stroke();

            // Vertikal simmetriya o'qi
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - d2Scaled / 2 - 20);
            ctx.lineTo(centerX, centerY + d2Scaled / 2 + 20);
            ctx.stroke();

            ctx.setLineDash([]);
        }

        // Vertex nuqtalar va labellar
        if (showLabels) {
            const labels = ['A', 'B', 'C', 'D'];
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(20, 184, 166, 0.3)';
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
                if (i === 0) { lx += 15; ly -= 15; }      // A - yuqori
                else if (i === 1) { lx += 20; ly += 5; }   // B - o'ng
                else if (i === 2) { lx += 15; ly += 20; }  // C - pastki
                else { lx -= 30; ly += 5; }                 // D - chap

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

    }, [side, diagonal1, diagonal2, showGrid, showDiagonals, showAngles, showSides, showLabels, showCenter, showSymmetry, isValid]);

    return <canvas ref={canvasRef} width={700} height={550} className="triangle-canvas" />;
}

export function RombPage() {
    const [diagonal1, setDiagonal1] = useState(12);
    const [diagonal2, setDiagonal2] = useState(8);
    const [unit, setUnit] = useState('sm');

    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setDiagonal1(prev => Math.round(prev * ratio * 100) / 100);
        setDiagonal2(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };

    const [showGrid, setShowGrid] = useState(true);
    const [showDiagonals, setShowDiagonals] = useState(true);
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
        const d1 = diagonal1;
        const d2 = diagonal2;

        // Romb tomoni: a = √((d1/2)² + (d2/2)²)
        const side = Math.sqrt(Math.pow(d1 / 2, 2) + Math.pow(d2 / 2, 2));

        // Yuza: S = (d1 × d2) / 2
        const area = (d1 * d2) / 2;

        // Perimetr: P = 4a
        const perimeter = 4 * side;

        // Burchaklar
        const halfD1 = d1 / 2;
        const halfD2 = d2 / 2;
        const acuteAngle = 2 * Math.atan2(halfD2, halfD1) * (180 / Math.PI);
        const obtuseAngle = 180 - acuteAngle;

        // Ichki doira radiusi: r = (d1 × d2) / (4a)
        const inradius = (d1 * d2) / (4 * side);

        const isValid = d1 > 0 && d2 > 0;

        return {
            side: side.toFixed(2),
            area: area.toFixed(2),
            perimeter: perimeter.toFixed(2),
            acuteAngle: acuteAngle.toFixed(1),
            obtuseAngle: obtuseAngle.toFixed(1),
            inradius: inradius.toFixed(2),
            isValid
        };
    }, [diagonal1, diagonal2]);

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
                <FullscreenRhombus
                    diagonal1={diagonal1}
                    diagonal2={diagonal2}
                    side={calculations.side}
                    unitSymbol={unitSymbol}
                    isValid={calculations.isValid}
                    onClose={exitFullscreen}
                    onSizeChange={({ diagonal1: newD1, diagonal2: newD2 }) => {
                        setDiagonal1(newD1);
                        setDiagonal2(newD2);
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
                            <span className="icon-glow" style={{ color: COLORS.primary }}>◇</span>
                        </div>
                        <div className="pro-header-text">
                            <h1>Romb</h1>
                            <p>Barcha tomonlari teng parallelogramm</p>
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

                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">Diagonallar</span>
                                <span className="pro-section-badge">2 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>d1</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Katta diagonal</span>
                                                <span className="pro-side-desc">AC diagonali</span>
                                            </div>
                                            <div className="pro-side-value">{diagonal1} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="2" max="20" step="0.5" value={diagonal1} onChange={(e) => setDiagonal1(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#8b5cf6' }} />
                                        </div>
                                    </div>

                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>d2</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Kichik diagonal</span>
                                                <span className="pro-side-desc">BD diagonali</span>
                                            </div>
                                            <div className="pro-side-value">{diagonal2} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="2" max="15" step="0.5" value={diagonal2} onChange={(e) => setDiagonal2(parseFloat(e.target.value))} className="pro-range" style={{ '--range-color': '#f59e0b' }} />
                                        </div>
                                    </div>

                                    <div className="pro-side-item" style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(16, 185, 129, 0.08))', border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: '12px', padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <div style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', flexShrink: 0, fontSize: '14px' }}>a</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0' }}>Tomon (hisoblangan)</div>
                                                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Diagonallardan hisoblanadi</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <div style={{ color: COLORS.primary, padding: '6px 16px', background: 'rgba(20, 184, 166, 0.2)', border: '1px solid rgba(20, 184, 166, 0.4)', borderRadius: '20px', fontWeight: 700, fontSize: '1rem' }}>{calculations.side} {unitSymbol}</div>
                                        </div>
                                    </div>

                                    {!calculations.isValid && (
                                        <div className="pro-error-box">
                                            <div className="error-icon-wrap">⚠️</div>
                                            <div className="error-text">
                                                <strong>Romb hosil bo'lmaydi!</strong>
                                                <p>Diagonallar musbat bo'lishi kerak</p>
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
                                <span className="pro-section-badge">{[showGrid, showDiagonals, showAngles, showSides, showLabels, showCenter, showSymmetry].filter(Boolean).length}/7</span>
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
                                        <button className={`pro-toggle-item ${showDiagonals ? 'active' : ''}`} onClick={() => setShowDiagonals(!showDiagonals)}>
                                            <span className="toggle-icon">⟋</span>
                                            <span className="toggle-label">Diagonallar</span>
                                            <span className={`toggle-status ${showDiagonals ? 'on' : 'off'}`}>{showDiagonals ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">✨ Qo'shimcha</h4>
                                    <div className="pro-toggle-grid-settings">
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
                    <RombCanvas
                        side={parseFloat(calculations.side)}
                        diagonal1={diagonal1}
                        diagonal2={diagonal2}
                        showGrid={showGrid}
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
                                <span className="badge-icon">◇</span>
                                Romb
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
                            <div className="pro-card-formula">S = (d₁ × d₂) / 2</div>
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
                            <div className="pro-card-formula">P = 4a</div>
                        </div>
                    </div>

                    <div className="pro-sections-container">
                        <details className="pro-section measurements-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchovlar</span>
                                <span className="pro-section-badge">5 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📐 Tomon va Diagonallar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('side')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">a (tomon)</span>
                                            <span className="measure-value">{calculations.side} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item">
                                            <span className="measure-label">d₁</span>
                                            <span className="measure-value">{diagonal1} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item">
                                            <span className="measure-label">d₂</span>
                                            <span className="measure-value">{diagonal2} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">∠ Burchaklar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item">
                                            <span className="measure-label">α (o'tkir)</span>
                                            <span className="measure-value">{calculations.acuteAngle}°</span>
                                        </div>
                                        <div className="pro-measure-item">
                                            <span className="measure-label">β (o'tmas)</span>
                                            <span className="measure-value">{calculations.obtuseAngle}°</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⊙ Ichki doira</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('inradius')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">r (radius)</span>
                                            <span className="measure-value">{calculations.inradius} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <details className="pro-section formulas-section">
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📚</div>
                                <span className="pro-section-title">Formulalar</span>
                                <span className="pro-section-badge">6 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📐 Asosiy</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>S = (d₁ × d₂) / 2</code><span>Yuza</span></div>
                                        <div className="pro-formula-item"><code>P = 4a</code><span>Perimetr</span></div>
                                        <div className="pro-formula-item"><code>a = √((d₁/2)² + (d₂/2)²)</code><span>Tomon</span></div>
                                    </div>
                                </div>
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">⊙ Ichki doira</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>r = (d₁ × d₂) / (4a)</code><span>Radius</span></div>
                                        <div className="pro-formula-item"><code>r = S / (2a)</code><span>Radius (alt)</span></div>
                                    </div>
                                </div>
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">∠ Burchaklar</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>α + β = 180°</code><span>Yonma-yon</span></div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <div className="pro-section rules-section" onClick={() => setShowRulesModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="pro-section-header">
                                <div className="pro-section-icon">📖</div>
                                <span className="pro-section-title">Qoidalar</span>
                                <span className="pro-section-badge">6 ta</span>
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
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#14b8a6' }}>📐 Yuzasini hisoblash</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>S = (d₁ × d₂) / 2</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>S = ({diagonal1} × {diagonal2}) / 2</div>
                                        <div>S = {diagonal1 * diagonal2} / 2</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#14b8a6', marginTop: '10px' }}>S = {calculations.area} {unitSymbol}²</div>
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
                                        <div>P = 4a</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>a = √((d₁/2)² + (d₂/2)²)</div>
                                        <div>a = √(({diagonal1}/2)² + ({diagonal2}/2)²)</div>
                                        <div>a = √({(diagonal1 / 2).toFixed(2)}² + {(diagonal2 / 2).toFixed(2)}²)</div>
                                        <div>a = {calculations.side} {unitSymbol}</div>
                                        <div style={{ marginTop: '10px' }}>P = 4 × {calculations.side}</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', marginTop: '10px' }}>P = {calculations.perimeter} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'side' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#14b8a6' }}>📐 Tomonni hisoblash</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>a = √((d₁/2)² + (d₂/2)²)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>a = √(({diagonal1}/2)² + ({diagonal2}/2)²)</div>
                                        <div>a = √({(diagonal1 / 2).toFixed(2)}² + {(diagonal2 / 2).toFixed(2)}²)</div>
                                        <div>a = √({Math.pow(diagonal1 / 2, 2).toFixed(2)} + {Math.pow(diagonal2 / 2, 2).toFixed(2)})</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#14b8a6', marginTop: '10px' }}>a = {calculations.side} {unitSymbol}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {resultModal === 'inradius' && (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981' }}>⊙ Ichki doira radiusi</h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Formula:</div>
                                        <div>r = (d₁ × d₂) / (4a)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Hisoblash:</div>
                                        <div>r = ({diagonal1} × {diagonal2}) / (4 × {calculations.side})</div>
                                        <div>r = {diagonal1 * diagonal2} / {(4 * parseFloat(calculations.side)).toFixed(2)}</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '10px' }}>r = {calculations.inradius} {unitSymbol}</div>
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
                        <h3 style={{ fontSize: '28px', marginBottom: '25px', color: '#14b8a6' }}>📖 Romb qoidalari</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { num: 1, title: "Ta'rifi", desc: "Barcha tomonlari teng bo'lgan parallelogramm", color: '#14b8a6' },
                                { num: 2, title: "Tomonlar", desc: "Barcha 4 ta tomon o'zaro teng: AB = BC = CD = DA", color: '#22d3ee' },
                                { num: 3, title: "Diagonallar", desc: "Diagonallar bir-birini perpendikulyar ravishda yarimlab kesadi", color: '#f59e0b' },
                                { num: 4, title: "Burchaklar", desc: "Qarama-qarshi burchaklar teng, yonma-yon burchaklar yig'indisi 180°", color: '#8b5cf6' },
                                { num: 5, title: "Simmetriya", desc: "2 ta simmetriya o'qi mavjud (diagonallar bo'ylab)", color: '#ec4899' },
                                { num: 6, title: "Ichki doira", desc: "Rombga ichki doira chizish mumkin, r = S / (2a)", color: '#10b981' }
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
