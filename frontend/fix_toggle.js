const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

const targetStr = `              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Currently Available</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
              </View>`;

const newStr = `              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: (!locationLat ? 5 : 15), paddingBottom: (!locationLat ? 5 : 15), borderBottomWidth: (!locationLat ? 0 : 1), borderBottomColor: '#ddd' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: !locationLat ? '#999' : '#000' }}>Currently Available</Text>
                <Switch disabled={!locationLat} value={locationLat ? isAvailable : false} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
              </View>
              {!locationLat && (
                <Text style={{ color: 'red', fontSize: 12, marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                  Please set your available service area first to enable availability.
                </Text>
              )}`;

if (code.includes(targetStr.trim().split('\n')[0])) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code, 'utf8');
  console.log('Successfully updated toggle');
} else {
  console.log('Target string not found');
}
