const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true
    },

    mobile: {
        type: String,
        required: [true, "Mobile number is required"],
        unique: true,
        match: [/^[6-9]\d{9}$/, "Please enter a valid mobile number"]
    },

    password: {
        type: String,
        required: [true, "Password is required"]
    },

    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    status: {
        type: Boolean,
        default: true
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);