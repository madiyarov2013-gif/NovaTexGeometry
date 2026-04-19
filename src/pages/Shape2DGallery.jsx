import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

export function Shape2DGallery() {
    const shapes = [
        {
            id: 'uchburchak',
            name: 'Uchburchak',
            description: "3 tomon va 3 burchakdan iborat tekis shakl",
            icon: '△',
            color: '#10b981',
            ready: true,
            formulas: ['S = (a × h) / 2', 'P = a + b + c']
        },
        {
            id: 'tortburchak',
            name: "To'rtburchak",
            description: "4 tomon va 4 burchakdan iborat tekis shakl",
            icon: '□',
            color: '#6366f1',
            ready: true,
            formulas: ['S = a × b', 'P = 2(a + b)']
        },
        {
            id: 'kvadrat',
            name: 'Kvadrat',
            description: "Barcha tomonlari teng to'rtburchak",
            icon: '■',
            color: '#8b5cf6',
            ready: true,
            formulas: ['S = a²', 'P = 4a']
        },
        {
            id: 'doira',
            name: 'Doira',
            description: 'Markazdan teng masofadagi nuqtalar',
            icon: '○',
            color: '#f59e0b',
            ready: true,
            formulas: ['S = πr²', 'C = 2πr']
        },
        {
            id: 'trapetsiya',
            name: 'Trapetsiya',
            description: 'Ikki tomoni parallel to\'rtburchak',
            icon: '⏢',
            color: '#ef4444',
            ready: true,
            formulas: ['S = (a + b) × h / 2']
        },
        {
            id: 'parallellogram',
            name: 'Parallelogramm',
            description: 'Qarama-qarshi tomonlari parallel',
            icon: '▱',
            color: '#ec4899',
            ready: true,
            formulas: ['S = a × h', 'P = 2(a + b)']
        },
        {
            id: 'romb',
            name: 'Romb',
            description: 'Barcha tomonlari teng parallelogramm',
            icon: '◇',
            color: '#14b8a6',
            ready: true,
            formulas: ['S = (d₁ × d₂) / 2']
        },
        {
            id: 'muntazam-koburchak',
            name: "Muntazam ko'pburchak",
            description: 'Barcha tomonlari va burchaklari teng',
            icon: '⬡',
            color: '#a855f7',
            ready: true,
            formulas: ['S = (n × a × apotema) / 2']
        }
    ];

    return (
        <div className="shape-gallery shape-2d-gallery">
            {/* Header */}
            <header className="gallery-header">
                <Link to="/" className="back-btn">
                    ← Orqaga
                </Link>
                <div>
                    <h1>📐 2D Modellar</h1>
                    <p>Tekis shaklni tanlang</p>
                </div>
                <UserMenu />
            </header>

            {/* Intro Section */}
            <section className="intro-section">
                <div className="intro-card">
                    <div className="intro-icon">📏</div>
                    <div className="intro-content">
                        <h2>Tekis geometrik shakllar</h2>
                        <p>
                            2D (ikki o'lchamli) shakllar — bu faqat uzunlik va kenglikka ega bo'lgan,
                            qalinligi bo'lmagan geometrik figuralar. Ular tekislikda joylashadi.
                        </p>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="shape-categories">
                <div className="category-section">
                    <h3>
                        <span className="category-icon">△</span>
                        Asosiy shakllar
                    </h3>
                    <div className="shape-grid">
                        {shapes.slice(0, 4).map(shape => (
                            <ShapeCard key={shape.id} shape={shape} />
                        ))}
                    </div>
                </div>

                <div className="category-section">
                    <h3>
                        <span className="category-icon">▱</span>
                        To'rtburchaklar
                    </h3>
                    <div className="shape-grid">
                        {shapes.slice(4, 7).map(shape => (
                            <ShapeCard key={shape.id} shape={shape} />
                        ))}
                    </div>
                </div>

                <div className="category-section">
                    <h3>
                        <span className="category-icon">⬡</span>
                        Ko'pburchaklar
                    </h3>
                    <div className="shape-grid">
                        {shapes.slice(7).map(shape => (
                            <ShapeCard key={shape.id} shape={shape} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Info Section */}
            <section className="info-section">
                <div className="info-grid">
                    <div className="info-card">
                        <div className="info-icon">📐</div>
                        <h4>Yuzasi (S)</h4>
                        <p>Shakl egallagan maydon, sm² yoki m²</p>
                    </div>
                    <div className="info-card">
                        <div className="info-icon">📏</div>
                        <h4>Perimetri (P)</h4>
                        <p>Barcha tomonlar yig'indisi</p>
                    </div>
                    <div className="info-card">
                        <div className="info-icon">📊</div>
                        <h4>Burchaklar</h4>
                        <p>Ichki burchaklar yig'indisi</p>
                    </div>
                    <div className="info-card">
                        <div className="info-icon">🔢</div>
                        <h4>O'lchovlar</h4>
                        <p>mm, sm, m, km - istalgan birlik</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ShapeCard({ shape }) {
    if (shape.ready) {
        return (
            <Link
                to={`/2d-models/${shape.id}`}
                className="shape-card-2d"
                style={{ '--accent-color': shape.color }}
            >
                <div className="shape-icon-2d" style={{ color: shape.color }}>
                    {shape.icon}
                </div>
                <div className="shape-info">
                    <h4>{shape.name}</h4>
                    <p>{shape.description}</p>
                    <div className="shape-formulas">
                        {shape.formulas.map((f, i) => (
                            <span key={i} className="formula-tag">{f}</span>
                        ))}
                    </div>
                </div>
                <div className="shape-arrow-2d">→</div>
            </Link>
        );
    }

    return (
        <div
            className="shape-card-2d disabled"
            style={{ '--accent-color': shape.color }}
        >
            <div className="shape-icon-2d" style={{ color: shape.color, opacity: 0.5 }}>
                {shape.icon}
            </div>
            <div className="shape-info">
                <h4>{shape.name}</h4>
                <p>{shape.description}</p>
                <div className="shape-formulas">
                    {shape.formulas.map((f, i) => (
                        <span key={i} className="formula-tag">{f}</span>
                    ))}
                </div>
            </div>
            <div className="coming-soon-badge-2d">Tez kunda</div>
        </div>
    );
}
