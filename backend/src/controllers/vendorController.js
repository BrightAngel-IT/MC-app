const prisma = require('../../db');
const { getDateFilter } = require('../utils/dateFilter');
const notificationService = require('../services/notificationService');
const { saveBase64Image } = require('../utils/fileUpload');

exports.getDashboard = async (req, res) => {
    try {
        const { filter, customStart, customEnd } = req.query;
        const dateFilter = getDateFilter(filter, customStart, customEnd);
        const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: req.user.id } });
        
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        
        const orders = await prisma.order.findMany({
            where: { 
                pharmacistId: profile.id,
                ...(dateFilter && { createdAt: dateFilter })
            },
            include: { 
                patient: { include: { user: true } },
                prescription: { include: { items: true, professional: { include: { user: true } } } },
                messages: { orderBy: { createdAt: 'asc' } },
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const prescriptionOrders = orders.filter(o => o.prescriptionId !== null);
        const regularOrders = orders.filter(o => o.prescriptionId === null);
        
        console.log('Total orders:', orders.length, 'Prescription orders:', prescriptionOrders.length);

        const stats = {
            prescriptions: {
                total: prescriptionOrders.length,
                pending: prescriptionOrders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length,
                completed: prescriptionOrders.filter(o => o.status === 'COMPLETED').length,
                rejected: prescriptionOrders.filter(o => o.status === 'CANCELED' || o.status === 'REJECTED').length,
            },
            orders: {
                total: regularOrders.length,
                pending: regularOrders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length,
                completed: regularOrders.filter(o => o.status === 'COMPLETED').length,
                rejected: regularOrders.filter(o => o.status === 'CANCELED' || o.status === 'REJECTED').length,
            }
        };

        return res.status(200).json({ stats, prescriptionOrders, regularOrders });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getOrders = async(req, res) => {
    try {
        const profile = await prisma.pharmacistProfile.findUnique({
            where: {userId: req.user.id},
        });
        if(!profile) return res.status(404).json({message: 'Profile not found'});
        
        const orders = await prisma.order.findMany({
            where: {pharmacistId: profile.id},
            include: {
                items: true,
                patient: true,
            }
        });
        return res.status(200).json({message: 'Orders fetched successfully', orders});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.updateOrders = async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status, vendorNotes, clearPatientNotes, billImage, rejectionReason, totalAmount } = req.body;
        
        let updateData = {};
        if (status) updateData.status = status;
        if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
        if (totalAmount !== undefined && totalAmount !== null && !isNaN(totalAmount)) {
            updateData.totalAmount = parseFloat(totalAmount);
        }
        
        if (status === 'ACCEPTED') {
            if (!billImage) {
                return res.status(400).json({ message: 'Bill or invoice image is required to accept this prescription order.' });
            }
        }

        if (billImage && typeof billImage === 'string' && billImage.startsWith('data:image')) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const savedPath = saveBase64Image(billImage, 'bills');
            if (savedPath) updateData.billImageUrl = baseUrl + savedPath;
        }

        if (status === 'COMPLETED' || status === 'ACCEPTED') {
            updateData.completedAt = new Date();
        }

        if (vendorNotes !== undefined) {
            updateData.vendorNotes = vendorNotes; // Keep for backward compatibility
            
            // Only create message if there's actual text and it's an update meant to send a note
            if (vendorNotes.trim() !== '') {
                await prisma.orderMessage.create({
                    data: {
                        orderId: orderId,
                        sender: 'VENDOR',
                        text: vendorNotes
                    }
                });
            }
        }
        if (clearPatientNotes) updateData.patientNotes = null;
        
        const updatedOrders = await prisma.order.update({
            where: {id: orderId},
            data: updateData,
            include: { messages: true, patient: { include: { user: true } }, pharmacist: true }
        });

        // Send push notification to patient
        let notifMessage = status ? `Your order status was updated to ${status}.` : `You received a message regarding your order.`;
        if (status === 'ACCEPTED' || status === 'COMPLETED') {
            notifMessage = `Your prescription order was accepted by ${updatedOrders.pharmacist?.businessName || 'Pharmacy'}. Bill amount: Rs. ${updatedOrders.totalAmount.toFixed(2)}`;
        } else if (status === 'REJECTED') {
            notifMessage = `Prescription order was declined by ${updatedOrders.pharmacist?.businessName || 'Pharmacy'}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`;
        } else if (vendorNotes && vendorNotes.trim() !== '') {
            notifMessage = `New message on order: ${vendorNotes}`;
        }

        await notificationService.sendNotification(
            updatedOrders.patient.userId,
            "Prescription Order Update",
            notifMessage,
            "ORDER",
            updatedOrders.id
        );

        return res.status(200).json({message: 'Order updated successfully', updatedOrders});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.addProduct = async (req,res)=>{
    try {
        const {name,description,price,stock,category,isprescriptionRequired, stockUnit, image1, image2} = req.body;

        const profile = await prisma.pharmacistProfile.findUnique({
            where: {userId: req.user.id},
        })

        if(!profile) return res.status(404).json({message: 'Profile not found'});

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        let url1 = null;
        let url2 = null;

        if (image1 && image1.startsWith('data:image')) {
            const savedPath = saveBase64Image(image1, 'products');
            if (savedPath) url1 = baseUrl + savedPath;
        }
        
        if (image2 && image2.startsWith('data:image')) {
            const savedPath = saveBase64Image(image2, 'products');
            if (savedPath) url2 = baseUrl + savedPath;
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock),
                stockUnit: stockUnit || 'Pieces',
                imageUrl1: url1,
                imageUrl2: url2,
                category,
                isPrescriptionRequired: isprescriptionRequired,
                pharmacistId: profile.id,
            }
        });

        return res.status(200).json({message: 'Product added successfully', newProduct})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.getProducts = async (req, res) => {
    try {
        const profile = await prisma.pharmacistProfile.findUnique({
            where: {userId: req.user.id},
        });
        if(!profile) return res.status(404).json({message: 'Profile not found'});

        const products = await prisma.product.findMany({
            where: {pharmacistId: profile.id}
        });
        return res.status(200).json({products});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await prisma.pharmacistProfile.findUnique({
            where: {userId: req.user.id},
        });
        if(!profile) return res.status(404).json({message: 'Profile not found'});

        const product = await prisma.product.findUnique({
            where: { id },
            include: { orderItems: true } // check if it has orders
        });

        if (!product || product.pharmacistId !== profile.id) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.orderItems && product.orderItems.length > 0) {
            return res.status(400).json({ message: 'Cannot delete product because it has been ordered by patients. You can mark it as Out of Stock instead.' });
        }

        await prisma.product.delete({
            where: { id }
        });

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.log(error);
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Cannot delete product because it is linked to patient orders.' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { locationLat, locationLng, serviceRadius, availabilityStatus } = req.body;
        
        let profile = await prisma.pharmacistProfile.findUnique({
            where: { userId }
        });
        
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        
        const updated = await prisma.pharmacistProfile.update({
            where: { userId },
            data: {
                locationLat: locationLat !== undefined ? parseFloat(locationLat) : profile.locationLat,
                locationLng: locationLng !== undefined ? parseFloat(locationLng) : profile.locationLng,
                serviceRadius: serviceRadius !== undefined ? parseInt(serviceRadius) : profile.serviceRadius,
                availabilityStatus: availabilityStatus !== undefined ? availabilityStatus : profile.availabilityStatus
            }
        });
        res.json({ message: 'Profile updated', profile: updated });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};