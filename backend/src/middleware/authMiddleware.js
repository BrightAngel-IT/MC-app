const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET_KEY;

exports.protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({message: 'No Token, Unauthorized'});
        }
        
        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, JWT_SECRET);
        
        const prisma = require('../../db');
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        
        if (!user) {
            return res.status(401).json({message: 'User no longer exists'});
        }

        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({message: "Invalid Token"});
    }
};