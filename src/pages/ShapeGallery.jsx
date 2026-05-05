import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

export function ShapeGallery() {
    const shapes = [
        {
            id: 'prizma',
            name: 'Prizma',
            description: "Ko'pburchakli asos, parallel yon yuzalar",
            icon: '⬡',
            color: '#6366f1',
            ready: true
        },
        {
            id: 'piramida',
            name: 'Piramida',
            description: "Ko'pburchakli asos, cho'qqi nuqtasi",
            icon: '△',
            color: '#10b981',
            ready: true
        },
        {
            id: 'silindr',
            name: 'Silindr',
            description: 'Doira asos, silindrik yon sirt',
            icon: '◎',
            color: '#f59e0b',
            ready: true
        },
        {
            id: 'konus',
            name: 'Konus',
            description: "Doira asos, cho'qqi nuqtasi",
            icon: '▲',
            color: '#ef4444',
            ready: true
        },
        {
            id: 'shar',
            name: 'Shar',
            description: 'Markazdan teng masofadagi nuqtalar',
            icon: '●',
            color: '#8b5cf6',
            ready: true
        },
        {
            id: 'konus-kesma',
            name: 'Kesik Konus',
            description: 'Parallel tekislik bilan kesilgan konus',
            icon: '⏺',
            color: '#ec4899',
            ready: true
        }
    ];

    return (
        <div className="shape-gallery">
            {/* Header */}
            <header className="gallery-header">
                <Link to="/" className="back-btn">
                    ← Orqaga
                </Link>
                <div>
                    <h1>3D Modellar</h1>
                    <p>Fazoviy shaklni tanlang</p>
                </div>
                <UserMenu />
            </header>

            {/* Shape Grid */}
            <div className="shape-grid">
                {shapes.map(shape => (
                    shape.ready ? (
                        <Link
                            key={shape.id}
                            to={`/3d-models/${shape.id}`}
                            className="shape-card"
                            style={{ '--accent-color': shape.color }}
                        >
                            <div className="shape-icon" style={{ color: shape.color }}>
                                {shape.icon}
                            </div>
                            <h3>{shape.name}</h3>
                            <p>{shape.description}</p>
                            <div className="shape-arrow">→</div>
                        </Link>
                    ) : (
                        <div
                            key={shape.id}
                            className="shape-card disabled"
                            style={{ '--accent-color': shape.color }}
                        >
                            <div className="shape-icon" style={{ color: shape.color, opacity: 0.5 }}>
                                {shape.icon}
                            </div>
                            <h3>{shape.name}</h3>
                            <p>{shape.description}</p>
                            <div className="coming-soon-badge">Tez kunda</div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
