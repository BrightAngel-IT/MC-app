
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

const prisma = require('../../db');
const { getDateFilter } = require('../utils/dateFilter');
const notificationService = require('../services/notificationService');

exports.getProfile = async(req,res) => {
    try {
        const getPatient = await prisma.patientProfile.findUnique({
            where: {userId:req.user.id},
            include:{
                user: {
                    select: {
                        email: true,
                        fullName: true,
                        phone: true
                    }
                }
            }
        })

        if(!getPatient) return res.status(404).json({message: 'Patient not found'});
        return res.status(200).json({message: 'Profile fetched successfully', getPatient});
    } catch (error) {
        console.log(error);
    }
};

exports.getDashboard = async (req, res) => {
    try {
        const { filter, customStart, customEnd } = req.query;
        const dateFilter = getDateFilter(filter, customStart, customEnd);
        const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient) return res.status(404).json({ message: "Patient profile not found" });
        
        const appointments = await prisma.appointment.findMany({
            where: { 
                patientId: patient.id,
                ...(dateFilter && { scheduledDate: dateFilter })
            },
            include: { professional: { include: { user: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const activeAppointments = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS');
        const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
        const canceledAppointments = appointments.filter(a => a.status === 'CANCELED');

        const recents = appointments.slice(0, 7);

        res.status(200).json({ 
            stats: {
                active: activeAppointments.length,
                completed: completedAppointments.length,
                canceled: canceledAppointments.length,
            },
            recents,
            appointments
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching dashboard" });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELED_BY_PATIENT' },
            include: { patient: { include: { user: true } }, professional: { include: { user: true } } }
        });
        
        await notificationService.sendNotification(
            appointment.professional.userId,
            "Appointment Canceled",
            `${appointment.patient.user.fullName} has canceled their appointment.`,
            "APPOINTMENT",
            appointment.id
        );
        
        res.status(200).json({ message: "Appointment canceled" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error canceling" });
    }
};

exports.getAppointments = async(req, res) => {
    try {
        const patient = await prisma.patientProfile.findUnique({
            where: { userId: req.user.id }
        });
        
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const appointments = await prisma.appointment.findMany({
            where: { patientId: patient.id },
            include: {
                professional: {
                    include: {
                        user: { select: { fullName: true, phone: true, role: true } }
                    }
                },
                prescriptions: {
                    include: {
                        items: true
                    }
                },
                messages: { orderBy: { createdAt: 'asc' } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ message: 'Appointments fetched successfully', appointments });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.addAppointmentMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: { professional: true, patient: { include: { user: true } } }
        });
        
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
        
        const message = await prisma.appointmentMessage.create({
            data: {
                appointmentId: id,
                sender: 'PATIENT',
                text
            }
        });

        await notificationService.sendNotification(
            appointment.professional.userId,
            "New Message",
            `${appointment.patient.user.fullName} sent you a message.`,
            "MESSAGE",
            id
        );
        
        return res.status(201).json({ message: 'Message sent', data: message });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getVerifiedDoctors = async (req, res) => {
    try {
        const doctors = await prisma.professionalProfile.findMany({
            where: {
                user: {
                    role: "DOCTOR",
                    verificationStatus: "APPROVED"
                }
            },
            include: { user: true }
        });

        const formattedDoctors = doctors.map(doc => ({
            id: doc.id,
            fullName: doc.fullName,
            specialization: doc.specialization,
            rating: doc.rating,
            availabilityStatus: doc.availabilityStatus,
            workingHospital: doc.workingHospital,
            address: doc.address,
            profileImage: doc.profileImage,
            experienceYears: doc.licenseIssuedYear ? new Date().getFullYear() - doc.licenseIssuedYear : 0,
            user: doc.user,
            locationLat: doc.locationLat,
            locationLng: doc.locationLng,
            serveEverywhere: doc.serveEverywhere,
            serviceRadius: doc.serviceRadius,
            bookingFee: doc.bookingFee,
            visitStartHour: doc.visitStartHour || "08:00 AM",
            visitEndHour: doc.visitEndHour || "08:00 PM",
            visitDays: doc.visitDays || "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
        }));
        
        return res.status(200).json({message: 'Doctors fetched successfully', verifiedDoctors: formattedDoctors})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error", error: error.message, stack: error.stack});
    }
};

exports.getVerifiedNurses = async (req, res) => {
    try {
        const nurses = await prisma.professionalProfile.findMany({
            where: {
                user: {
                    role: "NURSE",
                    verificationStatus: "APPROVED"
                }
            },
            include: { user: true }
        });

        const formattedNurses = nurses.map(nurse => ({
            id: nurse.id,
            fullName: nurse.fullName,
            specialization: nurse.specialization,
            rating: nurse.rating,
            availabilityStatus: nurse.availabilityStatus,
            workingHospital: nurse.workingHospital,
            profileImage: nurse.profileImage,
            experienceYears: nurse.licenseIssuedYear ? new Date().getFullYear() - nurse.licenseIssuedYear : 0,
            user: nurse.user,
            locationLat: nurse.locationLat,
            locationLng: nurse.locationLng,
            serveEverywhere: nurse.serveEverywhere,
            serviceRadius: nurse.serviceRadius,
            bookingFee: nurse.bookingFee,
            visitStartHour: nurse.visitStartHour || "08:00 AM",
            visitEndHour: nurse.visitEndHour || "08:00 PM",
            visitDays: nurse.visitDays || "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
        }));
        
        return res.status(200).json({message: 'Nurses fetched successfully', verifiedNurses: formattedNurses})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getVerifiedLabTechs = async (req, res) => {
    try {
        const labTechs = await prisma.professionalProfile.findMany({
            where: { user: { role: "LAB_TECH", verificationStatus: "APPROVED" } },
            include: { user: true }
        });
        const formatted = labTechs.map(p => ({
            id: p.id, fullName: p.fullName, specialization: p.specialization, rating: p.rating, availabilityStatus: p.availabilityStatus, workingHospital: p.workingHospital, address: p.address, profileImage: p.profileImage, experienceYears: p.licenseIssuedYear ? new Date().getFullYear() - p.licenseIssuedYear : 0, user: p.user, locationLat: p.locationLat, locationLng: p.locationLng, bookingFee: p.bookingFee, visitStartHour: p.visitStartHour || "08:00 AM", visitEndHour: p.visitEndHour || "08:00 PM", visitDays: p.visitDays || "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
        }));
        return res.status(200).json({message: 'Lab Techs fetched successfully', verifiedLabTechs: formatted})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getVerifiedParamedics = async (req, res) => {
    try {
        const paramedics = await prisma.professionalProfile.findMany({
            where: { user: { role: "PARAMEDIC", verificationStatus: "APPROVED" } },
            include: { user: true }
        });
        const formatted = paramedics.map(p => ({
            id: p.id, fullName: p.fullName, specialization: p.specialization, rating: p.rating, availabilityStatus: p.availabilityStatus, attachedHospital: p.attachedHospital, ambulanceVehicleNumber: p.ambulanceVehicleNumber, profileImage: p.profileImage, experienceYears: p.licenseIssuedYear ? new Date().getFullYear() - p.licenseIssuedYear : 0, user: p.user, locationLat: p.locationLat, locationLng: p.locationLng, bookingFee: p.bookingFee, visitStartHour: p.visitStartHour || "08:00 AM", visitEndHour: p.visitEndHour || "08:00 PM", visitDays: p.visitDays || "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
        }));
        return res.status(200).json({message: 'Paramedics fetched successfully', verifiedParamedics: formatted})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getVerifiedCaregivers = async (req, res) => {
    try {
        const caregivers = await prisma.professionalProfile.findMany({
            where: { user: { role: "CAREGIVER", verificationStatus: "APPROVED" } },
            include: { user: true }
        });
        const formatted = caregivers.map(p => ({
            id: p.id, fullName: p.fullName, specialization: p.specialization, rating: p.rating, availabilityStatus: p.availabilityStatus, workingHospital: p.workingHospital, address: p.address, experienceYears: p.licenseIssuedYear ? new Date().getFullYear() - p.licenseIssuedYear : 0, user: p.user, locationLat: p.locationLat, locationLng: p.locationLng, bookingFee: p.bookingFee, visitStartHour: p.visitStartHour || "08:00 AM", visitEndHour: p.visitEndHour || "08:00 PM", visitDays: p.visitDays || "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
        }));
        return res.status(200).json({message: 'Caregivers fetched successfully', verifiedCaregivers: formatted})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.bookAppointment = async ( req, res) => {
    try {
        const {professionalId, scheduledDate, symptoms, serviceType, locationLat, locationLng, visitAddress, bookedAtLat, bookedAtLng, bookedAtAddress, totalAmount, paymentMethod} = req.body;
        const Patient = await prisma.patientProfile.findUnique({
            where: {userId:req.user.id},
            include: { user: true }
        })

        if(!Patient) return res.status(404).json({message: 'Patient not found'});

        const appointmentTime = new Date(scheduledDate);
        if (isNaN(appointmentTime.getTime())) {
            return res.status(400).json({ message: "Invalid date and time selected." });
        }

        const now = new Date();
        // Allow a 5-minute grace window for booking current time
        if (appointmentTime.getTime() < now.getTime() - 5 * 60 * 1000) {
            return res.status(400).json({ message: "Cannot book appointments in the past. Please select an upcoming date and time." });
        }

        const newAppointment = await prisma.appointment.create({
            data: {
                patientId: Patient.id,
                professionalId,
                scheduledDate: appointmentTime,
                symptoms,
                serviceType,
                locationLat: locationLat !== undefined ? locationLat : null,
                locationLng: locationLng !== undefined ? locationLng : null,
                visitAddress: visitAddress || null,
                bookedAtLat: bookedAtLat !== undefined ? bookedAtLat : null,
                bookedAtLng: bookedAtLng !== undefined ? bookedAtLng : null,
                bookedAtAddress: bookedAtAddress || null,
                totalAmount: totalAmount || 0.0,
                paymentMethod: paymentMethod || 'CASH'
            }
        })

        const professional = await prisma.professionalProfile.findUnique({
            where: { id: professionalId }
        });

        if (professional) {
            await notificationService.sendNotification(
                professional.userId,
                "New Appointment",
                `${Patient.user.fullName} booked a new appointment with you on ${new Date(scheduledDate).toLocaleString()}`,
                "APPOINTMENT",
                newAppointment.id
            );
        }

        return res.status(201).json({message: 'Appointment booked successfully', newAppointment})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: error.message || "Internal server error"});
    }
};

exports.triggerSOS = async (req,res)=>{
    try {
        const {locationLat, locationLng, type} = req.body;
        const patient = await prisma.patientProfile.findUnique({
            where: {userId: req.user.id}
        });
        if(!patient) return res.status(404).json({message: 'Patient not found'});

        const sosType = type === 'TRANSPORT' ? 'TRANSPORT' : 'EMERGENCY';
        const newSOS = await prisma.emergencySOS.create({
            data: {
                patientId: patient.id,
                locationLat,
                locationLng,
                status: `TRIGGERED_${sosType}`
            }
        });
        
        const paramedics = await prisma.user.findMany({
            where: { role: "PARAMEDIC", verificationStatus: "APPROVED" }
        });
        
        if (paramedics.length > 0) {
            await prisma.notification.createMany({
                data: paramedics.map(p => ({
                    userId: p.id,
                    title: `🚨 EMERGENCY SOS!`,
                    message: `A patient has triggered an emergency SOS. Location: Lat ${locationLat}, Lng ${locationLng}. Tap to view.`,
                    type: 'EMERGENCY_SOS',
                    relatedId: newSOS.id
                }))
            });
        }
        
        return res.status(201).json({message: 'SOS triggered successfully', newSOS});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getProfessionals = async (req ,res) => {
    try {
        const professionals = await prisma.professionalProfile.findMany({
            include:{
             user: {select: {fullName:true, role:true, phone:true}},
            }
        }) ;

        if(!professionals) return res.status(404).json({message: 'Professionals not found'});
        return res.status(200).json({message: 'Professionals fetched successfully', professionals})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Internal server error'});
    }
};

exports.rescheduleAppointment = async (req, res) => {
    try {
        const {id} = req.params;
        const {newDate} = req.body;

        const existing = await prisma.appointment.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (existing.status === 'CONFIRMED') {
            return res.status(400).json({ message: 'Home visit has already been confirmed by the doctor and cannot be rescheduled.' });
        }

        if (existing.status === 'COMPLETED' || existing.status.startsWith('CANCELED')) {
            return res.status(400).json({ message: 'Cannot reschedule completed or canceled appointments.' });
        }

        const appointment = await prisma.appointment.update({
            where: {id},
            data:{
                scheduledDate: new Date(newDate), 
                status: "PENDING"
            }
        });

        return res.status(200).json({message: 'Appointment rescheduled successfully', appointment});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getPrescriptions = async (req, res) => {
    try{
        const patient  = await prisma.patientProfile.findUnique({
            where: {userId: req.user.id}
        });

        const prescriptions = await prisma.prescription.findMany({
            where: {
                patientId: patient?.id,
                status: { not: 'DELETED' }
            },
            include: {
                items: true,
                professional: {
                    include: {
                        user: {select: {fullName: true}}
                    }
                },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        pharmacist: {
                            include: {
                                user: { select: { fullName: true, phone: true } }
                            }
                        },
                        messages: { orderBy: { createdAt: 'asc' } }
                    }
                }
            }
        });

        if(!prescriptions) return res.status(404).json({message: 'Prescription not found'});
        return res.status(200).json({message: 'Prescriptions fetched successfully', prescriptions});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getPharmacists = async (req,res)=> {
    try {
        const vendors = await prisma.pharmacistProfile.findMany({
            where: {
                user: { 
                    role: 'PHARMACIST',
                    verificationStatus: 'APPROVED'
                }
            },
            include:{
             user: {select: {fullName:true, role:true, phone:true}},
            }
        });

        if(!vendors) return res.status(404).json({message: 'Vendors not found'});
        return res.status(200).json({message: 'Vendors fetched successfully', vendors})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Internal server error'});
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { prescriptionId, pharmacistId, items, patientNotes } = req.body;
        const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user.id } });
        
        // Calculate total amount if items are provided
        let totalAmount = 0.0;
        let orderItemsData = [];
        
        if (items && items.length > 0) {
            for (const item of items) {
                const product = await prisma.product.findUnique({ where: { id: item.productId } });
                if (product) {
                    totalAmount += product.price * item.quantity;
                    orderItemsData.push({
                        productId: item.productId,
                        quantity: item.quantity,
                        priceAtPurchase: product.price
                    });
                }
            }
        }
        
        const order = await prisma.order.create({
            data: {
                patientId: patient.id,
                pharmacistId: pharmacistId,
                prescriptionId: prescriptionId || null,
                totalAmount, patientNotes: patientNotes || null,
                items: {
                    create: orderItemsData
                }
            },
            include: { pharmacist: { include: { user: true } }, patient: { include: { user: true } }, items: true }
        });

        await notificationService.sendNotification(
            order.pharmacist.userId,
            "New Order",
            `You have received a new order from ${order.patient.user.fullName}.`,
            "ORDER",
            order.id
        );

        res.status(201).json({ message: "Order sent to pharmacy", order });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error sending order" });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: { pharmacist: { include: { user: true } } }
        });
        res.status(200).json({ products });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching products" });
    }
};

exports.getPharmacistProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const products = await prisma.product.findMany({
            where: { pharmacistId: id },
            include: { pharmacist: { include: { user: true } } }
        });
        res.status(200).json({ products });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching products" });
    }
};

// trigger nodemon restart again again again
exports.replyToOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { patientNotes } = req.body;

        const patient = await prisma.patientProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!patient) return res.status(404).json({ message: 'Profile not found' });

        const order = await prisma.order.findFirst({
            where: { prescriptionId: id, patientId: patient.id }
        });

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { 
                patientNotes: patientNotes // Keep for backward compatibility
            },
            include: { pharmacist: { include: { user: true } }, patient: { include: { user: true } } }
        });
        
        const newMsg = await prisma.orderMessage.create({
            data: {
                orderId: order.id,
                sender: 'PATIENT',
                text: patientNotes
            }
        });

        // Send push notification to vendor
        await notificationService.sendNotification(
            updatedOrder.pharmacist.userId,
            "New Message",
            `${updatedOrder.patient.user.fullName} replied to their order.`,
            "ORDER",
            updatedOrder.id
        );

        res.status(200).json({ message: 'Reply sent successfully', order: updatedOrder });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        
        const patient = await prisma.patientProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!patient) return res.status(404).json({ message: 'Profile not found' });

        const order = await prisma.order.findFirst({
            where: { prescriptionId: id, patientId: patient.id, status: 'PENDING' }
        });

        if (!order) return res.status(404).json({ message: 'Pending order not found' });

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELED' }
        });

        await prisma.orderMessage.create({
            data: {
                orderId: order.id,
                sender: 'PATIENT',
                text: 'Order Cancelled'
            }
        });

        return res.status(200).json({ message: 'Order cancelled successfully', order: updatedOrder });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.updatePrescriptionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const patient = await prisma.patientProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!patient) return res.status(404).json({ message: 'Profile not found' });

        const prescription = await prisma.prescription.findFirst({
            where: { id: id, patientId: patient.id }
        });

        if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

        if (status === 'DELETED') {
            // Delete all associated orders and their messages/items if we are permanently deleting
            // Actually just mark it as DELETED, we already filtered it out in getPrescriptions
        }

        const updated = await prisma.prescription.update({
            where: { id: prescription.id },
            data: { status }
        });

        return res.status(200).json({ message: 'Prescription updated successfully', prescription: updated });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const {id} =  req.params;
        await prisma.patientProfile.delete({
            where: {id}
        });

        return res.status(200).json({message: "User deleted successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

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

exports.submitReview = async (req, res) => {
    try {
        const { professionalId, rating, comment } = req.body;
        
        const patient = await prisma.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        
        await prisma.review.create({
            data: {
                patientId: patient.id,
                professionalId,
                rating: parseFloat(rating),
                comment: comment || ''
            }
        });
        
        const allReviews = await prisma.review.findMany({ where: { professionalId } });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        
        await prisma.professionalProfile.update({
            where: { id: professionalId },
            data: { rating: avgRating }
        });
        
        return res.status(201).json({ message: 'Review submitted successfully', newRating: avgRating });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ message: 'Failed to submit review' });
    }
};

exports.getNearbyProfessionals = async (req, res) => {
    try {
        const { lat, lng, roleFilter } = req.query;
        if (!lat || !lng) return res.status(400).json({ message: 'Location required' });

        let results = [];

        if (!roleFilter || roleFilter === 'ALL' || roleFilter !== 'PHARMACIST') {
            let filter = {
                locationLat: { not: null },
                locationLng: { not: null },
                availabilityStatus: 'AVAILABLE'
            };
            if (roleFilter && roleFilter !== 'ALL') {
                filter = { ...filter, user: { role: roleFilter } };
            }
            const professionals = await prisma.professionalProfile.findMany({
                where: filter,
                include: { user: { select: { fullName: true, role: true, phone: true } } }
            });
            results = [...results, ...professionals];
        }

        if (!roleFilter || roleFilter === 'ALL' || roleFilter === 'PHARMACIST') {
            let filter = {
                locationLat: { not: null },
                locationLng: { not: null },
                availabilityStatus: 'AVAILABLE'
            };
            const pharmacists = await prisma.pharmacistProfile.findMany({
                where: filter,
                include: { user: { select: { fullName: true, role: true, phone: true } } }
            });
            results = [...results, ...pharmacists];
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching nearby professionals:', error);
        res.status(500).json({ message: 'Error fetching nearby professionals' });
    }
};

exports.getVerifiedElderHomes = async (req, res) => {
    try {
        const elderHomes = await prisma.professionalProfile.findMany({
            where: { user: { role: "ELDER_HOME", verificationStatus: "APPROVED" } },
            include: { 
                user: true,
                elderHomePosts: { take: 3, orderBy: { createdAt: "desc" } },
                elderHomeServices: { take: 5, orderBy: { createdAt: "asc" } }
            }
        });
        const formatted = elderHomes.map(p => ({
            id: p.id,
            fullName: p.fullName,
            specialization: p.specialization,
            rating: p.rating,
            availabilityStatus: p.availabilityStatus,
            workingHospital: p.workingHospital,
            address: p.address,
            locationLat: p.locationLat,
            locationLng: p.locationLng,
            coverImage: p.coverImage,
            profileImage: p.profileImage,
            policies: p.policies,
            facilities: p.facilities,
            contactPhone: p.contactPhone,
            socialFacebook: p.socialFacebook,
            socialInstagram: p.socialInstagram,
            socialWhatsapp: p.socialWhatsapp,
            socialWebsite: p.socialWebsite,
            postsCount: p.elderHomePosts?.length || 0,
            servicesCount: p.elderHomeServices?.length || 0,
            latestPost: p.elderHomePosts?.[0] || null,
            experienceYears: p.licenseIssuedYear ? new Date().getFullYear() - p.licenseIssuedYear : 0,
            user: p.user
        }));
        return res.status(200).json({ message: "ElderHomes fetched successfully", verifiedElderHomes: formatted });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Initiate PayHere Card Payment for Completed Appointment by Patient
exports.initiateAppointmentPayment = async (req, res) => {
    try {
        const crypto = require('crypto');
        const { appointmentId } = req.body;

        if (!appointmentId) {
            return res.status(400).json({ message: "Appointment ID is required." });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: { include: { user: true } },
                professional: { include: { user: true } }
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        if (appointment.patient.userId !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized: This appointment does not belong to you." });
        }

        if (appointment.status !== 'COMPLETED') {
            return res.status(400).json({ message: "Card payment can only be made after the doctor completes the appointment." });
        }

        if (appointment.paymentStatus === 'PAID') {
            return res.status(400).json({ message: "This appointment has already been paid for." });
        }

        const totalAmount = Number(appointment.totalAmount) || 0;
        if (totalAmount <= 0) {
            return res.status(400).json({ message: "Invalid appointment fee amount." });
        }

        const orderId = `APT-${appointment.id.slice(0, 8)}-${Date.now()}`;
        const merchantId = process.env.PAYHERE_MERCHANT_ID || '1211149';
        const merchantSecret = process.env.PAYHERE_SECRET || '4T5A9b8c7d6e5f4a3b2c1d0e';
        const currency = 'LKR';
        const formattedAmount = totalAmount.toFixed(2);

        // PayHere Hash generation: uppercase(md5(merchant_id + order_id + amountFormatted + currency + uppercase(md5(merchant_secret))))
        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const hashString = merchantId + orderId + formattedAmount + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

        const isSandbox = (process.env.PAYHERE_MODE || 'sandbox').toLowerCase() === 'sandbox';

        return res.status(200).json({
            sandbox: isSandbox,
            merchant_id: merchantId,
            order_id: orderId,
            items: `Medical Consultation - Dr. ${appointment.professional?.user?.fullName || 'Doctor'}`,
            amount: formattedAmount,
            currency: currency,
            hash: hash,
            first_name: appointment.patient?.user?.fullName?.split(' ')[0] || 'Patient',
            last_name: appointment.patient?.user?.fullName?.split(' ').slice(1).join(' ') || 'User',
            email: appointment.patient?.user?.email || 'patient@example.com',
            phone: appointment.patient?.user?.phone || '0771234567',
            address: appointment.patient?.address || 'Sri Lanka',
            city: 'Colombo',
            country: 'Sri Lanka',
            custom_1: appointment.id,
            custom_2: 'APPOINTMENT_PAYMENT'
        });
    } catch (error) {
        console.error("Error initiating appointment payment:", error);
        return res.status(500).json({ message: "Error initiating payment gateway", error: error.message });
    }
};

// Verify and settle appointment payment upon success
exports.verifyAppointmentPayment = async (req, res) => {
    try {
        const { appointmentId, order_id, payment_id } = req.body;

        if (!appointmentId) {
            return res.status(400).json({ message: "appointmentId is required." });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: { include: { user: true } },
                professional: { include: { user: true } }
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        if (appointment.paymentStatus === 'PAID') {
            return res.status(200).json({ message: "Payment already recorded as PAID.", appointment });
        }

        const totalFee = Number(appointment.totalAmount) || 0;
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

        const currentBalance = Number(appointment.professional.walletBalance) || 0;
        const newBalance = currentBalance + professionalIncome;

        await prisma.$transaction([
            prisma.appointment.update({
                where: { id: appointmentId },
                data: {
                    paymentStatus: "PAID",
                    paymentMethod: "CARD"
                }
            }),
            prisma.professionalProfile.update({
                where: { id: appointment.professional.id },
                data: { walletBalance: newBalance }
            }),
            prisma.walletTransaction.create({
                data: {
                    professionalId: appointment.professional.id,
                    appointmentId: appointment.id,
                    amount: professionalIncome,
                    type: 'CREDIT',
                    paymentMethod: 'CARD',
                    totalFee: totalFee,
                    commissionAmount: commissionAmount,
                    description: `Online Card Payment Cleared by Patient (Order #${order_id || 'N/A'}, Ref: ${payment_id || 'N/A'}, Your Share: +Rs. ${professionalIncome})`,
                    balanceAfter: newBalance
                }
            })
        ]);

        try {
            await notificationService.sendNotification(
                appointment.professional.userId,
                "Card Payment Received",
                `Patient ${appointment.patient.user.fullName} completed the card payment of Rs. ${totalFee}. Your wallet has been credited Rs. ${professionalIncome}.`,
                "PAYMENT",
                appointment.id
            );
        } catch (notiErr) {}

        return res.status(200).json({
            message: "Payment processed successfully! Appointment is now marked as PAID.",
            paymentStatus: "PAID"
        });
    } catch (error) {
        console.error("Error verifying appointment payment:", error);
        return res.status(500).json({ message: "Error verifying appointment payment", error: error.message });
    }
};

// Patient Finance / Billing Statement History (Doctor Visits vs Pharmacy Orders)
exports.getPatientFinanceHistory = async (req, res) => {
    try {
        const patient = await prisma.patientProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!patient) {
            return res.status(404).json({ message: "Patient profile not found" });
        }

        // 1. Fetch all appointments (Doctors, Nurses, Caregivers, LabTechs, Paramedics)
        const appointments = await prisma.appointment.findMany({
            where: { patientId: patient.id },
            orderBy: { scheduledDate: 'desc' },
            include: {
                professional: {
                    include: {
                        user: { select: { fullName: true, role: true, phone: true } }
                    }
                }
            }
        });

        // 2. Fetch all pharmacy orders
        const orders = await prisma.order.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            include: {
                pharmacist: {
                    include: {
                        user: { select: { fullName: true, phone: true } }
                    }
                },
                items: {
                    include: { product: true }
                },
                prescription: true
            }
        });

        // 3. Transform Appointments into Finance Records
        const appointmentRecords = appointments.map(apt => {
            const prof = apt.professional;
            const profRole = prof?.user?.role || 'DOCTOR';
            const profName = prof?.user?.fullName || 'Healthcare Provider';
            const total = Number(apt.totalAmount) || 0;
            const baseFee = Number(prof?.bookingFee) || 0;
            const travelFee = total > baseFee ? total - baseFee : 0;

            return {
                id: apt.id,
                category: 'APPOINTMENT', // DOCTOR / NURSE / CAREGIVER / ETC.
                serviceType: apt.serviceType || `${profRole} Visit`,
                providerName: profName,
                providerRole: profRole,
                providerPhone: prof?.user?.phone || '',
                date: apt.completedAt || apt.scheduledDate || apt.createdAt,
                status: apt.status,
                paymentMethod: apt.paymentMethod || 'CASH',
                paymentStatus: apt.paymentStatus || 'PENDING',
                totalAmount: total,
                breakdown: {
                    baseFee: baseFee > 0 ? baseFee : total,
                    travelFee: travelFee,
                },
                notes: apt.symptoms || ''
            };
        });

        // 4. Transform Pharmacy Orders into Finance Records
        const orderRecords = orders.map(ord => {
            const pharma = ord.pharmacist;
            const pharmaName = pharma?.businessName || pharma?.user?.fullName || 'Pharmacy Vendor';
            const total = Number(ord.totalAmount) || 0;

            return {
                id: ord.id,
                category: 'PHARMACY',
                serviceType: ord.prescriptionId ? 'Prescription Dispense' : 'Direct Medicine Order',
                providerName: pharmaName,
                providerRole: 'PHARMACIST',
                providerPhone: pharma?.user?.phone || '',
                date: ord.completedAt || ord.createdAt,
                status: ord.status,
                paymentMethod: 'CASH', // or card
                paymentStatus: ord.status === 'COMPLETED' ? 'PAID' : (ord.status === 'REJECTED' || ord.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING'),
                totalAmount: total,
                billImageUrl: ord.billImageUrl || null,
                itemsCount: ord.items?.length || 0,
                items: ord.items?.map(it => ({
                    id: it.id,
                    name: it.product?.name || 'Medicine',
                    quantity: it.quantity,
                    price: it.priceAtPurchase,
                    subtotal: it.quantity * it.priceAtPurchase
                })) || [],
                notes: ord.vendorNotes || ord.patientNotes || ''
            };
        });

        // 5. Combine and Sort by Date desc
        const allTransactions = [...appointmentRecords, ...orderRecords].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        // 6. Summary Totals (only considering completed/paid transactions where applicable, plus pending)
        let totalDoctorPaid = 0;
        let totalDoctorPending = 0;
        appointmentRecords.forEach(a => {
            if (a.paymentStatus === 'PAID') {
                totalDoctorPaid += a.totalAmount;
            } else if (a.status !== 'CANCELED_BY_PATIENT' && a.status !== 'CANCELED_BY_DOCTOR') {
                totalDoctorPending += a.totalAmount;
            }
        });

        let totalPharmacyPaid = 0;
        let totalPharmacyPending = 0;
        orderRecords.forEach(o => {
            if (o.status === 'COMPLETED') {
                totalPharmacyPaid += o.totalAmount;
            } else if (o.status !== 'REJECTED' && o.status !== 'CANCELLED') {
                totalPharmacyPending += o.totalAmount;
            }
        });

        return res.status(200).json({
            summary: {
                totalSpent: totalDoctorPaid + totalPharmacyPaid,
                totalPending: totalDoctorPending + totalPharmacyPending,
                doctor: {
                    paid: totalDoctorPaid,
                    pending: totalDoctorPending,
                    count: appointmentRecords.length
                },
                pharmacy: {
                    paid: totalPharmacyPaid,
                    pending: totalPharmacyPending,
                    count: orderRecords.length
                }
            },
            history: allTransactions
        });

    } catch (error) {
        console.error("Error fetching patient finance history:", error);
        return res.status(500).json({ message: "Failed to fetch finance history", error: error.message });
    }
};

