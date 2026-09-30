const bcrypt = require('bcrypt');
const prisma = require('./db');

async function main() {
  console.log('Starting seeder...');

  // 1. Fix Admin Profile if missing
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    include: { adminProfile: true }
  });

  for (let admin of admins) {
    if (!admin.adminProfile) {
      await prisma.adminProfile.create({
        data: {
          userId: admin.id,
          fullName: admin.fullName
        }
      });
      console.log(`✅ Fixed: Created missing AdminProfile for ${admin.email}`);
    } else {
      console.log(`ℹ️ AdminProfile already exists for ${admin.email}`);
    }
  }

  // 2. Add Test Users
  const passwordHash = await bcrypt.hash('Password123', 10);

  const testUsers = [
    {
      email: 'doctor@test.com',
      fullName: 'Dr. Jane Smith',
      role: 'DOCTOR',
      phone: '0711111111',
      verificationStatus: 'PENDING',
      profileData: {
        specialization: 'Cardiologist, General Physician',
        qualifications: 'MBBS, MD',
        address: '123 Medical Lane',
        idCardNumber: '901234567V',
        workingHospital: 'General Hospital Colombo',
        isCurrentlyWorking: true
      },
      profileType: 'professionalProfile'
    },
    {
      email: 'patient@test.com',
      fullName: 'John Doe',
      role: 'PATIENT',
      phone: '0722222222',
      verificationStatus: 'APPROVED',
      profileData: {
        address: '456 Main Street',
        nicNumber: '951234567V'
      },
      profileType: 'patientProfile'
    },
    {
      email: 'pharmacy@test.com',
      fullName: 'Kamal Perera',
      role: 'PHARMACIST',
      phone: '0733333333',
      verificationStatus: 'PENDING',
      profileData: {
        businessName: 'City Care Pharmacy',
        licenseNumber: 'PH-998877',
        address: '789 Market Road'
      },
      profileType: 'pharmacistProfile'
    },
    {
      email: 'paramedic@test.com',
      fullName: 'Sunil Silva',
      role: 'PARAMEDIC',
      phone: '0744444444',
      verificationStatus: 'PENDING',
      profileData: {
        address: 'Ambulance Unit B',
        idCardNumber: '881234567V',
        attachedHospital: '1990 Suwa Seriya',
        ambulanceVehicleNumber: 'WP-5566',
        isCurrentlyWorking: true
      },
      profileType: 'professionalProfile'
    }
  ];

  for (let user of testUsers) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      const newUser = await prisma.user.create({
        data: {
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          passwordHash,
          verificationStatus: user.verificationStatus
        }
      });

      if (user.profileType === 'professionalProfile') {
        await prisma.professionalProfile.create({
          data: { ...user.profileData, userId: newUser.id, fullName: user.fullName }
        });
      } else if (user.profileType === 'patientProfile') {
        await prisma.patientProfile.create({
          data: { ...user.profileData, userId: newUser.id, fullName: user.fullName }
        });
      } else if (user.profileType === 'pharmacistProfile') {
        await prisma.pharmacistProfile.create({
          data: { ...user.profileData, userId: newUser.id }
        });
      }
      console.log(`✅ Seeded: ${user.role} (${user.email})`);
    } else {
      console.log(`ℹ️ Skipped: ${user.email} already exists.`);
    }
  }

  console.log('Seeding finished!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
