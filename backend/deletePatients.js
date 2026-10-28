const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllPatients() {
  try {
    const patients = await prisma.user.findMany({ where: { role: 'PATIENT' } });
    console.log(`Found ${patients.length} patients to delete.`);

    for (const patientUser of patients) {
      // Find patient profile
      const profile = await prisma.patientProfile.findUnique({ where: { userId: patientUser.id } });
      if (profile) {
        // Delete appointments messages first
        const appointments = await prisma.appointment.findMany({ where: { patientId: profile.id } });
        for (const appt of appointments) {
          await prisma.appointmentMessage.deleteMany({ where: { appointmentId: appt.id } });
        }
        
        // Delete SOS
        await prisma.emergencySOS.deleteMany({ where: { patientId: profile.id } });
        
        // Delete Order Items and Orders
        const orders = await prisma.order.findMany({ where: { patientId: profile.id } });
        for (const order of orders) {
          await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
          await prisma.orderMessage.deleteMany({ where: { orderId: order.id } });
        }
        await prisma.order.deleteMany({ where: { patientId: profile.id } });
        
        // Delete Prescription Items and Prescriptions
        const prescriptions = await prisma.prescription.findMany({ where: { patientId: profile.id } });
        for (const rx of prescriptions) {
          await prisma.prescriptionItem.deleteMany({ where: { prescriptionId: rx.id } });
        }
        await prisma.prescription.deleteMany({ where: { patientId: profile.id } });
        
        // Finally delete appointments
        await prisma.appointment.deleteMany({ where: { patientId: profile.id } });
        
        // Delete PatientProfile
        await prisma.patientProfile.delete({ where: { id: profile.id } });
      }

      // Delete User ActivityLogs and Notifications
      await prisma.activityLog.deleteMany({ where: { userId: patientUser.id } });
      await prisma.notification.deleteMany({ where: { userId: patientUser.id } });

      // Delete User
      await prisma.user.delete({ where: { id: patientUser.id } });
      console.log(`Deleted patient: ${patientUser.email}`);
    }
    
    console.log('All patients deleted successfully.');
  } catch (error) {
    console.error('Error deleting patients:', error);
  }
}

deleteAllPatients().catch(console.error).finally(() => process.exit(0));
