require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const mongoString = process.env.DATABASE_URL;
mongoose.connect(mongoString);

const database = mongoose.connection;
database.on('error', (error) => console.log(error));
database.once('connected', () => console.log('Database Connected'));

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS setup (allow credentials if you’ll use httpOnly cookies)
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// Default route
app.get('/', (req, res) => res.send("This is Home Page....!!!"));

// Import controllers
const Membercontroller = require('./controller/Membercontroller');
app.use('/member', Membercontroller);

const apartmentcontroller = require('./controller/apartmentcontroller');
app.use('/apartment',apartmentcontroller );

const Maintenancecontroller = require('./controller/Maintenancecontroller');
app.use('/Maintenance',Maintenancecontroller );

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Started at ${PORT}`));
