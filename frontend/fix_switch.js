const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

const targetStr = `<Switch disabled={!locationLat} value={locationLat ? isAvailable : false} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />`;
const newStr = `<Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
  console.log('Fixed switch');
} else {
  console.log('Target string not found');
}
