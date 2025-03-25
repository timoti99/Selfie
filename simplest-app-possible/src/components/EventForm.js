import React, { useState } from 'react';
import { useEvents } from '../contexts/EventsContext'; // Adjust path as necessary

function EventForm() {
    const { addNewEvent } = useEvents();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [label, setLabel] = useState('');
    const [day, setDay] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        const eventData = {
            title,
            description,
            label,
            day: new Date(day).getTime()
        };

        try {
            await addNewEvent(eventData);
            alert('Event created successfully!');
            setTitle('');
            setDescription('');
            setLabel('');
            setDay('');
        } catch (error) {
            alert('Failed to create event: ' + error.message);
        }
    };

    return (
        <div className="container">
            <h2>Add New Event</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="title" className="form-label">Title</label>
                    <input
                        type="text"
                        className="form-control"
                        id="title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <textarea
                        className="form-control"
                        id="description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="label" className="form-label">Label</label>
                    <input
                        type="text"
                        className="form-control"
                        id="label"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="day" className="form-label">Date</label>
                    <input
                        type="date"
                        className="form-control"
                        id="day"
                        value={day}
                        onChange={e => setDay(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">Submit</button>
            </form>
        </div>
    );
}

export default EventForm;