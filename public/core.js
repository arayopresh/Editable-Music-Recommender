//profile rules
//what the llm can and cant do
//I HAEV THE MAIN SAY


let counter = 0;
const newId = (prefix) => `${prefix}${++counter}`;


export const norm = (text) =>
    String(text || '').toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim(); // yh im avoiding those crashouts


export function createState() {
    return {lines: [], suggestions: [], removedTexxts: [], log: []};

}


export function note(state, kind, message) {
    state.log.unshift({kind, message});
}

const findLine = (state, id) => state.lines.find((x) => x.id === id);