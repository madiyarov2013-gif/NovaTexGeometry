import re

path = r'C:\Users\Admin\Desktop\NovaTexGeometry-main\src\pages\PrizmaPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add unitSymbol to Prizma3D function signature
content = content.replace(
    '    showMedians,\n    showBaseDiagonals\n}) {',
    '    showMedians,\n    showBaseDiagonals,\n    unitSymbol\n}) {'
)

# 2. Height label: h = {height}
content = content.replace(
    '                        h = {height}\n                    </Text>',
    '                        h = {height} {unitSymbol}\n                    </Text>'
)

# 3. Apothem label: a_p = {apothem.toFixed(2)}
content = content.replace(
    '                        a_p = {apothem.toFixed(2)}\n                    </Text>',
    '                        a_p = {apothem.toFixed(2)} {unitSymbol}\n                    </Text>'
)

# 4. Side label: a = {sideLength}
content = content.replace(
    '                            a = {sideLength}\n                        </Text>',
    '                            a = {sideLength} {unitSymbol}\n                        </Text>'
)

# 5. Radius label: R = {radius.toFixed(2)}
content = content.replace(
    '                            R = {radius.toFixed(2)}\n                        </Text>',
    '                            R = {radius.toFixed(2)} {unitSymbol}\n                        </Text>'
)

# 6. Normal view Prizma3D call - add unitSymbol prop
content = content.replace(
    '                                showBaseDiagonals={showBaseDiagonals}\n                            />\n                        </group>\n\n                        {showGrid && (',
    '                                showBaseDiagonals={showBaseDiagonals}\n                                unitSymbol={unitSymbol}\n                            />\n                        </group>\n\n                        {showGrid && ('
)

# 7. Fullscreen view Prizma3D call - add unitSymbol prop
content = content.replace(
    '                                        showBaseDiagonals={showBaseDiagonals}\n                                    />\n                                </group>\n                                {showGrid && (',
    '                                        showBaseDiagonals={showBaseDiagonals}\n                                        unitSymbol={unitSymbol}\n                                    />\n                                </group>\n                                {showGrid && ('
)

# 8. Add fullscreen parameter panel after drawing canvas
panel = '''
                        {/* Fullscreen Parameters Panel */}
                        <div className="fullscreen-info-panel" style={{ zIndex: 20, maxHeight: '70vh', overflowY: 'auto' }}>
                            <h3>?? Parametrlar</h3>
                            <div className="info-item">
                                <span>Birlik</span>
                                <div className="unit-selector" style={{ display: 'flex', gap: '4px' }}>
                                    {Object.entries(UNITS).map(([key, value]) => (
                                        <button
                                            key={key}
                                            className={`unit-btn ${unit === key ? 'active' : ''}`}
                                            onClick={() => handleUnitChange(key)}
                                            style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                                        >
                                            {value.symbol}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="info-divider" />
                            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                <span>Burchaklar: <strong>{sides}</strong></span>
                                <input
                                    type="range"
                                    min="3"
                                    max="12"
                                    value={sides}
                                    onChange={(e) => setSides(parseInt(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="info-divider" />
                            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                <span>Tomon (a): <strong>{sideLength} {unitSymbol}</strong></span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="20"
                                    step="0.1"
                                    value={sideLength}
                                    onChange={(e) => setSideLength(parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="info-divider" />
                            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                <span>Balandlik (h): <strong>{height} {unitSymbol}</strong></span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="20"
                                    step="0.1"
                                    value={height}
                                    onChange={(e) => setHeight(parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
'''

content = content.replace(
    '                        {/* Toast Notification */}',
    panel + '                        {/* Toast Notification */}'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
