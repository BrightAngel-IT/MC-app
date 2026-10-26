const fs = require('fs');
let code = fs.readFileSync('src/components/NearbyProfessionalsMap.js', 'utf8');

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
  }

  if (!location) {`;

const parts = code.split("if (Platform.OS === 'web') {");
if (parts.length === 2) {
  const parts2 = parts[1].split("if (!location) {");
  if (parts2.length === 2) {
    code = parts[0] + newWebBlock + parts2[1];
    fs.writeFileSync('src/components/NearbyProfessionalsMap.js', code, 'utf8');
    console.log("Success");
  } else { console.log("Failed split 2"); }
} else { console.log("Failed split 1"); }
