import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./login/Login";
import Register from "./login/Register";
import './App.css'


function App() {
  return (
    <Router>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Aggiungi una rotta di fallback se necessario */}
      <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
