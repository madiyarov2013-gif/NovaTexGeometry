import { useState, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

/* ──────────── Shape Configurations ──────────── */
const SHAPES_2D = {
  triangle: {
    name: "Uchburchak",
    icon: "△",
    fields: [
      { key: "base", label: "Asos", unit: "sm", min: 1, max: 50, default: 10 },
      { key: "height", label: "Balandlik", unit: "sm", min: 1, max: 50, default: 8 },
    ],
  },
  rectangle: {
    name: "To'rtburchak",
    icon: "▬",
    fields: [
      { key: "width", label: "Bo'yi", unit: "sm", min: 1, max: 50, default: 12 },
      { key: "height", label: "Eni", unit: "sm", min: 1, max: 50, default: 8 },
    ],
  },
  circle: {
    name: "Doira",
    icon: "●",
    fields: [
      { key: "radius", label: "Radius", unit: "sm", min: 1, max: 30, default: 6 },
    ],
  },
};

const SHAPES_3D = {
  cube: {
    name: "Kub",
    icon: "⬜",
    fields: [
      { key: "side", label: "Tomon", unit: "sm", min: 1, max: 30, default: 5 },
    ],
  },
  prism: {
    name: "Prizma",
    icon: "⬡",
    fields: [
      { key: "width", label: "Eni", unit: "sm", min: 1, max: 30, default: 6 },
      { key: "height", label: "Balandlik", unit: "sm", min: 1, max: 30, default: 8 },
      { key: "depth", label: "Chuqurlik", unit: "sm", min: 1, max: 30, default: 4 },
    ],
  },
  cylinder: {
    name: "Silindr",
    icon: "◎",
    fields: [
      { key: "radius", label: "Radius", unit: "sm", min: 1, max: 20, default: 4 },
      { key: "height", label: "Balandlik", unit: "sm", min: 1, max: 30, default: 8 },
    ],
  },
  cone: {
    name: "Konus",
    icon: "▲",
    fields: [
      { key: "radius", label: "Radius", unit: "sm", min: 1, max: 20, default: 4 },
      { key: "height", label: "Balandlik", unit: "sm", min: 1, max: 30, default: 10 },
    ],
  },
  sphere: {
    name: "Shar",
    icon: "⬤",
    fields: [
      { key: "radius", label: "Radius", unit: "sm", min: 1, max: 20, default: 5 },
    ],
  },
};

/* ──────────── 2D SVG Renderers ──────────── */
function SVGTriangle({ dims }) {
  const b = dims.base || 10;
  const h = dims.height || 8;
  const pad = 20;
  const vw = b + pad * 2;
  const vh = h + pad * 2;
  const cx = vw / 2;
  const points = `${cx},${pad} ${pad},${pad + h} ${pad + b},${pad + h}`;

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="model-lab-svg">
      <defs>
        <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5a67d8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
        </linearGradient>
        <filter id="triGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        points={points}
        fill="url(#triGrad)"
        stroke="#5a67d8"
        strokeWidth="2"
        filter="url(#triGlow)"
      />
      {/* Asos label */}
      <text x={cx} y={pad + h + 15} textAnchor="middle" className="svg-label">
        {b} sm
      </text>
      {/* Balandlik label */}
      <text
        x={pad - 10}
        y={pad + h / 2}
        textAnchor="middle"
        className="svg-label"
        transform={`rotate(-90, ${pad - 10}, ${pad + h / 2})`}
      >
        {h} sm
      </text>
    </svg>
  );
}

function SVGRectangle({ dims }) {
  const w = dims.width || 12;
  const h = dims.height || 8;
  const pad = 20;
  const vw = w + pad * 2;
  const vh = h + pad * 2;

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="model-lab-svg">
      <defs>
        <linearGradient id="rectGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5a67d8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
        </linearGradient>
        <filter id="rectGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x={pad}
        y={pad}
        width={w}
        height={h}
        rx="1"
        fill="url(#rectGrad)"
        stroke="#5a67d8"
        strokeWidth="2"
        filter="url(#rectGlow)"
      />
      {/* Bo'yi label */}
      <text x={pad + w / 2} y={pad + h + 15} textAnchor="middle" className="svg-label">
        {w} sm
      </text>
      {/* Eni label */}
      <text
        x={pad - 10}
        y={pad + h / 2}
        textAnchor="middle"
        className="svg-label"
        transform={`rotate(-90, ${pad - 10}, ${pad + h / 2})`}
      >
        {h} sm
      </text>
    </svg>
  );
}

function SVGCircle({ dims }) {
  const r = dims.radius || 6;
  const pad = 20;
  const size = r * 2 + pad * 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="model-lab-svg">
      <defs>
        <radialGradient id="circGrad" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5a67d8" stopOpacity="0.3" />
        </radialGradient>
        <filter id="circGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="url(#circGrad)"
        stroke="#5a67d8"
        strokeWidth="2"
        filter="url(#circGlow)"
      />
      {/* Radius chizig'i */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + r}
        y2={cy}
        stroke="#fff"
        strokeWidth="1.5"
        strokeDasharray="3,2"
        opacity="0.7"
      />
      <text x={cx + r / 2} y={cy - 5} textAnchor="middle" className="svg-label">
        r = {r} sm
      </text>
    </svg>
  );
}

/* ──────────── 3D Shape Components ──────────── */
function Shape3DCube({ dims }) {
  const s = (dims.side || 5) / 5;
  return (
    <mesh rotation={[0.4, 0.6, 0]}>
      <boxGeometry args={[s, s, s]} />
      <meshStandardMaterial color="#5a67d8" transparent opacity={0.85} roughness={0.3} metalness={0.2} />
      <lineSegments>
        <edgesGeometry args={[new (window.__THREE_BOX || Object)()]} />
      </lineSegments>
    </mesh>
  );
}

function Shape3DPrism({ dims }) {
  const w = (dims.width || 6) / 5;
  const h = (dims.height || 8) / 5;
  const d = (dims.depth || 4) / 5;
  return (
    <mesh rotation={[0.4, 0.6, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color="#6366f1" transparent opacity={0.85} roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

function Shape3DCylinder({ dims }) {
  const r = (dims.radius || 4) / 5;
  const h = (dims.height || 8) / 5;
  return (
    <mesh rotation={[0.3, 0.5, 0]}>
      <cylinderGeometry args={[r, r, h, 64]} />
      <meshStandardMaterial color="#8b5cf6" transparent opacity={0.85} roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

function Shape3DCone({ dims }) {
  const r = (dims.radius || 4) / 5;
  const h = (dims.height || 10) / 5;
  return (
    <mesh rotation={[0.3, 0.5, 0]}>
      <coneGeometry args={[r, h, 64]} />
      <meshStandardMaterial color="#a78bfa" transparent opacity={0.85} roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

function Shape3DSphere({ dims }) {
  const r = (dims.radius || 5) / 5;
  return (
    <mesh>
      <sphereGeometry args={[r, 64, 64]} />
      <meshStandardMaterial color="#7c3aed" transparent opacity={0.85} roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

/* ──────────── 3D Wireframe Overlay ──────────── */
function WireframeOverlay({ children, dims, shapeKey }) {
  const wireProps = useMemo(() => {
    switch (shapeKey) {
      case 'cube': {
        const s = (dims.side || 5) / 5;
        return { type: 'box', args: [s, s, s], rot: [0.4, 0.6, 0] };
      }
      case 'prism': {
        const w = (dims.width || 6) / 5;
        const h = (dims.height || 8) / 5;
        const d = (dims.depth || 4) / 5;
        return { type: 'box', args: [w, h, d], rot: [0.4, 0.6, 0] };
      }
      case 'cylinder': {
        const r = (dims.radius || 4) / 5;
        const h = (dims.height || 8) / 5;
        return { type: 'cylinder', args: [r, r, h, 64], rot: [0.3, 0.5, 0] };
      }
      case 'cone': {
        const r = (dims.radius || 4) / 5;
        const h = (dims.height || 10) / 5;
        return { type: 'cone', args: [r, h, 64], rot: [0.3, 0.5, 0] };
      }
      case 'sphere': {
        const r = (dims.radius || 5) / 5;
        return { type: 'sphere', args: [r, 16, 16], rot: [0, 0, 0] };
      }
      default:
        return null;
    }
  }, [shapeKey, dims]);

  if (!wireProps) return children;

  const GeometryEl = () => {
    switch (wireProps.type) {
      case 'box': return <boxGeometry args={wireProps.args} />;
      case 'cylinder': return <cylinderGeometry args={wireProps.args} />;
      case 'cone': return <coneGeometry args={wireProps.args} />;
      case 'sphere': return <sphereGeometry args={wireProps.args} />;
      default: return null;
    }
  };

  return (
    <group>
      {children}
      <mesh rotation={wireProps.rot}>
        <GeometryEl />
        <meshBasicMaterial color="#5a67d8" wireframe transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

/* ──────────── 3D Scene ──────────── */
function Scene3D({ shapeKey, dims }) {
  const ShapeComponent = {
    cube: Shape3DCube,
    prism: Shape3DPrism,
    cylinder: Shape3DCylinder,
    cone: Shape3DCone,
    sphere: Shape3DSphere,
  }[shapeKey];

  if (!ShapeComponent) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} color="#ffffff" />
      <directionalLight position={[-3, -2, -5]} intensity={0.3} color="#5a67d8" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#8b5cf6" />
      <WireframeOverlay dims={dims} shapeKey={shapeKey}>
        <ShapeComponent dims={dims} />
      </WireframeOverlay>
      <gridHelper args={[10, 20, '#2a2a3a', '#1a1a2a']} position={[0, -2.5, 0]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={1.5}
      />
      <Environment preset="night" />
    </>
  );
}

/* ──────────── Formulalar va Hisoblash ──────────── */
function getFormulas(mode, shapeKey, dims) {
  if (mode === '2d') {
    switch (shapeKey) {
      case 'triangle': {
        const b = dims.base || 0;
        const h = dims.height || 0;
        const area = (b * h) / 2;
        return { label: "Yuza", formula: "S = (a × h) / 2", value: `${area.toFixed(2)} sm²` };
      }
      case 'rectangle': {
        const w = dims.width || 0;
        const h = dims.height || 0;
        const area = w * h;
        const perimeter = 2 * (w + h);
        return { label: "Yuza / Perimetr", formula: "S = a × b, P = 2(a+b)", value: `S = ${area.toFixed(2)} sm², P = ${perimeter.toFixed(2)} sm` };
      }
      case 'circle': {
        const r = dims.radius || 0;
        const area = Math.PI * r * r;
        const circ = 2 * Math.PI * r;
        return { label: "Yuza / Aylana", formula: "S = πr², C = 2πr", value: `S = ${area.toFixed(2)} sm², C = ${circ.toFixed(2)} sm` };
      }
      default:
        return null;
    }
  } else {
    switch (shapeKey) {
      case 'cube': {
        const s = dims.side || 0;
        const vol = s ** 3;
        const surf = 6 * s ** 2;
        return { label: "Hajm / Sirt maydoni", formula: "V = a³, S = 6a²", value: `V = ${vol.toFixed(2)} sm³, S = ${surf.toFixed(2)} sm²` };
      }
      case 'prism': {
        const w = dims.width || 0;
        const h = dims.height || 0;
        const d = dims.depth || 0;
        const vol = w * h * d;
        const surf = 2 * (w * h + h * d + w * d);
        return { label: "Hajm / Sirt maydoni", formula: "V = a×b×c, S = 2(ab+bc+ac)", value: `V = ${vol.toFixed(2)} sm³, S = ${surf.toFixed(2)} sm²` };
      }
      case 'cylinder': {
        const r = dims.radius || 0;
        const h = dims.height || 0;
        const vol = Math.PI * r * r * h;
        const surf = 2 * Math.PI * r * (r + h);
        return { label: "Hajm / Sirt maydoni", formula: "V = πr²h, S = 2πr(r+h)", value: `V = ${vol.toFixed(2)} sm³, S = ${surf.toFixed(2)} sm²` };
      }
      case 'cone': {
        const r = dims.radius || 0;
        const h = dims.height || 0;
        const l = Math.sqrt(r * r + h * h);
        const vol = (Math.PI * r * r * h) / 3;
        const surf = Math.PI * r * (r + l);
        return { label: "Hajm / Sirt maydoni", formula: "V = πr²h/3, S = πr(r+l)", value: `V = ${vol.toFixed(2)} sm³, S = ${surf.toFixed(2)} sm²` };
      }
      case 'sphere': {
        const r = dims.radius || 0;
        const vol = (4 / 3) * Math.PI * r ** 3;
        const surf = 4 * Math.PI * r ** 2;
        return { label: "Hajm / Sirt maydoni", formula: "V = 4πr³/3, S = 4πr²", value: `V = ${vol.toFixed(2)} sm³, S = ${surf.toFixed(2)} sm²` };
      }
      default:
        return null;
    }
  }
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT — ModelLabPage
   ══════════════════════════════════════════════ */
export function ModelLabPage() {
  const [mode, setMode] = useState('2d');
  const [selectedShape, setSelectedShape] = useState('triangle');
  const [dimensions, setDimensions] = useState({});

  const shapes = mode === '2d' ? SHAPES_2D : SHAPES_3D;
  const currentShape = shapes[selectedShape];

  // Reset shape when mode changes
  const handleModeChange = (newMode) => {
    setMode(newMode);
    const firstKey = Object.keys(newMode === '2d' ? SHAPES_2D : SHAPES_3D)[0];
    setSelectedShape(firstKey);
    setDimensions({});
  };

  // Update a dimension value
  const handleDimChange = (key, value) => {
    const num = parseFloat(value);
    setDimensions((prev) => ({
      ...prev,
      [key]: isNaN(num) ? '' : num,
    }));
  };

  // Get effective dimension (with defaults)
  const getEffectiveDims = () => {
    if (!currentShape) return {};
    const eff = {};
    currentShape.fields.forEach((f) => {
      eff[f.key] = dimensions[f.key] !== undefined && dimensions[f.key] !== '' ? dimensions[f.key] : f.default;
    });
    return eff;
  };

  const effectiveDims = getEffectiveDims();
  const formulaInfo = getFormulas(mode, selectedShape, effectiveDims);

  /* ── 2D Render ── */
  const render2D = () => {
    switch (selectedShape) {
      case 'triangle': return <SVGTriangle dims={effectiveDims} />;
      case 'rectangle': return <SVGRectangle dims={effectiveDims} />;
      case 'circle': return <SVGCircle dims={effectiveDims} />;
      default: return null;
    }
  };

  return (
    <div className="model-lab-page">
      {/* ─── Header ─── */}
      <header className="model-lab-header">
        <Link to="/" className="back-btn" id="model-lab-back">
          ← Bosh sahifa
        </Link>
        <div className="header-title">
          <h1>
            <span className="gradient-text">Model Lab</span>
          </h1>
          <p>Dinamik 2D va 3D geometrik modellashtirish</p>
        </div>
      </header>

      {/* ─── Content ─── */}
      <div className="model-lab-content">
        {/* ─── Sidebar ─── */}
        <aside className="model-lab-sidebar">
          {/* Mode Toggle */}
          <div className="ml-section">
            <label className="ml-section-label">Rejim</label>
            <div className="mode-toggle" id="mode-toggle">
              <button
                className={`mode-btn ${mode === '2d' ? 'active' : ''}`}
                onClick={() => handleModeChange('2d')}
                id="mode-2d-btn"
              >
                <span className="mode-icon">📐</span>
                2D
              </button>
              <button
                className={`mode-btn ${mode === '3d' ? 'active' : ''}`}
                onClick={() => handleModeChange('3d')}
                id="mode-3d-btn"
              >
                <span className="mode-icon">🎲</span>
                3D
              </button>
              <div className={`mode-slider ${mode === '3d' ? 'right' : ''}`} />
            </div>
          </div>

          {/* Shape Selector */}
          <div className="ml-section">
            <label className="ml-section-label">Shaklni tanlang</label>
            <div className="shape-selector" id="shape-selector">
              {Object.entries(shapes).map(([key, shape]) => (
                <button
                  key={key}
                  className={`shape-option ${selectedShape === key ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedShape(key);
                    setDimensions({});
                  }}
                  id={`shape-${key}`}
                >
                  <span className="shape-opt-icon">{shape.icon}</span>
                  <span className="shape-opt-name">{shape.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimension Inputs */}
          {currentShape && (
            <div className="ml-section">
              <label className="ml-section-label">O'lchamlar (sm)</label>
              <div className="dim-inputs">
                {currentShape.fields.map((field) => (
                  <div className="dim-input-group" key={field.key}>
                    <label className="dim-label">{field.label}</label>
                    <div className="dim-input-wrapper">
                      <input
                        type="number"
                        id={`dim-${field.key}`}
                        min={field.min}
                        max={field.max}
                        step="0.5"
                        value={dimensions[field.key] !== undefined ? dimensions[field.key] : ''}
                        placeholder={String(field.default)}
                        onChange={(e) => handleDimChange(field.key, e.target.value)}
                        className="dim-input"
                      />
                      <span className="dim-unit">{field.unit}</span>
                    </div>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step="0.5"
                      value={effectiveDims[field.key] || field.default}
                      onChange={(e) => handleDimChange(field.key, e.target.value)}
                      className="dim-range"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulas */}
          {formulaInfo && (
            <div className="ml-section ml-formula-card">
              <label className="ml-section-label">📊 {formulaInfo.label}</label>
              <div className="formula-display">
                <code className="formula-code">{formulaInfo.formula}</code>
                <p className="formula-result">{formulaInfo.value}</p>
              </div>
            </div>
          )}
        </aside>

        {/* ─── Canvas / SVG Area ─── */}
        <main className="model-lab-canvas" id="model-lab-canvas">
          {mode === '2d' ? (
            <div className="svg-container">
              <div className="svg-wrapper">
                {render2D()}
              </div>
              <div className="canvas-label">
                <span className="canvas-label-icon">{currentShape?.icon}</span>
                <span>{currentShape?.name}</span>
              </div>
            </div>
          ) : (
            <div className="three-container">
              <Suspense fallback={
                <div className="canvas-loading">
                  <div className="loading-spinner" />
                  <span>Model yuklanmoqda...</span>
                </div>
              }>
                <Canvas
                  camera={{ position: [4, 3, 5], fov: 50 }}
                  gl={{ antialias: true, alpha: true }}
                  style={{ background: 'transparent' }}
                >
                  <Scene3D shapeKey={selectedShape} dims={effectiveDims} />
                </Canvas>
              </Suspense>
              <div className="canvas-label">
                <span className="canvas-label-icon">{currentShape?.icon}</span>
                <span>{currentShape?.name}</span>
                <span className="canvas-hint">🖱 Sichqoncha bilan aylantiring</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
