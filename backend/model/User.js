const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
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
    },
        address: {
        required: true,
        type: String
    },
        image: {
        default: 'https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.gettyimages.in%2Fphotos%2Fapartment&psig=AOvVaw08VDeTV9ufSkgu8IHl8nqP&ust=1764396498789000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCMjqwKmXlJEDFQAAAAAdAAAAABAE',
        type: String
    },
        status: {
        default: 'Active',
        type: String
    }
})

module.exports = mongoose.model('User', dataSchema)