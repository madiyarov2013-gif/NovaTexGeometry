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
    primary: '#8b5cf6', // Purple for square
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    indigo: '#6366f1'
};

// Rang palitasi
const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// Canvas komponenti - Kvadrat uchun
function SquareCanvas({
    side, unitSymbol, showGrid, showDiagonals, showCenter,
    showSides, showAngles, showDimensions, showSymmetry, showIncircle, showCircumcircle
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

        // Calculate square position - FIXED base scale (side ga bog'liq EMAS)
        const centerX = cWidth / 2 + 30;
        const centerY = cHeight / 2;
        // Fixed scale: 10 sm reference uchun hisoblanadi
        const baseScale = Math.min(cWidth * 0.35, cHeight * 0.4) / 15;
        const sScaled = side * baseScale;

        const x = centerX - sScaled / 2;
        const y = centerY - sScaled / 2;

        const points = [
            { x: x, y: y, label: 'A' },
            { x: x + sScaled, y: y, label: 'B' },
            { x: x + sScaled, y: y + sScaled, label: 'C' },
            { x: x, y: y + sScaled, label: 'D' }
        ];

        // Circumcircle
        if (showCircumcircle) {
            const circumRadius = (sScaled * Math.sqrt(2)) / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circumRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#3b82f680';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = '#3b82f6';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`R = ${(side * Math.sqrt(2) / 2).toFixed(2)} ${unitSymbol}`, centerX + circumRadius + 10, centerY);
        }

        // Incircle
        if (showIncircle) {
            const inRadius = sScaled / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, inRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#10b98180';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = '#10b981';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`r = ${(side / 2).toFixed(2)} ${unitSymbol}`, centerX + inRadius + 10, centerY + 20);
        }

        // Symmetry axes
        if (showSymmetry) {
            ctx.setLineDash([8, 4]);
            ctx.strokeStyle = '#ec489980';
            ctx.lineWidth = 1.5;

            // Horizontal axis
            ctx.beginPath();
            ctx.moveTo(x - 30, centerY);
            ctx.lineTo(x + sScaled + 30, centerY);
            ctx.stroke();

            // Vertical axis
            ctx.beginPath();
            ctx.moveTo(centerX, y - 30);
            ctx.lineTo(centerX, y + sScaled + 30);
            ctx.stroke();

            // Diagonal axes (unique to square)
            ctx.beginPath();
            ctx.moveTo(x - 20, y - 20);
            ctx.lineTo(x + sScaled + 20, y + sScaled + 20);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x + sScaled + 20, y - 20);
            ctx.lineTo(x - 20, y + sScaled + 20);
            ctx.stroke();

            ctx.setLineDash([]);
        }

        // Shadow
        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.shadowBlur = 30;

        // Fill square
        ctx.beginPath();
        ctx.rect(x, y, sScaled, sScaled);
        const gradient = ctx.createLinearGradient(x, y, x + sScaled, y + sScaled);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Diagonals
        if (showDiagonals) {
            ctx.setLineDash([8, 4]);
            ctx.strokeStyle = '#f59e0b';
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

        // Center point
        if (showCenter) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }

        // Right angle markers
        if (showAngles) {
            const mSize = 12;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            // A
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y + mSize);
            ctx.lineTo(points[0].x + mSize, points[0].y + mSize);
            ctx.lineTo(points[0].x + mSize, points[0].y);
            ctx.stroke();
            // B
            ctx.beginPath();
            ctx.moveTo(points[1].x - mSize, points[1].y);
            ctx.lineTo(points[1].x - mSize, points[1].y + mSize);
            ctx.lineTo(points[1].x, points[1].y + mSize);
            ctx.stroke();
            // C
            ctx.beginPath();
            ctx.moveTo(points[2].x, points[2].y - mSize);
            ctx.lineTo(points[2].x - mSize, points[2].y - mSize);
            ctx.lineTo(points[2].x - mSize, points[2].y);
            ctx.stroke();
            // D
            ctx.beginPath();
            ctx.moveTo(points[3].x + mSize, points[3].y);
            ctx.lineTo(points[3].x + mSize, points[3].y - mSize);
            ctx.lineTo(points[3].x, points[3].y - mSize);
            ctx.stroke();
        }

        // Points and labels
        if (showSides) {
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 14, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = '#8b5cf6';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();

                // Label
                const labelOffset = 30;
                let lx = point.x;
                let ly = point.y;

                if (i === 0) { lx -= labelOffset; ly -= labelOffset / 2; }
                else if (i === 1) { lx += labelOffset; ly -= labelOffset / 2; }
                else if (i === 2) { lx += labelOffset; ly += labelOffset / 2; }
                else { lx -= labelOffset; ly += labelOffset / 2; }

                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.beginPath();
                ctx.roundRect(lx - 15, ly - 15, 30, 30, 6);
                ctx.fill();
                ctx.strokeStyle = '#8b5cf6';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(point.label, lx, ly);
            });
        }

        // Dimension labels
        if (showDimensions) {
            const label = `a = ${side} ${unitSymbol}`;

            // Top side
            const topMidX = (points[0].x + points[1].x) / 2;
            const topMidY = points[0].y - 25;
            ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
            ctx.font = 'bold 12px Inter, sans-serif';
            const labelWidth = ctx.measureText(label).width + 20;
            ctx.beginPath();
            ctx.roundRect(topMidX - labelWidth / 2, topMidY - 14, labelWidth, 28, 6);
            ctx.fill();
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#8b5cf6';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, topMidX, topMidY);

            // Left side
            const leftMidX = points[0].x - 30;
            const leftMidY = (points[0].y + points[3].y) / 2;
            ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
            ctx.beginPath();
            ctx.roundRect(leftMidX - labelWidth / 2, leftMidY - 14, labelWidth, 28, 6);
            ctx.fill();
            ctx.strokeStyle = '#8b5cf6';
            ctx.stroke();
            ctx.fillStyle = '#8b5cf6';
            ctx.fillText(label, leftMidX, leftMidY);

            // Diagonal label
            if (showDiagonals) {
                const diagLen = (side * Math.sqrt(2)).toFixed(2);
                const diagLabel = `d = ${diagLen} ${unitSymbol}`;
                const diagMidX = centerX + 30;
                const diagMidY = centerY - 15;
                const dWidth = ctx.measureText(diagLabel).width + 20;
                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.beginPath();
                ctx.roundRect(diagMidX - dWidth / 2, diagMidY - 14, dWidth, 28, 6);
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.stroke();
                ctx.fillStyle = '#f59e0b';
                ctx.fillText(diagLabel, diagMidX, diagMidY);
            }
        }

        ctx.restore();

    }, [side, unitSymbol, showGrid, showDiagonals, showCenter, showSides, showAngles, showDimensions, showSymmetry, showIncircle, showCircumcircle, scale, offset, canvasSize]);

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

// Professional Fullscreen Whiteboard - Kvadrat uchun
function FullscreenSquareWhiteboard({ side, unitSymbol, onClose, onSizeChange }) {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const containerRef = useRef(null);

    // Zoom va Pan
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLocked, setIsLocked] = useState(false);
    const [draggingVertex, setDraggingVertex] = useState(null);
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
    const [squareFillColor, setSquareFillColor] = useState('gradient');
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

    // Kvadrat nuqtalari - FIXED base scale ishlatamiz
    const baseScale = useMemo(() => {
        // Fixed scale - side ga bog'liq emas
        return Math.min(canvasSize.width * 0.3, canvasSize.height * 0.35) / 10; // 10 = reference side
    }, [canvasSize]);

    const squareData = useMemo(() => {
        const cWidth = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = cWidth / 2;
        const centerY = cHeight / 2;
        const sScaled = side * baseScale;
        const x = centerX - sScaled / 2;
        const y = centerY - sScaled / 2;

        return {
            points: [
                { x, y, label: 'A' },
                { x: x + sScaled, y, label: 'B' },
                { x: x + sScaled, y: y + sScaled, label: 'C' },
                { x, y: y + sScaled, label: 'D' }
            ],
            baseScale,
            sScaled,
            centerX,
            centerY
        };
    }, [side, canvasSize, baseScale]);

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

        if (squareData) {
            const { points, sScaled } = squareData;

            // Shadow va fill
            ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
            ctx.shadowBlur = 40 / scale;
            ctx.beginPath();
            ctx.rect(points[0].x, points[0].y, sScaled, sScaled);

            if (squareFillColor === 'gradient') {
                const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
                gradient.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
                gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
                gradient.addColorStop(1, 'rgba(139, 92, 246, 0.35)');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = squareFillColor + '80';
            }
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 4 / scale;
            ctx.stroke();

            // Diagonallar
            ctx.setLineDash([8 / scale, 4 / scale]);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[2].x, points[2].y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[3].x, points[3].y); ctx.stroke();
            ctx.setLineDash([]);

            // Burchak belgilari
            const mSize = 15 / scale;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y + mSize); ctx.lineTo(points[0].x + mSize, points[0].y + mSize); ctx.lineTo(points[0].x + mSize, points[0].y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(points[1].x - mSize, points[1].y); ctx.lineTo(points[1].x - mSize, points[1].y + mSize); ctx.lineTo(points[1].x, points[1].y + mSize); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(points[2].x, points[2].y - mSize); ctx.lineTo(points[2].x - mSize, points[2].y - mSize); ctx.lineTo(points[2].x - mSize, points[2].y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(points[3].x + mSize, points[3].y); ctx.lineTo(points[3].x + mSize, points[3].y - mSize); ctx.lineTo(points[3].x, points[3].y - mSize); ctx.stroke();

            // Nuqtalar va labellar
            points.forEach((point, i) => {
                ctx.beginPath(); ctx.arc(point.x, point.y, 18 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(139, 92, 246, 0.5)'; ctx.fill();
                ctx.beginPath(); ctx.arc(point.x, point.y, 12 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#8b5cf6'; ctx.fill();
                ctx.beginPath(); ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#fff'; ctx.fill();

                const labelOffset = 40 / scale;
                let lx = point.x, ly = point.y;
                if (i === 0) { lx -= labelOffset; ly -= labelOffset / 2; }
                else if (i === 1) { lx += labelOffset; ly -= labelOffset / 2; }
                else if (i === 2) { lx += labelOffset; ly += labelOffset / 2; }
                else { lx -= labelOffset; ly += labelOffset / 2; }

                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.beginPath(); ctx.roundRect(lx - 20 / scale, ly - 20 / scale, 40 / scale, 40 / scale, 8 / scale); ctx.fill();
                ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2 / scale; ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.font = `bold ${18 / scale}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(point.label, lx, ly);
            });

            // O'lcham yorliqlari
            const aLabel = `a = ${side} ${unitSymbol}`;
            ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
            const topMidX = (points[0].x + points[1].x) / 2;
            const topMidY = points[0].y - 30 / scale;
            const aWidth = ctx.measureText(aLabel).width + 24 / scale;
            ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
            ctx.beginPath(); ctx.roundRect(topMidX - aWidth / 2, topMidY - 16 / scale, aWidth, 32 / scale, 8 / scale); ctx.fill();
            ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2 / scale; ctx.stroke();
            ctx.fillStyle = '#8b5cf6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(aLabel, topMidX, topMidY);
        }
        ctx.restore();
    }, [scale, offset, side, canvasSize, squareData, unitSymbol, squareFillColor]);

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

            if (isLocked && squareData) {
                // Katta hit radius - oson tanlash uchun
                const hitRadius = 80;
                for (let i = 0; i < squareData.points.length; i++) {
                    const p = squareData.points[i];
                    const dist = Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2);
                    if (dist <= hitRadius) {
                        setDraggingVertex(i);
                        return;
                    }
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
        } else if (draggingVertex !== null && squareData) {
            // Markazdan kursorga masofa
            const { centerX, centerY, baseScale } = squareData;
            const dx = coords.x - centerX;
            const dy = coords.y - centerY;
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);

            // Formula: markazdan cho'qqigacha = side * baseScale * sqrt(2) / 2
            // Teskari: side = distFromCenter * 2 / (baseScale * sqrt(2))
            let newSide = (distFromCenter * 2) / (baseScale * Math.sqrt(2));

            // 1 o'nlikgacha yaxlitlash
            newSide = Math.round(newSide * 10) / 10;

            // Chegaralar: 1 dan 50 gacha
            if (newSide > 50) newSide = 50;
            if (newSide < 1) newSide = 1;

            onSizeChange(newSide);
        } else if (isDragging && !isLocked) {
            const client = getClientCoords(e);
            setOffset({ x: client.x - dragStart.x, y: client.y - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentPath.length > 1) {
            setDrawings(prev => [...prev, { points: currentPath, color: penColor, size: activeTool === 'eraser' ? eraserSize : penSize, isEraser: activeTool === 'eraser' }]);
        }
        setIsDrawing(false); setDraggingVertex(null); setCurrentPath([]); setIsDragging(false); setLastPinchDistance(null);
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
    const resetToInitial = () => { setScale(1); setOffset({ x: 0, y: 0 }); setActiveTool('view'); setIsLocked(false); setDrawings([]); setCurrentPath([]); setPenColor('#ffffff'); setPenSize(3); setSquareFillColor('gradient'); setIsToolbarOpen(false); };

    return (
        <div className="fullscreen-whiteboard" ref={containerRef}>
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
                    <button className={`toolbar-btn ${isLocked ? 'active locked' : ''}`} onClick={() => { setIsLocked(!isLocked); setToast({ show: true, message: isLocked ? 'Qulfdan chiqarildi' : "Qulflandi - cho'qqilarni sudrab o'zgartiring" }); setTimeout(() => setToast({ show: false, message: '' }), 2000); }} title={isLocked ? 'Qulfni ochish' : 'Qulflash'}>
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
                    <span className="fill-label">Kvadrat:</span>
                    <div className="fill-buttons">
                        <button className={`fill-btn ${squareFillColor === 'gradient' ? 'active' : ''}`} onClick={() => setSquareFillColor('gradient')} title="Gradient">
                            <span className="gradient-preview"></span>
                        </button>
                        {COLOR_PALETTE.slice(0, 5).map(color => (
                            <button key={`fill-${color}`} className={`fill-btn ${squareFillColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setSquareFillColor(color)} title={`Bo'yash: ${color}`} />
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

            {isLocked && <div className="lock-indicator">🔒 Cho'qqilarni sudrab o'zgartiring</div>}

            <button className="whiteboard-close-btn" onClick={onClose} title="Yopish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
            </button>
        </div>
    );
}

export function KvadratPage() {
    const [side, setSide] = useState(8);
    const [unit, setUnit] = useState('sm');

    // Birlik o'zgartirish funksiyasi
    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setSide(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };
    const [showGrid, setShowGrid] = useState(true);
    const [showDiagonals, setShowDiagonals] = useState(false);
    const [showCenter, setShowCenter] = useState(false);
    const [showSides, setShowSides] = useState(true);
    const [showAngles, setShowAngles] = useState(true);
    const [showDimensions, setShowDimensions] = useState(true);
    const [showSymmetry, setShowSymmetry] = useState(false);
    const [showIncircle, setShowIncircle] = useState(false);
    const [showCircumcircle, setShowCircumcircle] = useState(false);
    const [resultModal, setResultModal] = useState(null);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fullscreenRef = useRef(null);

    // Fullscreen funksiyalari
    const enterFullscreen = () => {
        setIsFullscreen(true);
        setTimeout(() => {
            if (fullscreenRef.current) {
                if (fullscreenRef.current.requestFullscreen) {
                    fullscreenRef.current.requestFullscreen();
                } else if (fullscreenRef.current.webkitRequestFullscreen) {
                    fullscreenRef.current.webkitRequestFullscreen();
                }
            }
        }, 50);
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
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

    const unitSymbol = UNITS[unit].symbol;

    // Hisoblashlar
    const calculations = useMemo(() => {
        const area = (side * side).toFixed(2);
        const perimeter = (4 * side).toFixed(2);
        const diagonal = (side * Math.sqrt(2)).toFixed(2);
        const incircleRadius = (side / 2).toFixed(2);
        const circumcircleRadius = (side * Math.sqrt(2) / 2).toFixed(2);

        return {
            area,
            perimeter,
            diagonal,
            incircleRadius,
            circumcircleRadius
        };
    }, [side]);

    return (
        <div className="shape-page kvadrat-page">
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
                        <div className="pro-header-icon"><span className="icon-glow">■</span></div>
                        <div className="pro-header-text">
                            <h1>Kvadrat</h1>
                            <p>Interaktiv modellashtirish</p>
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

                        {/* Side Section */}
                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">Tomon uzunligi</span>
                            </summary>
                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: COLORS.primary }}>a</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">Tomon (a)</span>
                                            </div>
                                            <div className="pro-side-value">{side} {UNITS[unit].symbol}</div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input type="range" min="1" max="50" step="0.5" value={side} onChange={e => setSide(Number(e.target.value))} className="pro-range" style={{ '--range-color': COLORS.primary }} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', marginTop: '10px', fontSize: '12px', color: '#9ca3af' }}>
                                    💡 Kvadratda barcha 4 tomon teng: a = b = c = d
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

                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⚡ Qo'shimcha</h4>
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
                    <SquareCanvas
                        side={side}
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
                        <span className="badge-icon">■</span>
                        Kvadrat
                    </div>

                    <button className="fullscreen-toggle-btn" onClick={enterFullscreen} title="To'liq ekran">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    </button>
                </section>

                {/* Right Panel - Results */}
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

                    {/* Main Results */}
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
                            <div className="pro-card-formula">S = a²</div>
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
                            <div className="pro-card-formula">P = 4a</div>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="pro-sections-container">
                        {/* Measurements */}
                        <details className="pro-section measurements-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchovlar</span>
                                <span className="pro-section-badge">4 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">↗ Diagonal</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('diagonal')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">d</span>
                                            <span className="measure-value">{calculations.diagonal} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⭕ Aylana radiuslari</h4>
                                    <div className="pro-circles-grid">
                                        <div className="pro-circle-card incircle" onClick={() => setResultModal('incircle')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◎</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Ichki</span>
                                                <span className="circle-value">{calculations.incircleRadius} {unitSymbol}</span>
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

                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">∠ Burchaklar</h4>
                                    <div className="pro-angle-grid">
                                        {['A', 'B', 'C', 'D'].map(v => (
                                            <div key={v} className="pro-angle-item">
                                                <div className="pro-angle-vertex">{v}</div>
                                                <div className="pro-angle-value">90°</div>
                                                <div className="pro-angle-bar" style={{ width: '50%' }}></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pro-sum-info">
                                        Σ = 360° (barcha burchaklar 90°)
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Formulas */}
                        <details className="pro-section formulas-section">
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📚</div>
                                <span className="pro-section-title">Formulalar</span>
                                <span className="pro-section-badge">5 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📐 Yuza</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>S = a²</code><span>Asosiy</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📏 Perimetr</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>P = 4a</code><span>Asosiy</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">↗ Diagonal</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>d = a√2</code><span>Asosiy</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">⭕ Aylana</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>r = a/2</code><span>Ichki doira</span></div>
                                        <div className="pro-formula-item"><code>R = a√2/2</code><span>Tashqi doira</span></div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Rules */}
                        <div className="pro-section rules-section" onClick={() => setShowRulesModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="pro-section-header">
                                <div className="pro-section-icon">📖</div>
                                <span className="pro-section-title">Qoidalar</span>
                                <span className="pro-section-badge">10 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Result Modal */}
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
                                borderRadius: '50%'
                            }}
                        >×</button>

                        {resultModal === 'area' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>📐</span>
                                    Yuzasini hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>S = a²</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>S = {side}²</div>
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
                                        <div>P = 4a</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>P = 4 × {side}</div>
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
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>d = a√2</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>d = {side} × √2</div>
                                        <div>d = {side} × 1.414...</div>
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
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>r = a / 2</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>r = {side} / 2</div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            r = {calculations.incircleRadius} {unitSymbol}
                                        </div>
                                    </div>
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
                                        <div>R = a√2 / 2 = d / 2</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>R = {side} × √2 / 2</div>
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
                                borderRadius: '50%'
                            }}
                        >×</button>

                        <h3 style={{ fontSize: '28px', marginBottom: '25px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '32px' }}>📖</span>
                            Kvadrat qoidalari
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { num: 1, title: 'Barcha tomonlar teng', desc: 'Kvadratning barcha 4 tomoni o\'zaro teng: a = b = c = d', color: '#8b5cf6' },
                                { num: 2, title: 'Barcha burchaklar 90°', desc: 'Kvadratning barcha ichki burchaklari to\'g\'ri burchak (90°) ga teng', color: '#10b981' },
                                { num: 3, title: 'Diagonallar teng', desc: 'Kvadrat diagonallari teng va bir-birini to\'g\'ri burchak ostida yarimlatadi', color: '#f59e0b' },
                                { num: 4, title: 'Diagonal formula', desc: 'd = a√2, bu yerda a - tomon uzunligi', color: '#06b6d4' },
                                { num: 5, title: 'Yuza formulasi', desc: 'Yuza = a² (tomon kvadrati)', color: '#ec4899' },
                                { num: 6, title: 'Perimetr formulasi', desc: 'Perimetr = 4a (4 marta tomon)', color: '#3b82f6' },
                                { num: 7, title: 'Ichki doira', desc: 'Ichki chizilgan doira radiusi r = a/2', color: '#ef4444' },
                                { num: 8, title: 'Tashqi doira', desc: 'Tashqi chizilgan doira radiusi R = a√2/2 = d/2', color: '#6366f1' },
                                { num: 9, title: '4 ta simmetriya o\'qi', desc: 'Kvadratda 4 ta simmetriya o\'qi bor (2 ta diagonal va 2 ta o\'rta chiziq)', color: '#14b8a6' },
                                { num: 10, title: 'Maxsus to\'rtburchak', desc: 'Kvadrat - bu to\'g\'ri burchakli to\'rtburchak va rombning maxsus holi', color: '#a855f7' }
                            ].map(rule => (
                                <div key={rule.num} style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '16px',
                                    border: `1px solid ${rule.color}30`
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
            {isFullscreen && (
                <div className="fullscreen-modal" ref={fullscreenRef}>
                    <FullscreenSquareWhiteboard
                        side={side}
                        unitSymbol={unitSymbol}
                        onClose={exitFullscreen}
                        onSizeChange={(newSide) => setSide(newSide)}
                    />
                </div>
            )}
        </div>
    );
}
