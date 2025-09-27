import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import '../App.css';
import axios from 'axios';

export default function Account() {
  const navigate = useNavigate();
  const [, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");


  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      navigate("/login");
      return;
    }

    setToken(storedToken);

    axios.get("http://localhost:3000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${storedToken}`
      }
    })
    .then(res => {
      const user = res.data;
      setUserId(user._id);
    })
    .catch(err => {
      console.error("Errore nel caricamento dati utente:", err);
      navigate("/login");
    });
  }, [navigate]);

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      setMessage("Le nuove password non coincidono");
      return;
    }

    try {
      const res = await axios.put("http://localhost:3000/api/auth/change-password", {
        userId,
        currentPassword,
        newPassword
      });
      setMessage(res.data.message);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)){
      setMessage(err.response?.data?.message || "Errore");
      }
    }
  };

  return (
    <div className="profilo-container">
      <nav className="profilo-nav">
        <button className="tab" onClick={() => navigate("/profilo")}>Profile</button>
        <button className="tab active">Account</button>
        <button className="tab" onClick={() => navigate("/home")}>Home</button>
      </nav>

      <div className="profilo-content">
        <h2>Change Password</h2>
        <p>Inserisci la tua password attuale e una nuova password.</p>
        <hr />

        <label>Password attuale</label>
        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />

        <label>Nuova password</label>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />

        <label>Conferma nuova password</label>
        <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />

        <button className="save-btn" onClick={handleChangePassword}>Cambia password</button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}