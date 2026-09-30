const prisma = require('../../db');

// Utility to parse date ranges
const getDateFilter = (startDate, endDate) => {
  let filter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  
  return Object.keys(filter).length > 0 ? filter : undefined;
};

exports.getPatientReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateFilter(startDate, endDate);

    const patient = await prisma.patientProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        ...(dateFilter && { scheduledDate: dateFilter }),
      },
      include: {
        professional: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: patient.id,
        ...(dateFilter && { issuedAt: dateFilter }),
      },
      include: {
        professional: { include: { user: { select: { fullName: true } } } },
        items: true,
        orders: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    return res.status(200).json({ appointments, prescriptions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getProfessionalReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateFilter(startDate, endDate);

    const professional = await prisma.professionalProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!professional) return res.status(404).json({ message: 'Professional not found' });

    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        ...(dateFilter && { scheduledDate: dateFilter }),
      },
      include: {
        patient: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    const prescriptions = await prisma.prescription.findMany({
      where: {
        professionalId: professional.id,
        ...(dateFilter && { issuedAt: dateFilter }),
      },
      include: {
        patient: { include: { user: { select: { fullName: true } } } },
        items: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    return res.status(200).json({ appointments, prescriptions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getPharmacistReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateFilter(startDate, endDate);

    const pharmacist = await prisma.pharmacistProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!pharmacist) return res.status(404).json({ message: 'Pharmacist not found' });

    const orders = await prisma.order.findMany({
      where: {
        pharmacistId: pharmacist.id,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      include: {
        patient: { include: { user: { select: { fullName: true } } } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return res.status(200).json({ orders, totalRevenue });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAdminReport = async (req, res) => {
  try {
    const { startDate, endDate, role, userId } = req.query;
    const dateFilter = getDateFilter(startDate, endDate);

    let reportData = {};

    if (userId) {
       // Fetch specific user's report
       const user = await prisma.user.findUnique({ where: { id: userId } });
       if (!user) return res.status(404).json({ message: 'User not found' });

       if (user.role === 'PATIENT') {
           const patient = await prisma.patientProfile.findUnique({ where: { userId } });
           if(patient) {
               reportData.appointments = await prisma.appointment.findMany({ where: { patientId: patient.id, ...(dateFilter && { scheduledDate: dateFilter }) }});
               reportData.prescriptions = await prisma.prescription.findMany({ where: { patientId: patient.id, ...(dateFilter && { issuedAt: dateFilter }) }});
           }
       } else if (['DOCTOR', 'NURSE', 'PARAMEDIC'].includes(user.role)) {
           const prof = await prisma.professionalProfile.findUnique({ where: { userId } });
           if(prof) {
               reportData.appointments = await prisma.appointment.findMany({ where: { professionalId: prof.id, ...(dateFilter && { scheduledDate: dateFilter }) }});
               reportData.prescriptions = await prisma.prescription.findMany({ where: { professionalId: prof.id, ...(dateFilter && { issuedAt: dateFilter }) }});
           }
       } else if (user.role === 'VENDOR' || user.role === 'PHARMACIST') {
           const pharm = await prisma.pharmacistProfile.findUnique({ where: { userId } });
           if(pharm) {
               reportData.orders = await prisma.order.findMany({ where: { pharmacistId: pharm.id, ...(dateFilter && { createdAt: dateFilter }) }});
           }
       }
       return res.status(200).json(reportData);
    }

    // Default System-wide aggregate report
    const totalAppointments = await prisma.appointment.count({ where: { ...(dateFilter && { scheduledDate: dateFilter }) } });
    const totalPrescriptions = await prisma.prescription.count({ where: { ...(dateFilter && { issuedAt: dateFilter }) } });
    const totalOrders = await prisma.order.count({ where: { ...(dateFilter && { createdAt: dateFilter }) } });

    // Users breakdown
    const patientsCount = await prisma.user.count({ where: { role: 'PATIENT', ...(dateFilter && { createdAt: dateFilter }) } });
    const doctorsCount = await prisma.user.count({ where: { role: 'DOCTOR', ...(dateFilter && { createdAt: dateFilter }) } });
    const nursesCount = await prisma.user.count({ where: { role: 'NURSE', ...(dateFilter && { createdAt: dateFilter }) } });
    const labTechsCount = await prisma.user.count({ where: { role: 'LAB_TECH', ...(dateFilter && { createdAt: dateFilter }) } });
    const caregiversCount = await prisma.user.count({ where: { role: 'CAREGIVER', ...(dateFilter && { createdAt: dateFilter }) } });
    const paramedicsCount = await prisma.user.count({ where: { role: 'PARAMEDIC', ...(dateFilter && { createdAt: dateFilter }) } });
    const pharmacistsCount = await prisma.user.count({ where: { role: 'PHARMACIST', ...(dateFilter && { createdAt: dateFilter }) } });

    reportData = {
        systemStats: {
            totalAppointments,
            totalPrescriptions,
            totalOrders,
        },
        userStats: {
            newPatients: patientsCount,
            newDoctors: doctorsCount,
            newNurses: nursesCount,
            newLabTechs: labTechsCount,
            newCaregivers: caregiversCount,
            newParamedics: paramedicsCount,
            newPharmacists: pharmacistsCount,
        }
    };

    return res.status(200).json(reportData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
