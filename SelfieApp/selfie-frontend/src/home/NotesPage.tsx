import React, {useState, useEffect} from "react";
import axios from "axios";
import Navbar from "./Navbar";
import "../App.css"

const API = "http://localhost:3000/api/auth";


type Note = {
    _id: string;
  title: string;
  content: string;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

type SortKey = "date" | "title" | "length"; 


const NotesPage: React.FC = () => {
 const [notes, setNotes] = useState<Note[]>([]);
 const [token, setToken] = useState<string | null>(null);
 const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    categories: [] as string[],
 });
 const [sortBy, setSortBy] = useState<SortKey>("date");
 const [editingNote, setEditingNote] = useState<Note | null>(null);

 useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

useEffect(() => {
    const fetchNotes = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API}/notes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotes(res.data);
      } catch (err) {
        console.error("Errore caricamento note", err);
      }
    };

    fetchNotes();
  }, [token] );

 //aggiungi nuova nota
const handleAddNote = async () => {
  if (!newNote.title.trim()) return;
  try {
    const res = await axios.post(`${API}/notes`, newNote, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotes((prev) => [...prev, res.data]);
    setNewNote({ title: "", content: "", categories: [] });
  } catch (err) {
    console.error("Errore creazione nota", err);
  }
};

//modifica
const handleEditNote = async () => {
  if (!editingNote) return;
    try {
      const res = await axios.put(`${API}/notes/${editingNote._id}`, editingNote, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes((prev) => prev.map((n) => (n._id === editingNote._id ? res.data : n)));
      setEditingNote(null);
    } catch (err) {
      console.error("Errore modifica nota", err);
    }
};

 //Elimina
  const handleDeleteNote = async (id: string) => {
  try {
    await axios.delete(`${API}/notes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotes((prev) => prev.filter((n) => n._id !== id));
  } catch (err) {
    console.error("Errore eliminazione nota", err);
  }
};

  // Duplica
 const handleDuplicateNote = async (id: string) => {
 try {
      const res = await axios.post(
        `${API}/notes/${id}/duplicate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes((prev) => [...prev, res.data]);
    } catch (err) {
      console.error("Errore duplicazione nota", err);
    }
};

  //Copia contenuto
  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("Contenuto copiato negli appunti!");
  };

  // Ordinamento
  const sortedNotes = [...notes].sort((a, b) => {
  if (sortBy === "title") return a.title.localeCompare(b.title);
  if (sortBy === "length") return a.content.length - b.content.length;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
});

  return (
    <div className="notes-page">
      <Navbar />

      <div className="notes-header">
        <h1>Benvenuto nella pagina delle note</h1>
        <p className="subtitle">📝 Crea una nuova nota 📝</p>
      </div>

      {/* Nuova nota */}
      <div className="note-form">
        <input
          type="text"
          placeholder="Titolo"
          value={newNote.title}
          onChange={(e) =>
            setNewNote({ ...newNote, title: e.target.value })
          }
        />
         <input
          type="text"
          placeholder="Categorie separate da virgola"
          onChange={(e) =>
            setNewNote({
              ...newNote, categories: e.target.value.split(",").map((c) => c.trim()) })
          }
        />
        <textarea
          placeholder="Scrivi qui il contenuto..."
          value={newNote.content}
          onChange={(e) =>
            setNewNote({ ...newNote, content: e.target.value })
          }
        />
        <button onClick={handleAddNote}>➕ Aggiungi Nota</button>
      </div>

      {editingNote && (
        <div className="edit-modal">
          <div className="modal-content">
          <div className="edit-box">
           <h3>Modifica Nota</h3>
           <input type="text" value={editingNote.title} onChange={(e) => setEditingNote({...editingNote, title: e.target.value })}
           />
           <input type="text" value={editingNote.categories.join(", ")}
           onChange={(e) => setEditingNote({...editingNote, categories: e.target.value.split(",").map((c) => c.trim()),
           })
          }
          />
           <textarea
              value={editingNote.content}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
            />
            <button onClick={handleEditNote}>💾 Salva</button>
            <button onClick={() => setEditingNote(null)}>❌ Annulla</button>
           </div>
          </div>
          </div>
      )}

       <div className="notes-header" style={{ marginTop: "35px", marginBottom: "15px" }}>
      <h2>📝 Le tue note:</h2>
      <div className="sort-controls">
          <label>Ordina per: </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            <option value="date">Data (ultima modifica)</option>
            <option value="title">Titolo</option>
            <option value="length">Lunghezza (dal più corto al più lungo)</option>
          </select>
        </div>
        </div>
  
      {/* Lista note */}
      <div className="notes-list">
        {sortedNotes.map((note) => (
          <div key={note._id} className="note-card">
            <h3>{note.title}</h3>
            <div className="note-content">
            <p>{note.content.slice(0, 200)}...</p>
            </div>
            <div className="note-meta">
            <small>
              Categorie: {note.categories.join(", ") || "Nessuna"} <br />
              Creato: {new Date(note.createdAt).toLocaleDateString()} <br />
              Modificato: {new Date(note.updatedAt).toLocaleDateString()}
            </small>
            </div>

            <div className="note-actions">
              <button onClick={() => setEditingNote(note)}>✏️ Modifica</button>
              <button onClick={() => handleDuplicateNote(note._id)}>📑 Duplica</button>
              <button onClick={() => handleDeleteNote(note._id)}>❌ Elimina</button>
              <button onClick={() => copyContent(note.content)}>📋 Copia il testo della nota</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
    
export default NotesPage;
