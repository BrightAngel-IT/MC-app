const fs = require('fs');
const filePath = 'd:/Bright Angle/healthcare App/backend/src/controllers/adminController.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `                        orders: {
                            include: {
                                pharmacist: true
                            }
                        }`;

const replacement = `                        orders: {
                            orderBy: { createdAt: 'desc' },
                            include: {
                                pharmacist: {
                                    include: {
                                        user: { select: { fullName: true, phone: true } }
                                    }
                                }
                            }
                        }`;

const isCrlf = content.includes('\r\n');
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
    const updated = normContent.replace(normTarget, replacement);
    fs.writeFileSync(filePath, isCrlf ? updated.replace(/\n/g, '\r\n') : updated, 'utf8');
    console.log('adminController.js updated successfully!');
} else {
    console.error('Target not found in adminController.js');
}
