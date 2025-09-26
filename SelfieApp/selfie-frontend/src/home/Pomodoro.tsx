import React, { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import "../Pomodoro.css";

type Phase = "study" | "break";

function secondsToHMS(sec: number) {
  const mm = Math.floor(sec / 60).toString().padStart(2, "0");
  const ss = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

 export default function PomodoroPage() {
  const [studyMin, setStudyMin] = useState<number>(30);
  const [breakMin, setBreakMin] = useState<number>(5);
  const [cycles, setCycles] = useState<number>(5);
  const [totalMinutesInput, setTotalMinutesInput] = useState<number | "">("");
  const [proposals, setProposals] = useState<{ cycles: number; study: number; break: number }[]>([]);
  const [running, setRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState<number>(1); 
  const [phase, setPhase] = useState<Phase>("study");
  const [remaining, setRemaining] = useState<number>(studyMin * 60);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      setRemaining(phase === "study" ? studyMin * 60 : breakMin * 60 );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMin, breakMin, phase]);

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
        notifyAndBeep("Pausa: inizio pausa", `Inizia la pausa ${currentCycle}/${cycles}`);
        setPhase("break");
        setRemaining(breakMin * 60);
      } else {    
        const nextCycle = currentCycle + 1;
        if (nextCycle > cycles) {
          notifyAndBeep("Ciclo completato", "Hai completato tutti i cicli!");
          setRunning(false);
          setPhase("study");
          setCurrentCycle(1);
          setRemaining(studyMin * 60);
        } else {
          notifyAndBeep("Studio: inizio prossimo ciclo", `Inizia ciclo ${nextCycle}/${cycles}`);
          setCurrentCycle(nextCycle);
          setPhase("study");
          setRemaining(studyMin * 60);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

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
      setPhase("break");
      setRemaining(breakMin * 60);
      notifyAndBeep("Forzato", "Forzato: inizio pausa");
    } else {
      const nextCycle = currentCycle + 1;
      if (nextCycle > cycles) {
        setRunning(false);
        setCurrentCycle(1);
        setPhase("study");
        setRemaining(studyMin * 60);
        notifyAndBeep("Fine", "Fine ciclo");
      } else {
        setCurrentCycle(nextCycle);
        setPhase("study");
        setRemaining(studyMin * 60);
        notifyAndBeep("Forzato", `Forzato: inizio studio ciclo ${nextCycle}`);
      }
    }
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

          const totalCheck = n * (studyRounded + b);
          if (Math.abs(totalCheck - totalMinutes) <= Math.max(1, Math.round(0.02 * totalMinutes))) {
            results.push({ cycles: n, study: studyRounded, break: b });
          } else {
      
            results.push({ cycles: n, study: studyRounded, break: b });
          }
        }
      }
    }

    results.sort((a, b) => b.cycles - a.cycles || b.study - a.study);
    const seen = new Set<string>();
    const uniq = results.filter((r) => {
      const k = `${r.cycles}-${r.study}-${r.break}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return uniq.slice(0, 6);
  }

  function onComputeProposalsClick() {
    if (totalMinutesInput === "" || totalMinutesInput <= 0) return;
    const num = Number(totalMinutesInput);
    if (isNaN(num) || num <= 0) return;
    const p = computeProposals(num);
    setProposals(p);
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
    {/* Navbar in alto come nelle altre pagine */}
    <Navbar />

    <div className="home-header">
      <h1>🍅 Metodo Pomodoro 🍅</h1>
      <p>Organizza le tue sessioni di studio e pausa</p>
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