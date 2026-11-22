// Quanto si guadagna. Una risposta semplice vale $ 100. Un passaggio di un esercizio guidato vale $ 50:
// un esercizio da 4 passaggi paga il doppio di una domanda semplice (non il quadruplo: altrimenti le partite
// sulle operazioni pagavano da 4 a 8 volte più delle altre).
export const CASH_PER_RIGHT = 100;
export const CASH_PER_STEP = 50;
export const rewardFor = (isGuidedStep) => (isGuidedStep ? CASH_PER_STEP : CASH_PER_RIGHT);
