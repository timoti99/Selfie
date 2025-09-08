import { useState, useContext } from "react";
import { TimeMachineContext } from "../timeContext";
import "../App.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TimeMachineModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentDate, setDate, resetDate } = useContext(TimeMachineContext);

  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [day, setDay] = useState(currentDate.getDate());
  const [hour, setHour] = useState(currentDate.getHours());

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>🕒 Time Machine</h2>
        <p>Data attuale: {currentDate.toLocaleString()}</p>

        <div className="modal-fields">
          <label>Anno: <input type="number" value={year} onChange={(e) => setYear(+e.target.value)} /></label>
          <label>Mese: <input type="number" value={month} onChange={(e) => setMonth(+e.target.value)} /></label>
          <label>Giorno: <input type="number" value={day} onChange={(e) => setDay(+e.target.value)} /></label>
          <label>Ora: <input type="number" value={hour} onChange={(e) => setHour(+e.target.value)} /></label>
        </div>

        <div className="modal-buttons">
          <button className="btn-green" onClick={() => setDate(year, month, day, hour)}>Cambia</button>
          <button className="btn-red" onClick={resetDate}>Resetta</button>
          <button className="btn-gray" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
};

export default TimeMachineModal;