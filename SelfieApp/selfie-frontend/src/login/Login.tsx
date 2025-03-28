import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Login = () => {
  const [formData, setFormData] = useState({username: "", password: ""});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const res = await axios.post("http://localhost:3000/api/auth/login", formData);
    alert(`Benvenuto ${res.data.user.username}`);
  } catch (err) {
    alert("Credenziali errate");
  }
};

return (
  <div className="container">
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
    <button type="submit">Login</button>
  </form>

  <p>
    Non hai un account? <Link to="/register">Registrati</Link>
  </p>
</div>
);
};

export default Login;