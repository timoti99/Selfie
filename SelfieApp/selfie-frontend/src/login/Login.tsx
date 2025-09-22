import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import "../login.css";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:3000/api/auth/login", formData);

      // Salva il token JWT nel localStorage
      localStorage.setItem("token", res.data.token);

      alert(`Benvenuto ${res.data.user.username}`);

      // Vai alla home
      navigate("/home");
    } catch  {
      alert("Credenziali errate. Riprova");
    }
  };

  return (
    <div className="login-container">
      <div className="form-container">
        <h1>LOGIN</h1>
        <p>Accedi per organizzare la tua vita con SELFIE!</p>

        <form onSubmit={handleSubmit}>
          <label>Inserisci il tuo Username:</label>
          <input
            type="text"
            name="username"
            placeholder="Inserisci username"
            onChange={handleChange}
            required
          />

          <label>Inserisci la tua password:</label>
          <input
            type="password"
            name="password"
            placeholder="Inserisci password"
            onChange={handleChange}
            required
          />

          <button className="app-button" type="submit">Login</button>
        </form>

        <p>
          Non hai un account? <Link to="/register">Registrati</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;