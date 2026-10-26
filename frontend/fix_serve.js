const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

code = code.replace(
  "await api.put('/professional/profile', { locationLat: lat, locationLng: lng, serveEverywhere, serviceRadius: parseInt(serviceRadius) || 10, availabilityStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE' });",
  "await api.put('/professional/profile', { locationLat: lat, locationLng: lng, serveEverywhere: false, serviceRadius: parseInt(serviceRadius) || 10, availabilityStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE' });"
);

code = code.replace(
  "if (prof.serveEverywhere !== undefined) setServeEverywhere(prof.serveEverywhere);",
  "// removed serveEverywhere"
);

fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
console.log('Fixed serveEverywhere');
