const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

const startTag = "{Platform.OS === 'web' ? (";
const endTag = "          )}";
const startIdx = code.indexOf(startTag);
const endIdx = code.lastIndexOf(endTag, code.indexOf('</Modal>'));

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = \          <View style={{ flex: 1 }}>
            {MapView && (
              <MapView 
                style={{ flex: 1 }} 
                region={selectedRegion}
                onRegionChangeComplete={(r) => setSelectedRegion(r)}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
              </MapView>
            )}
            <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -15, marginTop: -30 }}>
              <Ionicons name="location" size={30} color={colors.primary} />
            </View>
            
            <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Currently Available</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
              </View>
              {isAvailable && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
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
                  )}
                </>
              )}
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={() => updateWorkingArea(selectedRegion.latitude, selectedRegion.longitude)}
                disabled={isUpdatingLocation}
              >
                {isUpdatingLocation ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Confirm Location</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>\;

  code = code.substring(0, startIdx) + replacement + code.substring(endIdx + endTag.length);
  fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code);
  console.log('Update successful');
} else {
  console.log('Failed to find tags', startIdx, endIdx);
}
