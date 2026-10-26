const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');
code = code.replace(
  "import AsyncStorage from '@react-native-async-storage/async-storage';",
  "import AsyncStorage from '@react-native-async-storage/async-storage';\nimport MapView, { UrlTile } from 'react-native-maps';"
);
fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code);
console.log('Added import!');
