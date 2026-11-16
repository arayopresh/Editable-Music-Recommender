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


// models generates the 1st profile

export function setAIProfile(state, texts) {
    state.lines = texts
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .map((texts) => ({id:newId('L'), text, author: 'AI', original: null}));

    state.suggestions =[];
    state.removedTexts =[];
    note(state, 'AI', `The AI wrote ${state.lines.length} lines from the listening history`)
    return state.lines;
}

//user controlsss
export function editLine(state, id, text){
    const line = findLine(state, id);
    const next = String(text || '').trim
    
    if(!line || !next || next ===line.text) 
        return false;

    if(line.author ==='AI')
        line.original = line.text; // #imbetterthantheAI ;p
        line.text = next;
        line.author ='User'

//showing the changes the user made 
    state.suggestions = state.suggestions.filter((s)=> s.targetId !== id);
    note(state, 'user', `You edited a line and now it reads " ${next}".`);
    return True


}

//undoing a line chanfe
export function restoreLine(state, id) {
  const line = findLine(state, id);

  if (!line || !line.original) 
    return false;
  line.text = line.original;
  line.author = 'AI';
  line.original = null;


  note(state, 'User', 'You undid the AI wording of a line.');
  return true;
}

//deleting a line 

export function deleteLine(state, id) {

  const line = findLine(state, id);

  if (!line) 
    return false;
    state.removedTexts.push(norm(line.text));

  if (line.original)
    state.removedTexts.push(norm(line.original));
    state.lines = state.lines.filter((l) => l.id !== id);
    state.suggestions = state.suggestions.filter((s) => s.targetId !== id);

  note(state, 'User', `You DELETED the line "${line.text}".`);
  return true;
}

//adding a line
export function addLine(state, text) {

  const next = String(text || '').trim();
  if (!next) 
    return null;

  const line = { id: newId('L'), text: next, author: 'User', original: null };
  state.lines.push(line);

  note(state, 'User', `You added the line "${next}".`);
  return line;
}



//ading a protection layer that the =model has to obey