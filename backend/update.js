const fs = require('fs');
let c = fs.readFileSync('src/controllers/authController.js', 'utf8');

c = c.replace(/const prisma = require\('\.\.\/\.\.\/db'\);/, "const prisma = require('../../db');\nconst cloudinary = require('cloudinary').v2;\n\ncloudinary.config({\n  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,\n  api_key: process.env.CLOUDINARY_API_KEY,\n  api_secret: process.env.CLOUDINARY_API_SECRET\n});");

c = c.replace(/const newUser = await prisma.user.create\(\{[\s\S]*?\}\);/, `const newUser = await prisma.user.create({
            data : {
                email,
                passwordHash,
                fullName,
                phone,
                role,
                verificationStatus
            }
        });

        let frontImageUrl = licenseFrontImageBase64 || null;
        let backImageUrl = licenseBackImageBase64 || null;

        if (licenseFrontImageBase64 && licenseFrontImageBase64.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(licenseFrontImageBase64, { folder: 'healthcare/licenses' });
            frontImageUrl = uploadRes.secure_url;
        }
        if (licenseBackImageBase64 && licenseBackImageBase64.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(licenseBackImageBase64, { folder: 'healthcare/licenses' });
            backImageUrl = uploadRes.secure_url;
        }`);

c = c.replace(/licenseFrontImage:\s*licenseFrontImageBase64/g, 'licenseFrontImage: frontImageUrl');
c = c.replace(/licenseBackImage:\s*licenseBackImageBase64/g, 'licenseBackImage: backImageUrl');

fs.writeFileSync('src/controllers/authController.js', c);
console.log('Update successful!');
