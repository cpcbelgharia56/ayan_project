const express = require('express');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const { createAccessToken, createRefreshToken } = require('../utils/tokens');
const Apartment = require('../model/Apartment');
const nodemailer = require('nodemailer');
const router = express.Router();

// ---------------- EMAIL TRANSPORTER ----------------

const transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.gmail.com",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    secure: true,
});

// ---------------- ROUTES ----------------

router.get('/', (req, res) => {
    res.send("This is Apartment Home Page....!!!");
});

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, password, contact, email, address, status } = req.body;

        const hashpassword = await bcrypt.hash(password, 10);

        const apartment = new Apartment({
            name,
            password: hashpassword,
            contact,
            email,
            address,
            status
        });

        const savedApartment = await apartment.save();

        const mailData = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Registration Successful',
            html: `<b>Hello ${name},</b><br/>Thank you for registering!`
        };

        transporter.sendMail(mailData, (err, info) => {
            if (err) {
                console.log("Email failed:", err);
                return res.status(200).json({
                    message: true,
                    emailStatus: "Email failed to send",
                    apartment: savedApartment
                });
            } else {
                console.log("Email sent:", info.response);
                return res.status(200).json({
                    message: true,
                    emailStatus: "Email sent successfully",
                    apartment: savedApartment
                });
            }
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const apartment = await Apartment.findOne({ email });

        if (!apartment) {
            return res.status(400).json({ message: 'Email not found' });
        }

        const isMatch = await bcrypt.compare(password, apartment.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password not matched' });
        }

        const payload = { id: apartment._id, email: apartment.email };

        const accessToken = createAccessToken(payload);
        const refreshToken = createRefreshToken(payload);

        res.cookie('jid', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            message: true,
            accessToken,
            apartment: {
                id: apartment._id,
                email: apartment.email,
                name: apartment.name,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// UPDATE
router.patch('/update', auth, async (req, res) => {
    try {
        const result = await Apartment.findByIdAndUpdate(
            req.user.id,
            req.body,
            { new: true }
        );

        res.json({ message: true, apartment: result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE
router.delete('/delete', auth, async (req, res) => {
    try {
        await Apartment.findByIdAndDelete(req.user.id);
        res.json({ message: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET ALL
router.get('/getall', async (req, res) => {
    try {
        const data = await Apartment.find();
        res.json({ message: true, apartment: data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET BY ID (LOGGED IN USER)
router.get('/getbyid', auth, async (req, res) => {
    try {
        const data = await Apartment.findById(req.user.id);
        res.json({ message: true, apartment: data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// SEARCH
router.get('/search/:keyword', async (req, res) => {
    const keyword = req.params.keyword;

    try {
        const data = await Apartment.find({
            name: { $regex: keyword, $options: 'i' }
        });

        res.json({ message: true, apartment: data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
