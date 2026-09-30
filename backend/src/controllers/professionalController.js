const prisma = require('../../db');
const { getDateFilter } = require('../utils/dateFilter');
const notificationService = require('../services/notificationService');

exports.getDashboard = async (req, res) => {
    try {
        const { filter, customStart, customEnd } = req.query;
        const dateFilter = getDateFilter(filter, customStart, customEnd);
        const prof = await prisma.professionalProfile.findUnique({ where: { userId: req.user.id } });
        if (!prof) return res.status(200).json({ appointments: [], stats: { pending: 0, homeVisits: 0, completed: 0, canceled: 0 }, recents: [] });

        const appointments = await prisma.appointment.findMany({
            where: {
                professionalId: prof.id,
                ...(dateFilter && { scheduledDate: dateFilter })
            },
            include: {
                patient: { include: { user: true } },
                messages: { orderBy: { createdAt: 'asc' } },
                prescriptions: true
            },
            orderBy: { scheduledDate: 'desc' }
        });

        const stats = {
            pending: appointments.filter(a => a.status === 'PENDING').length,
            homeVisits: appointments.filter(a => a.status === 'CONFIRMED').length,
            completed: appointments.filter(a => a.status === 'COMPLETED').length,
            canceled: appointments.filter(a => a.status === 'CANCELED').length
        };

        const recents = appointments.slice(0, 7);

        res.status(200).json({ appointments, stats, recents });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Error fetching dashboard", error: error.message });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELED_BY_DOCTOR' },
            include: { patient: { include: { user: true } }, professional: { include: { user: true } } }
        });
        
        await notificationService.sendNotification(
            appointment.patient.userId,
            "Appointment Canceled",
            `Dr. ${appointment.professional.user.fullName} has canceled your appointment.`,
            "APPOINTMENT",
            appointment.id
        );
        
        res.status(200).json({ message: "Appointment canceled" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error canceling" });
    }
};

exports.confirmAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status: 'CONFIRMED' },
            include: { patient: { include: { user: true } }, professional: { include: { user: true } } }
        });

        await notificationService.sendNotification(
            appointment.patient.userId,
            "Appointment Confirmed",
            `Your appointment with Dr. ${appointment.professional.user.fullName} has been confirmed.`,
            "APPOINTMENT",
            appointment.id
        );

        res.status(200).json({ message: "Appointment confirmed" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error confirming" });
    }
};

exports.issuePrescription = async (req, res) => {
    try {
        const { appointmentId, patientId, notes } = req.body;
        const prof = await prisma.professionalProfile.findUnique({ where: { userId: req.user.id } });
        if (!prof) return res.status(404).json({ message: "Professional profile not found" });

        await prisma.prescription.create({
            data: {
                appointmentId,
                patientId,
                professionalId: prof.id,
                notes
            }
        });

        const appointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'COMPLETED', completedAt: new Date() },
            include: { patient: { include: { user: true } } }
        });

        await notificationService.sendNotification(
            appointment.patient.userId,
            "Prescription Issued",
            `Dr. ${req.user.fullName} has issued a prescription for your recent visit.`,
            "PRESCRIPTION",
            appointmentId
        );

        res.status(201).json({ message: "Prescription issued" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error issuing prescription" });
    }
};

exports.getActiveSOS = async (req, res) => {
    try {
        const activeSOS = await prisma.emergencySOS.findMany({
            where: { status: "TRIGGERED" },
            include: {
                patient: { include: { user: true } }
            }
        });

        return res.status(200).json({ message: 'Active SOS fetched successfully', activeSOS })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.acceptSOS = async (req, res) => {
    try {
        const { sosId } = req.params;
        const profile = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id },
        });

        if (!profile) return res.status(404).json({ message: "Profile not found" });

        const updatedSOS = await prisma.emergencySOS.update({
            where: { id: sosId },
            data: {
                status: "ACCEPTED", paramedicId: profile.id
            },
            include: { patient: { include: { user: true } } }
        });

        await notificationService.sendNotification(
            updatedSOS.patient.userId,
            "SOS Accepted",
            `A paramedic is on the way to your location!`,
            "SOS",
            updatedSOS.id
        );

        return res.status(200).json({ message: 'SOS accepted successfully', updatedSOS });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.addAppointmentMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: { patient: true, professional: { include: { user: true } } }
        });

        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        const message = await prisma.appointmentMessage.create({
            data: {
                appointmentId: id,
                sender: 'PROFESSIONAL',
                text
            }
        });

        await notificationService.sendNotification(
            appointment.patient.userId,
            "New Message",
            `Dr. ${appointment.professional.user.fullName} sent you a message.`,
            "MESSAGE",
            id
        );

        return res.status(201).json({ message: 'Message sent', data: message });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
