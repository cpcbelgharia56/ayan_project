const express = require('express');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const { createAccessToken, createRefreshToken } = require('../utils/tokens');
const Member = require('../model/Member');
const Maintenance = require("../model/Maintenance");
const nodemailer = require('nodemailer');
const router = express.Router();

// Email setup
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

// Home
router.get('/', (req, res) => {
    res.send("This is Member Home Page....!!!");
});


// ============================
// REGISTER MEMBER
// ============================
router.post("/register", async (req, res) => {
  try {
    const { apartmentid, name, password, contact, email, address, status, Maintenance } = req.body;

    if (!apartmentid) {
      return res.status(400).json({ message: "Apartment ID missing" });
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const member = new Member({
      apartmentid,
      name,
      password: hashpassword,
      contact,
      email,
      address,
      status,
      Maintenance: Number(Maintenance), // store as number
    });

    await member.save();

    res.status(200).json({ message: true, Member: member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ============================
// LOGIN MEMBER
// ============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const member = await Member.findOne({ email });

    if (!member) {
      return res.status(400).json({ message: false, error: 'Email not found' });
    }

    // ✅ BLOCK INACTIVE MEMBER LOGIN
    if (member.status === "inactive") {
      return res.status(403).json({
        message: false,
        error: "Your account is inactive. Please contact admin."
      });
    }

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(400).json({ message: false, error: 'Password not matched' });
    }

    const payload = { id: member._id, email: member.email };

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
      Member: {
        id: member._id,
        email: member.email,
        name: member.name,
        apartmentid: member.apartmentid
      }
    });

  } catch (error) {
    res.status(500).json({ message: false, error: 'Server error' });
  }
});




// ============================
// UPDATE MEMBER (DUE CHECK)
// ============================
router.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // 🚫 Block inactivation if dues exist
    if (updatedData.status === "inactive") {
      const lastMaintenance = await Maintenance.findOne({
        memberId: id,
      }).sort({ month: -1 });

      if (lastMaintenance && lastMaintenance.dues > 0) {
        return res.status(400).json({
          message:
            "Member has pending dues after last payment. Clear dues before marking inactive.",
        });
      }
    }

    const updatedMember = await Member.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    res.json({ message: true, Member: updatedMember });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// ============================
// DELETE MEMBER
// ============================

router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await Member.findByIdAndDelete(id);

        res.json({ message: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});



// ============================
// GET ALL MEMBERS
// ============================
router.get('/getall', async (req, res) => {
    try {
        const members = await Member.find();
        res.json({ message: true, Members: members });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get("/getallbyapartment", async (req, res) => {
  try {
    const { apartmentid } = req.query;
    const data = await Member.find({ apartmentid });

    res.json({ message: true, Members: data }); 
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// ============================
// GET MEMBER BY ID
// ============================
router.get('/getbyid', auth, async (req, res) => {
    try {
        const id = req.user.id; // FIXED
        const member = await Member.findById(id);

        res.json({ message: true, Member: member });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// ============================
// SEARCH MEMBERS
// ============================
router.get('/search/:keyword', async (req, res) => {
    const keyword = req.params.keyword;

    try {
        const result = await Member.find({
            name: { $regex: keyword, $options: 'i' }
        });

        res.json({ message: true, Members: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
