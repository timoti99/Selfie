import mongoose from "mongoose";

const RecurrenceSchema = new mongoose.Schema({
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], required: false },
  daysOfWeek: [String],
  repeatUntil: Date,
  repeatCount: Number
}, { _id: false });

const EventoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Utente", required: true },
  title: { type: String, required: true },
  location: { type: String },
  start: { type: Date, required: true },
  end: { type: Date },
  durationMinutes: { type: Number },
  allDay: { type: Boolean, default: false },

  isRecurring: { type: Boolean, default: false },
  recurrence: {
    type: RecurrenceSchema,
    required: function (this: any) {
      return this.isRecurring;
    },
    default: undefined  
  },
  recurrenceId: {type: String},

  overridesOriginalId: { type: mongoose.Schema.Types.ObjectId, ref: "Evento", default: null }
});

export default mongoose.model("Evento", EventoSchema);