const express = require("express");
const router = express.Router();
const Maintenance = require("../model/Maintenance");
const Expense = require("../model/Expense"); // <-- Import Expense model

// ====================== MAINTENANCE ROUTES ======================

/* ============================================================
   GET PAYABLE (BASE + PREVIOUS DUES)
============================================================ */
router.get("/payable", async (req, res) => {
  try {
    const { memberId, month, baseAmount } = req.query;

    if (!memberId || !month || !baseAmount) {
      return res.status(400).json({ message: "Missing params" });
    }

    const lastRecord = await Maintenance.findOne({
      memberId,
      month: { $lt: month },
    }).sort({ month: -1 });

    const carryForward =
      lastRecord && lastRecord.dues > 0 ? lastRecord.dues : 0;

    const totalPayable = Number(baseAmount) + carryForward;

    res.json({
      baseAmount: Number(baseAmount),
      carryForward,
      totalPayable,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   ADD MAINTENANCE (FIXED LOGIC)
============================================================ */
router.post("/add", async (req, res) => {
  try {
    const { apartmentid, memberId, month, amount, paidAmount } = req.body;

    if (!apartmentid || !memberId || !month || paidAmount == null) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existingRecord = await Maintenance.findOne({
      memberId,
      month,
    });

    if (existingRecord) {
      return res.status(400).json({
        message: "Payment already done for this month.",
      });
    }

    // Get previous record
    const lastRecord = await Maintenance.findOne({
      memberId,
      month: { $lt: month },
    }).sort({ month: -1 });

    const previousDue =
      lastRecord && lastRecord.dues > 0 ? lastRecord.dues : 0;

    const totalPayable = Number(amount) + previousDue;

    let finalDues = totalPayable - Number(paidAmount);
    let status = "Due";

    // ✅ HANDLE ADVANCE
    if (finalDues <= 0) {
      finalDues = 0;
      status = "Paid";
    } else if (paidAmount > 0) {
      status = "Partial";
    }

    const newRecord = new Maintenance({
      apartmentid,
      memberId,
      month,
      amount: Number(amount),
      paidAmount,
      dues: finalDues,
      status,
    });

    await newRecord.save();

    res.json({ message: true, data: newRecord });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ============================================================
   FUND DASHBOARD
============================================================ */
router.get("/fund-dashboard", async (req, res) => {
  try {
    const { apartmentid } = req.query;

    const allRecords = await Maintenance.find({ apartmentid })
      .populate("memberId", "name")
      .sort({ createdAt: -1 });

    const totalFund = allRecords.reduce(
      (sum, r) => sum + Number(r.paidAmount || 0),
      0
    );

    const totalRemaining = allRecords.reduce(
      (sum, r) => sum + Number(r.dues || 0),
      0
    );

    const last10Transactions = allRecords.slice(0, 10);

    res.json({
      totalFund,
      totalRemaining,
      last10Transactions,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
   GET BY APARTMENT
============================================================ */
router.get("/getbyapartment", async (req, res) => {
  try {
    const { apartmentid } = req.query;

    const list = await Maintenance.find({ apartmentid })
      .populate("memberId", "name")
      .sort({ month: -1 });

    res.json({ message: true, Maintenance: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


/* ============================================================
   GET BY MEMBER (HISTORY)
============================================================ */
router.get("/getbymember/:memberId", async (req, res) => {
  try {
    const list = await Maintenance.find({
      memberId: req.params.memberId,
    }).sort({ month: -1 });

    res.json({ message: true, Maintenance: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Update maintenance
router.patch("/update/:id", async (req, res) => {
  try {
    const { amount, paidAmount } = req.body;
    let updateData = req.body;

    if (amount !== undefined && paidAmount !== undefined) {
      updateData.dues = Number(amount) - Number(paidAmount);
      updateData.status = paidAmount >= amount ? "Paid" : paidAmount > 0 ? "Partial" : "Due";
    }

    const updated = await Maintenance.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: true, Maintenance: updated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete maintenance
router.delete("/delete/:id", async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ message: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all maintenance
router.get("/getall", async (req, res) => {
  try {
    const list = await Maintenance.find().populate("memberId", "name contact").sort({ createdAt: -1 });
    res.json({ message: true, Maintenance: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Add expense
router.post("/expense/add", async (req, res) => {
  try {
    const { apartmentid, description, amount, date } = req.body;

    const newExpense = new Expense({
      apartmentid,
      description: description, // map description to title
      amount,
      date: date || Date.now(),
    });

    const savedExpense = await newExpense.save();
    res.status(200).json({ message: true, expense: savedExpense });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all expenses for apartment
router.get("/expense/getbyapartment", async (req, res) => {
  try {
    const { apartmentid } = req.query;
    const list = await Expense.find({ apartmentid }).sort({ date: -1 });
    res.json({ message: true, expenses: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// routes/maintenance.js
router.get("/fund-by-month", async (req, res) => {
  try {
    const { apartmentid, month } = req.query;

    if (!apartmentid || !month) {
      return res.status(400).json({ message: "apartmentid and month required" });
    }

    const records = await Maintenance.find({
      apartmentid,
      month,
    }).populate("memberId", "name");

    const totalFund = records.reduce(
      (sum, r) => sum + Number(r.paidAmount || 0),
      0
    );

    res.json({
      month,
      totalFund,
      records,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/total-fund", async (req, res) => {
  try {
    const { apartmentid } = req.query;

    const records = await Maintenance.find({ apartmentid });

    const fund = records.reduce(
      (sum, r) => sum + Number(r.paidAmount || 0),
      0
    );

    res.json({ fund });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;
