import React from 'react';
import './App.css';
import TimeTell from './components/TimeTell';
import Counter from './components/Counter';
import Timer from './components/Timer';
import 'bootstrap/dist/css/bootstrap.min.css';
import EventsList from './components/EventsList';
import EventForm from './components/EventForm';
import { EventsProvider } from './contexts/EventsContext';

function App() {
    return (
        <EventsProvider>
            <div className="App">
                <TimeTell color="red"></TimeTell>
                <Counter></Counter> 
                <Timer></Timer> 
                <EventsList />
                <EventForm />
            </div>
        </EventsProvider>
    );
}

export default App;
