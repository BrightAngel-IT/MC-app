const fs = require('fs');

let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

// 1. Remove serveEverywhere state
code = code.replace('const [serveEverywhere, setServeEverywhere] = useState(true);', '');

// 2. Remove API logic conditionally checking it
code = code.replace('radius: serveEverywhere ? -1 : parseFloat(serviceRadius),', 'radius: parseFloat(serviceRadius),');

// 3. Regex to remove the entire Serve Everywhere View wrapper
// We will just do a string replace for the entire UI block to be safe.
const oldUIBlock = `                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>Serve Everywhere</Text>
                    <Switch value={serveEverywhere} onValueChange={setServeEverywhere} trackColor={{ true: colors.primary }} />
                  </View>
                  {!serveEverywhere && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                      <Text style={{ flex: 1, fontWeight: 'bold' }}>Service Radius (km):</Text>
                      <TextInput 
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 60, textAlign: 'center' }}
                        keyboardType="numeric"
                        value={serviceRadius}
                        onChangeText={setServiceRadius}
                      />
                    </View>
                  )}`;

const newUIBlock = `                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Service Radius (km):</Text>
                    <TextInput 
                      style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 60, textAlign: 'center' }}
                      keyboardType="numeric"
                      value={serviceRadius}
                      onChangeText={setServiceRadius}
                    />
                  </View>`;

code = code.replace(oldUIBlock, newUIBlock);

// 4. Update MapComponent props in ProfessionalDashboard.js to remove serveEverywhere
code = code.replace('serveEverywhere={serveEverywhere}', '');

fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
console.log('Removed serveEverywhere from dashboard');

// Now update MapComponent.js (Native)
let nativeMap = fs.readFileSync('src/components/MapComponent.js', 'utf8');
nativeMap = nativeMap.replace('serveEverywhere, ', '');
nativeMap = nativeMap.replace('!serveEverywhere && ', '');
fs.writeFileSync('src/components/MapComponent.js', nativeMap, 'utf8');

// Now update MapComponent.web.js (Web)
let webMap = fs.readFileSync('src/components/MapComponent.web.js', 'utf8');
webMap = webMap.replace('serveEverywhere, ', '');
webMap = webMap.replace('!serveEverywhere && ', '');
webMap = webMap.replace('serveEverywhere, ', ''); // for dependency array
fs.writeFileSync('src/components/MapComponent.web.js', webMap, 'utf8');

console.log('Done removing serveEverywhere everywhere!');
