
// Browser side of the 2 Deezer calls
//  going thru server.js bc Deezer api dont allow direct calls from a web page.
//
//fetchPool  Real tracks similar to a seed artist from the history.
//checkTrack Does this track exist? Returns cover art, preview and link.

async function get(path, params) {
  const url = new URL(path, window.location.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) 
    throw new Error(data.error || `Catalogue request failed (${res.status})`);
  return data;
}

const found = (t) => ({ status: 'found', cover: t.cover, preview: t.preview, link: t.link });

//
//return an empty list if server casnt be reached. default to the offline list
export async function fetchPool(seed) {
  try {
    const data = await get('/api/catalogue/pool', { title: seed.title, artist: seed.artist });
    return (data.tracks || []).map((t) => ({ title: t.title, artist: t.artist, seedArtist: data.seedArtist, catalogue: found(t) }));
  } catch {
    return [];
  }
}

export async function checkTrack(track) {
  try {
    const data = await get('/api/catalogue/check', { title: track.title, artist: track.artist });
    return data.found ? found(data.track) : { status: 'missing' };
    
  } catch {
    return { status: 'unchecked' };
  }
}
