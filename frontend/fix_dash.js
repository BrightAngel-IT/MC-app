const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

// Payload replacement
code = code.replace(
  /await api\.put\('\/professional\/profile',\s*\{\s*locationLat:\s*lat,\s*locationLng:\s*lng,\s*serveEverywhere:\s*false,\s*serviceRadius:\s*parseInt\(serviceRadius\)\s*\|\|\s*10,\s*availabilityStatus:\s*isAvailable\s*\?\s*'AVAILABLE'\s*:\s*'UNAVAILABLE'\s*\}\);/,
  "await api.put('/professional/profile', { locationLat: lat, locationLng: lng, serveEverywhere: false, serviceRadius: parseInt(serviceRadius) || 10, availabilityStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE', bookingFee: parseFloat(bookingFee) || 0 });"
);

// Fetch parsing
code = code.replace(
  /if\s*\(prof\.serviceRadius\)\s*setServiceRadius\(prof\.serviceRadius\.toString\(\)\);/,
  "if (prof.serviceRadius) setServiceRadius(prof.serviceRadius.toString());\n        if (prof.bookingFee !== undefined && prof.bookingFee !== null) setBookingFee(prof.bookingFee.toString());"
);

// UI injection
const targetUI = /<Text style=\{\{\s*flex:\s*1,\s*fontWeight:\s*'bold'\s*\}\}>Service Radius \(km\):<\/Text>\s*<TextInput[\s\S]*?onChangeText=\{setServiceRadius\}\s*\/>\s*<\/View>\s*<\/>/;

const newUI = `<Text style={{ flex: 1, fontWeight: 'bold' }}>Service Radius (km):</Text>
                      <TextInput 
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 60, textAlign: 'center' }}
                        keyboardType="numeric"
                        value={serviceRadius}
                        onChangeText={setServiceRadius}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                      <Text style={{ flex: 1, fontWeight: 'bold' }}>Booking Fee (Rs.):</Text>
                      <TextInput 
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 80, textAlign: 'center' }}
                        keyboardType="numeric"
                        value={bookingFee}
                        onChangeText={setBookingFee}
                      />
                    </View>
                  </>`;
                  
code = code.replace(targetUI, newUI);

fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
console.log('Fixed ProfessionalDashboard finally');
