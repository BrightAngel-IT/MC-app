const prisma = require('../../db');
const { getDateFilter } = require('../utils/dateFilter');

exports.getPending = async(req,res)=>{
    try{
        const pendingUsers = await prisma.user.findMany({
            where: {verificationStatus: "PENDING"},
            include: {
                professionalProfile: true,
                pharmacistProfile: true,
            }
        });

        return res.status(200).json({message: 'Pending users fetched successfully', pendingUsers});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.approveUser = async(req,res)=>{
    try{
        const {userId} = req.params;
        const updatedUser = await prisma.user.update({
            where: {id: userId},
            data: {verificationStatus: "APPROVED"}
        });
        return res.status(200).json({message: 'User approved successfully', updatedUser});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.rejectUser = async(req,res)=>{
    try{
        const {userId} = req.params;
        const updatedUser = await prisma.user.update({
            where: {id: userId},
            data: {verificationStatus: "REJECTED"}
        });
        return res.status(200).json({message: 'User rejected successfully', updatedUser});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.undoRejectUser = async(req,res)=>{
    try{
        const {userId} = req.params;
        const updatedUser = await prisma.user.update({
            where: {id: userId},
            data: {verificationStatus: "PENDING"}
        });
        return res.status(200).json({message: 'User returned to pending successfully', updatedUser});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getRejected = async(req,res)=>{
    try{
        const rejectedUsers = await prisma.user.findMany({
            where: {verificationStatus: "REJECTED"},
            include: {
                professionalProfile: true,
                pharmacistProfile: true,
            }
        });

        return res.status(200).json({message: 'Rejected users fetched successfully', rejectedUsers});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.deleteUser = async(req,res)=>{
    try{
        const {userId} = req.params;
        
        // Delete related profiles first to avoid foreign key constraint errors
        await prisma.professionalProfile.deleteMany({ where: { userId } });
        await prisma.pharmacistProfile.deleteMany({ where: { userId } });
        await prisma.patientProfile.deleteMany({ where: { userId } });
        await prisma.adminProfile.deleteMany({ where: { userId } });
        
        await prisma.user.delete({
            where: {id: userId}
        });
        return res.status(200).json({message: 'User deleted successfully'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error - make sure cascade delete is setup or delete relations first."});
    }
};

exports.getAllUsers = async(req,res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                patientProfile: true,
                professionalProfile: true,
                pharmacistProfile: true,
            }
        });
        return res.status(200).json({message: 'Users fetched successfully', users});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getStats = async (req,res)=>{
    try {
        const { filter, customStart, customEnd } = req.query;
        const dateFilter = getDateFilter(filter, customStart, customEnd);
        const whereClause = dateFilter ? { createdAt: dateFilter } : {};

        const patients = await prisma.user.count({where: {role: "PATIENT", ...whereClause}});
        const doctors = await prisma.user.count({where: {role: "DOCTOR", ...whereClause}});
        const vendors = await prisma.user.count({where: {role: "PHARMACIST", ...whereClause}});
        const totalUsers = await prisma.user.count({where: whereClause});
        
        const pendingCount = await prisma.user.count({where: {verificationStatus: "PENDING", role: { notIn: ["PATIENT", "ADMIN"] }, ...whereClause}});
        const approvedCount = await prisma.user.count({where: {verificationStatus: "APPROVED", role: { notIn: ["PATIENT", "ADMIN"] }, ...whereClause}});
        const rejectedCount = await prisma.user.count({where: {verificationStatus: "REJECTED", role: { notIn: ["PATIENT", "ADMIN"] }, ...whereClause}});
        
        const aptWhereClause = dateFilter ? { createdAt: dateFilter } : {};
        const totalAppointments = await prisma.appointment.count({where: aptWhereClause});
        const totalCompletedAppointments = await prisma.appointment.count({where: {status: "COMPLETED", ...aptWhereClause}});
        const totalInProgressAppointments = await prisma.appointment.count({where: {status: "IN_PROGRESS", ...aptWhereClause}});

        const stats = {
            patients: patients,
            doctors: doctors,
            vendors: vendors,
            total: totalUsers,
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
            totalAppointments: totalAppointments,
            completedAppointments: totalCompletedAppointments,
            inProgressAppointments: totalInProgressAppointments
        };

        const recents = await prisma.user.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 7,
            select: { id: true, fullName: true, role: true, email: true, createdAt: true, verificationStatus: true }
        });
        
        return res.status(200).json({message: 'Stats fetched successfully', stats, recents});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}