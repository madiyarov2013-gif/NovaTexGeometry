import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';
import { HoverText } from '../components/HoverText';

export function Dashboard() {
    const revealRootRef = useRef(null);

    useEffect(() => {
        const root = revealRootRef.current;
        if (!root) return;

        const targets = root.querySelectorAll('.reveal');
        if (!targets.length) return;

        if (typeof IntersectionObserver === 'undefined') {
            targets.forEach((el) => el.classList.add('in-view'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
        );

        targets.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="dashboard" ref={revealRootRef}>
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
            <section className="hero reveal reveal-up">
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
            <section className="categories reveal reveal-up">
                <h2>Bo'limni tanlang</h2>
                <div className="category-cards">
                    {/* 2D Models Card */}
                    <Link to="/2d-models" className="category-card card-2d reveal reveal-up reveal-delay-1">
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
                    <Link to="/3d-models" className="category-card card-3d reveal reveal-up reveal-delay-2">
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


                </div>
            </section>

            {/* Features */}
            <section className="features reveal reveal-up">
                <h2>Platforma xususiyatlari</h2>
                <div className="feature-grid">
                    <div className="feature-item reveal reveal-up reveal-delay-1">
                        <div className="feature-icon">🎮</div>
                        <h4>Interaktiv 3D</h4>
                        <p>Modellarni aylantiring, yaqinlashtiring</p>
                    </div>
                    <div className="feature-item reveal reveal-up reveal-delay-2">
                        <div className="feature-icon">📏</div>
                        <h4>Aniq o'lchovlar</h4>
                        <p>mm, sm, m - istalgan birlik</p>
                    </div>
                    <div className="feature-item reveal reveal-up reveal-delay-3">
                        <div className="feature-icon">📐</div>
                        <h4>Burchak graduslar</h4>
                        <p>0° dan 180° gacha kiritish</p>
                    </div>
                    <div className="feature-item reveal reveal-up reveal-delay-4">
                        <div className="feature-icon">📊</div>
                        <h4>Formulalar</h4>
                        <p>Hajm, sirt maydoni - o'zbekcha</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
