import React from 'react';
import melone from '../melone.jpg'; // Ensure the path to the image is correct

function EventCard({ event }) {
    // Dynamically determine the border class based on the event label
    const borderColorClass = `border-${event.label}`;

    return (
        <div className={`card ${borderColorClass} mb-3`} style={{ maxWidth: '18rem' }}>
            <div className="card-header">Header</div>
            <div className="card-body">
                <img src={melone} className="img-fluid rounded-start mb-3" alt="event" />
                <h5 className="card-title">{event.title}</h5>
                <p className="card-text">{event.description}</p>
                <p className="card-text">
                    <small className="text-muted">Last updated {new Date(event.day).toLocaleDateString()}</small>
                </p>
            </div>
        </div>
    );
}

export default EventCard;
