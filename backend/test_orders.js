require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const orders = await prisma.order.findMany({
            include: { prescription: true, patient: { include: { user: true } } }
        });
        console.log("ALL ORDERS:");
        orders.forEach(o => {
            console.log(`Order ID: ${o.id}, Status: ${o.status}, Pharmacist: ${o.pharmacistId}, Prescription: ${o.prescriptionId}`);
        });
    } catch(e) {
        console.error(e);
    }
}
check();
