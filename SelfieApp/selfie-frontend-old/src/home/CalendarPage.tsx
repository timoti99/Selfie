import React, {useState} from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {EventInput} from '@fullcalendar/core';
import '../App.css';

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<EventInput[]>([]);

    const handleDateClick = (arg: any) => {
        const title = prompt('Inserisci il titolo dell\'evento');
        if (title) {
            setEvents([...events, {title, start: arg.dateStr, allDay: true}]);
        }
    };

    return (
        <div className="calendar-container">
            <FullCalendar 
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            headerToolbar={{left: 'today prev,next', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay'}}
            initialView="dayGridMonth" events={events} dateClick={handleDateClick} height="auto" />
        </div>
    );
};

export default CalendarPage;