// replay.js
// SIMULATED. A scripted stand-in for the LLM, so the whole interaction can be follloed w/o api keys

//
// key word rules
// played artist in the history for each genre.

import { CATALOGUE, SCRIPT } from './data.js';
import { norm } from './core.js';
import { fetchPool } from './catalogue.js';

const TAGS = {
//tags to look for whrn recs are made
  
  pop: { label: 'Pop', words: ['pop', 'mainstream pop', 'dance pop', 'synth pop', 'electropop', 'charli xcx', 'dua lipa', 'taylor swift', 'ariana grande'] },
rock: { label: 'Rock', words: ['rock', 'classic rock', 'alternative rock', 'indie rock', 'soft rock', 'the beatles', 'queen', 'fleetwood mac'] },
indie: { label: 'Indie', words: ['indie', 'indie pop', 'indie rock', 'bedroom pop', 'dream pop', 'arctic monkeys', 'mitski'] },
alternative: { label: 'Alternative', words: ['alternative', 'lana del rey', 'dream pop', 'shoegaze', 'psychedelic', 'cigarettes after sex', 'the neighbourhood'] },
rnb: { label: 'R&B', words: ['r&b', 'rnb', 'alternative r&b', 'neo soul', 'soul', 'frank ocean', 'sza', 'summer walker', 'the weeknd', 'partynextdoor'] },
hiphop: { label: 'Hip-hop & Rap', words: ['hip hop', 'hip-hop', 'rap', 'trap', 'melodic rap', 'future', 'metro boomin', 'drake', 'kendrick lamar', 'travis scott'] },
ukrap: { label: 'UK Rap', words: ['uk rap', 'grime', 'drill', 'dave', 'central cee', 'stormzy', 'little simz', 'skepta'] },
afrobeats: { label: 'Afrobeats', words: ['afrobeats', 'afrobeat', 'afropop', 'burna boy', 'wizkid', 'tems', 'fireboy dml', 'victony', 'rema', 'ayra starr'] },
amapiano: { label: 'Amapiano', words: ['amapiano', 'south african house', 'tyler icu', 'kabza de small', 'dj maphorisa', 'kelvin momo'] },
dancehall: { label: 'Dancehall & Reggae', words: ['dancehall', 'reggae', 'afro-dancehall', 'popcaan', 'vybz kartel', 'shenseea', 'bob marley'] },
house: { label: 'House & Dance', words: ['house', 'deep house', 'tech house', 'afro house', 'dance', 'club', 'disclosure', 'fred again'] },
electronic: { label: 'Electronic', words: ['electronic', 'techno', 'trance', 'synthwave', 'electronica', 'ambient electronic', 'jon hopkins', 'four tet'] },
jazz: { label: 'Jazz', words: ['jazz', 'modern jazz', 'contemporary jazz', 'bebop', 'jazz fusion', 'ezra collective', 'dave brubeck'] },
soul: { label: 'Soul & Neo-Soul', words: ['soul', 'neo soul', 'motown', 'jill scott', 'erykah badu', 'cleo sol', 'dangelo'] },
classical: { label: 'Classical', words: ['classical', 'piano', 'orchestral', 'baroque', 'debussy', 'erik satie', 'chopin'] },
ambient: { label: 'Ambient & Instrumental', words: ['ambient', 'white noise', 'instrumental', 'soundscape', 'atmospheric', 'minimalism', 'brian eno', 'tycho', 'hans zimmer'] },
folk: { label: 'Folk & Acoustic', words: ['folk', 'indie folk', 'acoustic', 'singer-songwriter', 'folk rock', 'bon iver', 'hozier', 'noah kahan'] },
latin: { label: 'Latin', words: ['latin', 'reggaeton', 'latin pop', 'bachata', 'salsa', 'bad bunny', 'karol g', 'rosalia'] },
soundtrack: { label: 'Film & Soundtrack', words: ['soundtrack', 'film score', 'cinematic', 'movie score', 'hans zimmer', 'ludovico einaudi'] }
};

// A line that limits a taste
const LIMITING = /\b(only for|only when|only at|only to|not|never|no longer|less|avoid|skip|stop| hate| dislike )\b|n't/i;

export function tagsFor(text) {
  const t = norm(text);
  return Object.keys(TAGS).filter((tag) => TAGS[tag].words.some((w) => t.includes(norm(w))));
}

export const isLimiting = (text) => LIMITING.test(String(text || ''));

const pause = (ms = 350) => new Promise((r) => setTimeout(r, ms));

// Splits the profile into lines that ask for music and genres that are ruled out.

export function readProfile(lines) {
  const excluded = new Set();
  const active = [];
  for (const line of lines) {
    const tags = tagsFor(line.text);
    if (isLimiting(line.text)) tags.forEach((t) => excluded.add(t));
    else if (tags.length) active.push({ line, tags });
  }
  return { active, excluded };
}

// genre tag mapping to deezer
// a pool uses the offline list.
export function pickTracks(lines, history, pools = {}) {
  const key = (t) => norm(`${t.title} ${t.artist}`);
  const heard = new Set(history.map(key));
  const { active, excluded } = readProfile(lines);
  const used = new Set();
  const usedArtists = new Set();
  const tracks = [];
  let progress = true;


  while (tracks.length < 5 && progress) {
    progress = false;
    for (const { line, tags } of active) {
      if (tracks.length >= 5) break;
      const options = tags
        .filter((tag) => !excluded.has(tag))
        .flatMap((tag) => [...(pools[tag] || []), ...CATALOGUE.filter((c) => c.tag === tag)].map((c) => ({ ...c, tag })))
        .filter((c) => !used.has(key(c)) && !heard.has(key(c)));
      const pick = options.find((c) => !usedArtists.has(norm(c.artist))) || options[0];
      if (!pick) continue;
      used.add(key(pick));
      usedArtists.add(norm(pick.artist));
      tracks.push({
        title: pick.title,
        artist: pick.artist,
        lineId: line.id,
        reason: pick.seedArtist
          ? `Similar to ${pick.seedArtist}, who you play most for ${TAGS[pick.tag].label}`
          : `Matches ${TAGS[pick.tag].label} in this line`,
        catalogue: pick.catalogue || null,
      });
      progress = true;
    }
  }
  return tracks;
}

// One Deezer pool per genre the profile asks for ... based on most playeds
// history track in that genre.
async function loadPools(lines, history) {
  const { active, excluded } = readProfile(lines);
  const wanted = [...new Set(active.flatMap((a) => a.tags))].filter((t) => !excluded.has(t));
  const pools = {};
  await Promise.all(
    wanted.map(async (tag) => {
      const seed = history.filter((h) => h.tag === tag).sort((a, b) => b.plays - a.plays)[0];
      if (seed) pools[tag] = await fetchPool(seed);
    }),
  );
  return pools;

}

export const replayResponder = {
  name: 'replay',
  async writeProfile() {
    await pause();
    return SCRIPT.profile.slice();
  },
  async recommend(lines, history) {
    return pickTracks(lines, history, await loadPools(lines, history));
  },

  // The scripted model  proposes the jazz line it missed,
  // and it tries to push its ambient reading back in. If the listener has
  // edited that line, the guard in core.js blocks the attempt.
  async propose(lines) {
    await pause();
    const proposals = [{ text: SCRIPT.newLine, replacesId: null }];
    const ambient = lines.find((l) => tagsFor(l.text).includes('ambient'));
    if (ambient) proposals.push({ text: SCRIPT.ambientRewrite, replacesId: ambient.id });
    else proposals.push({ text: SCRIPT.ambientOriginal, replacesId: null });
    return proposals;
  },
};
