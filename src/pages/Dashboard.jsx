import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

export function Dashboard() {
    return (
        <div className="dashboard">
            {/* Top Navigation */}
            <nav className="dashboard-nav">
                <div className="nav-logo">
                    <Link to="/" className="header-logo-link" title="Bosh sahifa">
                        <img src="/src/logo/logo.png" alt="NovaTex Logo" className="header-logo-img" />
                    </Link>
                    <span className="gradient-text">NovaTex</span>
                </div>
                <UserMenu />
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <h1>
                        <span className="gradient-text">3D Matematik</span>
                        <br />
                        Modellashtirish Platformasi
                    </h1>
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
                    <Link to="/2d-models" className="category-card active">
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
                    <Link to="/3d-models" className="category-card active">
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
                        <p>mm, sm, m, km - istalgan birlik</p>
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
