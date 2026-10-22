const express = require('express');
const router = express.Router();
const prisma = require('../../db');

router.get('/', async (req, res) => {
    try {
        const settings = await prisma.systemSetting.findMany();
        let formatted = {};
        settings.forEach(s => formatted[s.key] = s.value);
        res.status(200).json(formatted);
    } catch(err) {
        res.status(500).json({message: 'Error fetching settings'});
    }
});

module.exports = router;
