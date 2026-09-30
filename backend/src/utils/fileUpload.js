const fs = require('fs');
const path = require('path');

exports.saveBase64Image = (base64String, folderName) => {
    if (!base64String || !base64String.startsWith('data:image')) {
        return null;
    }

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
    }

    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    let extension = 'png';
    
    if (mimeType === 'image/jpeg') extension = 'jpg';
    else if (mimeType === 'image/webp') extension = 'webp';

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const uploadPath = path.join(__dirname, '../../public/uploads', folderName);

    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    // Return relative path. The frontend URL can be dynamically built or use absolute path
    return `/uploads/${folderName}/${fileName}`;
};
