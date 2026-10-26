const fs = require('fs');
let code = fs.readFileSync('src/screens/Vendor/VendorDashboard.js', 'utf8');

// 1. Add Switch and MaterialIcons imports
if (!code.includes('Switch')) {
    code = code.replace(
        "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';",
        "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';"
    );
}
if (!code.includes('MaterialIcons')) {
    code = code.replace(
        "import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';",
        "import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';"
    );
}

// 2. Add state
const stateTarget = `const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);`;
const stateNew = `const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [serviceRadius, setServiceRadius] = useState('10');
  const [isAvailable, setIsAvailable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);`;
if (!code.includes('setServiceRadius')) {
    code = code.replace(stateTarget, stateNew);
}

// 3. Add searchLocation
const reqTarget = `const requestLocation = async () => {`;
const reqNew = `const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const response = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(searchQuery));
      const data = await response.json();
      if (data && data.length > 0) {
        setSelectedRegion({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          latitudeDelta: 0.1,
          longitudeDelta: 0.1
        });
      } else {
        Alert.alert('Location Not Found', 'Could not find the location you searched for.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const requestLocation = async () => {`;
if (!code.includes('const searchLocation')) {
    code = code.replace(reqTarget, reqNew);
}

// 4. Update API call
const putTarget = `await api.put('/vendor/profile', { locationLat: lat, locationLng: lng });`;
const putNew = `await api.put('/vendor/profile', { locationLat: lat, locationLng: lng, serviceRadius: parseInt(serviceRadius) || 10, availabilityStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE' });`;
if (!code.includes('availabilityStatus')) {
    code = code.replace(putTarget, putNew);
}

// 5. Update fetchDashboard
const fetchTarget = `if (response.data.profile.locationLat) setLocationLat(response.data.profile.locationLat);
        if (response.data.profile.locationLng) setLocationLng(response.data.profile.locationLng);`;
const fetchNew = `if (response.data.profile.locationLat) setLocationLat(response.data.profile.locationLat);
        if (response.data.profile.locationLng) setLocationLng(response.data.profile.locationLng);
        if (response.data.profile.serviceRadius) setServiceRadius(response.data.profile.serviceRadius.toString());
        if (response.data.profile.availabilityStatus) setIsAvailable(response.data.profile.availabilityStatus === 'AVAILABLE');`;
if (!code.includes('response.data.profile.serviceRadius')) {
    code = code.replace(fetchTarget, fetchNew);
}

// 6. Update Map Component props
const mapTarget = `<MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} isAvailable={true} />`;
const mapNew = `<MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} isAvailable={isAvailable} serviceRadius={serviceRadius} />`;
code = code.replace(mapTarget, mapNew);

// 7. Update Modal UI
const modalUiTarget = `<View style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
              <TouchableOpacity style={{ backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 }} onPress={requestLocation}>
                {isGettingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="locate" size={20} color="white" />}
              </TouchableOpacity>
            </View>`;
const modalUiNew = `<View style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, elevation: 4, padding: 5 }}>
              <TextInput 
                style={{ flex: 1, padding: 10, marginRight: 10 }}
                placeholder="Search area (e.g. Colombo)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchLocation}
              />
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 40, marginRight: 10 }}
                onPress={searchLocation}
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={20} color="white" />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 40 }}
                onPress={requestLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="my-location" size={20} color="white" />}
              </TouchableOpacity>
            </View>`;
code = code.replace(modalUiTarget, modalUiNew);

const bottomUiTarget = `<View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 10 }}>
              <TouchableOpacity`;
const bottomUiNew = `<View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: (!locationLat ? 5 : 15), paddingBottom: (!locationLat ? 5 : 15), borderBottomWidth: (!locationLat ? 0 : 1), borderBottomColor: '#ddd' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: !locationLat ? '#999' : '#000' }}>Delivery/Service Available</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
              </View>
              {!locationLat && (
                <Text style={{ color: 'red', fontSize: 12, marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                  Please set your pharmacy location first to enable delivery.
                </Text>
              )}
              {locationLat && isAvailable && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Delivery Radius (km):</Text>
                    <TextInput 
                      style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 60, textAlign: 'center' }}
                      keyboardType="numeric"
                      value={serviceRadius}
                      onChangeText={setServiceRadius}
                    />
                  </View>
                </View>
              )}
              <TouchableOpacity`;
code = code.replace(bottomUiTarget, bottomUiNew);

fs.writeFileSync('src/screens/Vendor/VendorDashboard.js', code, 'utf8');
console.log('Fixed vendor map features');
