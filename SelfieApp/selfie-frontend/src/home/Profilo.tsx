import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css"

export default function Profilo() {
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(null);

    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [dataNascita, setDataNascita] = useState("");

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
            setUsername(user.username);
            setName(user.nome);
            setSurname(user.cognome);
            setEmail(user.email);
            setDataNascita(user.dataNascita?.substring(0, 10));
        })
        .catch(err => {
            console.error("Errore nel caricamento dati utente:", err);
            navigate("/login");
        });
    }, [navigate]);

    const handleSave = () => {
        if (!token) return;

        axios.put("http://localhost:3000/api/auth/update", {
            username: username,
            nome: name,
            cognome: surname,
            dataNascita: dataNascita,
            email: email,
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(() => {
            alert("Dati aggiornati con successo!Se hai modificato l'username, la prossima volta dovrai usare quello nuovo per il login.");
        })
        .catch(err => {
            console.error("Errore durante il salvataggio:", err);
            alert("Errore durante il salvataggio.");
        });
    };

    return (
        <div className="profilo-container">
            <nav className="profilo-nav">
                <button className="tab active">Profile</button>
                <button className="tab">Account</button>
                <button className="tab" onClick={() => navigate("/home")}>Home</button>
            </nav>

            <div className="profilo-content">
                <h2>Profilo</h2>
                <p>Consulta o modifica i tuoi dati personali</p>
                <hr />

                <label>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} />

                <label>Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} />

                <label>Surname</label>
                <input type="text" value={surname} onChange={e => setSurname(e.target.value)} />

                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} />

                <label>Date of Birth</label>
                <input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} />

                <button className="save-btn" onClick={handleSave}>Save Changes</button>
            </div>
        </div>
    );
}