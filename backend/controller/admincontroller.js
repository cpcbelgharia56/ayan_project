const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const Admin = require("../model/Admin"); 


const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: "smtp.gmail.com",
       auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_APP_PASSWORD,
         },
    secure: true,
});

router.post("/register", async function (req, res) {
  try {
    const { adminid, name, password, contact,email } = req.body;


    const hashedPassword = await bcrypt.hash(password, 10);


    const admin = new Admin({
      adminid,
      name,
      password: hashedPassword,
      contact,
      email,
    });


    const savedAdmin = await admin.save();
    res.status(200).json({ message: true, admin: savedAdmin });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.post("/login", async function (req, res) {
  const { adminid, password } = req.body;

  try {

    const existingAdmin = await Admin.findOne({ adminid: adminid });

    if (!existingAdmin) {
      return res.status(200).json({ message: "adminid not found" });
    }


    const isMatch = await bcrypt.compare(password, existingAdmin.password);

    if (isMatch) {
      res.status(200).json({ message: true, admin: existingAdmin });
    } else {
      res.status(200).json({ message: "password not matched" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register_user',async function (req, res) {
    const new_user = new Admin({
       "adminid" : req.body.adminid,
        "email" : req.body.email,
        "name": req.body.name,
        "password": req.body.password,
        "contact": req.body.contact
    })

    try {
        const dataToSave = await new_user.save();
console.log(dataToSave);
        //send mail to the registered user
        const mailData = {
            from: process.env.EMAIL,  // sender address
            to: req.body.email ,   // list of receivers
            subject: 'Registration Notification',
            text: 'MyWebsite',
            html: '<b>Hey '+req.body.name+' Thank you for registration....!!!',
          };
      
          transporter.sendMail(mailData, function (err, info) {
              if(err)
                res.send({message: 'failed'})
              else
                res.send({message: 'success'});
           });

        res.status(200).json(dataToSave)
    }
    catch (error) {
        res.status(400).json({message: error.message})
    }
});

module.exports = router;
