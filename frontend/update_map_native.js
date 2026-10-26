const fs = require('fs');

let code = fs.readFileSync('src/components/MapComponent.js', 'utf8');

// 1. Add Circle import
code = code.replace(
  "import MapView, { UrlTile } from 'react-native-maps';",
  "import MapView, { UrlTile, Circle } from 'react-native-maps';"
);

// 2. Add props
code = code.replace(
  'const MapComponent = ({ selectedRegion, setSelectedRegion }) => {',
  'const MapComponent = ({ selectedRegion, setSelectedRegion, serveEverywhere, serviceRadius, isAvailable }) => {'
);

// 3. Add Circle to MapView
const circleStr = `
        {isAvailable && !serveEverywhere && serviceRadius && !isNaN(parseFloat(serviceRadius)) && (
          <Circle
            center={selectedRegion}
            radius={parseFloat(serviceRadius) * 1000}
            fillColor="rgba(0, 150, 255, 0.2)"
            strokeColor="rgba(0, 150, 255, 0.5)"
            strokeWidth={2}
          />
        )}
      `;

code = code.replace('</MapView>', circleStr + '</MapView>');

fs.writeFileSync('src/components/MapComponent.js', code, 'utf8');
console.log('Successfully injected Circle to Native map');
