import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * TextHoverEffect - Framer Hovertext ning React versiyasi
 * Sichqoncha ustiga borganda SVG gradient effekt paydo bo'ladi
 */
export function HoverText({
    text,
    className = '',
    fontSize = '3.5rem',
    fontWeight = '800',
    strokeWidth = 0.3,
    duration = 0.15,
    animationDuration = 4,
    gradientColors = ['#eab308', '#ef4444', '#3b82f6', '#06b6d4', '#8b5cf6'],
    strokeColor = '#3a3a5a',
    viewBoxWidth = 700,
    viewBoxHeight = 120,
}) {
    const svgRef = useRef(null);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const [maskPosition, setMaskPosition] = useState({ cx: '50%', cy: '50%' });

    useEffect(() => {
        if (svgRef.current && cursor.x !== null && cursor.y !== null) {
            const svgRect = svgRef.current.getBoundingClientRect();
            const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
            const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
            setMaskPosition({
                cx: `${cxPercentage}%`,
                cy: `${cyPercentage}%`,
            });
        }
    }, [cursor]);

    const id = text.replace(/\s+/g, '-').toLowerCase();

    return (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={className}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                xmlns="http://www.w3.org/2000/svg"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
                style={{ userSelect: 'none', overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id={`textGradient-${id}`} gradientUnits="userSpaceOnUse">
                        {hovered && gradientColors.map((color, i) => (
                            <stop
                                key={i}
                                offset={`${(i / (gradientColors.length - 1)) * 100}%`}
                                stopColor={color}
                            />
                        ))}
                    </linearGradient>

                    <motion.radialGradient
                        id={`revealMask-${id}`}
                        gradientUnits="userSpaceOnUse"
                        r="25%"
                        initial={{ cx: '50%', cy: '50%' }}
                        animate={maskPosition}
                        transition={{ duration, ease: 'easeOut' }}
                    >
                        <stop offset="0%" stopColor="white" />
                        <stop offset="100%" stopColor="black" />
                    </motion.radialGradient>

                    <mask id={`textMask-${id}`}>
                        <rect x="0" y="0" width="100%" height="100%" fill={`url(#revealMask-${id})`} />
                    </mask>
                </defs>

                {/* Base text - stroke only (dark outline) */}
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    stroke={strokeColor}
                    style={{
                        fontSize,
                        fontWeight,
                        fontFamily: 'Inter, sans-serif',
                        opacity: hovered ? 0.7 : 1,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    {text}
                </text>

                {/* Animated drawing effect text */}
                <motion.text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    stroke={strokeColor}
                    initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
                    animate={{ strokeDashoffset: 0, strokeDasharray: 1000 }}
                    transition={{
                        duration: animationDuration,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatDelay: 2,
                    }}
                    style={{ fontSize, fontWeight, fontFamily: 'Inter, sans-serif' }}
                >
                    {text}
                </motion.text>

                {/* Gradient revealed text (follows cursor) */}
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    stroke={`url(#textGradient-${id})`}
                    strokeWidth={strokeWidth}
                    mask={`url(#textMask-${id})`}
                    fill="transparent"
                    style={{ fontSize, fontWeight, fontFamily: 'Inter, sans-serif' }}
                >
                    {text}
                </text>
            </svg>
        </div>
    );
}
