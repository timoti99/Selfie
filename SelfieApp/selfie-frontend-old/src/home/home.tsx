import React, {useState, useEffect} from "react";
import { useNavigate, Link } from "react-router-dom";
import SideMenu from "./SideMenu";


const Home = () => {
  const [showMenu, setShowMenu] = useState(false);
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
        const res = await fetch("http://localhost:3000/api/auth/me", {
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

        <button className="settings-button" onClick={toggleMenu}>Opzioni</button>
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

      <div className="home-content">
        <h1>Benvenuto in SELFIE!</h1>
        <p>La tua app per organizzare la tua vita.</p>
      
        <Link className="app-link" to="/login">Torna al Login</Link>
      </div>
    </div>
    
  );
};

export default Home;