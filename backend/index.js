const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require('./src/routes/authRoute');
const patientRoutes = require('./src/routes/patientRoutes')
const professionalRoutes = require('./src/routes/professionalRoutes');
const vendorRoutes = require('./src/routes/vendorRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

const PORT = process.env.PORT || 5000;

const path = require("path");

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes)
app.use('/api/professional', professionalRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);

const notificationRoutes = require('./src/routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Api is running..." })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});