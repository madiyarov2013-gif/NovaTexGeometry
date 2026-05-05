const fs = require('fs');
const path = 'C:\\Users\\Admin\\Desktop\\NovaTexGeometry-main\\src\\pages\\PrizmaPage.jsx';
let c = fs.readFileSync(path, 'utf-8');

// 1. Add isFullscreen prop to Prizma3D function signature
c = c.replace(
  '    showBaseDiagonals,\n    unitSymbol\n}) {',
  '    showBaseDiagonals,\n    unitSymbol,\n    isFullscreen\n}) {'
);

// 2. Height label: wrap with {!isFullscreen && ...}
c = c.replace(
  /(\s*\{\/\* Balandlik label \*\/\}\r?\n)(\s*<Html\r?\n\s*position=\{\[radius \+ 1\.5, 0, 0\]\}\r?\n\s*style=\{\{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' \}\}\r?\n\s*>\r?\n\s*h = \{height\} \{unitSymbol\}\r?\n\s*<\/Html>)/,
  '$1{!isFullscreen \u0026\u0026 (
$2
                    )}'
);

// 3. Angle value label
c = c.replace(
  /(\s*\{\/\* Burchak qiymati \*\/\}\r?\n)(\s*<Html\r?\n\s*position=\{\[\r?\n\s*vertex\.x \+ Math\.cos\(\(startAngle \+ endAngle\) \/ 2\) \* \(arcRadius \+ 0\.8\),\r?\n\s*vertex\.y \+ Math\.sin\(\(startAngle \+ endAngle\) \/ 2\) \* \(arcRadius \+ 0\.8\),\r?\n\s*-height\/2 \+ 0\.1\r?\n\s*\]\}\r?\n\s*center\r?\n\s*style=\{\{ color: '#8b5cf6', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' \}\}\r?\n\s*>\r?\n\s*\{interiorAngle\.toFixed\(0\)\}°\r?\n\s*<\/Html>)/,
  '$1{!isFullscreen \u0026\u0026 (
$2
                                )}'
);

// 4. Apotema label
c = c.replace(
  /(\s*\{\/\* Apotema label \*\/\}\r?\n)(\s*<Html\r?\n\s*position=\{\[0, -height\/2 - 1, 0\]\}\r?\n\s*center\r?\n\s*style=\{\{ color: '#06b6d4', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' \}\}\r?\n\s*>\r?\n\s*a_p = \{apothem\.toFixed\(2\)\} \{unitSymbol\}\r?\n\s*<\/Html>)/,
  '$1{!isFullscreen \u0026\u0026 (
$2
                    )}'
);

// 5. Side Label
c = c.replace(
  /(\s*\{\/\* Side Label \*\/\}\r?\n)(\s*<Html\r?\n\s*position=\{\[0, -height\/2 - 1\.5, 0\]\}\r?\n\s*center\r?\n\s*style=\{\{ color: '#10b981', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' \}\}\r?\n\s*>\r?\n\s*a = \{sideLength\} \{unitSymbol\}\r?\n\s*<\/Html>)/,
  '$1{!isFullscreen \u0026\u0026 (
$2
                    )}'
);

// 6. Radius Label
c = c.replace(
  /(\s*\{\/\* Radius Label \*\/\}\r?\n)(\s*<Html\r?\n\s*position=\{\[radius\/2, -height\/2 - 1, 0\]\}\r?\n\s*center\r?\n\s*style=\{\{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' \}\}\r?\n\s*>\r?\n\s*R = \{radius\.toFixed\(2\)\} \{unitSymbol\}\r?\n\s*<\/Html>)/,
  '$1{!isFullscreen \u0026\u0026 (
$2
                    )}'
);

// 7. Fullscreen Prizma3D call: add isFullscreen={true}
c = c.replace(
  /(\s*showBaseDiagonals=\{showBaseDiagonals\}\r?\n\s*unitSymbol=\{unitSymbol\}\r?\n\s*\/>\r?\n\s*\u003c\/group\u003e\r?\n\s*\{showGrid \u0026\u0026 \(\}\r?\n\s*\u003cGrid\r?\n\s*infiniteGrid\r?\n\s*fadeDistance=\{50\}\r?\n\s*fadeStrength=\{5\}\r?\n\s*cellSize=\{1\}\r?\n\s*cellColor=\{theme === 'dark' \? "#404040" : "#cccccc"\}\r?\n\s*sectionSize=\{5\}\r?\n\s*sectionColor=\{theme === 'dark' \? "#606060" : "#999999"\}\r?\n\s*\/>\r?\n\s*\}\r?\n\s*\{showAxes \u0026\u0026 \u003caxesHelper args=\{\[10\]\}\s*\/>\}\r?\n\s*\u003cOrbitControls)/,
  '                                        showBaseDiagonals={showBaseDiagonals}\n                                        unitSymbol={unitSymbol}\n                                        isFullscreen={true}\n                                    />\n                                </group>\n                                {showGrid \u0026\u0026 (\n                                    <Grid\n                                        infiniteGrid\n                                        fadeDistance={50}\n                                        fadeStrength={5}\n                                        cellSize={1}\n                                        cellColor={theme === \'dark\' ? "#404040" : "#cccccc"}\n                                        sectionSize={5}\n                                        sectionColor={theme === \'dark\' ? "#606060" : "#999999"}\n                                    />\n                                )}\n                                {showAxes \u0026\u0026 <axesHelper args={[10]} />}\n                                <OrbitControls'
);

fs.writeFileSync(path, c, 'utf-8');
console.log('Done');
