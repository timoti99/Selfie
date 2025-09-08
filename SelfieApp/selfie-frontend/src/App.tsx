import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./login/Login";
import Register from "./login/Register";
import Home from "./home/home";
import Profilo from "./home/Profilo";
import CalendarPage from "./home/CalendarPage";
import Account from "./home/Account";
import NotesPage from "./home/NotesPage";
import { TimeProvider } from "./timeContext";
import "./App.css";

function App() {
  return (
    <TimeProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profilo" element={<Profilo />} />
        <Route path="/account" element={<Account />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/note" element={<NotesPage/>} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
    </TimeProvider>
  );
}

export default App;