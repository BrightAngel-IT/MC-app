const prisma = require('../../db');

exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`[getUserNotifications] fetching for userId: ${userId}, role: ${req.user.role}`);
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`[getUserNotifications] success! Returning ${notifications.length} notifications`);
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('[getUserNotifications] Error:', error);
        res.status(500).json({ message: "Failed to get notifications" });
    }
};


exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await prisma.notification.count({
            where: { userId, isRead: false }
        });
        res.status(200).json({ unreadCount: count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: "Failed to get unread count" });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        await prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true }
        });
        
        res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ message: "Failed to mark as read" });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ message: "Failed to mark all as read" });
    }
};
