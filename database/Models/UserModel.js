const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    lateReturnFine: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

module.exports = mongoose.model('users', UserSchema)