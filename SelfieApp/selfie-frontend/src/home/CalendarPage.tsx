import React, {useState, useEffect, useCallback} from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {DateClickArg} from '@fullcalendar/interaction';
import {EventInput} from '@fullcalendar/core';
import { EventClickArg } from '@fullcalendar/core';

import Modal from 'react-modal';
import Navbar from "./Navbar";
import axios from "axios";
import '../App.css';

const API = "http://localhost:3000/api/auth";

Modal.setAppElement('#root');

interface EventFromServer {
  _id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string;
  durationMinutes?: number;
  isRecurring?: boolean;
  overridesOriginalId?: string;
  recurrenceId?: string;
  seriesParentId?: string;
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
  id: string | null;
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
  parentId?: string | null;
  extendedProps?: Record<string, unknown>;
}


const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<EventInput[]>([]);
    const [showEventBox, setShowEventBox] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
    const [showEditBox, setShowEditBox] = useState(false);
    const [editMode, setEditMode] = useState<'single' | 'all'>('single');

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

    const fetchEvents = useCallback(async () => {
  if (!token) return;
  try {
    const res = await axios.get(`${API}/eventi`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const serverEvents: EventFromServer[] = res.data;

    setEvents(
      serverEvents.map((ev) => ({
        id: String(ev._id),
        title: ev.title,
        start: ev.start,
        end: ev.end,
        allDay: !!ev.allDay,
        extendedProps: {
          location: ev.location,
          durationMinutes: ev.durationMinutes,
          isRecurring: ev.isRecurring,
          overridesOriginalId: ev.overridesOriginalId,
          recurrenceId: ev.recurrenceId,
          // parent/series id
          seriesParentId: ev.seriesParentId ?? ev.overridesOriginalId ?? null,
        },
        className: ev.isRecurring ? "recurring-event" : "single-event"
      }))
    );
  } catch (err) {
    console.error("Errore nel fetch degli eventi:", err);
  }
}, [token]);

    useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

    const handleDateClick = (arg: DateClickArg) => {
       setSelectedDate(arg.dateStr);
    setNewEvent(prev => ({ ...prev, start: arg.dateStr}));
    setShowEventBox(true);
    };


   const handleAddEvent = async () => {
  if (!newEvent.title || !newEvent.start) { alert("Titolo e data obbligatori"); return; }

  const startDate = new Date(newEvent.start);
  let endDate = newEvent.end ? new Date(newEvent.end) : new Date(startDate.getTime() + 30*60000);

  if (newEvent.allDay) {
    startDate.setHours(0,0,0,0);
    endDate = new Date(startDate);
    endDate.setHours(23,59,59,999);
  }

  const recurrenceId = crypto?.randomUUID?.() || Math.random().toString(36).slice(2,10);

  if (newEvent.isRecurring && newEvent.recurrence?.frequency && newEvent.recurrence?.repeatUntil) {
    const payload = {
      title: newEvent.title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay: newEvent.allDay,
      location: newEvent.location,
      isRecurring: true,
      recurrence: {
        frequency: newEvent.recurrence.frequency,
        repeatUntil: new Date(newEvent.recurrence.repeatUntil).toISOString()
      },
      recurrenceId
    };

    try {
      await axios.post(`${API}/eventi`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEvents();
      setShowEventBox(false);
    } catch (err) {
      console.error(err);
    }
    return;
  }

  // Evento singolo
  const singlePayload = {
    title: newEvent.title,
  start: startDate.toISOString(),
  end: endDate.toISOString(),
  allDay: newEvent.allDay,
  location: newEvent.location,
  isRecurring: false
  };

  try {
    const res = await axios.post(`${API}/eventi`, singlePayload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const saved = res.data;
  const mapped = {
    id: String(saved._id),
    title: saved.title,
    start: new Date(saved.start),
    end: saved.end ? new Date(saved.end) : undefined,
    allDay: !!saved.allDay,
    extendedProps: {
      location: saved.location || "",
      durationMinutes: saved.durationMinutes || 60,
      isRecurring: !!saved.isRecurring,
      recurrenceId: saved.recurrenceId ?? null,
      overridesOriginalId: saved.overridesOriginalId ?? null,
      isCancelled: !!saved.isCancelled
    }
  };

    setEvents(prev => [...prev, mapped]);
    setShowEventBox(false);
  } catch (err) {
    console.error(err);
  }
};

  const handleEventClick = (info: EventClickArg) => {
    const e = info.event;

  setSelectedEvent({
    id: e.id ?? e.extendedProps?._id ?? null,
    title: e.title,
    start: e.start?.toISOString() || "",
    end: e.end?.toISOString() || "",
    location: e.extendedProps?.location || "",
    allDay: e.allDay,
    recurrenceId: e.extendedProps?.recurrenceId || null,
    overridesOriginalId: e.extendedProps?.overridesOriginalId || null,
    isRecurring: !!e.extendedProps?.isRecurring,
    recurrence: e.extendedProps?.recurrence || undefined,
    extendedProps: e.extendedProps
  });

  if (e.extendedProps?.isRecurring && e.extendedProps?.recurrenceId) {
    // Evento ricorrente 
    setEditMode("single");
    
  } else {
    // Evento singolo
    setShowEditBox(true);
  }
};

 const handleEditEvent = async (mode: 'single' | 'all' = 'single') => {
   if (!selectedEvent) return;

  const startDate = new Date(selectedEvent.start);
  const endDate = new Date(selectedEvent.end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    alert("Errore: data di inizio o fine non valida.");
    return;
  }

  
  try {
    if (mode === "single" && selectedEvent.extendedProps?.recurrenceId) {
      // modifica solo una occorrenza (override)
     const payload = {
    id: selectedEvent.id, // se è un override, esiste un ID specifico
    title: selectedEvent.title,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    location: selectedEvent.location || "",
    allDay: selectedEvent.allDay
  };

  await axios.put(`${API}/eventi`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  } 
   else if (mode === "all" && selectedEvent.extendedProps?.recurrenceId) {
  const newStartTime = new Date(selectedEvent.start);
  const newEndTime = new Date(selectedEvent.end);

  await axios.put(`${API}/eventi/ricorrenti/${selectedEvent.extendedProps.recurrenceId}`, {
    updateData: {
      title: selectedEvent.title,
      location: selectedEvent.location || "",
      allDay: selectedEvent.allDay || false,
      startTime: {
        hours: newStartTime.getHours(),
        minutes: newStartTime.getMinutes(),
      },
      endTime: {
        hours: newEndTime.getHours(),
        minutes: newEndTime.getMinutes(),
      }
    }
  }, { headers: { Authorization: `Bearer ${token}` } });
} else if (selectedEvent.id && !selectedEvent.extendedProps?.recurrenceId) {
     await axios.put(
        `http://localhost:3000/api/auth/eventi`,
        {
          id: selectedEvent.id,
      title: selectedEvent.title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: selectedEvent.location || "",
      allDay: selectedEvent.allDay || false,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    
    // aggiorna subito la lista (senza reload)
   
    }

    await fetchEvents();

    alert("Evento modificato con successo!");
    setSelectedEvent(null);
    setShowEditBox(false);
    setEditMode('single');
  } catch (err) {
    console.error("Errore durante la modifica:", err);
    alert("Errore durante la modifica");
  }
};

  const handleDeleteEvent = async (mode: 'single' | 'all') => {
  if (!selectedEvent) return;

  try {
   if (mode === "single" && selectedEvent.extendedProps?.recurrenceId) {
  await axios.delete(`${API}/eventi/ricorrenti/${selectedEvent.extendedProps.recurrenceId}/occurrence`,
    {
      params: {  date: new Date(selectedEvent.start).toISOString() },
      headers: { Authorization: `Bearer ${token}` }
    }
  );

    } else if (mode === "all" && selectedEvent.extendedProps?.recurrenceId) {
      // elimina tutta la serie
      await axios.delete(
        `${API}/eventi/ricorrenti/${selectedEvent.extendedProps.recurrenceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    
    }  else if (selectedEvent.id) {
      // elimina evento singolo
      await axios.delete(
        `${API}/eventi/${selectedEvent.id}`,
        { 
          headers: { Authorization: `Bearer ${token}` } 
      });
    }

    // aggiorna subito la lista (senza reload)
    await fetchEvents();

    alert("Evento eliminato con successo!");
    setSelectedEvent(null);
    setShowEditBox(false);
    setEditMode('single');
  } catch (err) {
    console.error("Errore durante l'eliminazione:", err);
    alert("Errore durante l'eliminazione");
  }
};


  return (
    <div className="calendar-page-container">
  <Navbar />
<div style={{ marginTop: "20px", textAlign: "center" }}>
  <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "5px", color: "white" }}>
    Benvenuto nel tuo calendario personale
  </h2>
  <p style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)", margin: "3px 0" }}>
    Clicca su una data per creare un nuovo evento
  </p>
  <p style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)", margin: "7px 0" }}>
    Oppure clicca su un evento già esistente per modificarlo o eliminarlo
  </p>
   <p style={{fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)"}}>
  Legenda:
</p>
 <p style={{fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)" }}>
  🔵Evento con orario specifico
</p>
<p style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)" }}>
  🟥Evento ricorrente
</p>
</div>

  <div className="calendar-container">
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      headerToolbar={{
        left: 'today prev,next',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      initialView="dayGridMonth"
      timeZone="local"
      events={events}
      dateClick={handleDateClick}
      height="auto"
      eventClick={(info) => handleEventClick(info)}
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
  value={
    newEvent.start
      ? new Date(new Date(newEvent.start).getTime() - new Date(newEvent.start).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : ""
  }
  onChange={(e) => {
    const date = new Date(e.target.value);
    setNewEvent((prev) => ({ ...prev, start: date.toISOString() })); // ✅ niente offset qui
  }}
/>

<input
  type="datetime-local"
  className="input-field"
  value={
    newEvent.end
      ? new Date(new Date(newEvent.end).getTime() - new Date(newEvent.end).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : ""
  }
  onChange={(e) => {
    const date = new Date(e.target.value);
    setNewEvent((prev) => ({ ...prev, end: date.toISOString() })); // ✅ niente offset qui
  }}
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

{selectedEvent && !selectedEvent.isRecurring && showEditBox && (
  <div className="event-details-wrapper">
    <button
      className="event-close-button"
      onClick={() => {
        setSelectedEvent(null);
        setShowEditBox(false);
      }}
    >
      ×
    </button>
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
          value={
      selectedEvent.start
        ? new Date(
            new Date(selectedEvent.start).getTime() -
              new Date(selectedEvent.start).getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16)
        : ""
    }
    onChange={(e) =>
      setSelectedEvent((prev) =>
        prev ? { ...prev, start: new Date(e.target.value).toISOString() } : prev
      )
    }
        />
      </label>

      <label>
        Fine:
        <input
          className="input-field"
          type="datetime-local"
          value={
      selectedEvent.end
        ? new Date(
            new Date(selectedEvent.end).getTime() -
              new Date(selectedEvent.end).getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16)
        : ""
    }
    onChange={(e) =>
      setSelectedEvent((prev) =>
        prev ? { ...prev, end: new Date(e.target.value).toISOString() } : prev
      )
    }
  />
      </label>

      <label>
        Luogo:
        <input
          className="input-field"
          type="text"
          value={selectedEvent.location || ""}
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
        <button
          className="event-btn edit-btn"
          onClick={() => handleEditEvent("single")}
        >
          Modifica
        </button>
        <button
          className="event-btn delete-btn"
          onClick={() => handleDeleteEvent("single")}
        >
          Elimina
        </button>
        <button
          className="event-btn"
          onClick={() => {
            setSelectedEvent(null);
            setShowEditBox(false);
          }}
        >
          Annulla
        </button>
      </div>
    </div>
  </div>
)}

{/* Box EVENTO RICORRENTE */}
{selectedEvent && selectedEvent.isRecurring && (
  <div className="event-details-wrapper">
    <button
      className="event-close-button"
      onClick={() => {
        setSelectedEvent(null);
        setEditMode("single");
      }}
    >
      ×
    </button>
    <h2 className="form-title">Modifica evento ricorrente</h2>
    <div className="event-form-card">
      {/* Titolo */}
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

      {editMode === "all" ? (
        <>
          {/* Solo orari */}
          <label>
  Orario inizio:
  <input
    className="input-field"
    type="time"
    value={
      selectedEvent.start && !isNaN(new Date(selectedEvent.start).getTime())
        ? new Date(
            new Date(selectedEvent.start).getTime() -
              new Date(selectedEvent.start).getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(11, 16)
        : ""
    }
    onChange={(e) =>
      setSelectedEvent((prev) => {
        if (!prev) return null;

        const baseDate = !isNaN(new Date(prev.start).getTime())
          ? new Date(prev.start)
          : new Date();

        baseDate.setHours(
          parseInt(e.target.value.split(":")[0]),
          parseInt(e.target.value.split(":")[1]),
          0,
          0
        );

        return { ...prev, start: baseDate.toISOString() };
      })
    }
  />
</label>

<label>
  Orario fine:
  <input
    className="input-field"
    type="time"
    value={
      selectedEvent.end && !isNaN(new Date(selectedEvent.end).getTime())
        ? new Date(
            new Date(selectedEvent.end).getTime() -
              new Date(selectedEvent.end).getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(11, 16)
        : ""
    }
    onChange={(e) =>
      setSelectedEvent((prev) => {
        if (!prev) return null;

        const baseDate = !isNaN(new Date(prev.end).getTime())
          ? new Date(prev.end)
          : new Date();

        baseDate.setHours(
          parseInt(e.target.value.split(":")[0]),
          parseInt(e.target.value.split(":")[1]),
          0,
          0
        );

        return { ...prev, end: baseDate.toISOString() };
      })
    }
  />
</label>
        </>
      ) : (
        <>
          {/* Data e ora completa */}
          <label>
  Inizio:
  <input
    className="input-field"
    type="datetime-local"
    value={
      selectedEvent.start && !isNaN(new Date(selectedEvent.start).getTime())
        ? new Date(
            new Date(selectedEvent.start).getTime() -
              new Date(selectedEvent.start).getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16)
        : ""
    }
    onChange={(e) =>
      setSelectedEvent((prev) =>
        prev ? { ...prev, start: new Date(e.target.value).toISOString() } : prev
      )
    }
  />
          </label>

          <label>
  Fine:
  <input
    className="input-field"
    type="datetime-local"
    value={
      selectedEvent.end && !isNaN(new Date(selectedEvent.end).getTime())
        ? new Date(
            new Date(selectedEvent.end).getTime() -
              new Date(selectedEvent.end).getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16)
        : ""
    }
    onChange={(e) =>
      setSelectedEvent((prev) =>
        prev ? { ...prev, end: new Date(e.target.value).toISOString() } : prev
      )
    }
  />
          </label>
        </>
      )}

      {/* All day */}
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

      {/* Checkbox modifica tutta la serie */}
      <label className="checkbox-label" style={{ marginTop: "8px" }}>
        <input
          type="checkbox"
          checked={editMode === "all"}
          onChange={(e) => setEditMode(e.target.checked ? "all" : "single")}
        />
        Modifica/elimina tutta la serie
      </label>

      {/* Bottoni */}
      <div className="event-actions">
        {editMode === "all" ? (
          <button
            className="event-btn edit-btn"
            onClick={() => handleEditEvent("all")}
          >
            Modifica tutta la serie
          </button>
        ) : (
          <button
            className="event-btn edit-btn"
            onClick={() => handleEditEvent("single")}
          >
            Modifica solo questa occorrenza
          </button>
        )}
        {editMode === "all" ? (
          <button
            className="event-btn delete-btn"
            onClick={() => handleDeleteEvent("all")}
          >
            Elimina tutta la serie
          </button>
        ) : (
          <button
            className="event-btn delete-btn"
            onClick={() => handleDeleteEvent("single")}
          >
            Elimina solo questa occorrenza
          </button>
        )}
        <button
          className="event-btn"
          onClick={() => {
            setSelectedEvent(null);
            setEditMode("single");
          }}
        >
          Annulla
        </button>
      </div>
    </div>
  </div>
)}
</div>
  )};

  


export default CalendarPage;