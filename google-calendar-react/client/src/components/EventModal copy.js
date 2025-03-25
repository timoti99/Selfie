import React, { useContext, useEffect, useState } from "react";
import GlobalContext from "../context/GlobalContext";
import { v4 as uuidv4 } from 'uuid';


const labelsClasses = ["indigo", "gray", "green", "blue", "red", "purple"]

export default function EventModal() {
    const { setShowEventModal, daySelected, dispatchCalEvent, setSelectedEvent, selectedEvent } = useContext(GlobalContext)

    const [title, setTitle] = useState(selectedEvent ? selectedEvent.title : [])
    const [description, setDescription] = useState(selectedEvent ? selectedEvent.description : [])
    const [selectedLabel, setSelectedLabel] = useState(selectedEvent ? labelsClasses.find((lbl) => lbl === selectedEvent.label) : labelsClasses[0]) 
    
    useEffect(() => {
        setTitle(selectedEvent ? selectedEvent.title : "");
        setDescription(selectedEvent ? selectedEvent.description : "");
        setSelectedLabel(selectedEvent ? labelsClasses.find(lbl => lbl === selectedEvent.label) : labelsClasses[0]);
    }, [selectedEvent]);

    function handleSubmit(e) {
        e.preventDefault();

        const calendarEvent = {
            title,
            description,
            label: selectedLabel,
            day: daySelected.valueOf(),
            id: selectedEvent ? selectedEvent.id : uuidv4()  // Use UUID for unique ID
        };
        console.log("Event ID on Creation:", calendarEvent.id);
        

        if (selectedEvent) {
            dispatchCalEvent({ type: 'update', payload: calendarEvent });
            
        } else {
            dispatchCalEvent({ type: 'push', payload: calendarEvent });
        }
        setSelectedEvent(null);  // Ensure this is called to reset selectedEvent
        setShowEventModal(false);
    }
    
    return (
        <div className="h-screen w-full fixed left-0 top-0 flex justify-center items-center">
            <form className="bg-white rounded-lg shadow-2xl w-100">
                <header className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                    <span className="material-icons-outlined text-gray-400">
                        drag_handle
                    </span>
                    <div>
                        {selectedEvent && (
                        <span onClick={()=>{
                            dispatchCalEvent({type: 'delete', payload: selectedEvent})
                            setSelectedEvent(null);  // Ensure this is called to reset selectedEvent
                            setShowEventModal(false)
                    }}
                        
                        className="material-icons-outlined text-gray-400 cursor-pointer">
                            delete
                        </span>
                        )}
                    </div>
                    <button onClick={() => setShowEventModal(false)}>
                        <span className="material-icons-outlined text-gray-400">
                            close
                        </span>
                    </button>
                </header>
                <div className="p-3">
                    <div className="grid grid-cols-1/5 items-end gap-y-7">
                        <div>
                            <input className="pt-3 border-0 text-gray-600 text-xl font-semibold pb-2 w-full border-b-2 border-gray-200 focus:outline-none focus:ring-0 focus:border-blue-500" type="text" name="title" placeholder="Add Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                            <span className="material-icons-outlined text-gray-400">
                                schedule
                            </span>
                            <input className="pt-3 border-0 text-gray-600 pb-2 w-full border-b-2 border-gray-200 focus:outline-none focus:ring-0 focus:border-blue-500" type="text" name="description" placeholder="Add Description" value={description} onChange={(e) => setDescription(e.target.value)} />

                            <span className="material-icons-outlined text-gray-400">
                                bookmark_border
                            </span>
                            <div className="flex gap-x-2">
                                {labelsClasses.map((lblClass, i) => (
                                    <span key={i}
                                        onClick={() => setSelectedLabel(lblClass)}
                                        className={`bg-${lblClass}-500 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer`}>
                                        {selectedLabel === lblClass && (
                                            <span className="material-icons-outlined text-white-400 text-sm">
                                                check
                                            </span>

                                        )}

                                    </span>
                                ))}
                            </div>
                            <p>{daySelected.format("dddd, MMMM DD")}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <footer className="flex justify-end w-100 border-t p-3 mt-5">
                        <button type="submit" 
                        
                        onClick={handleSubmit}
                        
                        className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded text-white">Save</button>

                    </footer>
                </div>
            </form>
        </div>
    )
}