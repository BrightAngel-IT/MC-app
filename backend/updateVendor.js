const fs = require('fs');
let c = fs.readFileSync('src/controllers/vendorController.js', 'utf8');

if (!c.includes('const cloudinary = require')) {
    c = c.replace(/const notificationService = require\('\.\.\/services\/notificationService'\);/, "const notificationService = require('../services/notificationService');\nconst cloudinary = require('cloudinary').v2;");
}

const target = `exports.addProduct = async (req,res)=>{
    try {
        const {name,description,price,stock,category,isprescriptionRequired} = req.body;

        const profile = await prisma.pharmacistProfile.findUnique({
            where: {userId: req.user.id},
        })

        if(!profile) return res.status(404).json({message: 'Profile not found'});

        const newProduct = await prisma.product.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock),
                category,
                isPrescriptionRequired: isprescriptionRequired,
                pharmacistId: profile.id,
            }
        });

        return res.status(200).json({message: 'Equipment added successfully', newProduct})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
};`;

const replacement = `exports.addProduct = async (req,res)=>{
    try {
        const {name,description,price,stock,category,isprescriptionRequired, stockUnit, image1, image2} = req.body;

        const profile = await prisma.pharmacistProfile.findUnique({
            where: {userId: req.user.id},
        })

        if(!profile) return res.status(404).json({message: 'Profile not found'});

        let url1 = null;
        let url2 = null;

        if (image1 && image1.startsWith('data:image')) {
            const up1 = await cloudinary.uploader.upload(image1, { folder: 'healthcare/products' });
            url1 = up1.secure_url;
        }
        
        if (image2 && image2.startsWith('data:image')) {
            const up2 = await cloudinary.uploader.upload(image2, { folder: 'healthcare/products' });
            url2 = up2.secure_url;
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
};`;

c = c.replace(target, replacement);
fs.writeFileSync('src/controllers/vendorController.js', c);
console.log('vendorController updated');
