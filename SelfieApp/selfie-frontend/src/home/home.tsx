import React, { useEffect, useState, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import axios from "axios";
import { TimeMachineContext } from "../timeContext";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { EventInput, CalendarApi } from "@fullcalendar/core";

const API = "http://localhost:3000/api/auth";

interface EventFromServer {
  _id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
  durationMinutes?: number;
  isRecurring?: boolean;
  overridesOriginalId?: string;
  recurrenceId?: string;
  seriesParentId?: string | null;
  isCancelled?: boolean;
}

interface TaskFromServer {
  _id: string;
  nome?: string;
  title?: string;
  startDate?: string;
  dueDate?: string;
  scadenza?: string;
  completed?: boolean;
}

interface NoteFromServer {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
const Home: React.FC = () => {
   const { currentDate } = useContext(TimeMachineContext);
  const [events, setEvents] =  useState<EventInput[]>([]);
  const [lastCreatedNote, setLastCreatedNote] = useState<NoteFromServer | null>(null);
  const [lastModifiedNote, setLastModifiedNote] = useState<NoteFromServer | null>(null);
  const [nextEvents, setNextEvents] = useState<EventFromServer[]>([]);
  const [nextTasks, setNextTasks] = useState<TaskFromServer[]>([]);
  const token = localStorage.getItem("token");
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
   const fetchData = async () => {
      if (!token) return;
      const config = { headers: { Authorization: `Bearer ${token}` } };
       try {
             const [resEvents, resTasks, resNotes] = await Promise.all([
          axios.get<EventFromServer[]>(`${API}/eventi`, config),
          axios.get<TaskFromServer[]>(`${API}/tasks`, config),
          axios.get<NoteFromServer[]>(`${API}/notes`, config),
        ]);

       const mappedEvents: EventInput[] = resEvents.data.map((ev) => ({
          id: String(ev._id),
          title: ev.title,
          start: ev.start,
          end: ev.end,
          allDay: !!ev.allDay,
          extendedProps: {
            location: ev.location ?? "",
            durationMinutes: ev.durationMinutes ?? 60,
            isRecurring: !!ev.isRecurring,
            overridesOriginalId: ev.overridesOriginalId ?? null,
            recurrenceId: ev.recurrenceId ?? null,
            seriesParentId: ev.seriesParentId ?? ev.overridesOriginalId ?? null,
            isCancelled: !!ev.isCancelled,
          },
          className: ev.isRecurring ? "event-recurring" : "event-normal",
        }));

        const tasksAsEvents: EventInput[] = resTasks.data.flatMap((t) => {
          const taskEvents: EventInput[] = [];

          if (t.startDate) {
            taskEvents.push({
              id: `task-start-${t._id}`,
              title: "📝 " + (t.nome ?? t.title ?? "Attività") + " (inizio)",
              start: t.startDate,
              allDay: true,
              extendedProps: { isTask: true, type: "start", originalTask: t },
              className: "event-task-start",
            });
          }

          if (t.scadenza ?? t.dueDate) {
            taskEvents.push({
              id: `task-end-${t._id}`,
              title: "📝 " + (t.nome ?? t.title ?? "Attività") + " (scadenza)",
              start: t.scadenza ?? t.dueDate,
              allDay: true,
              extendedProps: { isTask: true, type: "end", originalTask: t },
              className: "event-task-end",
            });
          }

          return taskEvents;
        });

        // IMPORTANT: popolo gli eventi che usa il FullCalendar (evita unused var)
        setEvents([...mappedEvents, ...tasksAsEvents]);

        // calcolo i prossimi eventi (solo futuri o in corso rispetto a currentDate)
        const upcomingEvents = resEvents.data
          .filter((ev) => {
            const start = new Date(ev.start);
            const end = ev.end ? new Date(ev.end) : null;
            return start >= currentDate || (end !== null && end >= currentDate);
          })
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .slice(0, 3);
        setNextEvents(upcomingEvents);

        // calcolo le prossime tasks (scadenza/dueDate >= currentDate)
        const upcomingTasks = resTasks.data
          .filter((t) => {
            const deadline = new Date(t.scadenza ?? t.dueDate ?? "");
            return !isNaN(deadline.getTime()) && deadline >= currentDate;
          })
          .sort(
            (a, b) =>
              new Date(a.scadenza ?? a.dueDate ?? "").getTime() -
              new Date(b.scadenza ?? b.dueDate ?? "").getTime()
          )
          .slice(0, 3);
        setNextTasks(upcomingTasks);

        // note: prendo le note ricevute e calcolo ultima creata/ultima modificata
        if (resNotes.data.length > 0) {
          const sortedByCreation = [...resNotes.data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setLastCreatedNote(sortedByCreation[0]);

          const sortedByUpdate = [...resNotes.data].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          setLastModifiedNote(sortedByUpdate[0]);
        } else {
          setLastCreatedNote(null);
          setLastModifiedNote(null);
        }
      } catch (err) {
        console.error("Errore caricamento eventi/attività/note", err);
      }
    };

    fetchData();
  }, [token, currentDate]); // ricalcolo anche al cambio di currentDate (time machine)

  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi() as CalendarApi;
      api.setOption("now", () => currentDate);
      api.gotoDate(currentDate);
    }
  }, [currentDate]);
  return (
  <div className="home-container">
      <Navbar />

      <div className="home-header">
        <h1>Benvenuto in SELFIE!</h1>
        <p>La tua app per organizzare la tua vita.</p>
      </div>

      <div className="home-content-grid">
        {/* Colonna sinistra: mini calendario */}
        <div className="home-box">
          <h2>📅 Eventi della settimana</h2>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin]}
            initialView="dayGridWeek"
            firstDay={1}
            initialDate={currentDate}
            events={events}
            headerToolbar={false}
            height="auto"
            dayMaxEvents={2}
            dayCellClassNames={(arg) => {
              const cellDate = arg.date.toLocaleDateString("sv-SE");
              const current = currentDate.toLocaleDateString("sv-SE");
              return cellDate === current ? "custom-today" : "";
            }}
           eventClassNames={(arg) => {
  if (arg.event.extendedProps?.isRecurring) return ["event-recurring"];
  return [];
            }}
          />
          <Link to="/calendar">Vai al Calendario ➡️</Link>

          {/* Sezione prossimi eventi/tasks */}
          <div style={{ marginTop: "1rem" }}>
            <h3>📌 Prossimi Eventi</h3>
            {nextEvents.length > 0 ? (
              nextEvents.map((ev) => {
                const now = currentDate;
                const isOngoing =
                  new Date(ev.start) <= now && (!ev.end || new Date(ev.end) >= now);
                return (
                  <p key={ev._id} style={{ color: isOngoing ? "red" : "inherit" }}>
                    <strong>{ev.title}</strong>{" "}
                    {new Date(ev.start).toLocaleString()}
                    {ev.end && ` → ${new Date(ev.end).toLocaleString()}`}
                    {isOngoing && " (in corso)"}
                  </p>
                );
              })
            ) : (
              <p>Nessun evento in programma</p>
            )}

            <h3>✅ Prossime Attività</h3>
            {nextTasks.length > 0 ? (
             nextTasks.map((t) => {
                const deadline = new Date(t.scadenza ?? t.dueDate ?? "");
                const now = currentDate;
                const isOngoing =
                  !!t.startDate && new Date(t.startDate) <= now && deadline >= now;
                return (
                  <p
                    key={t._id}
                    style={{ color: isOngoing ? "red" : "inherit" }}
                  >
                    <strong>{t.nome ?? t.title ?? "Attività"}</strong>{" "}
                    (scadenza: {deadline.toLocaleDateString()})
                    {isOngoing && " (in corso)"}
                  </p>
                );
              })
            ) : (
              <p>Nessuna attività in programma</p>
            )}
          </div>
        </div>

        {/* Colonna destra: note */}
        <div className="home-box">
          <h2>📝 Le tue note</h2>
          <div className="notes-preview">
  {lastCreatedNote && (
    <div className="note-card">
      <h3 className="note-subtitle">Ultima nota creata</h3>
      <p className="note-title">{lastCreatedNote.title}</p>
      <p>{lastCreatedNote.content.slice(0, 120)}...</p>
      <small>
        Creata il{" "}
        {new Date(lastCreatedNote.createdAt).toLocaleString()}
      </small>
    </div>
  )}

  {lastModifiedNote && (
    <div className="note-card">
      <h3 className="note-subtitle">Ultima nota modificata</h3>
      <p className="note-title">{lastModifiedNote.title}</p>
      <p>{lastModifiedNote.content.slice(0, 120)}...</p>
      <small>
        Modificata il{" "}
        {new Date(lastModifiedNote.updatedAt).toLocaleString()}
      </small>
    </div>
  )}
</div>

          <Link to="/note">Vai alle Note ➡️</Link>
        </div>
      </div>

      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <Link className="app-link" to="/login">
          Torna al Login
        </Link>
      </div>
    </div>
  );
};

export default Home;