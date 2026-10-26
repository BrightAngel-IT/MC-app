const fs = require('fs');

let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

// 1. Add searchQuery state
const stateStr = 'const [isAvailable, setIsAvailable] = useState(true);';
if (!code.includes('const [searchQuery, setSearchQuery] = useState(\'\');')) {
  code = code.replace(stateStr, stateStr + '\n  const [searchQuery, setSearchQuery] = useState(\'\');\n  const [isSearchingLocation, setIsSearchingLocation] = useState(false);');
}

// 2. Add searchLocation function
const searchFuncStr = `
  const searchLocation = async () => {
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
`;

const updateWorkingAreaStr = 'const updateWorkingArea = async (lat, lng) => {';
if (!code.includes('const searchLocation = async () => {')) {
  code = code.replace(updateWorkingAreaStr, searchFuncStr + '\n\n  ' + updateWorkingAreaStr);
}

// 3. Add search bar to the modal, right above the map component
const mapCompStr = '<MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} />';
const searchBarJSX = `
            <View style={{ flexDirection: 'row', padding: 10, backgroundColor: 'white', zIndex: 10 }}>
              <TextInput 
                style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, marginRight: 10 }}
                placeholder="Search area (e.g. Colombo)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchLocation}
              />
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 50 }}
                onPress={searchLocation}
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={20} color="white" />}
              </TouchableOpacity>
            </View>
            `;
if (code.includes(mapCompStr)) {
  code = code.replace(mapCompStr, searchBarJSX + '<MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} serveEverywhere={serveEverywhere} serviceRadius={serviceRadius} isAvailable={isAvailable} />');
}

// 4. Also disable the confirm location button when isAvailable is off
// Find the Confirm Location button: `disabled={isUpdatingLocation}`
// Change it to: `disabled={isUpdatingLocation || !isAvailable}`
// AND change opacity if disabled!
const confirmBtnTarget = `disabled={isUpdatingLocation}`;
const confirmBtnReplacement = `disabled={isUpdatingLocation || !isAvailable} style={{ backgroundColor: (!isAvailable) ? '#ccc' : colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: isAvailable ? 0 : 10 }}`;

// Wait, the style is already on the TouchableOpacity. Let's just find the exact text:
// <TouchableOpacity 
//   style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: isAvailable ? 0 : 10 }}
//   onPress={() => updateWorkingArea(selectedRegion.latitude, selectedRegion.longitude)}
//   disabled={isUpdatingLocation}
// >

code = code.replace(
  `style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: isAvailable ? 0 : 10 }}
                onPress={() => updateWorkingArea(selectedRegion.latitude, selectedRegion.longitude)}
                disabled={isUpdatingLocation}`,
  `style={{ backgroundColor: (!isAvailable) ? '#ccc' : colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: isAvailable ? 0 : 10 }}
                onPress={() => updateWorkingArea(selectedRegion.latitude, selectedRegion.longitude)}
                disabled={isUpdatingLocation || !isAvailable}`
);

// If it didn't match perfectly, just replace `disabled={isUpdatingLocation}` generically
if (!code.includes('disabled={isUpdatingLocation || !isAvailable}')) {
    code = code.replace('disabled={isUpdatingLocation}', 'disabled={isUpdatingLocation || !isAvailable}');
}

fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
console.log('Successfully injected search bar and disabled Confirm Location');
