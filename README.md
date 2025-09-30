# Selfie---webTecnologiesProject
Progetto unibo per il corso di Tecnologie Web

 Thomas Bernardi    mail: thomas.bernardi2@studio.unibo.it

 Tommaso Michetti   mail: tommaso.michetti@studio.unibo.it

 Estensione progetto 18-27:
 Il progetto è stato stato realizzato in questo modo: 
 il frontend con il framework ReactJs usando Vite durante la fase di development, mentre il backend è stato implementato con Node + ExpressJs.
 Per il database è stato utilizzato MongoDb Atlas in fase di development con un account personale e succesivamente con quello fornito dal DISI Unibo.
 Abbiamo utilizzato l'Api fullCalendar per implementare tutte le funzionalità del calendario(eventi, task, ecc..).
 Infine è stata utilizzata come Generative AI ChatGPT principalmente per sistemare alcune parti CSS, per alcune funzioni dove erano richiesti calcoli complessi( ad esempio per il calcolo delle alternative di cicli minuti e studio nella pagina pomodoro) e infine per la correzione di alcuni bug(ad esempio mettendo i messeggi di errore del terminale o della console browser).


 Logiche di Selfie:
 Fronted(home e login):
 Pagine Login.tsx e Registrazione.tsx per poter accedere all'applicazione e registrarsi come nuovo utente.

 Pagina home.tsx: anteprima del calendario(settimana corrente) con eventi e task inseriti nella CalendarPage.tsx con lista dei prossimi eventi/attivita(possono essere in corso), anteprima della pagina delle note con ultima nota modificata e ultima nota creata(anche in markdown), anteprima dei prossimi eventi pomodoro con possibilità di andare alla pagina pomodoro(con evento specifico aggiunto sul calendario o casuale).

 Pagina Pomodoro.tsx: Con tutte le funzionalità richieste(configurazione pomodoro, alternative inserendo minuti di studio, e timer pomodoro con bottoni e notifiche) e possibilita di effettuare un pomodoro specifico(evento aggiunto sul calendario) oppure pomodoro non salvato.

 Pagina CalendarPage.tsx: pagina calendario con possibilita di poter aggiungere/modificare/eliminare eventi singoli o ricorrenti(possibilità di modifcare/eliminare uno solo o tutti gli eventi) collegata alla pagina Eventi.tsx per la modifica degli eventi. Aggiungere/modificare attività(task) con lista in basso dove poter eliminare task o consultare se una task è in corso, in ritardo o completata. Aggiungere/eliminare un evento pomodoro collegato direttamente alla pagina pomodoro(impostando la configurazione e logica del passaggio al giorno successivo se un evento non è completato dopo il giorno corrente).

 Pagina NotesPage.tsx: pagina delle note dove poter aggiungere note con titolo, categorie e testo(anche in markdown) e visualizzare note salvate con possibilità di modificare/duplicare/copiare il testo/eliminare le singole note.

timeMachineModal.tsx: collegata alla pagina TimeContext pop-up apribile in tutte le pagine di Selfie per poter modificare giorno/mese/anno/ore all'interno dell'applicazione.

Pagine Profilo.tsx e account.tsx: dove poter consultare/modificare i dati dell'utenete(profilo) e reimpostare la password(account).

Backend(routes e Models):
Tutte(o quasi) le pagine sono collegate al backend tramite la pagina auth.ts che contiene le routes che permettono il fuzionamento di tutte le logiche dell'applicazione(login, registrazione, eventi, task, note...).

In Models sono presenti tutti gli schemi salvati su MongoDB(user, evento, task, note, pomodoro).

L'unica parte mancante dell'estensione 18-27 sono le notifiche per alcuni bug e questioni tempistiche abbiamo deciso di non implementare.


Divisione del lavoro:
Thomas Bernardi: implementazione Login e registrazione(backend e frontend), pagina home.tsx(backend e frontend), CalendarPage.tsx e logica task, eventi, pomodoro(backend e frontend), pagina Note(frontend), navabar e opzioni(account e profilo), Collegamento a MongoDB Atlas.

Tommaso Michetti: i Time Machine(backend e frontend), Eventi.tsx(backend e frontend), CalendarPage.tsx e logica task, eventi, pomodoro(backend e frontend), Pagina note(backend), deploy sul docker del DISI.