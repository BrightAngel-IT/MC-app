const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

const oldText = `{!isAvailable ? 'Currently Unavailable' : \`Serving: \${serviceRadius || 10}km Radius\`}`;
const newText = `{!locationLat ? 'Service area not set' : (!isAvailable ? 'Currently Unavailable' : \`Serving: \${serviceRadius || 10}km Radius\`)}`;

if (code.includes(oldText)) {
  code = code.replace(oldText, newText);
  fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
  console.log('Fixed text');
}
