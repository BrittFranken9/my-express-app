import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: false // Make name optional for Google auth
    },
    age: {
        type: Number,
        required: false // Make age optional for Google auth
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: false // Make age optional for Google auth
    },
    weightKg: {
        type: Number,
        required: false // Make age optional for Google auth
    },
    activityLevel: {
        type: String,
        enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Muscle Gain'],
        required: false // Make age optional for Google auth
    },
    signupDate: {
        type: Date,
        default: Date.now
    },
    proteinGoal: {
        type: Number,
        required: false // Make age optional for Google auth
    }
});

const User = mongoose.model('User', userSchema);

export default User;