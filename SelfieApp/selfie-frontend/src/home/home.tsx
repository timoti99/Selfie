import React from "react";
import { Link } from "react-router-dom";


const Home = () => {
  return (
    <div className="home-container">
    
       <nav className="navbar">
       <div className="navbar-spacer" />
        
        
        <div className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/pomodoro">Pomodoro</Link>
          <Link to="/calendario">Calendario</Link>
          <Link to="/note">Note</Link>
          <Link to="/timemachine">Time Machine</Link>
        </div>

       <button className="settings-button">Opzioni</button>
      </nav>

      
      <div className="home-content">
        <h1>Benvenuto in SELFIE!</h1>
        <p>La tua app per organizzare la tua vita.</p>
      </div>

      
      <div className="login-link">
        <Link to="/login">Torna al Login</Link>
      </div>
    </div>
  );
};

export default Home;