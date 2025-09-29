import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import "../Pomodoro.css";
import axios from "axios";
import { useLocation } from "react-router-dom";

interface PomodoroEventFromServer {
  _id: string;
  title?: string;
  date: string;
  studyMinutes: number;
  breakMinutes: number;
  cyclesPlanned: number;
  cyclesCompleted: number;
}

interface LocationState {
  pomodoroId?: string;
  studyMinutes?: number;
  breakMinutes?: number;
  cyclesPlanned?: number;
  cyclesCompleted?: number;
}

type Phase = "study" | "break";

const API = "/api/auth";

function secondsToHMS(sec: number) {
  const mm = Math.floor(sec / 60).toString().padStart(2, "0");
  const ss = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

 export default function PomodoroPage() {
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const { pomodoroId, studyMinutes, breakMinutes, cyclesPlanned, cyclesCompleted: completedFromState } =
   state || {};
  const initCycles = cyclesPlanned ?? 5;
  const initCompleted = completedFromState ?? 0;
  const [studyMin, setStudyMin] = useState<number>(studyMinutes ?? 30);
  const [breakMin, setBreakMin] = useState<number>(breakMinutes ?? 5);
  const [cycles, setCycles] = useState<number>(initCycles);
  const [currentCycle, setCurrentCycle] = useState<number>(
  initCompleted >= initCycles ? initCycles : initCompleted + 1);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(initCompleted);
  const [totalMinutesInput, setTotalMinutesInput] = useState<number | "">("");
  const [proposals, setProposals] = useState<
    { cycles: number; study: number; break: number }[]
  >([]);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("study");
  const [remaining, setRemaining] = useState<number>(studyMin * 60);
  const intervalRef = useRef<number | null>(null);
  const markingRef = useRef(false);
  const token = localStorage.getItem("token") ?? "";

  useEffect(() => {
    if (pomodoroId && token) {
    axios.get(`${API}/pomodoro`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const p = (res.data as PomodoroEventFromServer[]).find((p) => p._id === pomodoroId);
        if (p) {
          setStudyMin(p.studyMinutes);
          setBreakMin(p.breakMinutes);
          setCycles(p.cyclesPlanned);
          setCyclesCompleted(p.cyclesCompleted ?? 0);
          setRemaining(p.studyMinutes * 60);
        }
      })
      .catch((err) => console.error("Errore caricamento pomodoro:", err));
  }
}, [pomodoroId, token]);

useEffect(() => {
    if (!running) {
      setRemaining(phase === "study" ? studyMin * 60 : breakMin * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMin, breakMin, phase]);

  // Timer principale
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (intervalRef.current) window.clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => r - 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  useEffect(() => {
   if (remaining <= 0 && running) {
    if (phase === "study") {
      // Fine study -> entriamo in pausa (NON segnare ancora il ciclo)
      notifyAndBeep("Pausa: inizio pausa", `Inizia la pausa ${currentCycle}/${cycles}`);
      setPhase("break");
      setRemaining(breakMin * 60);
      return;
    }

    // phase === "break" -> fine pausa: il ciclo (studio+pausa) è ora completo
    (async () => {
      // se ho già completato tutti i cicli, non faccio nulla
      if (cyclesCompleted >= cycles) {
        setRunning(false);
        setPhase("study");
        setCurrentCycle(cycles);
        setRemaining(studyMin * 60);
        return;
      }

      const newCompleted = await markCycleComplete();
      const completedNum = newCompleted ?? (cyclesCompleted + 1);

      // se abbiamo raggiunto o superato i cicli totali -> termina tutto
      if (completedNum >= cycles) {
        notifyAndBeep("Ciclo completato", "Hai completato tutti i cicli!");
        setRunning(false);
        setPhase("study");
        setCurrentCycle(completedNum); // rimane l'ultimo
        setRemaining(studyMin * 60);
      } else {
        // passiamo al prossimo ciclo (incrementiamo currentCycle)
        setCurrentCycle(completedNum + 1);
        setPhase("study");
        setRemaining(studyMin * 60);
      }
    })();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [remaining, running]);


  async function markCycleComplete(): Promise<number | null> {
  if (!pomodoroId || !token) return null;
  if (markingRef.current) return null; // evita richieste concorrenti
  markingRef.current = true;

  try {
    const res = await axios.put(
      `${API}/pomodoro/${pomodoroId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const updated = res.data;
    // se il backend restituisce cyclesCompleted usalo, altrimenti fai fallback all'incremento locale
    const newCompleted = updated?.cyclesCompleted ?? (cyclesCompleted + 1);

    setCyclesCompleted(newCompleted);

    // dispatch per aggiornare calendario
    window.dispatchEvent(new CustomEvent("pomodoro:updated", { detail: { id: pomodoroId } }));

    return newCompleted;
  } catch (err) {
    console.error("[Pomodoro] Errore aggiornamento ciclo:", err);
    return null;
  } finally {
    markingRef.current = false;
  }
}


  function toggleStartPause() {
    if (running) {
      setRunning(false);
    } else {
      setRemaining(phase === "study" ? studyMin * 60 : breakMin * 60);
      setRunning(true);
      notifyAndBeep("Avvio", phase === "study" ? "Inizio studio" : "Inizio pausa");
    }
  }

  function forceNextPhase() {
    if (phase === "study") {
    // forzo la fine dello studio: entriamo in pausa ma NON segnare il ciclo
    setPhase("break");
    setRemaining(breakMin * 60);
    notifyAndBeep("Forzato", "Forzato: inizio pausa");
    return;
  }

  // siamo in break e forziamo la fine della pausa => il ciclo completo termina
  (async () => {
    // se già completati tutti, non aumentare oltre
    if (cyclesCompleted >= cycles) {
      setRunning(false);
      setPhase("study");
      setCurrentCycle(cycles);
      setRemaining(studyMin * 60);
      return;
    }

    const newCompleted = await markCycleComplete();
    const completedNum = newCompleted ?? (cyclesCompleted + 1);

    if (completedNum >= cycles) {
      notifyAndBeep("Ciclo completato", "Hai completato tutti i cicli!");
      setRunning(false);
      setPhase("study");
      setCurrentCycle(completedNum);
      setRemaining(studyMin * 60);
    } else {
      setCurrentCycle(completedNum + 1);
      setPhase("study");
      setRemaining(studyMin * 60);
    }
  })();
}

  function restartCycle() {
    setRemaining(phase === "study" ? studyMin * 60 : breakMin * 60);
    setRunning(false);
    notifyAndBeep("Ricomincia", "Ricomincia ciclo corrente");
  }

  function endAll() {
    setRunning(false);
    setCurrentCycle(1);
    setPhase("study");
    setRemaining(studyMin * 60);
    notifyAndBeep("Fine", "Ciclo annullato");
  }

  function notifyAndBeep(title: string, body?: string) {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
  new Notification(title, { body });
      }
    } catch {
      // ignore
    }
    // beep
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.02;
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 120);
    } catch  {
      // ignore
    }
  }


  function computeProposals(totalMinutes: number) {
    const results: { cycles: number; study: number; break: number }[] = [];
    if (!totalMinutes || totalMinutes <= 0) return results;

    const breakCandidates = [5, 10, 15];
    for (let n = 1; n <= 12; n++) {
      for (const b of breakCandidates) {
        const study = totalMinutes / n - b;
        if (study >= 15) {
           const studyRounded = Math.round(study);
          results.push({ cycles: n, study: studyRounded, break: b });
        }
      }
    }

    results.sort((a, b) => b.cycles - a.cycles || b.study - a.study);
 const seen = new Set<string>();
    return results.filter((r) => {
      const k = `${r.cycles}-${r.study}-${r.break}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function onComputeProposalsClick() {
    if (totalMinutesInput === "" || totalMinutesInput <= 0) return;
    const num = Number(totalMinutesInput);
    if (isNaN(num) || num <= 0) return;
    const p = computeProposals(num);
    setProposals(p.slice(0, 6));
  }

  function acceptProposal(p: { cycles: number; study: number; break: number }) {
    setCycles(p.cycles);
    setStudyMin(p.study);
    setBreakMin(p.break);
    setProposals([]);
    setRemaining(p.study * 60);
  }

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(() => {});
    }
  }, []);

  return (
<div className="pomodoro-page">
    <Navbar />
    <div className="home-header">
      <h1>🍅 Metodo Pomodoro 🍅</h1>
      <p>Organizza le tue sessioni di studio e pausa</p>
       {pomodoroId && (
          <p>
      Evento collegato: {pomodoroId} — {cyclesCompleted}/{cycles}
      {" "}completati
    </p>
        )}
    </div>
    <div className="pomodoro-grid">
      {/* Colonna sinistra: configurazione */}
      <div className="pomodoro-config card">
        <h2>⚙️ Configurazione</h2>

        <label>
          Minuti studio:
          <input
            type="number"
            min={1}
            value={studyMin}
            onChange={(e) => setStudyMin(Math.max(1, Number(e.target.value)))}
          />
        </label>

        <label>
          Minuti pausa:
          <input
            type="number"
            min={0}
            value={breakMin}
            onChange={(e) => setBreakMin(Math.max(0, Number(e.target.value)))}
          />
        </label>

        <label>
          Cicli:
          <input
            type="number"
            min={1}
            max={24}
            value={cycles}
            onChange={(e) =>
              setCycles(Math.max(1, Math.min(24, Number(e.target.value))))
            }
          />
        </label>

        <hr />

        <label>
          Oppure inserisci minuti totali disponibili:
          <input
            type="number"
            min={1}
            placeholder="es. 200"
            value={totalMinutesInput}
            onChange={(e) =>
              setTotalMinutesInput(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
          <button onClick={onComputeProposalsClick}>Calcola proposte</button>
        </label>

        {proposals.length > 0 && (
  <div className="proposals">
    <div className="proposals-header">
      <h4>Proposte</h4>
      <button
        className="close-proposals"
        onClick={() => setProposals([])}
        title="Chiudi"
      >
        ✖
      </button>
    </div>

    {proposals.map((p, i) => (
      <div key={i} className="proposal">
        <div className="proposal-text">
          {p.cycles} cicli da {p.study}m studio + {p.break}m pausa
        </div>
        <button onClick={() => acceptProposal(p)}>Usa proposta</button>
      </div>
    ))}
      </div>
        )}
      </div>

      {/* Colonna destra: timer */}
      <div className="pomodoro-main card">
        <h2>⏱ Timer</h2>

        <div
          className={`anim-box ${
            phase === "study" ? "study-anim" : "break-anim"
          }`}
        >
          <div className="anim-inner">
            <div className="phase-label">
              {phase === "study" ? "STUDIO" : "PAUSA"}
            </div>
            <div className="time-large">{secondsToHMS(remaining)}</div>
            <div className="cycle-info">
              Ciclo {currentCycle} / {cycles}
            </div>
          </div>
        </div>

        <div className="controls">
          <button onClick={toggleStartPause}>
            {running ? "Pausa" : "Avvia"}
          </button>
          <button onClick={forceNextPhase}>Avanti (forza)</button>
          <button onClick={restartCycle}>Ricomincia</button>
          <button onClick={endAll}>Fine ciclo</button>
        </div>

        <div className="info">
          <small>
            🔔 Le notifiche richiedono permesso browser. Se non senti il beep,
            controlla audio del browser.
          </small>
        </div>
      </div>
    </div>
  </div>
  );
}
