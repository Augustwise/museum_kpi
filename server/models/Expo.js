const mongoose = require('mongoose');

const ExpoSchema = new mongoose.Schema(
  {
    expoId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    photoUrl: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expo', ExpoSchema);