// live.js
// Live mode. Sends the same three requests to the local server, which calls
// the LLM. The API key stays on the server and never reaches the browser.

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const plain = (lines) => lines.map(({ id, text, author }) => ({ id, text, author }));

export const liveResponder = {
  name: 'live',
  async writeProfile(history) {
    return (await post('/api/profile', { history })).lines || [];
  },
  async recommend(lines, history) {
    return (await post('/api/recommend', { lines: plain(lines), history })).tracks || [];
  },
  async propose(lines, history) {
    return (await post('/api/suggest', { lines: plain(lines), history })).proposals || [];
  },
};

export async function liveAvailable() {
  try {
    const res = await fetch('/api/status');
    return res.ok && Boolean((await res.json()).live);
  } catch {
    return false; // Static hosting, no server. Replay mode only.
  }
}
