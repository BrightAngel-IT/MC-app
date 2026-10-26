import sys

with open('src/screens/Professional/ProfessionalDashboard.js', 'r', encoding='utf-8') as f:
    code = f.read()

start_str = "          {Platform.OS === 'web' ? ("
end_str = "          )}"

start_idx = code.find(start_str)
if start_idx == -1:
    print('Failed to find start split')
    sys.exit(1)

modal_close_idx = code.find('</Modal>')
end_idx = code.rfind(end_str, 0, modal_close_idx)

if end_idx == -1:
    print('Failed to find end split')
    sys.exit(1)

replacement = """          <View style={{ flex: 1 }}>
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
                style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: isAvailable ? 0 : 10 }}
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
          </View>"""

new_code = code[:start_idx] + replacement + code[end_idx + len(end_str):]

with open('src/screens/Professional/ProfessionalDashboard.js', 'w', encoding='utf-8') as f:
    f.write(new_code)

print('Update successful via python!')
