import { useState, useEffect, useContext } from 'react'
import '../App.css';
import { TimeMachineContext } from '../timeContext';
import Navbar from "./Navbar";


const TimeMachine = () => {

  const { currentDate, setDate, resetDate } = useContext(TimeMachineContext);

  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [day, setDay] = useState(currentDate.getDate());
  const [hour, setHour] = useState(currentDate.getHours());

  useEffect(() => {});

  return (
    <div>
      <Navbar/>

        <div className='notes-header'>
            <h1>TIME-MACHINE</h1>
            <h1>{currentDate.toLocaleString()}</h1>
            <div>
              <p>Modifica Data:</p>
              <label style={{color: "white"}}> Year: <input type="number" value={year} onChange={(e) => setYear(+e.target.value)} /></label>
              <label style={{color: "white"}}> Month: <input type="number" value={month} onChange={(e) => setMonth(+e.target.value)} /></label>
              <label style={{color: "white"}}> Day: <input type="number" value={day} onChange={(e) => setDay(+e.target.value)} /></label>
              <label style={{color: "white"}}> Hour: <input type="number" value={hour} onChange={(e) => setHour(+e.target.value)} /></label>
              <div>
                <button style={{color: "white", backgroundColor: "grey"}} onClick={() => setDate(year, month, day, hour)}>Cambia</button>
                <button style={{color: "white", backgroundColor: "grey"}} onClick={() => resetDate()}>resetta</button>
              </div>
            </div>
        </div>
    </div>
  );


}

export default TimeMachine