export const DEFAULT_LOCALE = 'it';
export const SUPPORTED_LOCALES = Object.freeze(['it', 'en']);

const definitions = {
  it: {
    languageName: 'Italiano',
    standard: 'Inserisci i numeri da 1 a 9 senza ripetizioni in ogni riga e colonna.',
    boxes: 'Ogni riquadro 3 × 3 deve contenere tutti i numeri da 1 a 9.',
    shared: 'Le celle sovrapposte appartengono a entrambi i sudoku: il loro valore deve rispettare le regole di tutti e due.',
    variants: {
      classic: ['Sudoku classico', ''],
      inequality: ['Sudoku disuguaglianze', 'I segni < e > tra le celle devono essere rispettati: la punta indica il numero minore.'],
      addition: ['Sudoku somme', 'I numeri nelle celle evidenziate in blu devono sommare al numero nella cella arancione indicata sotto di esse.'],
      killer: ['Killer Sudoku', 'La somma dei numeri di ogni gabbia deve coincidere con il totale indicato. Nella stessa gabbia i numeri non si ripetono.'],
      consecutive: ['Sudoku consecutivi', 'Un ponte collega due celle adiacenti i cui numeri differiscono di 1. Senza ponte, i numeri delle due celle adiacenti non possono essere consecutivi. Si considerano solo adiacenze orizzontali e verticali interne a questo sudoku.'],
      diagonal: ['Sudoku X', 'Anche ciascuna delle due diagonali principali deve contenere tutti i numeri da 1 a 9.'],
      irregular: ['Sudoku regioni irregolari', 'Ciascuna delle nove regioni delimitate dai bordi spessi deve contenere tutti i numeri da 1 a 9. Le regioni sostituiscono i riquadri 3 × 3.'],
      offset: ['Sudoku Offset', 'Anche ciascun gruppo di nove celle dello stesso colore deve contenere tutti i numeri da 1 a 9.'],
    },
    ui: {
      appName: 'SuperSudoku Generator', language: 'Lingua', rules: 'Regole', close: 'Chiudi',
      newGame: 'Nuova partita', generate: 'Genera', generating: 'Generazione in corso…',
      resume: 'Riprendi partita', restart: 'Ricomincia', restartConfirm: 'Vuoi ricominciare questa partita? I progressi saranno cancellati.',
      notes: 'Appunti', erase: 'Cancella', undo: 'Annulla', redo: 'Ripristina',
      zoomIn: 'Ingrandisci', zoomOut: 'Riduci', fit: 'Adatta allo schermo',
      settings: 'Impostazioni', errorCheck: 'Controllo errori',
      checkRules: 'Violazioni delle regole', checkSolution: 'Confronto con la soluzione', checkOff: 'Disattivato',
      ruleConflict: 'Questo numero viola una regola.', wrongNumber: 'Questo numero è diverso dalla soluzione.',
      saved: 'Partita salvata', saveFailed: 'Impossibile salvare la partita su questo dispositivo.',
      loadFailed: 'Impossibile caricare la partita salvata.',
      generationFailed: 'Non è stato possibile generare una partita. Riprova.',
      completed: 'Complimenti! Hai completato il supersudoku.',
      difficulty: 'Difficoltà', easy: 'Facile', medium: 'Media', hard: 'Difficile',
      solution: 'Soluzione', showSolution: 'Mostra soluzione',
      showSolutionConfirm: 'Vuoi mostrare la soluzione di questa partita?',
      print: 'Stampa', help: 'Aiuto', selectCell: 'Seleziona una cella per iniziare.',
      cell: 'Cella', row: 'Riga', column: 'Colonna', empty: 'Vuota', given: 'Numero iniziale',
      sharedCell: 'Cella condivisa', paused: 'In pausa', timer: 'Tempo',
      tagline: 'Otto sudoku. Un solo intreccio.', play: 'La tua partita',
      intro: 'Segui i numeri, scopri le connessioni.',
      overview: 'Schema completo', focus: 'Ingrandisci sudoku', boards: 'Gli otto sudoku',
      progress: 'Completamento', filled: 'celle compilate', gameNumber: 'Partita',
      newGameHint: 'Otto varianti, nuove posizioni e una soluzione unica.',
      seed: 'Codice partita', seedHint: 'Lascia vuoto per una partita casuale',
      density: 'Caselle da riempire', relaxed: '320 · Più numeri iniziali', challenging: '400 · Meno numeri iniziali',
      cancel: 'Annulla', newGameConfirm: 'La nuova partita sostituirà quella attuale. I progressi precedenti non saranno conservati.',
      helpText: 'Seleziona una cella e usa i numeri sullo schermo o la tastiera. N attiva gli appunti; Backspace cancella; Ctrl/Cmd+Z annulla. Usa le frecce per spostarti. Tocca il nome di un sudoku per ingrandirlo e Regole per i suoi vincoli. Le celle condivise hanno un unico valore per entrambi i sudoku.',
      checking: 'Verifica della soluzione unica', constructing: 'Preparazione degli otto sudoku',
      welcome: 'La prima partita è pronta. Scegli una cella per iniziare.',
      localNote: 'I progressi si salvano su questo browser.',
      generationNote: 'Può richiedere qualche secondo. Puoi annullare e tornare alla partita.',
      solutionShown: 'Stai visualizzando la soluzione.', hideSolution: 'Torna alla partita',
      cellHint: 'Le celle condivise rispettano le regole di entrambi i sudoku.',
      resetView: 'Ripristina vista', loading: 'Preparazione della partita…',
      install: 'Installa app', startupFailed: 'Impossibile avviare la partita. Ricarica la pagina.',
      compactRules: 'Regole del sudoku selezionato',
    },
  },
  en: {
    languageName: 'English',
    standard: 'Fill every row and column with the numbers 1 to 9 without repetitions.',
    boxes: 'Every 3 × 3 box must contain all the numbers from 1 to 9.',
    shared: 'Overlapping cells belong to both sudokus: their values must satisfy the rules of both.',
    variants: {
      classic: ['Classic Sudoku', ''],
      inequality: ['Inequality Sudoku', 'The < and > signs between cells must hold true: the point faces the smaller number.'],
      addition: ['Addition Sudoku', 'The numbers in the blue highlighted cells must add up to the number in the indicated orange cell beneath them.'],
      killer: ['Killer Sudoku', 'The numbers in each cage must add up to its indicated total. Numbers cannot repeat within a cage.'],
      consecutive: ['Consecutive Sudoku', 'A bridge connects two adjacent cells whose numbers differ by 1. Without a bridge, the numbers in two adjacent cells cannot be consecutive. Only horizontal and vertical adjacencies within this sudoku count.'],
      diagonal: ['Sudoku X', 'Each of the two main diagonals must also contain all the numbers from 1 to 9.'],
      irregular: ['Irregular Sudoku', 'Each of the nine regions outlined by thick borders must contain all the numbers from 1 to 9. These regions replace the 3 × 3 boxes.'],
      offset: ['Offset Sudoku', 'Each group of nine cells with the same colour must also contain all the numbers from 1 to 9.'],
    },
    ui: {
      appName: 'SuperSudoku Generator', language: 'Language', rules: 'Rules', close: 'Close',
      newGame: 'New game', generate: 'Generate', generating: 'Generating…',
      resume: 'Resume game', restart: 'Restart', restartConfirm: 'Restart this game? Your progress will be cleared.',
      notes: 'Notes', erase: 'Erase', undo: 'Undo', redo: 'Redo',
      zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit to screen',
      settings: 'Settings', errorCheck: 'Error checking',
      checkRules: 'Rule violations', checkSolution: 'Check against solution', checkOff: 'Off',
      ruleConflict: 'This number breaks a rule.', wrongNumber: 'This number does not match the solution.',
      saved: 'Game saved', saveFailed: 'Unable to save the game on this device.',
      loadFailed: 'Unable to load the saved game.',
      generationFailed: 'Unable to generate a game. Please try again.',
      completed: 'Congratulations! You completed the supersudoku.',
      difficulty: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard',
      solution: 'Solution', showSolution: 'Show solution',
      showSolutionConfirm: 'Show the solution to this game?',
      print: 'Print', help: 'Help', selectCell: 'Select a cell to begin.',
      cell: 'Cell', row: 'Row', column: 'Column', empty: 'Empty', given: 'Given number',
      sharedCell: 'Shared cell', paused: 'Paused', timer: 'Time',
      tagline: 'Eight sudokus. One connected puzzle.', play: 'Your game',
      intro: 'Follow the numbers. Find the connections.',
      overview: 'Full puzzle', focus: 'Focus on sudoku', boards: 'The eight sudokus',
      progress: 'Progress', filled: 'cells filled', gameNumber: 'Game',
      newGameHint: 'Eight variants, new positions and one unique solution.',
      seed: 'Game code', seedHint: 'Leave empty for a random game',
      density: 'Empty cells', relaxed: '320 · More starting numbers', challenging: '400 · Fewer starting numbers',
      cancel: 'Cancel', newGameConfirm: 'The new game will replace your current game. Previous progress will not be kept.',
      helpText: 'Select a cell and use the on-screen numbers or your keyboard. N toggles notes; Backspace erases; Ctrl/Cmd+Z undoes. Use the arrow keys to move. Tap a sudoku name to focus on it and Rules to read its constraints. Shared cells have a single value for both sudokus.',
      checking: 'Checking for a unique solution', constructing: 'Preparing the eight sudokus',
      welcome: 'Your first game is ready. Pick a cell to begin.',
      localNote: 'Progress is saved in this browser.',
      generationNote: 'This may take a few seconds. You can cancel and return to your game.',
      solutionShown: 'You are viewing the solution.', hideSolution: 'Back to game',
      cellHint: 'Shared cells follow the rules of both sudokus.',
      resetView: 'Reset view', loading: 'Preparing your game…',
      install: 'Install app', startupFailed: 'Unable to start the game. Reload the page.',
      compactRules: 'Rules for the selected sudoku',
    },
  },
};

function freezeDeep(value) {
  for (const item of Object.values(value)) if (item && typeof item === 'object') freezeDeep(item);
  return Object.freeze(value);
}

export const MESSAGES = freezeDeep(definitions);

/** Regional tags are accepted; unsupported languages fall back to Italian. */
export function resolveLocale(locale = DEFAULT_LOCALE) {
  const language = typeof locale === 'string' ? locale.toLowerCase().split(/[-_]/)[0] : '';
  return SUPPORTED_LOCALES.includes(language) ? language : DEFAULT_LOCALE;
}

export function translate(key, locale = DEFAULT_LOCALE) {
  const messages = MESSAGES[resolveLocale(locale)].ui;
  if (!Object.hasOwn(messages, key)) throw new Error(`Unknown translation key: ${key}`);
  return messages[key];
}

export function variantInfo(variant, locale = DEFAULT_LOCALE) {
  const messages = MESSAGES[resolveLocale(locale)];
  if (!Object.hasOwn(messages.variants, variant)) throw new Error(`Unknown variant: ${variant}`);
  const [name, specific] = messages.variants[variant];
  return {
    id: variant, name,
    rules: [messages.standard, variant === 'irregular' ? '' : messages.boxes, specific, messages.shared].filter(Boolean).join(' '),
  };
}
