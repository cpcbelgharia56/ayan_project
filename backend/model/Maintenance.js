const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    apartmentid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    month: {
      type: String, // YYYY-MM
      required: true,
    },
    amount: {
      type: Number, // base + carry forward
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    dues: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Paid", "Partial", "Due"],
      default: "Due",
    },
  },
  { timestamps: true }
);

// one record per member per month
maintenanceSchema.index({ memberId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Maintenance", maintenanceSchema);
