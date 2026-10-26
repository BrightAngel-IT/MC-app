const fs = require('fs');
let code = fs.readFileSync('src/components/TimeFilter.js', 'utf8');
code = code.replace(/const styles = getStyles\(colors\)[\\s\\S]*?if \\(!styles\\) console\\.log\\(\"STYLES IS UNDEFINED!\"\\);/, 'const styles = getStyles(colors);');
fs.writeFileSync('src/components/TimeFilter.js', code);
