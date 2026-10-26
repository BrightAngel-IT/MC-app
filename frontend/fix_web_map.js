const fs = require('fs');
let code = fs.readFileSync('src/components/NearbyProfessionalsMap.js', 'utf8');

fs.writeFileSync('src/components/WebNearbyMap.js', 'export default function WebNearbyMap() { return null; }', 'utf8');

if (!code.includes('import WebNearbyMap')) {
  code = code.replace(
    "import { useNavigation } from '@react-navigation/native';",
    "import { useNavigation } from '@react-navigation/native';\nimport WebNearbyMap from './WebNearbyMap';"
  );
}

const oldWebBlock = `  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { borderColor: colors.border, height: 250, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }]}>
        <Text style={{ textAlign: 'center', fontSize: 14, color: colors.text }}>
          Map View is not supported on Web. Please use the mobile app to view nearby professionals on the map.
        </Text>
      </View>
    );
  }`;

const newWebBlock = `  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Nearby Healthcare Providers</Text>
        <View style={styles.filtersContainer}>
          <FilterButton role="ALL" label="All" icon="users" />
          <FilterButton role="DOCTOR" label="Doctors" icon="user-md" />
          <FilterButton role="NURSE" label="Nurses" icon="user-nurse" />
          <FilterButton role="PARAMEDIC" label="Ambulance" icon="ambulance" />
          <FilterButton role="LAB_TECH" label="Lab" icon="microscope" />
        </View>
        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          {loading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <WebNearbyMap location={location} professionals={professionals} />
        </View>
      </View>
    );
  }`;

if (code.includes('Map View is not supported on Web')) {
  code = code.replace(oldWebBlock, newWebBlock);
  fs.writeFileSync('src/components/NearbyProfessionalsMap.js', code, 'utf8');
}
console.log('Updated NearbyProfessionalsMap');
