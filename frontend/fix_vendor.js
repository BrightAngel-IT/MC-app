const fs = require('fs');
let code = fs.readFileSync('src/screens/Vendor/VendorDashboard.js', 'utf8');

// 1. Add MapComponent import
if (!code.includes('MapComponent')) {
  code = code.replace(
    "import NotificationBell from '../../components/NotificationBell';",
    "import NotificationBell from '../../components/NotificationBell';\nimport MapComponent from '../../components/MapComponent';\nimport * as Location from 'expo-location';"
  );
}

// 2. Add Location State
const stateTarget = "const [timeFilter, setTimeFilter] = useState('all');";
const stateNew = `const [timeFilter, setTimeFilter] = useState('all');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const requestLocation = async () => {
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to set your working area.');
        setIsGettingLocation(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setSelectedRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (e) {
      console.log('Location error', e);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const updateWorkingArea = async (lat, lng) => {
    try {
      setIsUpdatingLocation(true);
      await api.put('/vendor/profile', { locationLat: lat, locationLng: lng });
      setLocationLat(lat);
      setLocationLng(lng);
      setMapModalVisible(false);
      Alert.alert('Success', 'Location updated successfully!');
    } catch (err) {
      console.log('Update error', err);
      Alert.alert('Error', 'Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };`;
code = code.replace(stateTarget, stateNew);

// 3. Update fetchDashboard
const fetchTarget = `setRegularOrders(response.data.regularOrders || []);`;
const fetchNew = `setRegularOrders(response.data.regularOrders || []);
      if (response.data.profile) {
        if (response.data.profile.locationLat) setLocationLat(response.data.profile.locationLat);
        if (response.data.profile.locationLng) setLocationLng(response.data.profile.locationLng);
      }`;
code = code.replace(fetchTarget, fetchNew);

// 4. Add UI Location Set Button and Map Modal
const uiTarget = `<View style={styles.headerRight}>`;
const uiNew = `<View style={styles.headerRight}>
          <TouchableOpacity onPress={() => {
            if (locationLat && locationLng) {
              setSelectedRegion({ latitude: locationLat, longitude: locationLng, latitudeDelta: 0.05, longitudeDelta: 0.05 });
            } else {
              requestLocation();
            }
            setMapModalVisible(true);
          }} style={[styles.headerBtn, { marginRight: 15, backgroundColor: locationLat ? colors.primary + '30' : '#fee2e2' }]}>
            <Ionicons name="location" size={24} color={locationLat ? colors.primary : '#ef4444'} />
          </TouchableOpacity>`;
code = code.replace(uiTarget, uiNew);

const modalTarget = `</SafeAreaView>`;
const modalNew = `  <Modal visible={mapModalVisible} animationType="slide">
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
    </SafeAreaView>`;
code = code.replace(modalTarget, modalNew);

fs.writeFileSync('src/screens/Vendor/VendorDashboard.js', code, 'utf8');
console.log('Fixed VendorDashboard');
