const prisma = require('./db.js');

async function check() {
  const user = await prisma.user.findUnique({where: {email: 'pharmacy4@gmail.com'}});
  console.log("User 4:", user);
}
check().finally(() => process.exit(0));
