const bcrypt = require('bcrypt');
const prisma = require('./db');

async function update() {
  const hash = await bcrypt.hash('12345', 10);
  await prisma.user.update({
    where: { email: 'admin@gmail.com' },
    data: { passwordHash: hash }
  });
  console.log('Password updated successfully');
}

update()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
