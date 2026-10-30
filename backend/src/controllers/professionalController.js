const prisma = require('../../db');
const bcrypt = require('bcrypt');
const { getDateFilter } = require('../utils/dateFilter');
const notificationService = require('../services/notificationService');
const { saveBase64Image } = require('../utils/fileUpload');

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
            orderBy: { createdAt: 'desc' }
        });

        const stats = {
            pending: appointments.filter(a => a.status === 'PENDING').length,
            homeVisits: appointments.filter(a => a.status === 'CONFIRMED').length,
            completed: appointments.filter(a => a.status === 'COMPLETED').length,
            canceled: appointments.filter(a => a.status === 'CANCELED').length
        };

        const recents = appointments.slice(0, 7);

        res.status(200).json({ appointments, stats, recents, profile: prof });
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

exports.completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                patient: { include: { user: true } },
                professional: { include: { user: true } }
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.status !== "COMPLETED") {
            const totalFee = Number(appointment.totalAmount) || 0;
            const paymentMethod = appointment.paymentMethod || "CASH";

            let commissionPercent = 30;
            try {
                const setting = await prisma.systemSetting.findUnique({
                    where: { key: "COMMISSION_PERCENTAGE" }
                });
                if (setting && setting.value) {
                    commissionPercent = parseFloat(setting.value);
                }
            } catch (setErr) {}

            const commissionAmount = totalFee * (commissionPercent / 100);
            const professionalIncome = totalFee - commissionAmount;

            let walletChange = 0;
            let transactionType = 'CREDIT';
            let description = '';

            if (paymentMethod === "CARD") {
                // Card payment -> Collected by company, doctor gets credited their share (+)
                walletChange = professionalIncome;
                transactionType = "CREDIT";
                description = `Card Payment Received (Total: Rs. ${totalFee}, Platform Fee: Rs. ${commissionAmount}, Your Share: +Rs. ${professionalIncome})`;
            } else {
                // Cash payment -> Collected by doctor, company commission is debited (-)
                walletChange = -commissionAmount;
                transactionType = "DEBIT";
                description = `Cash Collected by Doctor (Total: Rs. ${totalFee}, Platform Fee Due: -Rs. ${commissionAmount})`;
            }

            const currentBalance = Number(appointment.professional.walletBalance) || 0;
            const newBalance = currentBalance + walletChange;

            await prisma.$transaction([
                prisma.professionalProfile.update({
                    where: { id: appointment.professional.id },
                    data: { walletBalance: newBalance }
                }),
                prisma.walletTransaction.create({
                    data: {
                        professionalId: appointment.professional.id,
                        appointmentId: appointment.id,
                        amount: walletChange,
                        type: transactionType,
                        paymentMethod: paymentMethod,
                        totalFee: totalFee,
                        commissionAmount: commissionAmount,
                        description: description,
                        balanceAfter: newBalance
                    }
                }),
                prisma.appointment.update({
                    where: { id },
                    data: {
                        status: "COMPLETED",
                        paymentStatus: "PAID",
                        completedAt: new Date()
                    }
                })
            ]);
        }

        try {
            await notificationService.sendNotification(
                appointment.patient.userId,
                "Appointment Completed",
                `Your appointment with Dr. ${appointment.professional.user.fullName} has been completed.`,
                "APPOINTMENT",
                appointment.id
            );
        } catch (notiError) {}

        return res.status(200).json({ message: "Appointment Completed and Payment processed successfully!" });
    } catch (error) {
        console.log("Complete Appointment Error:", error);
        return res.status(500).json({ message: "Error completing appointment!", error: error.message });
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
            where: { status: { in: ["TRIGGERED", "TRIGGERED_EMERGENCY", "TRIGGERED_TRANSPORT"] } },
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
        const { id: sosId } = req.params;
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


exports.deleteAppointment = async(req, res) => {
    try {
        const { id } = req.params;
        await prisma.appointmentMessage.deleteMany({ where: { appointmentId: id } });
        const prescriptions = await prisma.prescription.findMany({ where: { appointmentId: id } });
        for (const rx of prescriptions) {
            await prisma.prescriptionItem.deleteMany({ where: { prescriptionId: rx.id } });
            await prisma.prescription.delete({ where: { id: rx.id } });
        }
        await prisma.appointment.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Appointment deleted' });
    } catch(err) {
        if (err.code === 'P2025') {
            return res.status(200).json({ success: true, message: 'Appointment already deleted' });
        }
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete appointment' });
    }
};


exports.completeSOS = async (req, res) => {
    try {
        const { id } = req.params;
        const sos = await prisma.emergencySOS.update({
            where: { id },
            data: { status: 'COMPLETED' },
            include: { patient: { include: { user: true } }, paramedic: { include: { user: true } } }
        });
        
        // Auto-rate the paramedic for SOS
        if (sos.paramedicId && sos.patientId) {
            await prisma.review.create({
                data: {
                    patientId: sos.patientId,
                    professionalId: sos.paramedicId,
                    rating: 5,
                    comment: "Auto-generated 5-Star rating for SOS Emergency Transport."
                }
            });
            
            // Recalculate rating
            const allReviews = await prisma.review.findMany({ where: { professionalId: sos.paramedicId }});
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            await prisma.professionalProfile.update({
                where: { id: sos.paramedicId },
                data: { rating: avgRating, availabilityStatus: 'AVAILABLE' }
            });
        }

        await notificationService.sendNotification(
            sos.patient.userId,
            "SOS Emergency Completed",
            "The emergency transport has been successfully completed. Hope you are well!",
            "SOS_COMPLETED",
            sos.id
        );

        res.status(200).json({ message: "SOS completed successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error completing SOS" });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const profile = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        res.status(200).json(profile);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { 
            bookingFee, 
            workingHospital, 
            locationLat, 
            locationLng, 
            serviceRadius, 
            serveEverywhere, 
            availabilityStatus,
            phone,
            address,
            profileImage,
            currentPassword,
            newPassword,
            visitStartHour,
            visitEndHour,
            visitDays
        } = req.body;
        
        const profile = await prisma.professionalProfile.findUnique({ 
            where: { userId: req.user.id },
            include: { user: true }
        });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        // If user wants to update password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password' });
            }
            const isMatch = await bcrypt.compare(currentPassword, profile.user.passwordHash);
            if (!isMatch) {
                const settings = await prisma.systemSetting.findMany({
                    where: { key: { in: ['SUPPORT_PHONE', 'SUPPORT_EMAIL'] } }
                });
                const contact = {};
                settings.forEach(s => contact[s.key] = s.value);
                const helpPhone = contact.SUPPORT_PHONE || '0112345678';
                const helpEmail = contact.SUPPORT_EMAIL || 'admin@medicalcare.com';

                return res.status(400).json({ 
                    message: `Current password is incorrect. If you forgot your password, please contact Admin at Phone: ${helpPhone} or Email: ${helpEmail} to reset your account.`,
                    adminContact: { phone: helpPhone, email: helpEmail }
                });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters long' });
            }
            const newHash = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: req.user.id },
                data: { passwordHash: newHash }
            });
        }

        // If phone or address changed on User/Profile
        if (phone !== undefined) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { phone }
            });
        }

        let savedProfileImage = profile.profileImage;
        if (profileImage !== undefined) {
            if (profileImage && profileImage.startsWith('data:image')) {
                savedProfileImage = saveBase64Image(profileImage, 'professionals');
            } else {
                savedProfileImage = profileImage;
            }
        }

        const updated = await prisma.professionalProfile.update({
            where: { id: profile.id },
            data: {
                bookingFee: bookingFee !== undefined ? parseFloat(bookingFee) : profile.bookingFee,
                workingHospital: workingHospital !== undefined ? workingHospital : profile.workingHospital,
                address: address !== undefined ? address : profile.address,
                profileImage: savedProfileImage,
                locationLat: locationLat !== undefined ? parseFloat(locationLat) : profile.locationLat,
                locationLng: locationLng !== undefined ? parseFloat(locationLng) : profile.locationLng,
                serviceRadius: serviceRadius !== undefined ? parseInt(serviceRadius) : profile.serviceRadius,
                serveEverywhere: serveEverywhere !== undefined ? serveEverywhere : profile.serveEverywhere,
                availabilityStatus: availabilityStatus !== undefined ? availabilityStatus : profile.availabilityStatus,
                visitStartHour: visitStartHour !== undefined ? visitStartHour : profile.visitStartHour,
                visitEndHour: visitEndHour !== undefined ? visitEndHour : profile.visitEndHour,
                visitDays: visitDays !== undefined ? visitDays : profile.visitDays
            },
            include: { user: true }
        });
        
        res.status(200).json({ message: 'Profile updated successfully', profile: updated });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};
