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
  console.log('profile input', texts);
    state.lines = texts
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .map((text) => ({id:newId('L'), text, author: 'ai', original: null}));

    state.suggestions =[];
    state.removedTexts =[];
    note(state, 'ai', `The AI wrote ${state.lines.length} lines from the listening history`)
    return state.lines;
}

//user controlsss
export function editLine(state, id, text){
    const line = findLine(state, id);
    const next = String(text || '').trim()
    
    if(!line || !next || next ===line.text) 
        return false;

    if(line.author ==='ai')
        line.original = line.text; // #imbetterthantheAI ;p
        line.text = next;
        line.author ='User'

//showing the changes the user made 
    state.suggestions = state.suggestions.filter((s)=> s.targetId !== id);
    note(state, 'user', `You edited a line and now it reads " ${next}".`);
    return true


}

//undoing a line chanfe
export function restoreLine(state, id) {
  const line = findLine(state, id);

  if (!line || !line.original) 
    return false;
  line.text = line.original;
  line.author = 'ai';
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

  const line = { id: newId('L'), text: next, author: 'user', original: null };
  state.lines.push(line);

  note(state, 'User', `You added the line "${next}".`);
  return line;
}



//ading a protection layer that the =model has to obey bc were running a strict program here :p
export function applyModelProposals(state, proposals) {

  const result = { suggested: 0, blocked: 0, skipped: 0 };

  for (const p of Array.isArray(proposals) ? proposals : []) {
    const text = String((p && p.text) || '').trim();
    if (!text) 
    continue;

    const key = norm(text);
    const target = p.replacesId ? findLine(state, p.replacesId) : null;

    if (target && target.author === 'user') {
      result.blocked += 1;

      note(state, 'blocked', `Blocked. The AI tried to rewrite your line "${target.text}". Your edits stay the same.`);
      continue;
    }
    if (state.removedTexts.includes(key)) {
      result.skipped += 1;
      note(state, 'blocked', `Skipped. The AI suggested "${text}" again, which you removed earlier.`);
      continue;

    }

//dupes
    const duplicate =
      state.lines.some((l) => norm(l.text) === key) ||
      state.suggestions.some((s) => norm(s.text) === key);

    if (duplicate) 
        continue;


    state.suggestions.push({
      id: newId('S'),
      kind: target ? 'revise' : 'add',
      targetId: target ? target.id : null,
      text,
    });


    result.suggested += 1;
  }


  if (result.suggested) {

    note(state, 'ai', `The AI suggested ${result.suggested} change${result.suggested > 1 ? 's' : ''}. Nothing changes until you accept.`);
  } else if (!result.blocked && !result.skipped) {
    note(state, 'ai', 'The AI had nothing new to suggest.');
  }

  return result;

}

//knoing when to make suggestions

export function acceptSuggestion(state, sid) {


  const s = state.suggestions.find((x) => x.id === sid);

  if (!s) 
    return false;
  state.suggestions = state.suggestions.filter((x) => x.id !== sid);

  if (s.kind === 'revise') {
    const target = findLine(state, s.targetId);
    // double check bcuser  may have edited the line

    if (!target || target.author === 'user') 
    return false;
    target.text = s.text;

  } else {
    state.lines.push({ id: newId('L'), text: s.text, author: 'ai', original: null });
  }

  note(state, 'user', `You accepted the AI suggestion "${s.text}".`);
  return true;


}

//refusing suugestion

export function dismissSuggestion(state, sid) {

  const s = state.suggestions.find((x) => x.id === sid);
  if (!s) 
    return false;
  state.suggestions = state.suggestions.filter((x) => x.id !== sid);
  state.removedTexts.push(norm(s.text));


  note(state, 'user', `You dismissed the AI suggestion "${s.text}".`);
  return true;
}


//recommendations showing the line theyve come from -- aka the ake daata p
//and updating the dropped andkept edits


export function checkRecommendations(state, tracks, limit = 5) {
  const kept = [];

  let dropped = 0; //aafter edits

  const seen = new Set();

  for (const t of Array.isArray(tracks) ? tracks : []) {

    const title = String((t && t.title) || '').trim();
    const artist = String((t && t.artist) || '').trim();
    
    const key = norm(`${title} ${artist}`);

    if (!title || !artist || !findLine(state, t.lineId) || seen.has(key)) {
      dropped += 1; 
      continue;
    }

    seen.add(key);

    if (kept.length < limit) {
      kept.push({ title, artist, lineId: t.lineId, reason: String(t.reason || '').trim(), catalogue: t.catalogue || null });
    }


  }
  if (dropped) {
    note(state, 'blocked', `Dropped ${dropped} recommendation${dropped > 1 ? 's' : ''} that did not name a line in your profile.`);
  }

  return { kept, dropped };
}