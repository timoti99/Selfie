import React from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "../App.css";


interface SideMenuProps {
    nome: string;
    cognome: string;
    username: string;
    onClose: () => void;
    isOpen: boolean;
  }
  
  const SideMenu: React.FC<SideMenuProps> = ({ nome, cognome, username, onClose, isOpen }) => {
    const navigate = useNavigate();
  
    const handleLogout = () => {
      localStorage.removeItem("token");
      navigate("/login");
    };
  
    return (
      <div className={`side-menu ${isOpen ? "open" : ""}`}>
        <button className="close-button" onClick={onClose}>×</button>
  
        <div className="user-info">
        <h3>{nome} {cognome}</h3>
        <p className="username">@{username}</p>
        </div>  
  
        <div className="middle-section">
        <div className="menu-links">
        <Link className="menu-link" to="/profilo" onClick={onClose}>Profilo</Link>
        <div className="menu-link" >Account</div>
      </div>
      </div>
  

        
      <div className="logout-btn" onClick={handleLogout}>
        Logout
      </div>
    </div>
    );
  };
  
  export default SideMenu;