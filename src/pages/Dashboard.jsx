import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';
import { HoverText } from '../components/HoverText';

export function Dashboard() {
    return (
        <div className="dashboard">
            {/* Top Navigation */}
            <nav className="dashboard-nav">
                <div className="nav-logo">
                    <Link to="/" className="header-logo-link" title="Bosh sahifa">
                        <img src="/logo.png" alt="NovaTex Logo" className="header-logo-img" />
                    </Link>
                    <span className="gradient-text">NovaTex</span>
                </div>
                <UserMenu />
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-hovertext-wrapper">
                        <HoverText
                            text="3D Matematik"
                            fontSize="52px"
                            fontWeight="800"
                            strokeWidth={0.5}
                            duration={0.15}
                            animationDuration={4}
                            gradientColors={['#6366f1', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1']}
                            strokeColor="rgba(255, 255, 255, 0.3)"
                            viewBoxWidth={600}
                            viewBoxHeight={90}
                        />
                        <HoverText
                            text="Modellashtirish Platformasi"
                            fontSize="42px"
                            fontWeight="800"
                            strokeWidth={0.5}
                            duration={0.15}
                            animationDuration={5}
                            gradientColors={['#ffffff', '#a78bfa', '#60a5fa', '#34d399', '#ffffff']}
                            strokeColor="rgba(255, 255, 255, 0.2)"
                            viewBoxWidth={800}
                            viewBoxHeight={80}
                        />
                    </div>
                    <p className="hero-subtitle">
                        Fazoviy shakllarni interaktiv o'rganish uchun professional vosita
                    </p>
                </div>
                <div className="hero-decoration">
                    <div className="floating-shape shape-1"></div>
                    <div className="floating-shape shape-2"></div>
                    <div className="floating-shape shape-3"></div>
                </div>
            </section>

            {/* Category Selection */}
            <section className="categories">
                <h2>Bo'limni tanlang</h2>
                <div className="category-cards">
                    {/* 2D Models Card */}
                    <Link to="/2d-models" className="category-card card-2d">
                        <div className="card-icon">
                            <svg className="custom-glass-icon" viewBox="0 0 100 100" width="70" height="70" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.4))' }}>
                                <defs>
                                    <linearGradient id="glassClear" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                                        <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                                    </linearGradient>
                                    <linearGradient id="glassPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(167, 139, 250, 0.95)" />
                                        <stop offset="100%" stopColor="rgba(91, 33, 182, 0.8)" />
                                    </linearGradient>
                                </defs>
                                <style>
                                    {`
                                        @keyframes float-icon-1 {
                                            0%, 100% { transform: translateY(0px); }
                                            50% { transform: translateY(-4px); }
                                        }
                                        @keyframes float-icon-2 {
                                            0%, 100% { transform: translateY(0px); }
                                            50% { transform: translateY(-3px); }
                                        }
                                        @keyframes float-icon-3 {
                                            0%, 100% { transform: translateY(0px); }
                                            50% { transform: translateY(-5px); }
                                        }
                                    `}
                                </style>
                                {/* Circle (Top) */}
                                <g style={{ animation: 'float-icon-1 3s ease-in-out infinite' }}>
                                    <circle cx="50" cy="30" r="26" fill="url(#glassPurple)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                                </g>
                                {/* Square (Bottom Left) */}
                                <g style={{ animation: 'float-icon-2 3.5s ease-in-out infinite 0.5s' }}>
                                    <rect x="8" y="55" width="40" height="40" rx="6" fill="url(#glassClear)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" transform="rotate(-12 28 75)" />
                                </g>
                                {/* Triangle (Bottom Right) */}
                                <g style={{ animation: 'float-icon-3 2.8s ease-in-out infinite 1s' }}>
                                    <polygon points="56,92 96,92 76,52" fill="url(#glassClear)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinejoin="round" />
                                </g>
                            </svg>
                        </div>
                        <h3>2D Modellar</h3>
                        <p>Tekis shakllar: uchburchak, to'rtburchak, doira va boshqalar</p>
                        <div className="card-shapes">
                            <span>△</span>
                            <span>□</span>
                            <span>○</span>
                            <span>◇</span>
                        </div>
                        <div className="card-arrow">→</div>
                    </Link>

                    {/* 3D Models Card */}
                    <Link to="/3d-models" className="category-card card-3d">
                        <div className="card-icon">
                            <svg className="custom-3d-wireframe" viewBox="0 0 100 100" width="70" height="70" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.4))', overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="cubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#38bdf8" />
                                        <stop offset="100%" stopColor="#c084fc" />
                                    </linearGradient>
                                    <linearGradient id="cubeGradDim" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
                                        <stop offset="100%" stopColor="rgba(192, 132, 252, 0.4)" />
                                    </linearGradient>
                                </defs>
                                <style>
                                    {`
                                        @keyframes float-cube {
                                            0%, 100% { transform: translateY(0px); }
                                            50% { transform: translateY(-5px); }
                                        }
                                        .glow-line {
                                            stroke-dasharray: 300;
                                            stroke-dashoffset: 300;
                                            animation: draw-line 3s ease-out forwards;
                                        }
                                        @keyframes draw-line {
                                            to { stroke-dashoffset: 0; }
                                        }
                                    `}
                                </style>
                                <g style={{ animation: 'float-cube 4s ease-in-out infinite' }}>
                                    {/* Blueprint accent lines */}
                                    <line x1="6" y1="29" x2="48" y2="5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                    <line x1="94" y1="29" x2="52" y2="5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                    <line x1="6" y1="81" x2="48" y2="105" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                    <line x1="94" y1="81" x2="52" y2="105" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                    <line x1="5" y1="36" x2="5" y2="74" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                    <line x1="95" y1="36" x2="95" y2="74" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

                                    {/* Arrow heads for accents */}
                                    <polygon points="6,29 10,29 8,26" fill="rgba(255,255,255,0.6)" transform="rotate(-30 6 29)" />
                                    <polygon points="48,5 44,5 46,8" fill="rgba(255,255,255,0.6)" transform="rotate(-30 48 5)" />
                                    <polygon points="94,29 90,29 92,26" fill="rgba(255,255,255,0.6)" transform="rotate(30 94 29)" />
                                    <polygon points="52,5 56,5 54,8" fill="rgba(255,255,255,0.6)" transform="rotate(30 52 5)" />
                                    <polygon points="6,81 10,81 8,84" fill="rgba(255,255,255,0.6)" transform="rotate(30 6 81)" />
                                    <polygon points="48,105 44,105 46,102" fill="rgba(255,255,255,0.6)" transform="rotate(30 48 105)" />
                                    <polygon points="94,81 90,81 92,84" fill="rgba(255,255,255,0.6)" transform="rotate(-30 94 81)" />
                                    <polygon points="52,105 56,105 54,102" fill="rgba(255,255,255,0.6)" transform="rotate(-30 52 105)" />

                                    {/* Outer Hexagon */}
                                    <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="url(#cubeGrad)" strokeWidth="2.5" className="glow-line" strokeLinejoin="round" />
                                    
                                    {/* Front edges (Y-shape) */}
                                    <polyline points="15,35 50,55 85,35" fill="none" stroke="url(#cubeGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="50" y1="55" x2="50" y2="95" stroke="url(#cubeGrad)" strokeWidth="2.5" strokeLinecap="round" />
                                    
                                    {/* Cross bracing / blueprint lines on faces */}
                                    <line x1="15" y1="35" x2="50" y2="95" stroke="url(#cubeGradDim)" strokeWidth="1" />
                                    <line x1="15" y1="75" x2="50" y2="55" stroke="url(#cubeGradDim)" strokeWidth="1" />
                                    
                                    <line x1="85" y1="35" x2="50" y2="95" stroke="url(#cubeGradDim)" strokeWidth="1" />
                                    <line x1="85" y1="75" x2="50" y2="55" stroke="url(#cubeGradDim)" strokeWidth="1" />
                                    
                                    <line x1="15" y1="35" x2="85" y2="35" stroke="url(#cubeGradDim)" strokeWidth="1" />
                                    <line x1="50" y1="15" x2="50" y2="55" stroke="url(#cubeGradDim)" strokeWidth="1" />
                                </g>
                            </svg>
                        </div>
                        <h3>3D Modellar</h3>
                        <p>Fazoviy shakllar: prizma, silindr, konus, shar va boshqalar</p>
                        <div className="card-shapes">
                            <span>⬡</span>
                            <span>◎</span>
                            <span>△</span>
                            <span>●</span>
                        </div>
                        <div className="card-arrow">→</div>
                    </Link>

                    {/* Custom Builder Card */}
                    <Link to="/create-shape" className="category-card card-builder" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-icon">
                            <svg className="custom-tools-icon" viewBox="0 0 120 100" width="80" height="70" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.4))', overflow: 'visible' }}>
                                <defs>
                                    {/* Compass Gradients */}
                                    <linearGradient id="metalMain" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#f8fafc" />
                                        <stop offset="50%" stopColor="#cbd5e1" />
                                        <stop offset="100%" stopColor="#94a3b8" />
                                    </linearGradient>
                                    <linearGradient id="metalDark" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#64748b" />
                                        <stop offset="100%" stopColor="#334155" />
                                    </linearGradient>

                                    {/* Pencil Gradients */}
                                    <linearGradient id="pencilBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#0ea5e9" />
                                        <stop offset="30%" stopColor="#38bdf8" />
                                        <stop offset="70%" stopColor="#0284c7" />
                                        <stop offset="100%" stopColor="#0369a1" />
                                    </linearGradient>
                                    <linearGradient id="pencilWood" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#fef08a" />
                                        <stop offset="100%" stopColor="#ca8a04" />
                                    </linearGradient>
                                </defs>

                                <style>
                                    {`
                                        @keyframes float-compass {
                                            0%, 100% { transform: translateY(0px); }
                                            50% { transform: translateY(-4px); }
                                        }
                                        @keyframes float-pencil {
                                            0%, 100% { transform: translate(85px, 5px) rotate(30deg); }
                                            50% { transform: translate(85px, 0px) rotate(32deg); }
                                        }
                                    `}
                                </style>

                                {/* Compass (Sirkul) */}
                                <g style={{ animation: 'float-compass 4s ease-in-out infinite' }} transform="translate(15, 0)">
                                    {/* Top Handle */}
                                    <rect x="35" y="5" width="10" height="15" rx="3" fill="url(#metalMain)" />
                                    <rect x="32" y="20" width="16" height="6" rx="2" fill="url(#metalDark)" />
                                    
                                    {/* Center Hinge */}
                                    <circle cx="40" cy="36" r="14" fill="url(#metalMain)" />
                                    <circle cx="40" cy="36" r="8" fill="url(#metalDark)" />
                                    <circle cx="40" cy="36" r="4" fill="#f8fafc" />

                                    {/* Left Arm */}
                                    <g transform="rotate(22 40 36)">
                                        <rect x="35" y="45" width="10" height="40" rx="3" fill="url(#metalMain)" />
                                        {/* Inner cutout/detail */}
                                        <rect x="38" y="50" width="4" height="25" rx="1" fill="url(#metalDark)" opacity="0.3" />
                                        <polygon points="36,85 44,85 40,98" fill="url(#metalDark)" />
                                    </g>

                                    {/* Right Arm */}
                                    <g transform="rotate(-22 40 36)">
                                        <rect x="35" y="45" width="10" height="40" rx="3" fill="url(#metalMain)" />
                                        <rect x="38" y="50" width="4" height="25" rx="1" fill="url(#metalDark)" opacity="0.3" />
                                        {/* Graphite tip for pencil arm */}
                                        <polygon points="36,85 44,85 40,98" fill="#1e293b" />
                                    </g>
                                    
                                    {/* Adjustment Wheel */}
                                    <line x1="22" y1="65" x2="58" y2="65" stroke="url(#metalDark)" strokeWidth="3" strokeLinecap="round" />
                                    <rect x="36" y="58" width="8" height="14" rx="2" fill="url(#metalMain)" />
                                    <line x1="36" y1="62" x2="44" y2="62" stroke="#64748b" strokeWidth="1" />
                                    <line x1="36" y1="65" x2="44" y2="65" stroke="#64748b" strokeWidth="1" />
                                    <line x1="36" y1="68" x2="44" y2="68" stroke="#64748b" strokeWidth="1" />
                                </g>

                                {/* Pencil (Qalam) */}
                                <g style={{ animation: 'float-pencil 3.5s ease-in-out infinite 0.5s' }}>
                                    {/* Eraser */}
                                    <path d="M-7,0 C-7,-6 7,-6 7,0 L7,6 L-7,6 Z" fill="#e2e8f0" />
                                    {/* Metal Ferrule */}
                                    <rect x="-7" y="6" width="14" height="8" fill="url(#metalMain)" />
                                    <line x1="-7" y1="8" x2="7" y2="8" stroke="#64748b" strokeWidth="1" />
                                    <line x1="-7" y1="12" x2="7" y2="12" stroke="#64748b" strokeWidth="1" />
                                    {/* Blue Body */}
                                    <rect x="-7" y="14" width="14" height="55" fill="url(#pencilBlue)" />
                                    <line x1="-3" y1="14" x2="-3" y2="69" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                    {/* Scalloped edge between body and wood */}
                                    <path d="M-7,69 Q-3.5,65 0,69 Q3.5,65 7,69 L7,70 L-7,70 Z" fill="url(#pencilBlue)" />
                                    {/* Wood tip */}
                                    <polygon points="-7,69 7,69 0,86" fill="url(#pencilWood)" />
                                    {/* Graphite tip */}
                                    <polygon points="-2.5,80 2.5,80 0,86" fill="#1e293b" />
                                </g>
                            </svg>
                        </div>
                        <h3>Shakl Yaratish</h3>
                        <p>O'zingiz xohlagan 2D yoki 3D shaklni yarating, sm o'lchamlarni kiriting va hisob-kitoblarni ko'ring!</p>
                        <div className="card-shapes">
                            <span>📐</span>
                            <span>📏</span>
                            <span>📊</span>
                        </div>
                        <div className="card-arrow">→</div>
                    </Link>
                </div>
            </section>

            {/* Features */}
            <section className="features">
                <h2>Platforma xususiyatlari</h2>
                <div className="feature-grid">
                    <div className="feature-item">
                        <div className="feature-icon">🎮</div>
                        <h4>Interaktiv 3D</h4>
                        <p>Modellarni aylantiring, yaqinlashtiring</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📏</div>
                        <h4>Aniq o'lchovlar</h4>
                        <p>mm, sm, m - istalgan birlik</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📐</div>
                        <h4>Burchak graduslar</h4>
                        <p>0° dan 180° gacha kiritish</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📊</div>
                        <h4>Formulalar</h4>
                        <p>Hajm, sirt maydoni - o'zbekcha</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
