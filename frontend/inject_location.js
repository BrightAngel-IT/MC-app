const fs = require('fs');

let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

// 1. Add expo-location import
if (!code.includes('import * as Location from \'expo-location\';')) {
  code = code.replace(
    "import AsyncStorage from '@react-native-async-storage/async-storage';",
    "import AsyncStorage from '@react-native-async-storage/async-storage';\nimport * as Location from 'expo-location';"
  );
}

// 2. Add getCurrentLocation function and state
const funcStr = `
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied. Please enable it in settings.');
        setIsGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setSelectedRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location.');
    } finally {
      setIsGettingLocation(false);
    }
  };
`;

if (!code.includes('const getCurrentLocation = async () => {')) {
  code = code.replace('const searchLocation = async () => {', funcStr + '\n  const searchLocation = async () => {');
}

// 3. Update the search bar UI to include the Current Location button
const oldSearchBar = `
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 50 }}
                onPress={searchLocation}
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={20} color="white" />}
              </TouchableOpacity>
            </View>
`;

const newSearchBar = `
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 50, marginRight: 10 }}
                onPress={searchLocation}
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={20} color="white" />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 50 }}
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="my-location" size={20} color="white" />}
              </TouchableOpacity>
            </View>
`;

if (code.includes(oldSearchBar)) {
  code = code.replace(oldSearchBar, newSearchBar);
}

fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
console.log('Successfully injected current location feature');
