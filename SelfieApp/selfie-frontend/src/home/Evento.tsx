import React, {useState, useEffect} from "react";
import axios from "axios";
import '../App.css';

const API = "http://localhost:3000/api/auth";

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

type props = {
  event: SelectedEvent
  fetch: () => void
  onClose: () => void
}

function Evento({ event, fetch, onClose }: props){

  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>(event);
  const [editMode, setEditMode] = useState<'single' | 'all'>('single');

  const token = localStorage.getItem("token");

  useEffect(() => {
    setSelectedEvent(event);
  }, [event]);

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

      await fetch();

      alert("Evento modificato con successo!");
      setEditMode('single');
      onClose();
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
      await fetch();

      alert("Evento eliminato con successo!");
      setEditMode('single');
      onClose();

    } catch (err) {
      console.error("Errore durante l'eliminazione:", err);
      alert("Errore durante l'eliminazione");
    }
  };

  return(
    <div className="event-details-wrapper">
      <button
        className="event-close-button"
        onClick={() => {
          setEditMode("single");
          onClose();
        }}
      >
        ×
      </button>
      {event.isRecurring ? (
        <>
        {/* evento RICORRENTE */}
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
                  setSelectedEvent(prev => ({...prev, title: e.target.value}))
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
                      selectedEvent.start && !isNaN(new Date(selectedEvent.start).getTime()) ? 
                        new Date(
                          new Date(selectedEvent.start).getTime() - new Date(selectedEvent.start).getTimezoneOffset() * 60000
                        ).toISOString().slice(11, 16)
                      : ""
                    }
                    onChange={(e) =>
                      setSelectedEvent((prev) => {

                        const baseDate = !isNaN(new Date(prev.start).getTime()) ? new Date(prev.start) : new Date();

                        baseDate.setHours(parseInt(e.target.value.split(":")[0]), parseInt(e.target.value.split(":")[1]), 0, 0);

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
                      selectedEvent.end && !isNaN(new Date(selectedEvent.end).getTime()) ?
                        new Date(
                          new Date(selectedEvent.end).getTime() - new Date(selectedEvent.end).getTimezoneOffset() * 60000
                        ).toISOString().slice(11, 16)
                      : ""
                    }
                    onChange={(e) =>
                      setSelectedEvent((prev) => {

                        const baseDate = !isNaN(new Date(prev.end).getTime()) ? new Date(prev.end) : new Date();

                        baseDate.setHours( parseInt(e.target.value.split(":")[0]), parseInt(e.target.value.split(":")[1]), 0, 0 );

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
                      setSelectedEvent((prev) => prev ? { ...prev, location: e.target.value } : prev)
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
                  setSelectedEvent((prev) => ({ ...prev, allDay: e.target.checked }))
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
                  setEditMode("single");
                  onClose();
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        </>
         
      ) : (
        <>
        {/*evento NON RICORRENTE*/}
        <h2 className="form-title">Modifica o elimina evento</h2>
        <div className="event-form-card">
          <label>
            Titolo:
            <input
              className="input-field"
              type="text"
              value={selectedEvent.title}
              onChange={(e) =>
                setSelectedEvent((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </label>

          <label>
            Inizio:
            <input
              className="input-field"
              type="datetime-local"
              value={selectedEvent.start ? 
                new Date(
                  new Date(selectedEvent.start).getTime() - new Date(selectedEvent.start).getTimezoneOffset() * 60000
                ).toISOString().slice(0, 16) 
                : ""
              }
              onChange={(e) =>
                setSelectedEvent((prev) => prev ? { ...prev, start: new Date(e.target.value).toISOString() } : prev)
              }
            />
          </label>

          <label>
            Fine:
            <input
              className="input-field"
              type="datetime-local"
              value={selectedEvent.end ? 
                new Date(
                  new Date(selectedEvent.end).getTime() - new Date(selectedEvent.end).getTimezoneOffset() * 60000
                ).toISOString().slice(0, 16)
                : ""
              }
              onChange={(e) =>
                setSelectedEvent((prev) => prev ? { ...prev, end: new Date(e.target.value).toISOString() } : prev)
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
                setSelectedEvent((prev) => ({ ...prev, location: e.target.value }))
              }
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedEvent.allDay || false}
              onChange={(e) =>
                setSelectedEvent((prev) => ({ ...prev, allDay: e.target.checked }))
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
              onClick={() => onClose()}
            >
              Annulla
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export default React.memo(Evento);