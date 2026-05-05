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
                            strokeWidth={0.4}
                            duration={0.15}
                            animationDuration={4}
                            gradientColors={['#6366f1', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1']}
                            strokeColor="#3a3a5a"
                            viewBoxWidth={600}
                            viewBoxHeight={90}
                        />
                        <HoverText
                            text="Modellashtirish Platformasi"
                            fontSize="42px"
                            fontWeight="800"
                            strokeWidth={0.35}
                            duration={0.15}
                            animationDuration={5}
                            gradientColors={['#ffffff', '#a78bfa', '#60a5fa', '#34d399', '#ffffff']}
                            strokeColor="#2a2a3a"
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
                        <div className="card-icon">📐</div>
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
                        <div className="card-icon">🎲</div>
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
                        <div className="card-icon">🛠️</div>
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
