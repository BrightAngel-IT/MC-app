const fs = require('fs');
let code = fs.readFileSync('src/controllers/patientController.js', 'utf8');

const distanceHelper = `
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
`;

if (!code.includes('function calculateDistance')) {
    code = distanceHelper + '\n' + code;
}

const startIdx = code.indexOf('exports.getNearbyProfessionals');
const endIdx = code.indexOf('};', startIdx);
let funcBlock = code.substring(startIdx, endIdx + 2);

if (!funcBlock.includes('calculateDistance')) {
    const oldRes = 'res.status(200).json(professionals);';
    const newRes = `
        const pLat = parseFloat(lat);
        const pLng = parseFloat(lng);
        const filtered = professionals.filter(p => {
            const dist = calculateDistance(pLat, pLng, p.locationLat, p.locationLng);
            const radius = p.serviceRadius ? parseFloat(p.serviceRadius) : 10;
            return dist <= radius;
        });
        res.status(200).json(filtered);
`;
    funcBlock = funcBlock.replace(oldRes, newRes);
    code = code.substring(0, startIdx) + funcBlock + code.substring(endIdx + 2);
    fs.writeFileSync('src/controllers/patientController.js', code, 'utf8');
}
