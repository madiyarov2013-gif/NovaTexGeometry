import { shapes, calculateVolume, calculateSurfaceArea } from '../data/shapes';

export function MathInfo({ shapeType, params }) {
    const shape = shapes[shapeType];

    if (!shape) return null;

    const volume = calculateVolume(shapeType, params);
    const surfaceArea = calculateSurfaceArea(shapeType, params);

    return (
        <div className="math-info">
            <h2>📐 {shape.name}</h2>

            {/* Tavsif */}
            <div className="info-section">
                <h3>📝 Ta'rif</h3>
                <p>{shape.description}</p>
            </div>

            {/* Joriy hisob-kitoblar */}
            <div className="info-section calculations">
                <h3>🔢 Joriy qiymatlar</h3>
                <div className="calc-grid">
                    <div className="calc-item">
                        <span className="calc-label">Hajmi:</span>
                        <span className="calc-value">{volume.toFixed(2)} sm³</span>
                    </div>
                    <div className="calc-item">
                        <span className="calc-label">Sirt maydoni:</span>
                        <span className="calc-value">{surfaceArea.toFixed(2)} sm²</span>
                    </div>
                </div>
            </div>

            {/* Formulalar */}
            <div className="info-section formulas">
                <h3>📊 Formulalar</h3>
                {Object.entries(shape.formulas).map(([key, formula]) => (
                    <div key={key} className="formula-item">
                        <div className="formula-name">{formula.name}</div>
                        <div className="formula-equation">{formula.formula}</div>
                        <div className="formula-desc">{formula.description}</div>
                    </div>
                ))}
            </div>

            {/* Xossalar */}
            <div className="info-section properties">
                <h3>✨ Xossalar</h3>
                <ul>
                    {shape.properties.map((prop, index) => (
                        <li key={index}>{prop}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
