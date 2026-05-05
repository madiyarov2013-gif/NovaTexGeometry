import { shapes } from '../data/shapes';

export function ControlPanel({ shapeType, setShapeType, params, setParams, color, setColor }) {
    const currentShape = shapes[shapeType];

    const handleParamChange = (key, value) => {
        setParams(prev => ({
            ...prev,
            [key]: parseFloat(value)
        }));
    };

    const shapeColors = {
        prism: "#4f46e5",
        pyramid: "#10b981",
        cylinder: "#f59e0b",
        cone: "#ef4444",
        sphere: "#8b5cf6"
    };

    const handleShapeChange = (newShape) => {
        setShapeType(newShape);
        setColor(shapeColors[newShape]);

        // Yangi shakl uchun default parametrlarni o'rnatish
        const defaultParams = {};
        shapes[newShape].parameters.forEach(param => {
            defaultParams[param.key] = param.default;
        });
        setParams(defaultParams);
    };

    return (
        <div className="control-panel">
            <h2>🎛️ Boshqaruv paneli</h2>

            {/* Shakl tanlash */}
            <div className="control-group">
                <label>Shaklni tanlang:</label>
                <div className="shape-buttons">
                    {Object.keys(shapes).map(key => (
                        <button
                            key={key}
                            className={`shape-btn ${shapeType === key ? 'active' : ''}`}
                            onClick={() => handleShapeChange(key)}
                        >
                            {shapes[key].name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Parametrlar */}
            <div className="control-group">
                <label>Parametrlar:</label>
                {currentShape?.parameters.map(param => (
                    <div key={param.key} className="param-input">
                        <span>{param.label}</span>
                        <div className="slider-group">
                            <input
                                type="range"
                                min={param.min}
                                max={param.max}
                                step="0.1"
                                value={params[param.key] || param.default}
                                onChange={(e) => handleParamChange(param.key, e.target.value)}
                            />
                            <input
                                type="number"
                                min={param.min}
                                max={param.max}
                                step="0.1"
                                value={params[param.key] || param.default}
                                onChange={(e) => handleParamChange(param.key, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Rang tanlash */}
            <div className="control-group">
                <label>Rang:</label>
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="color-picker"
                />
            </div>

            {/* Yordam */}
            <div className="help-section">
                <h4>🎮 Boshqarish:</h4>
                <ul>
                    <li>🖱️ Sichqonchani suring — aylantirish</li>
                    <li>🔍 Scroll — yaqinlashtirish/uzoqlashtirish</li>
                    <li>➡️ O'ng tugma — surish</li>
                </ul>
            </div>
        </div>
    );
}
