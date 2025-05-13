import React, {useState, useEffect} from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {DateClickArg} from '@fullcalendar/interaction';
import {EventInput} from '@fullcalendar/core';
import Modal from 'react-modal';
import Navbar from "./Navbar";
import axios from "axios";
import '../App.css';

Modal.setAppElement('#root');


const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<EventInput[]>([]);
    const [showEventBox, setShowEventBox] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');

   interface EventFromServer {
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location?: string;
  durationMinutes?: number;
} 

interface NewEvent {
  title: string;
  start: string;
  end: string;
  durationMinutes: number;
  location: string;
  allDay: boolean;
  isRecurring: boolean;
  recurrence: {
    frequency: string;
    repeatCount: number;
    repeatUntil: string;
  };
}

    const [newEvent, setNewEvent] = useState<NewEvent>({
    title: '',
  start: '',
  end: '',
  durationMinutes: 60,
  location: '',
  allDay: false,
  isRecurring: false,
  recurrence: {
    frequency: '',
    repeatCount: 0,
    repeatUntil: ''
    }
    });

    const token = localStorage.getItem("token");

    useEffect(() => {
       if (token) {
      axios.get("http://localhost:3000/api/auth/eventi", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        console.log("Eventi ricevuti dal backend:", res.data);
         setEvents(res.data.map((ev: EventFromServer) => ({
    title: ev.title,
    start: ev.start,
    allDay: ev.allDay,
    extendedProps: {
      location: ev.location,
      durationMinutes: ev.durationMinutes,
          }
        })));
      })
      .catch((err) => console.error("Errore nel caricamento eventi:", err));
    }
  }, [token]);

    const handleDateClick = (arg: DateClickArg) => {
       setSelectedDate(arg.dateStr);
    setNewEvent(prev => ({ ...prev, start: arg.dateStr}));
    setShowEventBox(true);
    };


    const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.start) {
    alert("Inserisci almeno untitolo e una data per l'evento.");
    return;
  }

       if (token) {
      const payload: Partial<NewEvent> = { ...newEvent };


  // Rimuove il campo "recurrence" se non è un evento ricorrente
  if (!newEvent.isRecurring) {
    delete payload.recurrence;
  }

  axios.post('http://localhost:3000/api/auth/eventi', payload, {
    headers: { Authorization: `Bearer ${token}` }
  })
      .then((res) => {
        const newEv = res.data.evento;
        setEvents([...events, {
          title: newEv.title,
          start: newEv.start,
          allDay: newEv.allDay,
          extendedProps: {
            location: newEv.location,
            durationMinutes: newEv.durationMinutes
          }
        }]);
        setShowEventBox(false);
      })
      .catch((err) => console.error("Errore salvataggio evento:", err));
    }
  };


  return (
    <div className="calendar-page-container">
  <Navbar />

  <div className="calendar-container">
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      headerToolbar={{
        left: 'today prev,next',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      initialView="dayGridMonth"
      events={events}
      dateClick={handleDateClick}
      height="auto"
    />
  </div>

  {showEventBox && (
    <div className="eventi-container">
      <h2 className="eventi-title">Nuovo Evento - {selectedDate}</h2>
      <div className="event-card">
        <input
          type="text"
          placeholder="Titolo"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <input
          type="datetime-local"
          value={newEvent.start}
          onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
        />
        <input
          type="datetime-local"
          value={newEvent.end}
          onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
        />
        <input
          type="text"
          placeholder="Luogo"
          value={newEvent.location}
          onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
        />

        <label>
          <input
            type="checkbox"
            checked={newEvent.allDay}
            onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
          />
          Evento per tutta la giornata
        </label>

        <label>
          <input
            type="checkbox"
            checked={newEvent.isRecurring}
            onChange={(e) =>
              setNewEvent({ ...newEvent, isRecurring: e.target.checked })
            }
          />
          Evento ripetibile
        </label>

        {newEvent.isRecurring && (
          <div className="recurrence-section">
            <select
              value={newEvent.recurrence.frequency}
              onChange={(e) =>
                setNewEvent({
                  ...newEvent,
                  recurrence: {
                    ...newEvent.recurrence,
                    frequency: e.target.value,
                  },
                })
              }
            >
              <option value="">Seleziona frequenza</option>
              <option value="daily">Ogni giorno</option>
              <option value="weekly">Ogni settimana</option>
              <option value="monthly">Ogni mese</option>
            </select>

            <input
              type="number"
              min={1}
              placeholder="Ripeti N volte"
              value={newEvent.recurrence.repeatCount}
              onChange={(e) =>
                setNewEvent({
                  ...newEvent,
                  recurrence: {
                    ...newEvent.recurrence,
                    repeatCount: Number(e.target.value),
                  },
                })
              }
            />

            <input
              type="date"
              value={newEvent.recurrence.repeatUntil}
              onChange={(e) =>
                setNewEvent({
                  ...newEvent,
                  recurrence: {
                    ...newEvent.recurrence,
                    repeatUntil: e.target.value,
                  },
                })
              }
            />
          </div>
        )}

        <div className="event-actions">
          <button className="event-btn edit-btn" onClick={handleAddEvent}>
            Aggiungi Evento
          </button>
          <button
            className="event-btn delete-btn"
            onClick={() => setShowEventBox(false)}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
};

export default CalendarPage;