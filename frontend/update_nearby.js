const fs = require('fs');
let file = fs.readFileSync('src/components/NearbyProfessionalsMap.js', 'utf8');

const target = "if(prof.user.role === 'DOCTOR') navigation.navigate('DoctorSearch', { prefill: prof.user.fullName });";
const target2 = "if(prof.user.role === 'NURSE') navigation.navigate('NurseScreen', { prefill: prof.user.fullName });";

if (file.includes(target)) {
  const replacement = `const navParams = { prefill: prof.user.fullName, professionalId: prof.id, autoBook: true };
                if (prof.user.role === 'DOCTOR') navigation.navigate('DoctorSearch', navParams);
                else if (prof.user.role === 'NURSE') navigation.navigate('NurseScreen', navParams);
                else if (prof.user.role === 'CAREGIVER') navigation.navigate('CaregiverSearch', navParams);
                else if (prof.user.role === 'LAB_TECH') navigation.navigate('LabTechSearch', navParams);
                else if (prof.user.role === 'PARAMEDIC') navigation.navigate('ParamedicSearch', navParams);
                else if (prof.user.role === 'PHARMACIST') navigation.navigate('PharmacyScreen', { prefill: prof.user.fullName });`;

  file = file.replace(target, replacement);
  file = file.replace(target2, '');
  fs.writeFileSync('src/components/NearbyProfessionalsMap.js', file, 'utf8');
  console.log('NearbyProfessionalsMap updated successfully!');
} else {
  console.log('Target not found in NearbyProfessionalsMap');
}
