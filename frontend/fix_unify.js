const fs = require('fs');

const webContent = fs.readFileSync('src/components/WebNearbyMap.web.js', 'utf8');

const unifiedContent = "import { Platform } from 'react-native';\n" + webContent.replace(
  'const WebNearbyMap = ({ location, professionals }) => {',
  "const WebNearbyMap = ({ location, professionals }) => {\n  if (Platform.OS !== 'web') return null;"
);

fs.writeFileSync('src/components/WebNearbyMap.js', unifiedContent, 'utf8');
console.log('Unified WebNearbyMap.js');
