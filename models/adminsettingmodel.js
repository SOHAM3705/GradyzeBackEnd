const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        gender: {
            type: String,
            enum: ["male", "female", "prefer-not-to-say"],
        },
        password: {
            type: String,
        },
        profilePhotoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profilePhotos.files", // Correct GridFS reference
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema, "users");

module.exports = User;