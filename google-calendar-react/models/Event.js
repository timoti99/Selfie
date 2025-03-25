const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  label: { type: String, required: true },
  day: { type: Number, required: true }, // Store as number (timestamp)
});

module.exports = mongoose.model('Event', eventSchema);
