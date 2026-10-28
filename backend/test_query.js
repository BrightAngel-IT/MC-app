const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const pharmacists = await prisma.pharmacistProfile.findMany({
            where: {
                locationLat: { not: null },
                locationLng: { not: null },
                availabilityStatus: 'AVAILABLE'
            },
            include: { user: { select: { fullName: true, role: true, phone: true } } }
        });
        console.log('Found Pharmacists:', pharmacists.length);
        console.log(JSON.stringify(pharmacists, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
