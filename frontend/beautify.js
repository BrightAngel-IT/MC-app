const fs = require('fs');
let code = fs.readFileSync('src/screens/Professional/ProfessionalDashboard.js', 'utf8');

const beautifulStyles = \const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // beautiful dark slate background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38bdf8',
    marginTop: 4,
    letterSpacing: 1,
  },
  bannerContainer: {
    flexDirection: 'row',
    margin: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#38bdf8', // bright primary
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  bannerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    width: '47%',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 32,
    fontWeight: '800',
  },
  recentItem: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  recentSub: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bgWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  bgPrimary: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  bgSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ProfessionalDashboard;\;

code = code.replace(/const getStyles = \\(colors\\) => StyleSheet\\.create\\(\\{[\\s\\S]*?export default ProfessionalDashboard;/m, beautifulStyles);

fs.writeFileSync('src/screens/Professional/ProfessionalDashboard.js', code);
console.log('Beautified styles!');
