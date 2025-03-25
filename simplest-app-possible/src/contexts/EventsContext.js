// Importa React e vari hook necessari, insieme alle funzioni dell'API.
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { fetchEvents, createEvent } from '../api';

// Crea un nuovo contesto che sarà utilizzato per condividere i dati degli eventi tra i componenti.
const EventsContext = createContext();

// Hook personalizzato per utilizzare facilmente il contesto negli altri componenti.
export const useEvents = () => useContext(EventsContext);

// Componente provider che gestisce lo stato degli eventi e le operazioni correlate.
export const EventsProvider = ({ children }) => {
    // Stato locale per tenere traccia degli eventi.
    const [events, setEvents] = useState([]);

    // Funzione per caricare gli eventi dall'API, avvolta in useCallback per evitare ricreazioni inutili.
    const loadEvents = useCallback(async () => {
        // Richiede gli eventi tramite l'API e aggiorna lo stato.
        const eventsData = await fetchEvents();
        setEvents(eventsData);
    }, []);

    // Funzione per aggiungere un nuovo evento tramite l'API.
    const addNewEvent = async (eventData) => {
        // Crea un nuovo evento e aggiorna lo stato aggiungendolo alla lista esistente.
        const newEvent = await createEvent(eventData);
        setEvents(prevEvents => [...prevEvents, newEvent]);
    };

    // Effetto per caricare gli eventi una volta che il componente viene montato.
    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    // Il provider del contesto passa lo stato degli eventi e le funzioni agli elementi figli.
    return (
        <EventsContext.Provider value={{ events, addNewEvent }}>
            {children}
        </EventsContext.Provider>
    );
};
