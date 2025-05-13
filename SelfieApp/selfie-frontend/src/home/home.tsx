import React from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar"; // importa il nuovo componente Navbar

const Home = () => {
  return (
    <div className="home-container">
      <Navbar /> 

      <div className="home-content">
        <h1>Benvenuto in SELFIE!</h1>
        <p>La tua app per organizzare la tua vita.</p>

        <Link className="app-link" to="/login">
          Torna al Login
        </Link>
      </div>
    </div>
  );
};

export default Home;