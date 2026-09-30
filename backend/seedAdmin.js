const prisma = require('./db');
const bcrypt = require('bcrypt');

async function main() {
  const adminEmail = 'admin@gmail.com';
  const adminPassword = '123';
  const fullName = 'System Administrator';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists.`);
    return;
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  // Create Admin User and AdminProfile
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: passwordHash,
      fullName: fullName,
      role: 'ADMIN',
      verificationStatus: 'APPROVED',
      adminProfile: {
        create: {
          fullName: fullName,
          adminLevel: 'SUPER_ADMIN'
        }
      }
    }
  });

  console.log(`✅ Super Admin created successfully!`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
