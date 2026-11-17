
import http from 'node:http';  
import fs from 'node:fs';                 
import path from 'node:path';               
import { fileURLToPath } from 'node:url';   



const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');


//reading the env

const envFile = path.join(ROOT, '.env');

if (fs.existsSync(envFile)) {
  for (const row of fs.readFileSync(envFile, 'utf8').split('\n')) {

    const m = row.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
   
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}


const PORT = Number(process.env.PORT) || 3000;

// Which LLM to call. Most free providers copy OpenAI's request format, so one
// "openai" setting covers Groq, Google Gemini, OpenRouter and Ollama.
//   LLM_PROVIDER=openai     Groq, Gemini, Ollama and others (free options)
//   LLM_PROVIDER=anthropic  Anthropic API (paid)

//usoing openAI as the free option
const PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

// getting my claude pro worht
const API_KEY = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || '';


const MODEL = process.env.LLM_MODEL || 'openai/gpt-oss-120b';

const API_URL = process.env.LLM_API_URL || 'https://api.groq.com/openai/v1/chat/completions';



const LIVE = Boolean(API_KEY) || /localhost|127\.0\.0\.1/.test(API_URL); //mode for when theres a key.... 

// ===== LLM =======================================================================
// One instruction (a "system prompt") for each of the three jobs the model does.
// Each one asks for JSON only, so the reply can be read by code.
const PROMPTS = {
  profile:
    'You describe a listener\'s music taste from their listening history. Write 5 to 7 short plain statements, each under 12 words, in the third person with no subject, for example "Likes Afrobeats for upbeat moments". Use only what the history shows. Reply with JSON only, in the form {"lines":["..."]}.',
  recommend:
    'You recommend music from a written taste profile. Each profile line has an id and an author. Lines with author "User" are the listener\'s own statements and outrank anything in the history. Respect lines that limit or exclude a taste. Recommend exactly 5 real tracks that are not in the history. Each track must name the one line id it relies on most and give a reason under 15 words. Reply with JSON only, in the form {"tracks":[{"title":"...","artist":"...","lineId":"...","reason":"..."}]}.',
  suggest:
    'You review a written taste profile against a listening history. Propose at most 2 changes. A change is either a new line the profile is missing, with "replacesId" null, or a rewrite of an existing line, with "replacesId" set to that line\'s id. Each text is under 12 words. If the profile is already accurate, propose nothing. Reply with JSON only, in the form {"proposals":[{"text":"...","replacesId":null}]}.',
};



//sending req as a JS object
async function askModel(system, payload) {
  const user = JSON.stringify(payload);
  const anthropic = PROVIDER === 'anthropic';

  

  const headers = anthropic
    ? { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' }

    : { 'content-type': 'application/json', ...(API_KEY ? { authorization: `Bearer ${API_KEY}` } : {}) };

  const body = anthropic
    ? { model: MODEL, max_tokens: 1024, system, messages: [{ role: 'user', content: user }] }
    
    : { model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };

  const res = await fetch(API_URL, {

    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000), // give up after 60 seconds
  });

 

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(`The model request failed with status ${res.status}${detail ? ` (${detail})` : ''}`);
  }



  // Pull the text out of the reply.
  const data = await res.json();

  const raw = anthropic
    ? (data.content || []).map((b) => b.text || '').join('')
    : String(data.choices?.[0]?.message?.content || '');


  //removing think tags 
  const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '');

//man models need so much work eh

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start < 0 || end < start) throw new Error('The model did not return JSON');
  try {

    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('The model returned JSON that could not be read');
  }
}


//live modes of the server that check the shape and the model answer so theres n breaks

const ROUTES = {

  // Writing the first profile from the listening history.
  '/api/profile': async ({ history }) => {
    const out = await askModel(PROMPTS.profile, { history });
    return { lines: Array.isArray(out.lines) ? out.lines.slice(0, 7) : [] };
  },


  // Recommending tracks from the current profile.]


  '/api/recommend': async ({ lines, history }) => {
    const out = await askModel(PROMPTS.recommend, { profile: lines, history });
    return { tracks: Array.isArray(out.tracks) ? out.tracks : [] };
  },


  // Suggesting  two changes to the profile.
  '/api/suggest': async ({ lines, history }) => {
    const out = await askModel(PROMPTS.suggest, { profile: lines, history });
    return { proposals: Array.isArray(out.proposals) ? out.proposals.slice(0, 2) : [] };
  },

};

////DEEZERRRR

//thank you deezer for the free work


const DEEZER = 'https://api.deezer.com';
const cache = new Map(); // remembers recent answers so the same search is not repeated

// Makes one Deezer request and returns the JSON.
