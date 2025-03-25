const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const Event = require('./models/Event');
const path = require('path')
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://aschimmenti:x7Av89cNnnsOgLlZ@notes-cluster.1tihbik.mongodb.net/?retryWrites=true&w=majority&appName=Notes-Cluster";
app.use(cors());


app.use(bodyParser.json());

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    createDummyEvent();  // Call the function to create a dummy event
  })
  .catch(err => console.log(err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



function createDummyEvent() {
  const today = new Date();
  const dummyEvent = new Event({
    title: 'Dummy Event',
    description: 'This is a dummy event',
    label: 'indigo',
    day: today.valueOf()  // Ensure day is stored as a numeric timestamp
  });

  dummyEvent.save()
    .then(() => console.log('Dummy event created successfully!'))
    .catch(err => console.error('Failed to create dummy event:', err));
}


app.use(express.static(path.join(__dirname, 'client', 'build')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});


// Get events by labels
app.get('/events/by-label', async (req, res) => {
  try {
    const labels = req.query.labels;
    if (!labels) {
      return res.status(400).json({ message: 'Label parameter is required' });
    }
    const labelArray = labels.split(',');  // Split labels into an array
    const events = await Event.find({ label: { $in: labelArray } });
    if (events.length === 0) {
      return res.status(404).json({ message: 'No events found with the specified labels' });
    }
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all events
app.get('/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new event
app.post('/events', async (req, res) => {
  const event = new Event({
    title: req.body.title,
    description: req.body.description,
    label: req.body.label,
    day: req.body.day
  });
  try {
    const newEvent = await event.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get a specific event by ID
app.get('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/events/:id', async (req, res) => {
  try {
    const { title, description, label, day } = req.body;
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Allow updates unconditionally
    event.title = title || event.title;
    event.description = description || event.description;
    event.label = label || event.label;
    event.day = day || event.day;

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});





// Delete an event
app.delete('/events/:id', async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

