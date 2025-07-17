import React, {useState, useEffect} from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {DateClickArg} from '@fullcalendar/interaction';
import {EventInput} from '@fullcalendar/core';
import { EventApi } from '@fullcalendar/core';
import Modal from 'react-modal';
import Navbar from "./Navbar";
import axios from "axios";
import '../App.css';

Modal.setAppElement('#root');

   interface EventFromServer {
  title: string;
  start: string;
  end: string;
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

interface SelectedEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  location?: string;
  recurrenceId?: string;
  allDay?: boolean;
  overridesOriginalId?: string;
  isRecurring?: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    repeatUntil?: string | Date;
  };
}

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<EventInput[]>([]);
    const [showEventBox, setShowEventBox] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
    const [showEditBox, setShowEditBox] = useState(false);

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
         
        setEvents(res.data.map((ev: EventFromServer & {_id: string}) => ({
    id: ev._id,
    title: ev.title,
    start: new Date(ev.start),
    end: new Date(ev.end),
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
    alert("Inserisci almeno un titolo e una data per l'evento.");
    return;
  }

  if (newEvent.isRecurring && !newEvent.recurrence.repeatUntil) {
    alert("Seleziona una data di fine per la ripetizione dell’evento.");
  return;
  }

   const frequency = newEvent.recurrence?.frequency;

   let repeatUntil: Date | undefined = undefined;
   if (newEvent.recurrence?.repeatUntil) {
    const parsedDate = new Date(newEvent.recurrence.repeatUntil);
    if (!isNaN(parsedDate.getTime())) {
      repeatUntil = parsedDate;
    }
   }

  const startDate = new Date(newEvent.start);
  const endDate = newEvent.end ? new Date(newEvent.end) : null;
  const duration = endDate ? endDate.getTime() - startDate.getTime() : 30 * 60000;

  const recurrenceId = typeof window !== "undefined" && window.crypto?.randomUUID
  ? window.crypto.randomUUID()
  : Math.random().toString(36).substring(2, 10); // fallback
  const eventsToAdd: EventInput[] = [];

  const addOccurrence = (date: Date) => {
    const eventStart = new Date(date);
    const eventEnd = new Date(eventStart.getTime() + duration);

    eventsToAdd.push({
      title: newEvent.title,
      start: eventStart.toISOString(),
      end: eventEnd.toISOString(),
      allDay: newEvent.allDay || false,
      extendedProps: {
        location: newEvent.location,
        durationMinutes: duration / 60000,
        recurrenceId
      }
    });
  };

  const currentDate = new Date(startDate);

  if (!frequency || !repeatUntil) {
    // Nessuna ricorrenza, singolo evento
    addOccurrence(currentDate);
  } else {
    while (currentDate <= repeatUntil) {
      addOccurrence(currentDate);

      // Aggiungi la prossima ricorrenza
      if (frequency === "daily") currentDate.setDate(currentDate.getDate() + 1);
      else if (frequency === "weekly") currentDate.setDate(currentDate.getDate() + 7);
      else if (frequency === "monthly") currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  // Salva su backend se presente il token
  if (token) {
   console.log("Eventi da salvare:", eventsToAdd);
  
  Promise.all(eventsToAdd.map(event =>
  axios.post("http://localhost:3000/api/auth/eventi", event, {
    headers: { Authorization: `Bearer ${token}` }
  })
))
.then(() => {
  setEvents([...events, ...eventsToAdd]);
  setShowEventBox(false);
})
.catch(err => console.error("Errore nel salvataggio degli eventi:", err));
  }  
  };

  const handleEventClick = (event: EventApi) => {
    const title = event.title;
  const start = event.start ?? new Date();
  const end = event.end ?? new Date(start.getTime() + 60 * 60000);
  const location = event.extendedProps?.location || '';
  const recurrenceId = event.extendedProps?.recurrenceId || null;
  const overridesOriginalId = event.extendedProps?.overridesOriginalId || null;

  setSelectedEvent({
    id: event.id,
    title,
    start,
    end,
    location,
    recurrenceId,
    allDay: event.allDay,
    isRecurring: !!recurrenceId,
    recurrence: undefined,
    overridesOriginalId,
  });
  setShowEditBox(true);
  };

  const handleEditEvent = async (mode: 'single' | 'all' = 'single') => {
  if (!selectedEvent) return;

  const isOverride = mode === 'single' && selectedEvent.recurrenceId;

  const updatePayload = {
    id: isOverride ? undefined : selectedEvent.id, // se override, nuovo evento (no id)
    title: selectedEvent.title,
    start: selectedEvent.start,
    end: selectedEvent.end,
    location: selectedEvent.location,
    allDay: selectedEvent.allDay || false,
    recurrenceId: mode === 'all' ? selectedEvent.recurrenceId : undefined,
    overridesOriginalId: isOverride ? selectedEvent.id : undefined,
  };

  try {
    await axios.put("http://localhost:3000/api/auth/eventi", updatePayload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    alert("Evento modificato con successo!");
    setSelectedEvent(null);
    setShowEditBox(false);
    window.location.reload();
  } catch (err) {
    console.error("Errore durante la modifica dell'evento", err);
    alert("Si è verificato un errore durante la modifica dell'evento");
  }
};

  const handleDeleteEvent = (mode = 'single') => {
    if (!selectedEvent) return;

    //Se mode è 'all' uso recurrenceId   
    const idOrRecurrence = 
    mode === 'all' && selectedEvent.recurrenceId
    ? {recurrenceId: selectedEvent.recurrenceId }
    : {start: selectedEvent.start, title: selectedEvent.title};

    axios
    .delete(`http://localhost:3000/api/auth/eventi/${selectedEvent.id}`, {
      headers: {Authorization: `Bearer ${token}`},
      data: idOrRecurrence,
    })
    .then(() => {
      alert("Evento eliminato!");
      setShowEditBox(false);
      window.location.reload();
    })
    .catch((err) => console.error("Errore eliminazione evento", err));
  };

  function chiudiModificaEvento() {
  setShowEditBox(false);
  setSelectedEvent(null);
}


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
      eventClick={(info) => handleEventClick(info.event)}
    />
     {(showEventBox || selectedEvent) && (<div className="overlay-background"
     onClick={() => {
      setShowEventBox(false);
      setShowEditBox(false);
      setSelectedEvent(null);
     }} 
     />
     )}
  </div>


  { showEventBox && (
    <div className="eventi-container">
      <h2 className="eventi-title">Nuovo Evento - {selectedDate}</h2>
      <div className="event-card">
        <input
          type="text"
          className="input-field"
          placeholder="Titolo"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <input
          type="datetime-local"
          className="input-field"
          value={newEvent.start}
          onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
        />
        <input
          type="datetime-local"
          className="input-field"
          value={newEvent.end}
          onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
        />
        <input
          type="text"
          className="input-field"
          placeholder="Luogo"
          value={newEvent.location}
          onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
        />

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={newEvent.allDay}
            onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
          />
          Evento per tutta la giornata
        </label>

        <label className="checkbox-label">
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
            <label className="label-select">Frequenza:</label>
            <select
              className="select-field"
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

            

           <label className="label-date">Fino al</label>
           <input
           type="date"
           className="input-field"
           value={newEvent.recurrence.repeatUntil}
           onChange={(e) => setNewEvent({
            ...newEvent,
            recurrence: {
              ...newEvent.recurrence,
              repeatUntil: e.target.value
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

{showEditBox && selectedEvent && (
      <div className="event-details-wrapper">
        <button className="event-close-button" onClick={chiudiModificaEvento}>×</button>
        <h2 className="form-title">Modifica o elimina evento</h2>
        <div className="event-form-card">
          <label>
            Titolo:
            <input
              className="input-field"
              type="text"
              value={selectedEvent.title}
              onChange={(e) =>
                setSelectedEvent((prev) =>
                  prev ? { ...prev, title: e.target.value } : null
                )
              }
            />
          </label>

          <label>
            Inizio:
            <input
              className="input-field"
              type="datetime-local"
              value={new Date(selectedEvent.start).toISOString().slice(0, 16)}
              onChange={(e) =>
                setSelectedEvent((prev) =>
                  prev ? { ...prev, start: new Date(e.target.value) } : null
                )
              }
            />
          </label>

          <label>
            Fine:
            <input
              className="input-field"
              type="datetime-local"
              value={new Date(selectedEvent.end).toISOString().slice(0, 16)}
              onChange={(e) =>
                setSelectedEvent((prev) =>
                  prev ? { ...prev, end: new Date(e.target.value) } : null
                )
              }
            />
          </label>

          <label>
            Luogo:
            <input
              className="input-field"
              type="text"
              value={selectedEvent.location || ''}
              onChange={(e) =>
                setSelectedEvent((prev) =>
                  prev ? { ...prev, location: e.target.value } : null
                )
              }
            />
          </label>

          <label className="checkbox-label">
  <input
    type="checkbox"
    checked={selectedEvent.allDay || false}
    onChange={(e) =>
      setSelectedEvent((prev) =>
        prev ? { ...prev, allDay: e.target.checked } : null
      )
    }
  />
  Evento per tutta la giornata
</label>

        <div className="event-actions">
  <button className="event-btn edit-btn" onClick={() => handleEditEvent('single')}>
    Modifica occorrenza
  </button>
  {selectedEvent.recurrenceId && (
    <button className="event-btn edit-btn" onClick={() => handleEditEvent('all')}>
      Modifica tutta la serie
    </button>
  )}
  <button className="event-btn delete-btn" onClick={() => handleDeleteEvent('single')}>
    Elimina occorrenza
  </button>
  {selectedEvent.recurrenceId && (
    <button className="event-btn delete-btn" onClick={() => handleDeleteEvent('all')}>
      Elimina tutta la serie
    </button>
  )}
  <button
    className="event-btn"
    onClick={() => {
      setShowEditBox(false);
      setSelectedEvent(null);
    }}
  >
    Annulla
  </button>
</div> 
        </div>
      </div>
    )}

  { selectedEvent && selectedEvent.isRecurring && (
  <div className="ricorrenza-elimina-opzioni">
    <p>L'evento è ricorrente. Cosa vuoi eliminare?</p>
    <button
      className="event-btn delete-btn"
      onClick={() => handleDeleteEvent('single')}
    >
      Solo questo evento
    </button>
    <button
      className="event-btn delete-btn"
      onClick={() => handleDeleteEvent('all')}
    >
      Tutta la serie
    </button>
  </div>
)}
      </div>
    )}

export default CalendarPage;