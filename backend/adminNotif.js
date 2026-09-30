const fs = require('fs');
let c = fs.readFileSync('src/controllers/authController.js', 'utf8');

c = c.replace(/const cloudinary = require\('cloudinary'\)\.v2;/, "const cloudinary = require('cloudinary').v2;\nconst { sendNotification } = require('../services/notificationService');");

const target = `res.status(201).json({message : "User registered Successfully" , user: newUser, token});`;
const replacement = `// Notify all Admins if the user is a professional needing approval
        if (['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH', 'PARAMEDIC', 'PHARMACIST'].includes(role)) {
            try {
                const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
                const notifPromises = admins.map(admin => 
                    sendNotification(admin.id, 'New Registration Approval', \`A new \${role.toLowerCase()} (\${fullName}) has registered and is waiting for approval.\`, 'SYSTEM_ALERT', newUser.id)
                );
                await Promise.all(notifPromises);
            } catch (err) {
                console.log('Failed to send admin notifications:', err);
            }
        }

        res.status(201).json({message : "User registered Successfully" , user: newUser, token});`;

c = c.replace(target, replacement);

fs.writeFileSync('src/controllers/authController.js', c);
console.log('Done');
