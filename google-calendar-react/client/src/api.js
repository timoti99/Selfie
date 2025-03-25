import axios from 'axios';

const API_URL = 'http://localhost:5000/events'; // Base URL for API

// Fetch all events
export const fetchEvents = async () => {
  try {
    const response = await axios.get(API_URL);
    if (response.status === 200) {
      return response.data; // Assuming the API returns the array of events directly
    } else {
      throw new Error('Failed to fetch events');
    }
  } catch (error) {
    console.error('Failed to fetch events:', error.response ? error.response.data.message : error.message);
    return []; // Return an empty array in case of an error
  }
};

// Fetch event by ID
export const fetchEventById = async (id) => {
  return await axios.get(`${API_URL}/${id}`);
};

// Fetch events by label
export const fetchEventsByLabel = async (labels) => {
  return await axios.get(`${API_URL}/by-label`, { params: { labels } });
};

// Create a new event
export const createEvent = async (eventData) => {
  return await axios.post(API_URL, eventData);
};

// Update an event
export const updateEvent = async (id, eventData) => {
  return await axios.put(`${API_URL}/${id}`, eventData);
};

// Delete an event
export const deleteEvent = async (id) => {
  return await axios.delete(`${API_URL}/${id}`);
};
