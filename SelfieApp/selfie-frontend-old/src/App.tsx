import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./login/Login";
import Register from "./login/Register";
import Home from "./home/home";
import Profilo from "./home/Profilo";
import CalendarPage from '../src/home/CalendarPage';
import "./App.css";
import Account from "./home/Account";


function App() {
  return (
    <Router>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<Home />} />
      <Route path="/profilo" element={<Profilo />} />
      <Route path="/account" element={<Account  />} />
      <Route path="/calendar" element={<CalendarPage />} />
      {/* Aggiungi una rotta di fallback se necessario */}
      <Route path="*" element={<Login />} />
      </Routes>
    </Router>
    
  );
}

export default App;
