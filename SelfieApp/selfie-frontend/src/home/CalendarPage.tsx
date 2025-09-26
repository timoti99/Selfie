import React, {useState, useEffect, useCallback, useContext, useRef} from "react";
import { useNavigate } from "react-router-dom";
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
import dayjs from "dayjs";
import '../App.css';
import '../calendarPage.css';
import { TimeMachineContext } from '../timeContext';
import Evento from './Evento'

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

interface PomodoroFromServer {
  _id: string;
  date: string;               
  cyclesPlanned: number;
  cyclesCompleted?: number;
  studyMinutes: number;
  breakMinutes: number;
  title?: string;
}

interface PomodoroEvent {
  _id: string;
  date: string;
  cyclesPlanned: number;
  cyclesCompleted: number;
  studyMinutes: number;
  breakMinutes: number;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [serverEventsMapped, setServerEventsMapped] = useState<EventInput[]>([]);

  const [pomodoroEvents, setPomodoroEvents] = useState<EventInput[]>([]);

  const [showTaskBox, setShowTaskBox] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskEditBox, setShowTaskEditBox] = useState(false);
  const [showPomodoroBox, setShowPomodoroBox] = useState(false);
  const [newPomodoro, setNewPomodoro] = useState({
    date: "",
    cyclesPlanned: 5,
    studyMinutes: 30,
    breakMinutes: 5,
  });
  const [selectedPomodoro, setSelectedPomodoro] = useState<PomodoroEvent | null>(null);
  const [showPomodoroActionBox, setShowPomodoroActionBox] = useState(false);


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

      // solo imposto la sorgente "server"
      setServerEventsMapped(mappedServer);
    } catch (err) {
      console.error("Errore nel fetch degli eventi:", err);
    }
  }, [token]);

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get<Task[]>(`${API}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch (err) {
      console.error("Errore fetch tasks", err);
    }
  }, [token]);

  const fetchPomodoro = useCallback(async () => {
    if (!token) return;
    try {
      console.log("[fetchPomodoro] start - currentDate:", currentDate);

      const putUrl = `${API}/pomodoro/completeDayAll`;
      console.log("[fetchPomodoro] calling PUT", putUrl);

      const putRes = await axios.put(putUrl,{ currentDate }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[fetchPomodoro] PUT response:", putRes.data);

      const res = await axios.get<PomodoroFromServer[]>(`${API}/pomodoro`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[fetchPomodoro] GET pomodoro count:", res.data.length);

      const mappedPomodoro: EventInput[] = res.data.map((p) => ({
        id: String(p._id),
        title: p.title || "🍅 Pomodoro",
        // normalizziamo a inizio giornata 
        start: dayjs(p.date).startOf("day").toISOString(),
        end: dayjs(p.date).startOf("day").toISOString(),
        allDay: true,
        extendedProps: {
          type: "pomodoro",
          pomodoroData: p,
        },
        className: "pomodoro-event",
      }));

      setPomodoroEvents(mappedPomodoro);
    } catch (err) {
      console.error("Errore caricamento Pomodoro", err);
    }
  }, [token, currentDate]);

  useEffect(() => {
    fetchPomodoro();
  }, [fetchPomodoro, currentDate]);

  useEffect(() => {
    // unisco in ordine: eventi server, tasks eventi, poi pomodoro
    setEvents([
      ...serverEventsMapped,
      ...mapTasksToEvents(tasks),
      ...pomodoroEvents,
    ]);
  }, [serverEventsMapped, tasks, pomodoroEvents]);

  //effect per modificare la data corrente
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.setOption("now", () => currentDate);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
    fetchTasks();
  }, [fetchEvents, fetchTasks]);

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

  const handleAddPomodoro = async () => {
    if (!token) return;
    try {
      await axios.post(
        `${API}/pomodoro`,
        {
          date: newPomodoro.date,
          cyclesPlanned: newPomodoro.cyclesPlanned,
          studyMinutes: newPomodoro.studyMinutes,
          breakMinutes: newPomodoro.breakMinutes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

    
      await fetchPomodoro();

      setShowPomodoroBox(false);
      setNewPomodoro({
        date: "",
        cyclesPlanned: 5,
        studyMinutes: 30,
        breakMinutes: 5,
      });
    } catch (err) {
      console.error("Errore creazione pomodoro", err);
    }
  };

  const handleCompletePomodoro = async () => {
    if (!selectedPomodoro) return;
    try {
      await axios.delete(`${API}/pomodoro/${selectedPomodoro._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPomodoro();
      setShowPomodoroActionBox(false);
      setSelectedPomodoro(null);
    } catch (err) {
      console.error("Errore completamento Pomodoro", err);
    }
  };

  const navigate = useNavigate();

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

    //pomodoro
    if (e.extendedProps?.type === "pomodoro" && e.extendedProps?.pomodoroData) {
    const pomodoro = e.extendedProps.pomodoroData;
    setSelectedPomodoro(pomodoro);
    setShowPomodoroActionBox(true);
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

    setShowEditBox(true);
  };

  const handleCloseForm = () => {
    setSelectedEvent(null);
    setShowEditBox(false);
  }

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
      const task = tasks.find((t) => t._id === id); 
      if (!task) return;

      const res = await axios.put(
        `${API}/tasks/${id}`,
        { completed: !task.completed }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTasks((prev) =>
        prev.map((t) => (t._id === id ? res.data : t)) 
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
        initialDate={currentDate}  
        initialView="dayGridMonth"
        timeZone="local"
        events={events}
        dateClick={handleDateClick}
        height="auto"
        eventClick={(info) => handleEventClick(info)}
        dayCellClassNames={(arg) => {
          const cellDate = arg.date.toLocaleDateString("sv-SE");
          const current = currentDate.toLocaleDateString("sv-SE");
          return cellDate === current ? "custom-today" : "";
        }}
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

    {/*Box crea EVENTO*/}
    {showEventBox && (
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
              onChange={(e) => setNewEvent({ ...newEvent, isRecurring: e.target.checked })}
            />
            Evento ripetibile
          </label>



          {newEvent.isRecurring && (
            <div className="recurrence-section">
              <label className="label-select">Frequenza:</label>
              <select
                className="select-field"
                value={newEvent.recurrence.frequency}
                onChange={(e) => setNewEvent({...newEvent, recurrence: {...newEvent.recurrence, frequency: e.target.value,}, }) }
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
              onChange={(e) => setNewEvent({...newEvent, recurrence: {...newEvent.recurrence, repeatUntil: e.target.value}, }) }
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

    {/*Box crea TASK */}
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

    {showPomodoroBox && (
      <>
      <div className="overlay-background" onClick={() => setShowPomodoroBox(false)} />
      <div className="event-box pomodoro-box">
        <h3>Nuovo Pomodoro</h3>

        <label>
          Data inizio:
          <input
            type="datetime-local"
            value={newPomodoro.date}
            onChange={(e) =>
              setNewPomodoro({ ...newPomodoro, date: e.target.value })
            }
          />
        </label>

        <label>
          Minuti studio:
          <input
            type="number"
            min={1}
            value={newPomodoro.studyMinutes}
            onChange={(e) =>
              setNewPomodoro({
                ...newPomodoro,
                studyMinutes: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          Minuti pausa:
          <input
            type="number"
            min={1}
            value={newPomodoro.breakMinutes}
            onChange={(e) =>
              setNewPomodoro({
                ...newPomodoro,
                breakMinutes: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          Cicli:
          <input
            type="number"
            min={1}
            value={newPomodoro.cyclesPlanned}
            onChange={(e) =>
              setNewPomodoro({
                ...newPomodoro,
                cyclesPlanned: Number(e.target.value),
              })
            }
          />
        </label>

        <button onClick={handleAddPomodoro}>Aggiungi Pomodoro</button>
        <button onClick={() => setShowPomodoroBox(false)}>Annulla</button>
      </div>
      </>
    )}

    {showPomodoroActionBox && selectedPomodoro && (
      <div className="overlay-background" onClick={() => setShowPomodoroActionBox(false)} />
    )}

    {showPomodoroActionBox && selectedPomodoro && (
      <div className="event-box pomodoro-box">
        <h3>Pomodoro</h3>
        <p><strong>Data:</strong> {new Date(selectedPomodoro.date).toLocaleString()}</p>
        <p><strong>Cicli:</strong> {selectedPomodoro.cyclesPlanned} (completati {selectedPomodoro.cyclesCompleted})</p>
        <p><strong>Studio:</strong> {selectedPomodoro.studyMinutes} min, <strong>Pausa:</strong> {selectedPomodoro.breakMinutes} min</p>

        <button onClick={() => navigate("/pomodoro")}>Apri Pomodoro</button>
        <button className="pomodoro-complete-btn" onClick={handleCompletePomodoro}>
      Pomodoro Completato(elimina dal calendario)
      </button>
        <button onClick={() => setShowPomodoroActionBox(false)}>Chiudi</button>
      </div>
    )}

    {/*Box modifica TASK*/}
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

    {selectedEvent && showEditBox && (
      <Evento event={selectedEvent} fetch = {fetchEvents} onClose={handleCloseForm}/>
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

      <button
        onClick={() => setShowPomodoroBox(true)}
        style={{
          padding: "6px 12px",
          background: "#f1c40f",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginLeft: "10px",
        }}
      >
        🍅 Nuovo Pomodoro
      </button>
    </div>
 
    <div className="task-list" style={{ marginTop: "20px" }}>
      <h3>Le tue Attività</h3>

      
      <ul>
        {tasks.map((task) => {
          const isOverdue =
            !task.completed && new Date(task.dueDate) < currentDate;
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