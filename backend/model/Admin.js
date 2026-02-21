const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    adminid: {
        required: true,
        type: String
    },
    name: {
        required: true,
        type: String
    },
    password: {
        required: true,
        type: String
    },
    contact: {
        required: true,
        type: String
    },
        email: {
        required: true,
        type: String
    }
})

module.exports = mongoose.model('Admin', dataSchema)