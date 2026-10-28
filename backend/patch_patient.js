const fs = require('fs');
const filePath = 'd:/Bright Angle/healthcare App/backend/src/controllers/patientController.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        messages: { orderBy: { createdAt: 'asc' } }
                    }
                }`;

const replacement = `                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        pharmacist: {
                            include: {
                                user: { select: { fullName: true, phone: true } }
                            }
                        },
                        messages: { orderBy: { createdAt: 'asc' } }
                    }
                }`;

// Normalize CRLF to LF in memory to find position
const isCrlf = content.includes('\r\n');
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    const newNormalized = normalizedContent.replace(normalizedTarget, replacement);
    const finalContent = isCrlf ? newNormalized.replace(/\n/g, '\r\n') : newNormalized;
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log('Successfully updated patientController.js');
} else {
    console.error('Target not found in normalized content!');
}
