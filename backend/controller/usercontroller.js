const express = require('express');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const { createAccessToken, createRefreshToken } = require('../utils/tokens');
const jwt = require('jsonwebtoken');
const User = require('../model/User');
const nodemailer = require('nodemailer');
const router = express.Router();


const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: "smtp.gmail.com",
       auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_APP_PASSWORD,
         },
    secure: true,
});


router.get('/', function (req, res) {
    res.send("This is User Home Page....!!!")
});

router.post('/register', async function (req, res) {
    try {
        const { name, password, contact, email, address, status } = req.body;

        const hashpassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            password: hashpassword,
            contact,
            email,
            address,
            status
            
        });

        const savedUser = await user.save();

        // Prepare email
        const mailData = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Registration Successful',
            html: `<b>Hello ${name},</b><br/>Thank you for registering!`
        };

        // Send email
        transporter.sendMail(mailData, function (err, info) {
            if (err) {
                console.log("Email failed:", err);
                return res.status(200).json({
                    message: true,
                    emailStatus: "Email failed to send",
                    user: savedUser
                });
            } else {
                console.log("Email sent:", info.response);
                return res.status(200).json({
                    message: true,
                    emailStatus: "Email sent successfully",
                    user: savedUser
                });
            }
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // find user by userid
    const user = await User.findOne({ email });
    console.log('Found user:', user);

    if (!user) {
      return res.status(400).json({ message: 'email not found' });
    }

    // compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password not matched' });
    }

    // ✅ JWT payload should be small & simple
    const payload = { id: user._id, email: user.email };

    // ✅ Create JWT tokens
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    // ✅ Set httpOnly cookie
    res.cookie('jid', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Return access token + user info
    res.status(200).json({
      message: true,
      accessToken,
      user: {
        id: user._id,
       email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


    router.patch('/update',  auth,  async (req, res) => {
    try {
        const id = req.user.id;
        const updatedData = req.body;
        const options = { new: true };

        const result = await User.findByIdAndUpdate(
            req.user.id, updatedData, options
        )

        res.send({message: true, user: result})
    }
    catch (error) {
        res.status(400).json({ message: error.message })
    }
});

router.delete('/delete',  auth, async function (req, res) {
     try {
        const id = req.params.id;
        const data = await User.findByIdAndDelete(req.user.id)
        res.send({message: true})
    }
    catch (error) {
        res.status(400).json({ message: error.message })
    }
});

router.get('/getall',async function (req, res) {
    try{
        const data = await User.find();
        res.json({message: true, user: data})
    }
    catch(error){
        res.status(500).json({message: error.message})
    }
});

router.get('/getbyid', auth,  async function (req, res) {
   try{
        const data = await User.findById(req.user.id);
        res.json({message: true, user: data})
    }
    catch(error){
        res.status(500).json({message: error.message})
    }
});

router.get('/search/:keyword', async function (req, res) {
  const keyword = req.params.keyword;

  try {
    const data = await User.find({
      name: { $regex: keyword, $options: 'i' }
    });

    res.json({ message: true, users: data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router