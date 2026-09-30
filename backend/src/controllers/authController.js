const jwt = require('jsonwebtoken'); // Force nodemon restart
const bcrypt = require('bcrypt'); // Added comment to restart nodemon
const prisma = require('../../db');
const { saveBase64Image } = require('../utils/fileUpload');
const { sendNotification } = require('../services/notificationService');


const JWT_SECRET = process.env.JWT_SECRET_KEY;

exports.register = async(req, res) => {
    console.log("Register request received!");
    try {
        let { idFrontImageBase64, idBackImageBase64} = req.body;
        
        email = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({where: {email}});
        if(existingUser) { 
            if (existingUser.verificationStatus === 'REJECTED')
             { return res.status(400).json({message: 'Your previous application was rejected. Please contact the admin via admin@medicalcare.com for support.'}); }
              return res.status(400).json({message : 'User already exists'}); 
        } const OR_conditions = [{ email }]; 
        if (phone) OR_conditions.push({ phone }); if (idCardNumber || nicNumber) OR_conditions.push({ idCardNumber: idCardNumber || nicNumber }); 
        const rejectedRecord = await prisma.rejectedRecord.findFirst({ where: { OR: OR_conditions } }); 
        if (rejectedRecord) { return res.status(400).json({message: 'Your previous application was rejected. Please contact the admin via admin@medicalcare.com for support.'}); }

        const passwordHash = await bcrypt.hash(password, 10);
        let verificationStatus = 'PENDING';

        if(role === 'PATIENT' || role === 'OVERSEAS_GUARDIAN') {
            verificationStatus = 'APPROVED';
        }

        const newUser = await prisma.user.create({      
            data : {
                email,
                passwordHash,
                fullName,
                phone,
                role,
                verificationStatus
            }
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        let frontImageUrl = null;
        let backImageUrl = null;
        
        if (licenseFrontImageBase64 && licenseFrontImageBase64.startsWith('data:image')) {
            const savedPath = saveBase64Image(licenseFrontImageBase64, 'licenses');
            if (savedPath) frontImageUrl = baseUrl + savedPath;
        }
        
        if (licenseBackImageBase64 && licenseBackImageBase64.startsWith('data:image')) {
            const savedPath = saveBase64Image(licenseBackImageBase64, 'licenses');
            if (savedPath) backImageUrl = baseUrl + savedPath;
        }

        let idFrontUrl = null;
        let idBackUrl = null;

        if (idFrontImageBase64 && idFrontImageBase64.startsWith('data:image')) {
            const savedPath = saveBase64Image(idFrontImageBase64, 'ids');
            if (savedPath) idFrontUrl = baseUrl + savedPath;
        }

        if (idBackImageBase64 && idBackImageBase64.startsWith('data:image')) {
            const savedPath = saveBase64Image(idBackImageBase64, 'ids');
            if (savedPath) idBackUrl = baseUrl + savedPath;
        }

        if(role === 'PATIENT' || role === 'OVERSEAS_GUARDIAN') {
            await prisma.patientProfile.create({
                data : {
                    userId : newUser.id,
                    fullName,
                    address: address || null,
                    nicNumber: nicNumber || idCardNumber || null
                }
            });
        }else if(role === 'DOCTOR' || role === 'NURSE' || role === 'CAREGIVER' || role === 'LAB_TECH' || role === 'PARAMEDIC') {
            await prisma.professionalProfile.create({
                data : {
                    userId : newUser.id,
                    fullName,
                    specialization,
                    qualifications,
                    licenseFrontImage: frontImageUrl,
                    licenseBackImage: backImageUrl,
                    address: address || null,
                    idCardNumber: idCardNumber || nicNumber || null,
                    workingHospital: workingHospital || null,
                    isCurrentlyWorking: isCurrentlyWorking !== undefined ? isCurrentlyWorking : true,
                    ambulanceVehicleNumber: ambulanceVehicleNumber || null,
                    attachedHospital: attachedHospital || null,
                    licenseIssuedYear: licenseIssuedYear ? parseInt(licenseIssuedYear) : null,
                    licenseNumber: licenseNumber || null
                }
            });
        }else if(role === 'PHARMACIST') {
            await prisma.pharmacistProfile.create({
                data : {
                    userId : newUser.id,
                    businessName: businessName || fullName,
                    licenseNumber: licenseNumber || null,
                    licenseIssuedYear: licenseIssuedYear ? parseInt(licenseIssuedYear) : null,
                    address: address || null,
                    licenseFrontImage: frontImageUrl,
                    licenseBackImage: backImageUrl
                }
            });
        }else if(role === 'ADMIN') {
            await prisma.adminProfile.create({
                data : {
                    userId : newUser.id,
                    fullName
                }
            });
        }

        const token = jwt.sign({id: newUser.id, role: newUser.role, verificationStatus: newUser.verificationStatus},
           JWT_SECRET, {expiresIn : '1h'});

        // Notify all Admins if the user is a professional needing approval
        if (['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH', 'PARAMEDIC', 'PHARMACIST'].includes(role)) {
            try {
                const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
                const notifPromises = admins.map(admin => 
                    sendNotification(admin.id, 'New Registration Approval', `A new ${role.toLowerCase()} (${fullName}) has registered and is waiting for approval.`, 'SYSTEM_ALERT', newUser.id)
                );
                await Promise.all(notifPromises);
            } catch (err) {
                console.log('Failed to send admin notifications:', err);
            }
        }

        res.status(201).json({message : "User registered Successfully" , user: newUser, token});

    } catch (error) {
        console.log(error)
        require('fs').appendFileSync('error.log', new Date().toISOString() + ' ' + (error.stack || error.message || String(error)) + '\n');
        return res.status(500).json({message : error.message || "Internal Server Error"});
    }
};

exports.updatePushToken = async (req, res) => {
    try {
        const { expoPushToken } = req.body;
        const userId = req.user.id; // from verifyToken middleware
        
        if (expoPushToken) {
            await prisma.user.update({
                where: { id: userId },
                data: { expoPushToken }
            });
        }
        
        res.status(200).json({ message: "Push token updated successfully" });
    } catch (error) {
        console.error("Failed to update push token:", error);
        res.status(500).json({ message: "Failed to update push token" });
    }
};

exports.login = async(req, res) => {
    try {
        let {email, password} = req.body;
        email = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({where: {email}});

        if(!user) {
            return res.status(400).json({message : "Invalid Credentials"})
        }

        const isPassword = await bcrypt.compare(password, user.passwordHash);
        
        if(!isPassword){
            return res.status(400).json({message: "Invalid password!"});
        }

        const token = await jwt.sign({id: user.id, role: user.role, verificationStatus: user.verificationStatus},
           JWT_SECRET, {expiresIn : '1h'});

           res.status(201).json({
            message: "Login Successfull",
            token,
            user
           })
     } catch (error) {
        console.log("Login Error:", error);
        require('fs').appendFileSync('error.log', new Date().toISOString() + ' [LOGIN] ' + (error.stack || error.message || String(error)) + '\n');
        return res.status(500).json({message: "Internal Server Error"})
    }
};

exports.logOut = async(req, res)=>{
    try {
        res.cookie('token', '',{maxAge: 0});

        return res.status(201).json({message : "Logout Successfull"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}




exports.getMe = async (req, res) => {
    try {
        const user = req.user;
        const { passwordHash, ...safeUser } = user;
        return res.status(200).json({ user: safeUser });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

