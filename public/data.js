export const GROUPS = [
  { id: 'cortex', nome: 'Lobi della corteccia' },
  { id: 'sotto', nome: 'Strutture profonde' },
  { id: 'tronco', nome: 'Tronco encefalico e cervelletto' },
];

// deep: true = struttura nascosta dalla corteccia (la trasparenza si attiva da sola)
export const PARTS = [
  {
    id: 'frontale', gruppo: 'cortex', nome: 'Lobo frontale', colore: '#d9694f',
    funzione: 'Pianificazione, presa di decisioni, controllo degli impulsi, memoria di lavoro e movimento volontario.',
    dettagli: 'Comprende la corteccia motoria primaria (giro precentrale), la corteccia premotoria e la corteccia prefrontale. Nell\'emisfero dominante, di solito il sinistro, il giro frontale inferiore ospita l\'area di Broca, coinvolta nella produzione del linguaggio.',
    clinica: 'Caso di Phineas Gage (1848): dopo la lesione frontale cambiò personalità. Le lesioni frontali causano disinibizione, apatia, perseverazione e difficoltà di pianificazione.',
  },
  {
    id: 'parietale', gruppo: 'cortex', nome: 'Lobo parietale', colore: '#e8b84a',
    funzione: 'Elaborazione delle sensazioni corporee, attenzione spaziale e integrazione di informazioni di sensi diversi.',
    dettagli: 'Il giro postcentrale è la corteccia somatosensoriale primaria, con una mappa del corpo (homunculus sensoriale). Il solco centrale lo separa dal lobo frontale. La corteccia parietale posteriore guida l\'azione nello spazio.',
    clinica: 'Una lesione parietale destra può causare negligenza spaziale unilaterale: il paziente ignora la metà sinistra dello spazio. Altri esiti: aprassia e difficoltà di calcolo.',
  },
  {
    id: 'temporale', gruppo: 'cortex', nome: 'Lobo temporale', colore: '#4fa3d9',
    funzione: 'Udito, comprensione del linguaggio, riconoscimento di oggetti e volti, memoria.',
    dettagli: 'Contiene la corteccia uditiva primaria (giro di Heschl) e, nell\'emisfero dominante, l\'area di Wernicke. Nella faccia inferiore il giro fusiforme partecipa al riconoscimento dei volti. Nella parte mediale si trovano ippocampo e amigdala.',
    clinica: 'Afasia di Wernicke: eloquio fluente ma privo di senso e comprensione compromessa. Lesioni del giro fusiforme possono causare prosopagnosia, l\'incapacità di riconoscere i volti.',
  },
  {
    id: 'occipitale', gruppo: 'cortex', nome: 'Lobo occipitale', colore: '#7a68c9',
    funzione: 'Elaborazione delle informazioni visive.',
    dettagli: 'Ospita la corteccia visiva primaria V1 (area 17 di Brodmann, attorno al solco calcarino). Da qui partono la via ventrale ("che cosa", verso il temporale) e la via dorsale ("dove/come", verso il parietale).',
    clinica: 'Lesioni di V1 causano emianopsia omonima controlaterale. Lesioni bilaterali estese possono dare cecità corticale.',
  },
  {
    id: 'corpo_calloso', gruppo: 'sotto', nome: 'Corpo calloso', colore: '#f2efe6', deep: true,
    funzione: 'Mette in comunicazione i due emisferi cerebrali.',
    dettagli: 'È il più grande fascio di fibre del cervello, con circa 200 milioni di assoni che collegano aree corrispondenti dei due emisferi. Permette di integrare le informazioni elaborate separatamente a destra e a sinistra.',
    clinica: 'Nella callosotomia (usata per l\'epilessia grave) il corpo calloso viene sezionato. Gli studi di Sperry e Gazzaniga sui pazienti "split-brain" hanno mostrato le specializzazioni emisferiche (Nobel a Sperry, 1981).',
  },
  {
    id: 'talamo', gruppo: 'sotto', nome: 'Talamo', colore: '#e0a96d', deep: true,
    funzione: 'Stazione di smistamento delle informazioni sensoriali verso la corteccia; interviene in attenzione, sonno e vigilanza.',
    dettagli: 'Quasi tutte le vie sensoriali (eccetto l\'olfatto) passano per il talamo prima di raggiungere la corteccia. Il nucleo genicolato laterale è relè per la vista, il genicolato mediale per l\'udito. Fa parte del diencefalo.',
    clinica: 'Lesioni talamiche possono causare disturbi sensitivi, dolore centrale, alterazioni della coscienza e dell\'attenzione.',
  },
  {
    id: 'ipotalamo', gruppo: 'sotto', nome: 'Ipotalamo', colore: '#e06c9f', deep: true,
    funzione: 'Omeostasi: fame, sete, temperatura corporea, ritmi sonno-veglia, risposta allo stress e comportamento riproduttivo.',
    dettagli: 'Piccolo ma cruciale: controlla l\'ipofisi e quindi il sistema endocrino, e regola il sistema nervoso autonomo. Il nucleo soprachiasmatico è l\'orologio circadiano. Partecipa all\'asse ipotalamo-ipofisi-surrene (risposta allo stress).',
    clinica: 'Le alterazioni possono dare disturbi della temperatura, dell\'appetito e del sonno. È centrale nello studio psicologico di stress ed emozioni.',
  },
  {
    id: 'ippocampo', gruppo: 'sotto', nome: 'Ippocampo', colore: '#5fd0c4', deep: true,
    funzione: 'Formazione di nuovi ricordi dichiarativi (episodici e semantici) e orientamento spaziale.',
    dettagli: 'Si trova nella parte mediale del lobo temporale ed è parte del sistema limbico. Consolida i ricordi, che poi vengono archiviati in modo distribuito nella corteccia. Contiene le cellule di posizione (place cells).',
    clinica: 'Paziente H.M. (Scoville e Milner, 1957): dopo la rimozione bilaterale dell\'ippocampo sviluppò amnesia anterograda grave. L\'ippocampo è precocemente colpito nella malattia di Alzheimer e sensibile allo stress cronico.',
  },
  {
    id: 'amigdala', gruppo: 'sotto', nome: 'Amigdala', colore: '#ff7a59', deep: true,
    funzione: 'Valutazione del significato emotivo degli stimoli, in particolare paura e minaccia; memoria emotiva.',
    dettagli: 'Insieme di nuclei nel lobo temporale mediale, davanti all\'ippocampo. È coinvolta nel condizionamento della paura e nel riconoscimento delle espressioni emotive, e comunica con ipotalamo e corteccia prefrontale.',
    clinica: 'La paziente S.M., con danno bilaterale all\'amigdala, mostra assenza quasi totale di paura. Un\'iperattività amigdalea è associata ad ansia e disturbi correlati allo stress.',
  },
  {
    id: 'gangli', gruppo: 'sotto', nome: 'Gangli della base', colore: '#c9d65f', deep: true,
    funzione: 'Selezione e avvio dei movimenti, apprendimento di abitudini e procedure, circuiti della ricompensa.',
    dettagli: 'Comprendono nucleo caudato, putamen (insieme striato) e globo pallido, con sostanza nera e nucleo subtalamico come stazioni collegate. Formano circuiti ad anello con corteccia e talamo.',
    clinica: 'Malattia di Parkinson: degenerazione dei neuroni dopaminergici della sostanza nera con rallentamento e tremore a riposo. Corea di Huntington: degenerazione del caudato e movimenti involontari.',
  },
  {
    id: 'mesencefalo', gruppo: 'tronco', nome: 'Mesencefalo', colore: '#b98a6a',
    funzione: 'Riflessi visivi e uditivi, controllo dei movimenti oculari, sistemi dopaminergici.',
    dettagli: 'Contiene i collicoli superiori (vista) e inferiori (udito), i nuclei dei nervi cranici III e IV, la sostanza nera e l\'area tegmentale ventrale, origine delle vie dopaminergiche della ricompensa.',
    clinica: 'Il danno della sostanza nera è alla base del Parkinson; l\'area tegmentale ventrale è centrale nei meccanismi di dipendenza.',
  },
  {
    id: 'ponte', gruppo: 'tronco', nome: 'Ponte', colore: '#a67b5b',
    funzione: 'Collega corteccia e cervelletto, partecipa a respirazione, sonno REM e movimenti del viso.',
    dettagli: 'Ponte di fibre tra i due emisferi del cervelletto. Contiene i nuclei di diversi nervi cranici (tra cui V, VI e VII) e centri che modulano il ritmo respiratorio e il sonno REM.',
    clinica: 'Lesioni pontine possono causare paralisi facciali e, se estese, la sindrome locked-in (paziente cosciente ma paralizzato, con movimenti oculari verticali conservati).',
  },
  {
    id: 'bulbo', gruppo: 'tronco', nome: 'Bulbo (midollo allungato)', colore: '#8f6a52',
    funzione: 'Controllo delle funzioni vitali: respirazione, frequenza cardiaca, pressione; riflessi come tosse, vomito e deglutizione.',
    dettagli: 'Continua verso il midollo spinale. Qui avviene la decussazione piramidale: le fibre motorie si incrociano, per questo ogni emisfero controlla il lato opposto del corpo. Contiene i nuclei di diversi nervi cranici (tra cui IX, X, XI e XII).',
    clinica: 'Danni al bulbo possono essere rapidamente fatali per la compromissione di respirazione e circolo.',
  },
  {
    id: 'cervelletto', gruppo: 'tronco', nome: 'Cervelletto', colore: '#5cb88a',
    funzione: 'Coordinazione e precisione del movimento, equilibrio, apprendimento motorio e temporizzazione.',
    dettagli: 'Pur occupando circa il 10% del volume encefalico, contiene la maggior parte dei neuroni dell\'intero cervello. Confronta il movimento programmato con quello eseguito e lo corregge. Contribuisce anche ad alcune funzioni cognitive.',
    clinica: 'Lesioni cerebellari causano atassia (andatura instabile), dismetria e tremore intenzionale. Non causano paralisi: il movimento c\'è ma è scoordinato.',
  },
];

// Nomenclatura latina secondo la Terminologia Anatomica
export const LATINO = {
  frontale: 'Lobus frontalis', parietale: 'Lobus parietalis', temporale: 'Lobus temporalis', occipitale: 'Lobus occipitalis',
  corpo_calloso: 'Corpus callosum', talamo: 'Thalamus', ipotalamo: 'Hypothalamus', ippocampo: 'Hippocampus',
  amigdala: 'Corpus amygdaloideum', gangli: 'Nuclei basales', mesencefalo: 'Mesencephalon', ponte: 'Pons',
  bulbo: 'Medulla oblongata', cervelletto: 'Cerebellum',
};
