
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


async function deezer(pathname, params = {}) {


  const url = new URL(DEEZER + pathname);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

 

  //using cached answers to save tiem

  const key = url.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 600_000) return hit.data; //under 10 mins

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) }); // give up after 10 seconds
  if (!res.ok) 
    throw new Error(`Deezer returned status ${res.status}`);

  const data = await res.json();

  // Deezer reports an empty search as an error treat it as no results.
  if (data.error && /no data/i.test(data.error.message || '')) 
    return { data: [] };

  if (data.error) 
    throw new Error(`Deezer error, ${data.error.message || 'unknown'}`);

  cache.set(key, { at: Date.now(), data });
  return data;

}

// clean up crew ;p

const clean = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

// only the parts of a Deezer track the page needs.
const shape = (t) => ({
  title: t.title_short || t.title,
  artist: (t.artist && t.artist.name) || '',
  cover: (t.album && t.album.cover_medium) || '',  // cover art
  preview: t.preview || '',                          // 30 second clip

  link: t.link || (t.id ? `https://www.deezer.com/track/${t.id}` : ''),

});

// 2 titles count as the same if they match, or one adds only a version word.


const VERSION = /^(part|pt|remaster|remastered|version|edit|live|mix|radio|single|album|acoustic|\d)/;

function sameTitle(a, b) {
  if (a === b) 
    return true;

  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return long.startsWith(`${short} `) && VERSION.test(long.slice(short.length + 1));

}


//artists names match if they have the same full name

const people = (s) => s.split(/\b(?:and|feat|ft|featuring|with|x|vs)\b/).map((p) => p.trim()).filter(Boolean);
const sameArtist = (a, b) => people(a).some((p) => people(b).includes(p));

//bad request error if a required search parameter is missing.
function need(q, ...names) {
  const missing = names.filter((n) => !String(q.get(n) || '').trim());

  if (missing.length) 
    throw Object.assign(new Error(`${missing.join(' and ')} required`), { bad: true });

}

// search Deezer for a song and returns it only if the title and artist both match.

async function findTrack(title, artist) {
  const data = await deezer('/search', { q: `${title} ${artist}`, limit: 10 });
  const wantT = clean(title);
  const wantA = clean(artist);

  return (data.data || []).find((t) => {

    const gotT = clean(t.title_short || t.title);
    const gotA = clean(t.artist && t.artist.name);

    return gotT && gotA && sameTitle(gotT, wantT) && sameArtist(gotA, wantA);
  })
   || null;
}

// Words that carry no artist name in a profile line are skipped.
const FILLER = new Set('uk us rap grime drill afrobeats afrobeat amapiano ambient calm instrumental classical piano rnb r b soul soulful hip hop conscious jazz house dance electronic indie alternative rock pop upbeat moments slow strong vocals open genre i im me my we only just really mostly mainly like likes love loves enjoy enjoys prefer prefers listen listens listening to into by from of the a an and or is are am was music song songs track tracks artist artists band bands stuff especially lot lots more most all always favourite favorite fan big huge for when with on in at it that this some new old'.split(' '));

// Finds an artist named anywhere in a profile line
// Tries groups of words, longest first, and accepts an exact artist name.

async function artistInLine(text) {
  const words = clean(text).split(' ').filter((w) => w && !FILLER.has(w)).slice(0, 8);

  for (let size = Math.min(words.length, 4); size >= 1; size -= 1) {
    for (let i = 0; i + size <= words.length; i += 1) {

      const phrase = words.slice(i, i + size).join(' ');
      const hits = (await deezer('/search/artist', { q: phrase, limit: 3 })).data || [];

    
      const hit = hits.find((a) => clean(a.name) === phrase && a.nb_fan > (size > 1 ? 1000 : 100000));
      if (hit) return hit;
    }
  }
  // artist name not found use the words as a song title instead.
  

  if (words.length < 2)
    return null;
  const track = ((await deezer('/search', { q: words.join(' '), limit: 1 })).data || [])[0];
  const titleInLine = track && ` ${words.join(' ')} `.includes(` ${clean(track.title_short || track.title)} `);

  return titleInLine ? track.artist : null;
}

// deezer requests the browser can make.

const CATALOGUE_ROUTES = {
  // soes the song exist

  '/api/catalogue/check': async (q) => {
    need(q, 'title', 'artist');
    const hit = await findTrack(q.get('title'), q.get('artist'));
    return hit ? { found: true, track: shape(hit) } : { found: false };

  },
  // songs from the same artists

  '/api/catalogue/pool': async (q) => {
    need(q, 'title', 'artist');

    const seed = await findTrack(q.get('title'), q.get('artist'));
    if (!seed) 
        return { seedArtist: null, tracks: [] };
    const radio = await deezer(`/artist/${seed.artist.id}/radio`, { limit: 25 });

    return { seedArtist: seed.artist.name, tracks: (radio.data || []).filter((t) => t.readable !== false).map(shape) };
  },

  // songs for a profile line that match an artist

  '/api/catalogue/line': async (q) => {
    need(q, 'text');

    const artist = await artistInLine(q.get('text'));
    if (!artist) 
        
        return { seedArtist: null, tracks: [] };
    const own = (await deezer(`/artist/${artist.id}/top`, { limit: 10 })).data || [];

    // for when im my specific artist phase.. ms del rey only 

    const similar = q.get('only') === '1' ? [] : (await deezer(`/artist/${artist.id}/radio`, { limit: 25 })).data || [];
    return { seedArtist: artist.name, tracks: [...own, ...similar].filter((t) => t.readable !== false).map(shape) };
  },
};

//HTTP callllls
//might have to kms over this

// tells the browser what kind of file it is getting
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

//reply with . JSON by default, or a file's contents with its type.
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

// post request

function readBody(req) {

  return new Promise((resolve, reject) => {
    let raw = ''; //rahh 

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 200_000) 
        reject(new Error('Request too large')); // refuse huge requests

    });
    req.on('end', () => {

      try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Bad JSON')); }

    });
    req.on('error', reject);

  });


}

// runs ones for every request and decides what o send back

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  //to know whether to enable the Live LLM button.
  if (url.pathname === '/api/status') return send(res, 200, { live: LIVE, provider: LIVE ? PROVIDER : null, model: LIVE ? MODEL : null });

  // Live mode requests. refused if there is no key.
  if (req.method === 'POST' && ROUTES[url.pathname]) {
    if (!LIVE) 
        return send(res, 503, { error: 'Live mode needs an API key. See the README' });
    try {

      return send(res, 200, await ROUTES[url.pathname](await readBody(req)));
    } catch (err) {

      return send(res, 502, { error: err.message }); // 502 means a service behind this server failed
    }

  }

  //get request answers
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

  // Deezer requests.
  if (CATALOGUE_ROUTES[url.pathname]) {
    try {
      return send(res, 200, await CATALOGUE_ROUTES[url.pathname](url.searchParams));
    } catch (err) {
      return send(res, err.bad ? 400 : 502, { error: err.message });
    }

  }


  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);

  

  if (!file.startsWith(PUBLIC + path.sep)) 
    return send(res, 403, { error: 'Forbidden' });

  fs.readFile(file, (err, data) => {
    if (err) 
        
        return send(res, 404, { error: 'Not found' });
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });

});

//listening ears activated

server.listen(PORT, () => {
  console.log(`Taste profile running at http://localhost:${PORT}`);
  console.log(LIVE ? `Live mode available, provider ${PROVIDER}, model ${MODEL}` : 'No API key found. Replay (simulated) mode only.');
});