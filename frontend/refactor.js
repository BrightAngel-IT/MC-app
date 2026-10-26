const fs = require('fs');

let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

// 1. Remove MapView import and add MapComponent import
code = code.replace(
  "import MapView, { UrlTile } from 'react-native-maps';",
  "import MapComponent from '../../components/MapComponent';"
);

// 2. Replace the MapView block
const mapStart = '{MapView && (';
const mapEnd = '</MapView>\n            )}';

const sIdx = code.indexOf(mapStart);
const eIdx = code.indexOf(mapEnd);

if (sIdx !== -1 && eIdx !== -1) {
  const replacement = '<MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} />';
  code = code.substring(0, sIdx) + replacement + code.substring(eIdx + mapEnd.length);
  
  // also remove the old absolute location icon since it is now inside MapComponent
  const iconStr = `<View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -15, marginTop: -30 }}>
              <Ionicons name="location" size={30} color={colors.primary} />
            </View>`;
            
  // Use a more robust replace for the icon
  const iconIdx = code.indexOf('<View style={{ position: \'absolute\', top: \'50%\', left: \'50%\', marginLeft: -15, marginTop: -30 }}>');
  if (iconIdx !== -1) {
      const endIconIdx = code.indexOf('</View>', iconIdx);
      if (endIconIdx !== -1) {
          code = code.substring(0, iconIdx) + code.substring(endIconIdx + 7);
      }
  }

  fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
  console.log('Successfully refactored to MapComponent');
} else {
  console.log('Could not find map block');
}
