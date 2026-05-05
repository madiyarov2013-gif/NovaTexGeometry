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
    primary: '#f59e0b', // Orange for circle
    secondary: '#10b981',
    accent: '#8b5cf6',
    danger: '#ef4444',
    indigo: '#6366f1'
};

// Rang palitasi
const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Canvas komponenti - Doira uchun
function CircleCanvas({
    radius, unitSymbol, showGrid, showCenter, showRadius,
    showDiameter, showDimensions, showSectors, showChord
}) {
    const canvasRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 600, height: 500 });
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    setCanvasSize({ width: parent.clientWidth, height: parent.clientHeight });
                }
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
        const cWidth = canvas.width;
        const cHeight = canvas.height;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, cWidth, cHeight);

        ctx.save();
        ctx.translate(cWidth / 2, cHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);

        // Grid
        if (showGrid) {
            const gridSize = 30;
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 0.5;
            for (let x = 0; x < cWidth; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, cHeight);
                ctx.stroke();
            }
            for (let y = 0; y < cHeight; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(cWidth, y);
                ctx.stroke();
            }
        }

        // Calculate circle position
        const centerX = cWidth / 2;
        const centerY = cHeight / 2;
        // Auto-scale to fit canvas
        const maxRadius = Math.min(cWidth, cHeight) * 0.35;
        const rScaled = (radius > 0) ? (maxRadius * (radius / radius)) : maxRadius; // Just maxRadius basically, but we might want zoom

        // Actually, we want the circle to be visible.
        // If we use static scale, big units make it huge.
        // Let's scale based on radius:
        const fitScale = maxRadius / (radius || 1);
        const drawRadius = radius * fitScale;

        // Shadow
        ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        ctx.shadowBlur = 30;

        // Fill circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, drawRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, drawRadius);
        gradient.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
        gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Sectors
        if (showSectors) {
            ctx.setLineDash([8, 4]);
            ctx.strokeStyle = '#ec489980';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + drawRadius * Math.cos(angle), centerY + drawRadius * Math.sin(angle));
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // Chord
        if (showChord) {
            const chordAngle1 = Math.PI / 6;
            const chordAngle2 = (5 * Math.PI) / 6;
            const x1 = centerX + drawRadius * Math.cos(chordAngle1);
            const y1 = centerY + drawRadius * Math.sin(chordAngle1);
            const x2 = centerX + drawRadius * Math.cos(chordAngle2);
            const y2 = centerY + drawRadius * Math.sin(chordAngle2);

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Chord label
            const chordLength = 2 * radius * Math.sin((chordAngle2 - chordAngle1) / 2);
            ctx.fillStyle = '#10b981';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`vatar = ${chordLength.toFixed(2)} ${unitSymbol}`, (x1 + x2) / 2, (y1 + y2) / 2 + 20);
        }

        // Radius line
        if (showRadius) {
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + drawRadius, centerY);
            ctx.stroke();

            // Arrow at end
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.moveTo(centerX + drawRadius, centerY);
            ctx.lineTo(centerX + drawRadius - 8, centerY - 4);
            ctx.lineTo(centerX + drawRadius - 8, centerY + 4);
            ctx.closePath();
            ctx.fill();
        }

        // Diameter line
        if (showDiameter) {
            ctx.setLineDash([8, 4]);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - drawRadius, centerY);
            ctx.lineTo(centerX + drawRadius, centerY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Center point
        if (showCenter) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Center label o'chirildi - faqat nuqta ko'rsatiladi
        }

        // Dimension labels
        if (showDimensions) {
            const rLabel = `r = ${radius} ${unitSymbol}`;
            const dLabel = `d = ${radius * 2} ${unitSymbol}`;

            // Radius label
            if (showRadius) {
                const rMidX = centerX + drawRadius / 2;
                const rMidY = centerY - 20;
                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.font = 'bold 12px Inter, sans-serif';
                const rWidth = ctx.measureText(rLabel).width + 20;
                ctx.beginPath();
                ctx.roundRect(rMidX - rWidth / 2, rMidY - 14, rWidth, 28, 6);
                ctx.fill();
                ctx.strokeStyle = '#8b5cf6';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#8b5cf6';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(rLabel, rMidX, rMidY);
            }

            // Diameter label
            if (showDiameter) {
                const dMidY = centerY + 30;
                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.font = 'bold 12px Inter, sans-serif';
                const dWidth = ctx.measureText(dLabel).width + 20;
                ctx.beginPath();
                ctx.roundRect(centerX - dWidth / 2, dMidY - 14, dWidth, 28, 6);
                ctx.fill();
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#3b82f6';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dLabel, centerX, dMidY);
            }
        }

        ctx.restore();

    }, [radius, unitSymbol, showGrid, showCenter, showRadius, showDiameter, showDimensions, showSectors, showChord, scale, offset, canvasSize]);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(s => Math.max(0.5, Math.min(3, s * delta)));
    };

    return (
        <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onWheel={handleWheel}
            style={{ display: 'block', width: '100%', height: '100%' }}
        />
    );
}

// Professional Fullscreen Whiteboard - Doira uchun
function FullscreenCircleWhiteboard({ radius, unitSymbol, onClose, onSizeChange }) {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const containerRef = useRef(null);

    // Zoom va Pan
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLocked, setIsLocked] = useState(false);
    const [draggingEdge, setDraggingEdge] = useState(false);
    const [lastPinchDistance, setLastPinchDistance] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

    // Chizish vositalari
    const [activeTool, setActiveTool] = useState('view');
    const [drawings, setDrawings] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [penColor, setPenColor] = useState('#ffffff');
    const [penSize, setPenSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(20);
    const [circleFillColor, setCircleFillColor] = useState('gradient');
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);

    const GRID_SIZE = 40;

    useEffect(() => {
        const updateSize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const circleData = useMemo(() => {
        const cWidth = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = cWidth / 2;
        const centerY = cHeight / 2;
        const r = radius || 5;

        // Auto-scale
        const maxRadius = Math.min(cWidth, cHeight) * 0.35;
        const rScaled = maxRadius; // Fixed visual size, label changes
        const baseScale = maxRadius / r;

        return {
            centerX,
            centerY,
            rScaled,
            baseScale,
            radius: r
        };
    }, [radius, canvasSize]);

    // Canvas chizish
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
        ctx.strokeStyle = '#1a1a24';
        ctx.lineWidth = 0.5 / scale;
        for (let x = 0; x < cWidth; x += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cHeight); ctx.stroke();
        }
        for (let y = 0; y < cHeight; y += GRID_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cWidth, y); ctx.stroke();
        }

        if (circleData) {
            const { centerX, centerY, rScaled } = circleData;

            // Shadow va fill
            ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
            ctx.shadowBlur = 40 / scale;
            ctx.beginPath();
            ctx.arc(centerX, centerY, rScaled, 0, Math.PI * 2);

            if (circleFillColor === 'gradient') {
                const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, rScaled);
                gradient.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
                gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
                gradient.addColorStop(1, 'rgba(245, 158, 11, 0.35)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = circleFillColor + '80';
            }
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4 / scale;
            ctx.stroke();

            // Radius line
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + rScaled, centerY);
            ctx.stroke();

            // Diameter line
            ctx.setLineDash([8 / scale, 4 / scale]);
            ctx.strokeStyle = '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(centerX - rScaled, centerY);
            ctx.lineTo(centerX + rScaled, centerY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Center point
            ctx.beginPath();
            ctx.arc(centerX, centerY, 10 / scale, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5 / scale, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Edge dragging point (when locked)
            if (isLocked) {
                ctx.beginPath();
                ctx.arc(centerX + rScaled, centerY, 15 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(centerX + rScaled, centerY, 10 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#8b5cf6';
                ctx.fill();
            }

            // Dimension label - radius qiymati
            const rLabel = `r = ${circleData.radius.toFixed(1)} ${unitSymbol}`;
            ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
            const rMidX = centerX + rScaled / 2;
            const rMidY = centerY - 25 / scale;
            const rWidth = ctx.measureText(rLabel).width + 24 / scale;
            ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
            ctx.beginPath();
            ctx.roundRect(rMidX - rWidth / 2, rMidY - 16 / scale, rWidth, 32 / scale, 8 / scale);
            ctx.fill();
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
            ctx.fillStyle = '#8b5cf6';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rLabel, rMidX, rMidY);
        }
        ctx.restore();
    }, [scale, offset, radius, canvasSize, circleData, unitSymbol, circleFillColor, isLocked]);

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

        drawings.forEach(d => {
            if (d.points.length < 2) return;
            if (d.isEraser) { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = (d.size || 20) / scale; }
            else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = d.color; ctx.lineWidth = d.size / scale; }
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(d.points[0].x, d.points[0].y);
            d.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        });

        if (currentPath.length > 1) {
            if (activeTool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = eraserSize / scale; }
            else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = penColor; ctx.lineWidth = penSize / scale; }
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
        ctx.restore();
    }, [drawings, currentPath, scale, offset, penColor, penSize, eraserSize, activeTool]);

    // Touch/Mouse koordinatalari
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches?.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else if (e.changedTouches?.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
        else { clientX = e.clientX; clientY = e.clientY; }
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return { x: (x - canvas.width / 2) / scale + canvas.width / 2 - offset.x, y: (y - canvas.height / 2) / scale + canvas.height / 2 - offset.y };
    };

    const getClientCoords = (e) => {
        if (e.touches?.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches?.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
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
            const coords = getCanvasCoords(e);
            setCurrentPath([coords]);
        } else if (activeTool === 'view') {
            const coords = getCanvasCoords(e);

            if (isLocked && circleData) {
                // Check if clicking on edge point
                const edgeX = circleData.centerX + circleData.rScaled;
                const edgeY = circleData.centerY;
                const dist = Math.sqrt((edgeX - coords.x) ** 2 + (edgeY - coords.y) ** 2);
                if (dist <= 80) {
                    setDraggingEdge(true);
                    return;
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
        } else if (draggingEdge && circleData) {
            // Markazdan kursorga masofa
            const { centerX, centerY, baseScale } = circleData;
            const dx = coords.x - centerX;
            const dy = coords.y - centerY;
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);

            // Formula: radius = distFromCenter / baseScale
            let newRadius = distFromCenter / baseScale;

            // 1 o'nlikgacha yaxlitlash
            newRadius = Math.round(newRadius * 10) / 10;

            // Chegaralar: 1 dan 50 gacha
            if (newRadius > 50) newRadius = 50;
            if (newRadius < 1) newRadius = 1;

            onSizeChange(newRadius);
        } else if (isDragging && !isLocked) {
            const client = getClientCoords(e);
            setOffset({ x: client.x - dragStart.x, y: client.y - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentPath.length > 1) {
            setDrawings(prev => [...prev, { points: currentPath, color: penColor, size: activeTool === 'eraser' ? eraserSize : penSize, isEraser: activeTool === 'eraser' }]);
        }
        setIsDrawing(false); setDraggingEdge(false); setCurrentPath([]); setIsDragging(false); setLastPinchDistance(null);
    };

    const handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches.length === 2) { setLastPinchDistance(getPinchDistance(e)); return; }
        handleMouseDown(e);
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && !isLocked) {
            const distance = getPinchDistance(e);
            if (lastPinchDistance !== null && distance !== null) {
                setScale(s => Math.max(0.3, Math.min(5, s * (distance / lastPinchDistance))));
                setLastPinchDistance(distance);
            }
            return;
        }
        handleMouseMove(e);
    };

    const handleWheel = (e) => { if (isLocked) return; e.preventDefault(); setScale(s => Math.max(0.3, Math.min(5, s * (e.deltaY > 0 ? 0.9 : 1.1)))); };

    const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };
    const clearDrawings = () => { setDrawings([]); setCurrentPath([]); };
    const resetToInitial = () => { setScale(1); setOffset({ x: 0, y: 0 }); setActiveTool('view'); setIsLocked(false); setDrawings([]); setCurrentPath([]); setPenColor('#ffffff'); setPenSize(3); setCircleFillColor('gradient'); setIsToolbarOpen(false); };

    return (
        <div className="fullscreen-whiteboard" ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
            <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="whiteboard-main-canvas"
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp} onTouchCancel={handleMouseUp}
                onWheel={handleWheel} style={{ cursor: activeTool === 'pen' || activeTool === 'eraser' ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'), touchAction: 'none' }} />

            <canvas ref={drawingCanvasRef} width={canvasSize.width} height={canvasSize.height} className="whiteboard-drawing-canvas"
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp} onTouchCancel={handleMouseUp}
                onWheel={handleWheel} style={{ cursor: activeTool === 'pen' || activeTool === 'eraser' ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'), pointerEvents: activeTool === 'pen' || activeTool === 'eraser' ? 'auto' : 'none', touchAction: 'none' }} />

            <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
                <span className="toast-icon">🔓</span><span className="toast-message">{toast.message}</span>
            </div>

            {/* Toolbar Toggle */}
            <button className={`toolbar-toggle-btn ${isToolbarOpen ? 'open' : ''}`} onClick={() => setIsToolbarOpen(!isToolbarOpen)} title={isToolbarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isToolbarOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>}
                </svg>
            </button>

            {/* Professional Toolbar */}
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
                    <button className={`toolbar-btn ${isLocked ? 'active locked' : ''}`} onClick={() => { setIsLocked(!isLocked); setToast({ show: true, message: isLocked ? 'Qulfdan chiqarildi' : "Qulflandi - chetni sudrab o'zgartiring" }); setTimeout(() => setToast({ show: false, message: '' }), 2000); }} title={isLocked ? 'Qulfni ochish' : 'Qulflash'}>
                        {isLocked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>}
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
                    <span className="fill-label">Doira:</span>
                    <div className="fill-buttons">
                        <button className={`fill-btn ${circleFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setCircleFillColor('gradient')} title="Gradient">
                            <span className="gradient-preview" style={{ background: 'radial-gradient(circle, #f59e0b, #f59e0b66)' }}></span>
                        </button>
                        {COLOR_PALETTE.slice(0, 5).map(color => (
                            <button key={`fill-${color}`} className={`fill-btn ${circleFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setCircleFillColor(color)} title={`Bo'yash: ${color}`} />
                        ))}
                    </div>
                </div>

                <div className="toolbar-divider" />

                <div className="whiteboard-actions">
                    <button className="whiteboard-action-btn clear-btn" onClick={clearDrawings} title="Chizmalarni tozalash">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                    <button className="whiteboard-action-btn refresh-btn" onClick={resetToInitial} title="Boshlang'ich holatga">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" /></svg>
                    </button>
                </div>
            </div>

            {isLocked && <div className="lock-indicator">🔒 Chetni sudrab radiusni o'zgartiring</div>}

            <button className="whiteboard-close-btn" onClick={onClose} title="Yopish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
            </button>
        </div>
    );
}

export function DoiraPage() {
    const [radius, setRadius] = useState(5);
    const [unit, setUnit] = useState('sm');
    const [showGrid, setShowGrid] = useState(true);
    const [showCenter, setShowCenter] = useState(true);
    const [showRadius, setShowRadius] = useState(true);
    const [showDiameter, setShowDiameter] = useState(true);
    const [showDimensions, setShowDimensions] = useState(false);
    const [showSectors, setShowSectors] = useState(false);
    const [showChord, setShowChord] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);

    const unitSymbol = UNITS[unit].symbol;

    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setRadius(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };

    // Calculations based on current radius and unit
    const calculations = useMemo(() => {
        const r = radius;
        const d = 2 * r;
        const circumference = 2 * Math.PI * r;
        const area = Math.PI * r * r;
        const semicircleArea = area / 2;
        const quadrantArea = area / 4;
        const arcLength90 = circumference / 4;

        return {
            radius: r.toFixed(2),
            diameter: d.toFixed(2),
            circumference: circumference.toFixed(2),
            area: area.toFixed(2),
            semicircleArea: semicircleArea.toFixed(2),
            quadrantArea: quadrantArea.toFixed(2),
            arcLength90: arcLength90.toFixed(2)
        };
    }, [radius]);

    const formulas = {
        area: {
            title: 'Yuza',
            formula: 'S = π × r²',
            steps: [
                `S = π × r²`,
                `S = π × ${radius}²`,
                `S = ${(Math.PI * radius * radius).toFixed(2)} ${unitSymbol}²`
            ],
            result: calculations.area,
            icon: '📐'
        },
        circumference: {
            title: 'Aylana uzunligi',
            formula: 'C = 2πr',
            steps: [
                `C = 2 × π × r`,
                `C = 2 × π × ${radius}`,
                `C = ${(2 * Math.PI * radius).toFixed(2)} ${unitSymbol}`
            ],
            result: calculations.circumference,
            icon: '⭕'
        },
        diameter: {
            title: 'Diametr',
            formula: 'd = 2r',
            steps: [
                `d = 2 × r`,
                `d = 2 × ${radius}`,
                `d = ${(2 * radius).toFixed(2)} ${unitSymbol}`
            ],
            result: calculations.diameter,
            icon: '↔️'
        },
        semicircleArea: {
            title: 'Yarim doira yuza',
            formula: 'S = πr² / 2',
            steps: [
                `S = π × r² / 2`,
                `S = π × ${radius}² / 2`,
                `S = ${(Math.PI * radius * radius / 2).toFixed(2)} ${unitSymbol}²`
            ],
            result: calculations.semicircleArea,
            icon: '🌓'
        },
        quadrantArea: {
            title: 'Chorak doira yuza',
            formula: 'S = πr² / 4',
            steps: [
                `S = π × r² / 4`,
                `S = π × ${radius}² / 4`,
                `S = ${(Math.PI * radius * radius / 4).toFixed(2)} ${unitSymbol}²`
            ],
            result: calculations.quadrantArea,
            icon: '◔'
        },
        arcLength90: {
            title: "90° yoy uzunligi",
            formula: 'L = 2πr / 4',
            steps: [
                `L = 2 × π × r / 4`,
                `L = 2 × π × ${radius} / 4`,
                `L = ${(2 * Math.PI * radius / 4).toFixed(2)} ${unitSymbol}`
            ],
            result: calculations.arcLength90,
            icon: '⌒'
        }
    };

    // Qoidalar
    const rules = [
        {
            title: "Doira ta'rifi",
            content: "Doira — tekislikda berilgan nuqtadan (markaz) teng masofada joylashgan barcha nuqtalar to'plami.",
            icon: '○'
        },
        {
            title: 'Radius (r)',
            content: "Markazdan doira chetigacha bo'lgan masofa. Barcha radiuslar teng.",
            icon: '📏'
        },
        {
            title: 'Diametr (d)',
            content: "Markazdan o'tuvchi, doiraning ikki nuqtasini tutashtiruvchi kesma. d = 2r",
            icon: '↔️'
        },
        {
            title: 'Aylana',
            content: "Doiraning chegarasi. Aylana uzunligi C = 2πr yoki C = πd formula bilan hisoblanadi.",
            icon: '⭕'
        },
        {
            title: 'Vatar',
            content: "Doiraning istalgan ikki nuqtasini tutashtiruvchi kesma. Eng uzun vatar — diametr.",
            icon: '➖'
        },
        {
            title: 'Sektor',
            content: "Ikki radius va ular orasidagi yoy bilan chegaralangan qism.",
            icon: '◔'
        },
        {
            title: 'Segment',
            content: "Vatar va yoy bilan chegaralangan qism.",
            icon: '🌙'
        },
        {
            title: 'π (Pi) soni',
            content: "π ≈ 3.14159... — doira aylana uzunligining diametrga nisbati. Irratsional son.",
            icon: 'π'
        }
    ];

    const handleResultClick = (key) => {
        setSelectedResult(formulas[key]);
        setShowResultsModal(true);
    };

    if (showFullscreen) {
        return (
            <FullscreenCircleWhiteboard
                radius={radius}
                unitSymbol={unitSymbol}
                onClose={() => setShowFullscreen(false)}
                onSizeChange={setRadius}
            />
        );
    }

    return (
        <div className="shape-page doira-page">
            {/* Header - PRO Format */}
            <header className="shape-page-header pro-page-header pro-header-enhanced">
                {/* Left Section - Back Button & Logo & Title */}
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
                            <span className="icon-glow" style={{ color: COLORS.primary }}>○</span>
                        </div>
                        <div className="pro-header-text">
                            <h1>Doira</h1>
                            <p>Interaktiv modellashtirish va hisoblash</p>
                        </div>
                    </div>
                </div>

                {/* Right Section - Actions */}
                <div className="header-right-section">
                    <UserMenu />
                    <div className="header-pro-badge">
                        <span className="pro-crown">👑</span>
                        <span className="pro-text">PRO</span>
                    </div>
                </div>
            </header>

            <div className="shape-page-content">
                {/* Left Panel - PRO Settings */}
                <aside className="params-panel pro-params-panel pro-settings-panel">
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

                    <div className="pro-sections-container">
                        {/* O'lchov birligi */}
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

                        {/* Radius */}
                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">Radius</span>
                                <span className="pro-section-badge">{radius} {unitSymbol}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>r</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Radius</span>
                                                <span className="pro-side-desc">Markazdan chetigacha</span>
                                            </div>
                                            <div className="pro-side-value">{radius} {unitSymbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="100"
                                                step="0.1"
                                                value={radius}
                                                onChange={(e) => setRadius(parseFloat(e.target.value))}
                                                className="pro-range"
                                                style={{ '--range-color': '#f59e0b' }}
                                            />
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
                                <span className="pro-section-badge">{[showGrid, showCenter, showRadius, showDiameter, showDimensions, showSectors, showChord].filter(Boolean).length}/7</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
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
                                        <button className={`pro-toggle-item ${showCenter ? 'active' : ''}`} onClick={() => setShowCenter(!showCenter)}>
                                            <span className="toggle-icon">○</span>
                                            <span className="toggle-label">Markaz</span>
                                            <span className={`toggle-status ${showCenter ? 'on' : 'off'}`}>{showCenter ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showRadius ? 'active' : ''}`} onClick={() => setShowRadius(!showRadius)}>
                                            <span className="toggle-icon">—</span>
                                            <span className="toggle-label">Radius</span>
                                            <span className={`toggle-status ${showRadius ? 'on' : 'off'}`}>{showRadius ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showDiameter ? 'active' : ''}`} onClick={() => setShowDiameter(!showDiameter)}>
                                            <span className="toggle-icon">↔</span>
                                            <span className="toggle-label">Diametr</span>
                                            <span className={`toggle-status ${showDiameter ? 'on' : 'off'}`}>{showDiameter ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">✨ Qo'shimcha</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button className={`pro-toggle-item ${showDimensions ? 'active' : ''}`} onClick={() => setShowDimensions(!showDimensions)}>
                                            <span className="toggle-icon">📏</span>
                                            <span className="toggle-label">O'lchamlar</span>
                                            <span className={`toggle-status ${showDimensions ? 'on' : 'off'}`}>{showDimensions ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showSectors ? 'active' : ''}`} onClick={() => setShowSectors(!showSectors)}>
                                            <span className="toggle-icon">◔</span>
                                            <span className="toggle-label">Sektorlar</span>
                                            <span className={`toggle-status ${showSectors ? 'on' : 'off'}`}>{showSectors ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button className={`pro-toggle-item ${showChord ? 'active' : ''}`} onClick={() => setShowChord(!showChord)}>
                                            <span className="toggle-icon">⌒</span>
                                            <span className="toggle-label">Vatar</span>
                                            <span className={`toggle-status ${showChord ? 'on' : 'off'}`}>{showChord ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </aside>

                {/* Canvas Panel */}
                <section className="canvas-panel" style={{ position: 'relative' }}>
                    <CircleCanvas
                        radius={radius}
                        unitSymbol={unitSymbol}
                        showGrid={showGrid}
                        showCenter={showCenter}
                        showRadius={showRadius}
                        showDiameter={showDiameter}
                        showDimensions={showDimensions}
                        showSectors={showSectors}
                        showChord={showChord}
                    />

                    <button className="fullscreen-toggle-btn" onClick={() => setShowFullscreen(true)} title="To'liq ekran">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    </button>
                </section>

                {/* Right Panel - PRO Results */}
                <aside className="formulas-panel pro-results-panel" style={{ minWidth: '340px' }}>
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

                    {/* Asosiy natijalar - Premium Cards (UchburchakPage kabi) */}
                    <div className="pro-main-results">
                        <div className="pro-result-card area-card" onClick={() => handleResultClick('area')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                </svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Yuzasi</span>
                                <span className="pro-card-value">{calculations.area}</span>
                                <span className="pro-card-unit">{unitSymbol}²</span>
                            </div>
                            <div className="pro-card-formula">S = πr²</div>
                        </div>

                        <div className="pro-result-card perimeter-card" onClick={() => handleResultClick('circumference')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" strokeDasharray="5 3" />
                                </svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Aylana uzunligi</span>
                                <span className="pro-card-value">{calculations.circumference}</span>
                                <span className="pro-card-unit">{unitSymbol}</span>
                            </div>
                            <div className="pro-card-formula">C = 2πr</div>
                        </div>
                    </div>

                    <div className="pro-sections-container">
                        <details className="pro-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">Asosiy hisoblashlar</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-results-grid">
                                    {Object.entries(formulas).map(([key, item]) => (
                                        <button key={key} className="pro-result-card" onClick={() => handleResultClick(key)}>
                                            <div className="result-icon-wrap">{item.icon}</div>
                                            <div className="result-content">
                                                <span className="result-label">{item.title}</span>
                                                <span className="result-value">
                                                    {key === 'area' || key === 'semicircleArea' || key === 'quadrantArea'
                                                        ? item.result
                                                        : item.result}
                                                    <small> {key === 'area' || key === 'semicircleArea' || key === 'quadrantArea' ? unitSymbol + '²' : unitSymbol}</small>
                                                </span>
                                            </div>
                                            <div className="result-arrow">→</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>

                        <details className="pro-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📖</div>
                                <span className="pro-section-title">Ma'lumotlar</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-info-grid">
                                    <div className="pro-info-card">
                                        <div className="info-icon-wrap" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>π</div>
                                        <div className="info-text">
                                            <strong>Pi soni</strong>
                                            <p>π ≈ 3.14159265...</p>
                                        </div>
                                    </div>
                                    <div className="pro-info-card">
                                        <div className="info-icon-wrap" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>○</div>
                                        <div className="info-text">
                                            <strong>Simmetriya</strong>
                                            <p>Cheksiz simmetriya o'qlari</p>
                                        </div>
                                    </div>
                                </div>
                                <button className="pro-action-btn" onClick={() => setShowRulesModal(true)}>
                                    📖 Barcha qoidalarni ko'rish
                                </button>
                            </div>
                        </details>
                    </div>
                </aside>
            </div>

            {/* Results Modal */}
            {showResultsModal && selectedResult && (
                <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
                    <div className="modal-content pro-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowResultsModal(false)}>×</button>
                        <div className="modal-header">
                            <span className="modal-icon">{selectedResult.icon}</span>
                            <h2>{selectedResult.title}</h2>
                        </div>
                        <div className="modal-body">
                            <div className="formula-display">
                                <span className="formula-label">Formula:</span>
                                <span className="formula-text">{selectedResult.formula}</span>
                            </div>
                            <div className="calculation-steps">
                                <h4>Hisoblash bosqichlari:</h4>
                                {selectedResult.steps.map((step, i) => (
                                    <div key={i} className="step">
                                        <span className="step-number">{i + 1}</span>
                                        <span className="step-content">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules Modal */}
            {showRulesModal && (
                <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
                    <div className="modal-content rules-modal pro-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowRulesModal(false)}>×</button>
                        <div className="modal-header">
                            <span className="modal-icon">📖</span>
                            <h2>Doira qoidalari</h2>
                        </div>
                        <div className="modal-body">
                            <div className="rules-grid">
                                {rules.map((rule, i) => (
                                    <div key={i} className="rule-card">
                                        <div className="rule-icon">{rule.icon}</div>
                                        <div className="rule-content">
                                            <h4>{rule.title}</h4>
                                            <p>{rule.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
