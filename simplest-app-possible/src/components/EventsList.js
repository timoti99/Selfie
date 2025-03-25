import React from 'react';
import EventCard from './EventCard';
import { useEvents } from '../contexts/EventsContext'; // Adjust path as necessary

function EventsList() {
    const { events } = useEvents();

    return (
        <div className="container mt-4">
            <div className="row">
                {events.map(event => (
                    <div className="col-sm-12 col-md-6 col-lg-4" key={event._id}>
                        <EventCard event={event} />
                    </div>
                ))}
            </div>
        </div>
    );
}


export default EventsList;
