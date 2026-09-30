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
            orderBy: { scheduledDate: 'desc' }
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
                        user: { select: { fullName: true, phone: true } }
                    }
                },
                prescriptions: {
                    include: {
                        items: true
                    }
                },
                messages: { orderBy: { createdAt: 'asc' } }
            },
            orderBy: { scheduledDate: 'desc' }
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
            experienceYears: doc.licenseIssuedYear ? new Date().getFullYear() - doc.licenseIssuedYear : 0,
            user: doc.user
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
            experienceYears: nurse.licenseIssuedYear ? new Date().getFullYear() - nurse.licenseIssuedYear : 0,
            user: nurse.user
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
            id: p.id, fullName: p.fullName, specialization: p.specialization, rating: p.rating, availabilityStatus: p.availabilityStatus, workingHospital: p.workingHospital, address: p.address, experienceYears: p.licenseIssuedYear ? new Date().getFullYear() - p.licenseIssuedYear : 0, user: p.user
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
            id: p.id, fullName: p.fullName, specialization: p.specialization, rating: p.rating, availabilityStatus: p.availabilityStatus, attachedHospital: p.attachedHospital, ambulanceVehicleNumber: p.ambulanceVehicleNumber, experienceYears: p.licenseIssuedYear ? new Date().getFullYear() - p.licenseIssuedYear : 0, user: p.user
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
            id: p.id, fullName: p.fullName, specialization: p.specialization, rating: p.rating, availabilityStatus: p.availabilityStatus, workingHospital: p.workingHospital, address: p.address, experienceYears: p.licenseIssuedYear ? new Date().getFullYear() - p.licenseIssuedYear : 0, user: p.user
        }));
        return res.status(200).json({message: 'Caregivers fetched successfully', verifiedCaregivers: formatted})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.bookAppointment = async ( req, res) => {
    try {
        const {professionalId,scheduledDate,symptoms,serviceType} = req.body;
        const Patient = await prisma.patientProfile.findUnique({
            where: {userId:req.user.id},
            include: { user: true }
        })

        if(!Patient) return res.status(404).json({message: 'Patient not found'});

        const newAppointment = await prisma.appointment.create({
            data: {
                patientId: Patient.id,
                professionalId,
                scheduledDate: new Date(scheduledDate),
                symptoms,
                serviceType,
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
        const {locationLat, locationLng} = req.body;
        const patient = await prisma.patientProfile.findUnique({
            where: {userId: req.user.id}
        });
        if(!patient) return res.status(404).json({message: 'Patient not found'});

        const newSOS = await prisma.emergencySOS.create({
            data: {
                patientId: patient.id,
                locationLat,
                locationLng,
                status:"TRIGGERED"
            }
        });
        
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

        const appointment = await prisma.appointment.update({
            where: {id},
            data:{
                scheduledDate: new Date(newDate), 
                status: "PENDING"
            }
        })

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
        const { prescriptionId, pharmacistId, items } = req.body;
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
                totalAmount,
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