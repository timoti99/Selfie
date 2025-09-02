import { useState, createContext, useEffect } from "react";

export const TimeMachineContext = createContext<{
    currentDate: Date,
    setDate: (year: number, month: number, day: number, hour: number) => void
    resetDate: () => void
}>({
    currentDate: new Date(),
    setDate: () => {},
    resetDate: () => {}
})

export const TimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [date, setDate] = useState(new Date())
    const [offset, setOffset] = useState(0)


    useEffect(() => {
        const interval = setInterval(() =>{
            setDate(new Date(Date.now() + offset));
        }, 1000)

        return () => clearInterval(interval);
    }, [offset])

    const setNew = (year: number, month: number, day: number, hour: number) => {
        
        let newDate = new Date();

        newDate.setDate(day);
        newDate.setHours(hour);
        newDate.setMonth(month - 1);
        newDate.setFullYear(year);
        newDate.setSeconds(0, 0);

        console.log(newDate.toLocaleString())

        let nowDate = new Date();
        nowDate.setSeconds(0, 0);
        console.log(newDate.getTime() - nowDate.getTime())
        setOffset(newDate.getTime() - nowDate.getTime())
    }

    const reset = () => setOffset(0);

    return(
        <TimeMachineContext.Provider value={{currentDate: date, setDate: setNew, resetDate: reset}}>
            {children}
        </TimeMachineContext.Provider>           
    );
}
