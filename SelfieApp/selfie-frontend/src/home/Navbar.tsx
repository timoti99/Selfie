import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import TimeMachineModal from "./TimeMachineModal";

const Navbar: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [user, setUser] = useState<{ nome: string; cognome: string; username: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await fetch("http://localhost:8000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Utente non autorizzato");
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Errore nel recupero dell'utente:", err);
        navigate("/login");
      }
    };

    fetchUserData();
  }, [navigate]);

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-spacer" />

        <div className="navbar-links">
          <Link to="/home">Home</Link>
          <Link to="/pomodoro">Pomodoro</Link>
          <Link to="/calendar">Calendario</Link>
          <Link to="/note">Note</Link>
          <button className="time-machine-btn" onClick={() => setShowTimeMachine(true)}>🕒 Time Machine</button>
        </div>

        <button className="settings-button" onClick={toggleMenu}>
          Opzioni
        </button>
      </nav>

      {showMenu && user && (
        <SideMenu
          nome={user.nome}
          cognome={user.cognome}
          username={user.username}
          onClose={toggleMenu}
          isOpen={showMenu}
        />
      )}
      <TimeMachineModal isOpen={showTimeMachine} onClose={() => setShowTimeMachine(false)} />
    </>
  );
};

export default Navbar;