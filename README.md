# SuperSudoku Generator

Progetto di un'app per generare e risolvere supersudoku da telefono e PC, ispirato a `Supersudoku.webp`.

## Stato

Prima base del motore, senza dipendenze esterne. L'interfaccia e il generatore non sono ancora implementati.

- Otto griglie 9 × 9 disposte ad anello su un'area di 33 × 33 posizioni.
- 576 celle effettive, di cui 72 condivise tra due griglie.
- Vincoli per righe, colonne, regioni, diagonali, offset, disuguaglianze, somme e consecutività.
- Risolutore con limite di ricerca e verifica di unicità tramite ricerca di una seconda soluzione.
- Le regioni irregolari richiedono una mappa esplicita: nessuna sostituzione automatica con riquadri normali.

La trascrizione delle regioni irregolari e dei vincoli illustrati nella foto resta da completare. Le somme supportano per ora un obiettivo numerico fisso; la relazione tra zone colorate dell'Addition Sudoku richiede una modellazione dedicata. Il modello completo non è ancora pronto per generare partite.

## Verifica

Richiede Node.js 22 o successivo. Dalla cartella del progetto:

```powershell
node --test
node --check src/engine.js
```

## Passi successivi

1. Completare la trascrizione delle regole e verificare una soluzione completa delle otto griglie.
2. Costruire una griglia giocabile con zoom, tastierino, appunti e segnalazione degli errori.
3. Aggiungere generazione con soluzione unica, salvataggio locale, annulla/ripristina e supporto PWA.

L'immagine è un riferimento: prima di distribuirla con l'app occorre verificare i diritti di utilizzo. Gli autori indicati nell'immagine sono Carykh e Yessoan.
