# SuperSudoku Generator

App locale per generare e risolvere supersudoku da PC e telefono: otto varianti, 576 celle, sovrapposizioni e soluzione unica verificata.

[English documentation](README.en.md)

## Prima partita

Richiede Node.js 22 o successivo. Dal terminale aperto nella cartella Supersudoku:

```powershell
node server.js
```

Apri **http://localhost:5173**. Non occorre installare dipendenze per giocare. Mantieni aperto il terminale; Ctrl+C arresta il server.

La prima partita è già pronta e verificata. **Nuova partita** genera un nuovo schema: scegli 320 o 400 caselle vuote e, facoltativamente, un codice per riprodurlo. La quantità di numeri iniziali non è una difficoltà certificata.

Dal telefono, collegati allo stesso Wi-Fi del PC e apri uno degli indirizzi `Telefono / Phone` stampati nel terminale. Il PC e il server devono rimanere accesi. Se Windows chiede l'accesso alla rete per Node, consenti la rete privata per usare il telefono. Il progetto non è pubblicato online.

## Comandi

- Seleziona una cella e usa il tastierino o la tastiera. Le frecce spostano la selezione.
- **Ingrandisci sudoku** mostra una griglia; tocca un nome nell'elenco per cambiarla. **Schema completo** mostra tutte le sovrapposizioni. I controlli + e − aumentano lo zoom; scorri la griglia per spostarti.
- Ogni sudoku ha nome e pulsante **Regole**, nello schema completo e nell'elenco. Una cella condivisa ha un solo valore e rispetta entrambi i sudoku.
- **Appunti** (N), **Cancella** (Backspace/Delete), **Annulla** (Ctrl/Cmd+Z), **Ripristina** (Ctrl/Cmd+Shift+Z).
- Il controllo predefinito confronta con la soluzione; puoi scegliere solo le violazioni delle regole o disattivarlo. Gli errori vengono mantenuti ed evidenziati per consentire correzione o annullamento.
- I progressi si salvano automaticamente nello stesso browser: numeri, appunti e tempo. La cronologia di annulla/ripristina vale per la sessione aperta. Nessuna sincronizzazione tra dispositivi.
- **Mostra soluzione** non sovrascrive la partita; ripremilo per tornare a giocare. **Ricomincia** cancella i progressi dopo conferma.
- Italiano / English cambia tutti i testi senza modificare la partita e conserva la preferenza.
- **Stampa** usa lo schema completo. Manifest e service worker permettono installazione e offline nei browser compatibili su localhost o HTTPS, dopo il primo caricamento. Sul telefono tramite indirizzo HTTP del PC si può giocare, ma installazione e offline non sono disponibili.

## Generazione

Le varianti sono Classico, Disuguaglianze, Somme, Killer, Consecutivi, X, Regioni irregolari e Offset. Vengono mescolate nelle otto posizioni dell'anello, cambiando i vicini e mantenendo 72 celle condivise.

Il generatore costruisce una soluzione per la disposizione, crea regioni irregolari connesse e indizi, quindi rimuove numeri solo verificando che la soluzione rimanga unica. Anche i ponti mancanti nel sudoku consecutivo sono vincoli. Nel sudoku somme, due celle blu sommano alla cella arancione sotto; le lettere identificano i gruppi. Le gabbie Killer non consentono ripetizioni.

La generazione usa un Web Worker per lasciare reattiva l'interfaccia. Puoi annullarla senza perdere la partita. La ricerca ha limiti di calcolo: in caso di fallimento puoi riprovare, conservando lo schema attuale. Lo stesso codice riproduce la partita nella stessa versione del generatore.

`Supersudoku.webp` è un riferimento alle varianti e non viene servita dall'app. Il generatore crea nuovi indizi e regioni, senza trascrivere la foto. Crediti riportati nell'immagine: Carykh e Yessoan.

## Verifica e sviluppo

```powershell
node --test
node scripts/check.js
```

Per i test nel browser, dipendenze, cache e browser restano nel progetto:

```powershell
npm.cmd ci --cache .cache/npm
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/browsers'
node node_modules/playwright/cli.js install chromium
npm.cmd run test:e2e
```

Playwright verifica desktop e telefono simulato: inserimento, errori, cambio lingua, salvataggio, nuova partita, completamento e offline. La simulazione usa Chromium e non sostituisce una prova su Safari/iOS reale. I test avviano e arrestano il loro server sulla porta 5173: ferma il server di gioco prima di eseguirli.

`node scripts/create-starter.js` rigenera la prima partita in `data/starter.json`. `src/i18n.js` centralizza i testi visibili in entrambe le lingue; gli errori tecnici del motore sono diagnostica interna.

Non sono ancora implementati suggerimenti logici e difficoltà classificata con tecniche umane. Il salvataggio richiede che il browser consenta l'archiviazione locale.
