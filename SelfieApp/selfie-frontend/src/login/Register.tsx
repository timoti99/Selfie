import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../App.css";
import "../login.css";



const Register = () => {
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    username: "",
    email: "",
    password: "",
    dataNascita: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/auth/register", formData);
      alert("Registrazione completata! Ora puoi effettuare il login.");
    } catch {
      alert("Errore nella registrazione. Riprova");
    }
  };

  return (
    <div className="login-container">
    <div className="form-container">
    <h1>REGISTRAZIONE</h1>
    <p>Crea il tuo account per usare SELFIE!</p>

   
    <label>Inserisci il tuo nome:</label>
    <form onSubmit={handleSubmit}>
      <input
        className="app-input"
        type="text"
        name="nome"
        placeholder="Nome"
        onChange={handleChange}
        required
      />

      <label>Inserisci il tuo cognome:</label>
      <input
        className="app-input"
        type="text"
        name="cognome"
        placeholder="Cognome"
        onChange={handleChange}
        required
      />

      <label>Crea il tuo username:</label>
      <input
        className="app-input"
        type="text"
        name="username"
        placeholder="Username"
        onChange={handleChange}
        required
      />

      <label>Inserisci la tua Email:</label>
      <input
        className="app-input"
        type="email"
        name="email"
        placeholder="Email"
        onChange={handleChange}
        required
      />

      <label>Crea la tua password:</label>
      <input
        className="app-input"
        type="password"
        name="password"
        placeholder="Password"
        onChange={handleChange}
        required
      />

      <label>Inserisci la tua data di nascita:</label>
      <input
        className="app-input"
        type="date"
        name="dataNascita"
        onChange={handleChange}
        required
      />
      <button className="app-button" type="submit">Registrati</button>
    </form>

    <p>
      Hai già un account? <Link className="app-link" to="/login">Accedi</Link>
    </p>
  </div>
  </div>
);
};


export default Register;