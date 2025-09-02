import React, {useState, useEffect, useCallback, useContext, useRef} from "react";
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
import { TimeMachineContext } from '../timeContext';

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

type Task = {
  _id: string;
  title: string;
  startDate: string;
  dueDate: string;   
  completed: boolean;
};

type NewTask = Omit<Task, "id">;

const mapTasksToEvents = (tsks: Task[]) =>
  tsks.flatMap((t) => [
    {
      id: `task-${t._id}-start`,
      title: `📝 ${t.title} (inizio)`,
      start: t.startDate,
      allDay: true,
      className: `task-start${t.completed ? " task-completed" : ""}`,
      extendedProps: {
        type: "task",
        taskData: t,
      },
    },
    {
      id: `task-${t._id}-due`,
      title: `📝 ${t.title} (scadenza)`,
      start: t.dueDate,
      allDay: true,
      className: `task-deadline${t.completed ? " task-completed" : ""}`,
      extendedProps: {
        type: "task",
        taskData: t,
      },
    },
  ]);

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [showEventBox, setShowEventBox] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [showEditBox, setShowEditBox] = useState(false);
  const [editMode, setEditMode] = useState<'single' | 'all'>('single');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [serverEventsMapped, setServerEventsMapped] = useState<EventInput[]>([]);
  const [showTaskBox, setShowTaskBox] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskEditBox, setShowTaskEditBox] = useState(false);
  const { currentDate } = useContext(TimeMachineContext);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [newTask, setNewTask] = useState<NewTask>({
    _id: "",
    title: "",
    startDate: "",
    dueDate: "",
    completed: false,
  });
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

      const mappedServer: EventInput[] = serverEvents.map((ev) => ({
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
          seriesParentId: ev.seriesParentId ?? ev.overridesOriginalId ?? null,
        },
        className: ev.isRecurring ? "recurring-event" : "single-event"
      }));

      setServerEventsMapped(mappedServer);

      setEvents([...mappedServer, ...mapTasksToEvents(tasks),]);

    } catch (err) {
      console.error("Errore nel fetch degli eventi:", err);
    }
  }, [token, tasks]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${API}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks(res.data);
      } catch (err) {
        console.error("Errore caricamento task", err);
      }
    };

    if (token) fetchTasks();
  }, [token]);


  // Rinfondo eventi e task quando cambiano le task
  useEffect(() => {
    setEvents([
      ...serverEventsMapped,
      ...mapTasksToEvents(tasks),
    ]);
  }, [tasks, serverEventsMapped]);

  //effect per modificare la data corrente
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.gotoDate(currentDate);
    }
  }, [currentDate]);

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

    //parte task
    if (e.extendedProps?.type === "task" && e.extendedProps?.taskData) {
      const task = e.extendedProps.taskData;

      setSelectedTask({
        _id: task._id,
        title: task.title,
        startDate: task.startDate,
        dueDate: task.dueDate,
        completed: task.completed,
      });
      setShowTaskEditBox(true);
      return;
    }

    //parte eventi
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
      } 
      else if (selectedEvent.id && !selectedEvent.extendedProps?.recurrenceId) {
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
      } else if (selectedEvent.id) {
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


  //TASK
  // Funzione per aggiungere un’attività
  const handleAddTask = async () => {
    if (!newTask.title || !newTask.dueDate) {
      alert("Titolo e scadenza obbligatori");
      return;
    }

    if (!token) {
      alert("Non sei autenticato. Fai login di nuovo.");
      return;
    }

    try {
      const res = await axios.post(`${API}/tasks`, newTask, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // risposta dal backend quindi aggiungo alla lista
      const savedTask: Task = res.data;
      setTasks((prev) => [...prev, savedTask]);

      // reset campi input
      setNewTask({ _id: "", title: "", startDate: "", dueDate: "", completed: false });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("Errore aggiunta task", err.response || err.message);
        if (err.response?.status === 401) {
          alert("Sessione scaduta o non valida. Fai login di nuovo.");
        }
      } else if (err instanceof Error) {
        console.error("Errore generico:", err.message);
      } else {
        console.error("Errore sconosciuto", err);
      }
    }
  };

  // Funzione per segnare completata
  const toggleTaskCompletion = async (id: string) => {
    try {
      const task = tasks.find((t) => t._id === id); // <-- uso _id, non id
      if (!task) return;

      const res = await axios.put(
        `${API}/tasks/${id}`,
        { completed: !task.completed }, // mando solo la proprietà che cambia
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTasks((prev) =>
        prev.map((t) => (t._id === id ? res.data : t)) // aggiorno con quello che torna dal backend
      );
    } catch (err) {
      console.error("Errore aggiornamento task", err);
    }
  };


  //funzione per modificare le attività
  const handleEditTask = async () => {
    if (!selectedTask) return;
    try {
      await axios.put(
        `http://localhost:3000/api/auth/tasks/${selectedTask._id}`,
        {
          title: selectedTask.title,
          startDate: selectedTask.startDate,
          dueDate: selectedTask.dueDate,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );


      alert("Task aggiornata con successo!");
      setShowTaskEditBox(false);
      setSelectedTask(null);
      setTasks((prev) =>
      prev.map((t) => (t._id === selectedTask._id ? selectedTask : t))
  );
    } catch (err) {
      console.error("Errore modifica task:", err);
      alert("Errore durante la modifica della task");
    }
  };

  //funzione per eliminare le attività
  const deleteTask = async (id: string) => {
    try {
      await axios.delete(`${API}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error("Errore eliminazione task", err);
    }
  };


  return (
    <div className="calendar-page-container">
  <Navbar />

<div className="calendar-header">
    <h2>Benvenuto nel tuo calendario personale</h2>

    <div className="calendar-instructions">
      <div className="instructions-left">
        <p>Eventi:</p>
        <p>Clicca su una data o sul bottone in basso per creare un nuovo evento.</p>
        <p>Oppure clicca su un evento già esistente per modificarlo o eliminarlo.</p>

        <h4>Legenda calendario:</h4>
        <ul>
          <li>🔵 Evento con orario specifico</li>
          <li>🟥 Evento ricorrente</li>
          <li>🟩 Attività</li>
        </ul>
      </div>

      <div className="instructions-right">
        <p>Attività:</p>
        <p>
          Clicca sul pulsante in basso per creare una nuova Attività 
        </p>
        <p>
          oppure cliccane una già esistente per modificarla.
        </p>
        <p>
          🟩 (verde chiaro) data inizio, (verde scuro) data scadenza, 🔳 (grigio) Attività completata.
        </p>
        <p>
          Clicca sulla ❌ nella lista in basso per eliminare l'attività dal calendario.
        </p>
      </div>
    </div>
  </div>


  <div className="calendar-container">
    <FullCalendar
      ref = {calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      headerToolbar={{
        left: 'today prev,next',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      now={currentDate}
      initialDate={currentDate}
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
    setNewEvent((prev) => ({ ...prev, end: date.toISOString() })); 
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

  {showTaskBox && (
  <div className="event-box task-box">
    <h3>Nuova Attività</h3>

    {/* Titolo */}
    <label>
    Titolo:
    <input
      type="text"
      value={newTask.title}
      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
      className="input-field"
    />
  </label>


    {/* Data di inizio */}
   <label>
    Data inizio:
    <input
      type="date"
      value={newTask.startDate}
      onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
      className="input-field"
    />
  </label>

{/* Data di scadenza */}
    <label>
    Scadenza:
    <input
      type="date"
      value={newTask.dueDate}
      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
      className="input-field"
    />
  </label>

    <button onClick={handleAddTask}>Aggiungi Attività</button>
    <button onClick={() => setShowTaskBox(false)}>Chiudi</button>
  </div>
)}

{showTaskEditBox && selectedTask && (
  <>
  <div
      className="overlay-background"
      onClick={() => setShowTaskEditBox(false)}
    />
  <div className="task-modal">
    <h3>Modifica attività</h3>

    <div className="task-form-card">
    <label>
      Titolo:
      <input
        type="text"
        value={selectedTask.title}
        onChange={(e) =>
          setSelectedTask({ ...selectedTask, title: e.target.value })
        }
      />
    </label>
    <label>
      Data inizio:
      <input
        type="date"
        value={selectedTask.startDate?.slice(0, 10)}
        onChange={(e) =>
          setSelectedTask({ ...selectedTask, startDate: e.target.value })
        }
      />
    </label>
    <label>
      Data scadenza:
      <input
        type="date"
        value={selectedTask.dueDate?.slice(0, 10)}
        onChange={(e) =>
          setSelectedTask({ ...selectedTask, dueDate: e.target.value })
        }
      />
    </label>
    <button onClick={handleEditTask}>Salva</button>
    <button onClick={() => setShowTaskEditBox(false)}>Annulla</button>
  </div>
  </div>
  </>
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

<label>
      Luogo:
      <input
        className="input-field"
        type="text"
        value={selectedEvent.location || ""}
        onChange={(e) =>
          setSelectedEvent((prev) =>
            prev ? { ...prev, location: e.target.value } : prev
          )
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

          <label>
      Luogo:
      <input
        className="input-field"
        type="text"
        value={selectedEvent.location || ""}
        onChange={(e) =>
          setSelectedEvent((prev) =>
            prev ? { ...prev, location: e.target.value } : prev
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

<div style={{ marginTop: "1rem", textAlign: "center" }}>
  <button
    onClick={() => setShowEventBox(true)}
    style={{
      marginRight: "10px",
      padding: "6px 12px",
      background: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    ➕ Nuovo Evento
  </button>

  <button
    onClick={() => setShowTaskBox(true)} 
    style={{
      padding: "6px 12px",
      background: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    📝 Nuova Attività
  </button>
</div>
 
<div className="task-list" style={{ marginTop: "20px" }}>
  <h3>Le tue Attività</h3>

  
  <ul>
    {tasks.map((task) => {
      const isOverdue =
        !task.completed && new Date(task.dueDate) < new Date();
      return (
       <li key={task._id} className="task-item">
  <span style={{ marginRight: "8px", fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
    Completata →
  </span>
  <input
    type="checkbox"
    checked={task.completed}
    onChange={() => toggleTaskCompletion(task._id)}
  />
  <span
    style={{
      textDecoration: task.completed ? "line-through" : "none",
      marginLeft: "6px"
    }}
  >
    {task.title} (scade il{" "}
    {new Date(task.dueDate).toLocaleDateString()})
  </span>
  {isOverdue && (
    <strong style={{ color: "red", marginLeft: "8px" }}>
      IN RITARDO
    </strong>
  )}
  <button onClick={() => deleteTask(task._id)}>❌</button>
</li>
      );
    })}
  </ul>
</div>

</div>
  )};

  


export default CalendarPage;