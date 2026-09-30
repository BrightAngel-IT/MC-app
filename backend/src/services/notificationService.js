const { Expo } = require('expo-server-sdk');
const prisma = require('../../db');
const expo = new Expo();

/**
 * Send a notification to a specific user.
 * It saves the notification to the DB and sends a Push Notification if the user has an Expo Push Token.
 */
const sendNotification = async (userId, title, message, type, relatedId = null) => {
    try {
        // 1. Save to Database (In-App Notification)
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                relatedId
            }
        });

        // 2. Fetch User to get expoPushToken
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { expoPushToken: true }
        });

        if (user && user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
            // 3. Send Push Notification
            const messages = [{
                to: user.expoPushToken,
                sound: 'default',
                title: title,
                body: message,
                data: { notificationId: notification.id, type, relatedId },
            }];

            const chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    await expo.sendPushNotificationsAsync(chunk);
                } catch (error) {
                    console.error('Error sending push notification chunk:', error);
                }
            }
        }

        return notification;
    } catch (error) {
        console.error('Failed to send notification:', error);
        throw error;
    }
};

module.exports = {
    sendNotification
};
