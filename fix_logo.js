const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
files.forEach(f => {
    const p = path.join(dir, f);
    let c = fs.readFileSync(p, 'utf8');
    c = c.split("src={new URL('../logo/logo.png', import.meta.url).href}").join('src="/logo.png"');
    fs.writeFileSync(p, c);
});
