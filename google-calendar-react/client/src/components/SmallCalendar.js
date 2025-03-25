import React, { useContext, useEffect, useState } from "react";
import dayjs from "dayjs";
import { getMonth } from "../util";
import GlobalContext from "../context/GlobalContext";

export default function SmallCalendar() {

    /*smaller calendar with separate date */
    const [currentMonthIdx, setCurrentMonthIdx] = useState(dayjs().month()) 
    const [currentMonth, setCurrentMonth] = useState(getMonth())

    useEffect(() =>{
        setCurrentMonth(getMonth(currentMonthIdx))
    },[currentMonthIdx])

    const {monthIndex, setSmallCalendarMonth, daySelected, setDaySelected} = useContext(GlobalContext)
    useEffect(()=>{
        setCurrentMonthIdx(monthIndex)
    }, [monthIndex])

    function handlePrevMonth() {
        setCurrentMonthIdx(currentMonthIdx- 1)
    }
    function handleNextMonth() {
        setCurrentMonthIdx(currentMonthIdx + 1)
    }

    function getDayClass(day){
        const format = "DD-MM-YY";
        const nowDay = dayjs().format(format)
        const currentDay = day.format(format)
        const slcDay = daySelected && daySelected.format(format)
        if(nowDay === currentDay) {
            return `bg-blue-500 rounded-full text-white`
        }
        else if (currentDay === slcDay) {
            return `bg-blue-100 rounded-full text-blue-600 font-bold`
        }
        else {
            return ""
        }        
    }


   return <div className="mt-9">
    <header className="flex justify-between">
        {/* currentmonth */}
    <button onClick={handlePrevMonth}>
        <span className="material-icons-outlined cursor-pointer text-gray-600 mx-2">
            chevron_left
        </span>
    </button>
    <p className="text-gray font-bold">
        {dayjs(new Date(dayjs().year(), currentMonthIdx)).format("MMMM YYYY")}
    </p>
    <button onClick={handleNextMonth}>
        <span className="material-icons-outlined cursor-pointer text-gray-600 mx-2">
            chevron_right
        </span>
    </button>
    </header>
    <div className="grid grid-cols-7 grid-rows-5">
        {currentMonth[0].map((day,i)=>(
            <span key={i} className="text-sm py-1 text-center font-bold">
                {day.format("dd").charAt(0)}
            </span>
        ))}
        {currentMonth.map((row,i)=> (
            <React.Fragment key={i}>
                {row.map((day,idx)=>(
                    <button 
                    onClick={()=>{
                        setSmallCalendarMonth(currentMonthIdx)
                        setDaySelected(day)
                    }}
                    key={idx} className={`py-1 w-full ${getDayClass(day)}`}>
                        <span className="text-sm">
                            {day.format('D')}
                        </span>
                    </button>
                ))}
            </React.Fragment>
        ))}

    </div>

    </div>
} 