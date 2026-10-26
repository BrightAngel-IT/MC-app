const fs = require('fs');
let code = fs.readFileSync('src/components/NearbyProfessionalsMap.js', 'utf8');

const oldStr = '<WebNearbyMap location={location} professionals={professionals} />';
const newStr = '{(() => { const WebMap = require("./WebNearbyMap.web.js").default || require("./WebNearbyMap.web.js"); return <WebMap location={location} professionals={professionals} />; })()}';

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync('src/components/NearbyProfessionalsMap.js', code, 'utf8');
  console.log('Fixed import');
}
