const fs = require('fs');
const path = 'C:\\Users\\Admin\\Desktop\\NovaTexGeometry-main\\src\\pages\\PrizmaPage.jsx';
let c = fs.readFileSync(path, 'utf-8');

// Replace all \r\n with \n for easier processing, then convert back
c = c.replace(/\r\n/g, '\n');

// 1. Add isFullscreen prop to Prizma3D signature
c = c.replace(
  '    showBaseDiagonals,\n    unitSymbol\n}) {',
  '    showBaseDiagonals,\n    unitSymbol,\n    isFullscreen\n}) {'
);

// 2. Wrap height label Html
c = c.replace(
  `                    {/* Balandlik label */}\n                    <Html\n                        position={[radius + 1.5, 0, 0]}\n                        style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        h = {height} {unitSymbol}\n                    </Html>`,
  `                    {!isFullscreen && (\n                    {/* Balandlik label */}\n                    <Html\n                        position={[radius + 1.5, 0, 0]}\n                        style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        h = {height} {unitSymbol}\n                    </Html>\n                    )}`
);

// 3. Wrap angle value Html
c = c.replace(
  `                                {/* Burchak qiymati */}\n                                <Html\n                                    position={[\n                                        vertex.x + Math.cos((startAngle + endAngle) / 2) * (arcRadius + 0.8),\n                                        vertex.y + Math.sin((startAngle + endAngle) / 2) * (arcRadius + 0.8),\n                                        -height/2 + 0.1\n                                    ]}\n                                    center\n                                    style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}\n                                >\n                                    {interiorAngle.toFixed(0)}°\n                                </Html>`,
  `                                {!isFullscreen && (\n                                {/* Burchak qiymati */}\n                                <Html\n                                    position={[\n                                        vertex.x + Math.cos((startAngle + endAngle) / 2) * (arcRadius + 0.8),\n                                        vertex.y + Math.sin((startAngle + endAngle) / 2) * (arcRadius + 0.8),\n                                        -height/2 + 0.1\n                                    ]}\n                                    center\n                                    style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}\n                                >\n                                    {interiorAngle.toFixed(0)}°\n                                </Html>\n                                )}`
);

// 4. Wrap apotema label Html
c = c.replace(
  `                    {/* Apotema label */}\n                    <Html\n                        position={[0, -height/2 - 1, 0]}\n                        center\n                        style={{ color: '#06b6d4', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        a_p = {apothem.toFixed(2)} {unitSymbol}\n                    </Html>`,
  `                    {!isFullscreen && (\n                    {/* Apotema label */}\n                    <Html\n                        position={[0, -height/2 - 1, 0]}\n                        center\n                        style={{ color: '#06b6d4', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        a_p = {apothem.toFixed(2)} {unitSymbol}\n                    </Html>\n                    )}`
);

// 5. Wrap side label Html
c = c.replace(
  `                    {/* Side Label */}\n                    <Html\n                        position={[0, -height/2 - 1.5, 0]}\n                        center\n                        style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        a = {sideLength} {unitSymbol}\n                    </Html>`,
  `                    {!isFullscreen && (\n                    {/* Side Label */}\n                    <Html\n                        position={[0, -height/2 - 1.5, 0]}\n                        center\n                        style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        a = {sideLength} {unitSymbol}\n                    </Html>\n                    )}`
);

// 6. Wrap radius label Html
c = c.replace(
  `                    {/* Radius Label */}\n                    <Html\n                        position={[radius/2, -height/2 - 1, 0]}\n                        center\n                        style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        R = {radius.toFixed(2)} {unitSymbol}\n                    </Html>`,
  `                    {!isFullscreen && (\n                    {/* Radius Label */}\n                    <Html\n                        position={[radius/2, -height/2 - 1, 0]}\n                        center\n                        style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}\n                    >\n                        R = {radius.toFixed(2)} {unitSymbol}\n                    </Html>\n                    )}`
);

// 7. Add isFullscreen={true} to fullscreen Prizma3D call
c = c.replace(
  `                                        showBaseDiagonals={showBaseDiagonals}\n                                        unitSymbol={unitSymbol}\n                                    />`,
  `                                        showBaseDiagonals={showBaseDiagonals}\n                                        unitSymbol={unitSymbol}\n                                        isFullscreen={true}\n                                    />`
);

// Convert back to CRLF
c = c.replace(/\n/g, '\r\n');

fs.writeFileSync(path, c, 'utf-8');
console.log('Done');
