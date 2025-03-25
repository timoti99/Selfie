import React, { useEffect, useReducer, useState, useMemo } from "react";
import GlobalContext from "./GlobalContext";
import dayjs from "dayjs";
import { fetchEvents } from '../api'; // Make sure this is correctly imported

function savedEventsReducer(state, { type, payload }) {
    switch (type) {
        case 'push':
            return [...state, payload];
        case 'update':
                // Find the index of the event to update
                const index = state.findIndex(evt => evt._id === payload._id);
                if (index !== -1) {
                    // If the event exists, update it
                    const updatedEvents = [...state];
                    updatedEvents[index] = payload;
                    return updatedEvents;
                } else {
                    // If the event doesn't exist, add it
                    return [...state, payload];
                }
        case 'delete':
            return state.filter(evt => evt._id !== payload._id);
        case 'reset':
            return payload;  // Resets the state to the payload
        default:
            return state;  // Returns current state for unhandled action types
    }
}




export default function ContextWrapper(props) {
    const [savedEvents, dispatchCalEvent] = useReducer(savedEventsReducer, []); // Initialize to an empty array
    const [monthIndex, setMonthIndex] = useState(dayjs().month());
    const [smallCalendarMonth, setSmallCalendarMonth] = useState(null);
    const [daySelected, setDaySelected] = useState(dayjs());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [labels, setLabels] = useState([]);

    useEffect(() => {
        const loadEvents = async () => {
            const events = await fetchEvents(); // Asynchronously fetch events
            console.log(events)
            dispatchCalEvent({ type: 'reset', payload: events || [] });
        };
        loadEvents(); // Call the function to load events on component mount
    }, []);

    function updateLabel(label) {
        setLabels(labels.map(lbl => lbl.label === label.label ? label : lbl));
    }

    const filteredEvents = useMemo(() => savedEvents.filter(evt =>
        labels.filter(lbl => lbl.checked).map(lbl => lbl.label).includes(evt.label)
    ), [savedEvents, labels]);

    useEffect(() => {
        setLabels(prevLabels => [...new Set(savedEvents.map(evt => evt.label))].map(label => {
            const currentLabel = prevLabels.find(lbl => lbl.label === label);
            return {
                label,
                checked: currentLabel ? currentLabel.checked : true,
            };
        }));
    }, [savedEvents]);

    useEffect(() => {
        localStorage.setItem('savedEvents', JSON.stringify(savedEvents));
    }, [savedEvents]);

    useEffect(() => {
        if (smallCalendarMonth !== null) {
            setMonthIndex(smallCalendarMonth);
        }
    }, [smallCalendarMonth]);

    useEffect(() => {
        if (!showEventModal) {
            setSelectedEvent(null);
        }
    }, [showEventModal]);

    return (
        <GlobalContext.Provider value={{
            monthIndex,
            setMonthIndex,
            smallCalendarMonth,
            setSmallCalendarMonth,
            daySelected,
            setDaySelected,
            showEventModal,
            setShowEventModal,
            dispatchCalEvent,
            savedEvents,
            setSelectedEvent,
            selectedEvent,
            setLabels,
            labels,
            updateLabel,
            filteredEvents
        }}>
            {props.children}
        </GlobalContext.Provider>
    );
}