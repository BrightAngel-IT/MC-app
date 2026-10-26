const fs = require('fs');
let code = fs.readFileSync('src/screens/Vendor/VendorDashboard.js', 'utf8');

const uiTarget = `<View style={{flexDirection: 'row', alignItems: 'center'}}>`;
const uiNew = `<View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => {
            if (locationLat && locationLng) {
              setSelectedRegion({ latitude: locationLat, longitude: locationLng, latitudeDelta: 0.05, longitudeDelta: 0.05 });
            } else {
              requestLocation();
            }
            setMapModalVisible(true);
          }} style={{ marginRight: 15, padding: 4, borderRadius: 20, backgroundColor: locationLat ? colors.primary + '20' : '#fee2e2' }}>
            <Ionicons name="location" size={24} color={locationLat ? colors.primary : '#ef4444'} />
          </TouchableOpacity>`;
code = code.replace(uiTarget, uiNew);

const modalTarget = `</ScrollView>
  );
};`;
const modalNew = `</ScrollView>
  <Modal visible={mapModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', elevation: 2 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Set Pharmacy Location</Text>
              <Text style={{ color: '#64748b' }}>Drag the map to pinpoint your location</Text>
            </View>
            <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1 }}>
            <View style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
              <TouchableOpacity style={{ backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 }} onPress={requestLocation}>
                {isGettingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="locate" size={20} color="white" />}
              </TouchableOpacity>
            </View>
            <MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} isAvailable={true} />
            
            <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 10 }}>
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
          </View>
        </View>
      </Modal>
  );
};`;
if (!code.includes('<Modal visible={mapModalVisible}')) {
  code = code.replace(modalTarget, modalNew);
}

// Add ActivityIndicator import
if (!code.includes('ActivityIndicator')) {
    code = code.replace(
        "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';",
        "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';"
    );
}

fs.writeFileSync('src/screens/Vendor/VendorDashboard.js', code, 'utf8');
console.log('Fixed VendorDashboard icon and modal');
