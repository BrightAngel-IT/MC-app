const fs = require('fs');
let code = fs.readFileSync('src/screens/Patient/PatientDashboard.js', 'utf8');

const mapTag = '<NearbyProfessionalsMap />';

if (code.includes(mapTag)) {
  // Remove the old one
  code = code.replace(/<NearbyProfessionalsMap \/>\s*/g, '');
  
  // Insert before Our Services
  const servicesTag = '<Text style={styles.sectionTitle}>Our Services</Text>';
  code = code.replace(servicesTag, '<NearbyProfessionalsMap />\n          ' + servicesTag);
  
  fs.writeFileSync('src/screens/Patient/PatientDashboard.js', code, 'utf8');
  console.log('Moved map successfully');
} else {
  console.log('Map tag not found');
}
