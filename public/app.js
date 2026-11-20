// main interface

import * as core from './core.js';
import { HISTORY } from './data.js';
import { replayResponder } from './replay.js';
import { liveResponder, liveAvailable } from './live.js';
import { checkTrack } from './catalogue.js';

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;

    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);

    else if (v === true) node.setAttribute(k, '');

    else if (v !== false && v != null) node.setAttribute(k, v);
  }


  for (const c of children.flat()) {
    if (c == null || c === false) 
    continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }


  return node;
}

let state = core.createState();
const ui = {
  responder: replayResponder,
  canLive: false,
  started: false,
  busy: null, // profilerec propose
  recs: [],

  stale: false,
  editingId: null,
  error: '',
  playing: null, // preview url now playing
};

//shared player for the 30 second Deezer previews.
const player = new Audio();
player.addEventListener('ended', () => { ui.playing = null; drawRecs(); });

function togglePreview(url) {
  if (ui.playing === url) {

    player.pause();
    ui.playing = null;


  } else {
    player.src = url;
    player.play().catch(() => { ui.playing = null; drawRecs(); });
    ui.playing = url;
  }

  drawRecs();
}

//lights cam action


async function run(kind, job) {
  ui.busy = kind;
  ui.error = '';
  render();
  try {

    await job();
  } 
  
  catch (err) {
    console.error(err); //kill me
    ui.error = `${err.message}. Nothing in your profile was changed.`;
  }
  ui.busy = null;
  render();


}

async function refreshRecs() {
  const raw = await ui.responder.recommend(state.lines, HISTORY);
  const kept = core.checkRecommendations(state, raw).kept;



  // catalogue check 

  await Promise.all(kept.map(async (r) => { if (!r.catalogue) r.catalogue = await checkTrack(r); }));
  const count = (status) => kept.filter((r) => r.catalogue.status === status).length;
  if (count('missing')) {

    core.note(state, 'blocked', `Catalogue check. ${count('missing')} of ${kept.length} tracks were not found on Deezer and are flagged.`);
  } else if (count('unchecked')) {


    core.note(state, 'ai', 'Catalogue check could not reach Deezer. Tracks are shown unchecked.');
  } else if (kept.length) {

    core.note(state, 'ai', `Catalogue check. All ${kept.length} tracks were found on Deezer.`);
  }


  player.pause();
  ui.playing = null;
  ui.recs = kept;
  ui.stale = false;
}

const writeProfile = () =>
  run('profile', async () => {
    core.setAIProfile(state, await ui.responder.writeProfile(HISTORY));
    ui.started = true;

    await refreshRecs();

  });

const updateRecs = () => run('recs', refreshRecs);

const askForSuggestions = () =>
  run('propose', async () => {


    core.applyModelProposals(state, await ui.responder.propose(state.lines, HISTORY));

  });

function changed(didChange) {
  if (didChange) ui.stale = true;

  ui.editingId = null;
  render();

}

function reset(responder = ui.responder) {
  state = core.createState();
  player.pause();

  Object.assign(ui, { playing: null });
  Object.assign(ui, { responder, started: false, busy: null, recs: [], stale: false, editingId: null, error: '' });

  render();
} 


function drawHistory() {
  const groups = new Map();
  for (const h of HISTORY) {
    if (!groups.has(h.playlist)) groups.set(h.playlist, []);

    groups.get(h.playlist).push(h);
  }


  $('history').replaceChildren(
    ...[...groups].map(([name, items]) =>
      el('div', { class: 'group' },
        el('h3', {}, name),
        el('ul', {}, items.map((h) =>
          el('li', {}, el('span', { class: 'track' }, h.title, el('em', {}, h.artist)), el('span', { class: 'plays' }, `${h.plays} plays`)),
        )),
      ),
    ),
  );
}

function lineRow(line) {
  if (ui.editingId === line.id) {
    const input = el('input', { type: 'text', value: line.text, 'aria-label': 'Edit this line', maxlength: 140 });


    const save = () => changed(core.editLine(state, line.id, input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();

      if (e.key === 'Escape') changed(false);
    });
    queueMicrotask(() => { input.focus(); input.select(); });
    return el('li', { class: 'line editing', 'data-line': line.id },
      input,
      el('div', { class: 'row-actions' },
        el('button', { type: 'button', class: 'primary small', onclick: save }, 'Save'),
        el('button', { type: 'button', class: 'ghost small', onclick: () => changed(false) }, 'Cancel'),
      ),
    );
  }


  const mine = line.author === 'user';
  return el('li', { class: `line ${mine ? 'mine' : ''}`, 'data-line': line.id },
    el('div', { class: 'line-main' },
      el('span', { class: `chip ${mine ? 'user' : 'ai'}` }, mine ? 'Your edit' : 'Written by the AI'),
      el('p', { class: 'line-text' }, line.text),
      line.original && el('p', { class: 'was' }, `The AI wrote "${line.original}". `,
        el('button', { type: 'button', class: 'link', onclick: () => changed(core.restoreLine(state, line.id)) }, 'Restore')),
    ),
    el('div', { class: 'row-actions' },
      el('button', { type: 'button', class: 'ghost small', onclick: () => { ui.editingId = line.id; render(); } }, 'Edit'),
      el('button', { type: 'button', class: 'ghost small', 'aria-label': `Remove line. ${line.text}`, onclick: () => changed(core.deleteLine(state, line.id)) }, 'Remove'),
    ),
  );
}

function suggestionRow(s) {
  const target = s.targetId && state.lines.find((l) => l.id === s.targetId);
  return el('li', { class: 'suggestion' },
    el('div', { class: 'line-main' },
      el('span', { class: 'chip suggest' }, target ? 'AI suggests a rewrite' : 'AI suggests a new line'),
      el('p', { class: 'line-text' }, s.text),
      target && el('p', { class: 'was' }, `Would replace "${target.text}".`),
    ),
    el('div', { class: 'row-actions' },
      el('button', { type: 'button', class: 'primary small', onclick: () => changed(core.acceptSuggestion(state, s.id)) }, 'Accept'),
      el('button', { type: 'button', class: 'ghost small', onclick: () => { core.dismissSuggestion(state, s.id); render(); } }, 'Dismiss'),
    ),
  );
}

function drawProfile() {
  const box = $('profile');
  if (!ui.started) {
    box.replaceChildren(
      el('p', { class: 'empty' }, 'Nothing yet. The AI will read the listening history and write your taste as a few short lines you can change.'),
      el('button', { type: 'button', class: 'primary', id: 'write', disabled: ui.busy === 'profile', onclick: writeProfile },
        ui.busy === 'profile' ? 'Reading the history…' : 'Write my taste profile'),
    );
    return;
  }



  const addInput = el('input', { type: 'text', id: 'addText', placeholder: 'Add a line in your own words', 'aria-label': 'Add a line in your own words', maxlength: 140 });
  const add = () => changed(Boolean(core.addLine(state, addInput.value)));
  addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  box.replaceChildren(
    state.lines.length
      ? el('ul', { class: 'lines' }, state.lines.map(lineRow))
      : el('p', { class: 'empty' }, 'Your profile is empty. Add a line below.'),
    el('div', { class: 'add' }, addInput, el('button', { type: 'button', class: 'ghost', id: 'add', onclick: add }, 'Add line')),
    el('div', { class: 'suggest-block' },
      el('div', { class: 'suggest-head' },
        el('h3', {}, 'Suggestions from the AI'),
        el('button', { type: 'button', class: 'ghost small', id: 'ask', disabled: Boolean(ui.busy), onclick: askForSuggestions },
          ui.busy === 'propose' ? 'Checking…' : 'Ask the AI to review my profile'),
      ),
      el('p', { class: 'hint' }, 'Suggestions stay outside your profile until you accept them.'),
      state.suggestions.length ? el('ul', { class: 'lines' }, state.suggestions.map(suggestionRow)) : null,
    ),
  );
}

function light(lineId, on) {
  document.querySelectorAll('[data-line]').forEach((n) => n.classList.toggle('lit', on && n.dataset.line === lineId));
}

function drawRecs() {
  const box = $('recs');
  if (!ui.started) {
    box.replaceChildren(el('p', { class: 'empty' }, 'Tracks appear here once there is a profile. Each one names the profile line it came from and is checked against the Deezer catalogue.'));
    return;
  }


  const banner = ui.stale
    ? el('div', { class: 'stale' },
        el('p', {}, 'Your profile changed. These tracks come from the old one.'),
        el('button', { type: 'button', class: 'primary small', id: 'update', disabled: Boolean(ui.busy), onclick: updateRecs },
          ui.busy === 'recs' ? 'Updating…' : 'Update recommendations'))
    : null;
  const cards = ui.recs.map((r) => {
    const line = state.lines.find((l) => l.id === r.lineId);
    const show = (on) => () => light(r.lineId, on);
    const cat = r.catalogue || { status: 'unchecked' };
    const chip = {
      found: ['ok', 'Found on Deezer'],
      missing: ['warn', 'Not found on Deezer'],
      unchecked: ['sim', 'Not checked'],
    }[cat.status];
    return el('li', { class: `rec ${ui.stale ? 'old' : ''}`, tabindex: 0, onmouseenter: show(true), onmouseleave: show(false), onfocus: show(true), onblur: show(false) },
      cat.cover ? el('img', { class: 'cover', src: cat.cover, alt: '', width: 56, height: 56, loading: 'lazy' }) : el('div', { class: 'cover blank', 'aria-hidden': 'true' }, '?'),
      el('div', { class: 'rec-body' },
        el('div', { class: 'rec-top' },
          el('p', { class: 'rec-title' }, r.title, el('em', {}, r.artist)),
          el('span', { class: `chip ${chip[0]}` }, chip[1]),
        ),
        el('p', { class: 'because' }, 'Because of ',
          line ? el('q', {}, line.text) : el('span', {}, 'a line you have since removed'),
          line && line.author === 'user' ? ' (your edit)' : ''),
        r.reason && el('p', { class: 'reason' }, r.reason),
        cat.status === 'missing' && el('p', { class: 'reason' }, 'The AI named this track but the catalogue has no match. It may not exist.'),
        (cat.preview || cat.link) && el('div', { class: 'rec-links' },
          cat.preview && el('button', { type: 'button', class: 'ghost small', 'aria-label': `${ui.playing === cat.preview ? 'Stop' : 'Play'} preview of ${r.title}`, onclick: () => togglePreview(cat.preview) },
            ui.playing === cat.preview ? 'Stop preview' : 'Play preview'),
          cat.link && el('a', { href: cat.link, target: '_blank', rel: 'noopener' }, 'Open in Deezer'),
        ),
      ),
    );
  });


  const list = ui.recs.length
    ? el('ol', { class: 'recs' }, cards)
    : el('p', { class: 'empty' }, ui.busy ? 'Finding tracks…' : 'No tracks fit the current profile. Add or loosen a line, then update.');
  box.replaceChildren(...[banner, list].filter(Boolean));
}

function drawLog() {
  $('log').replaceChildren(
    ...(state.log.length
      ? state.log.map((e) => el('li', { class: `log-${e.kind}` }, e.message))
      : [el('li', { class: 'log-empty' }, 'Nothing yet.')]),
  );
}

function render() {
  const live = ui.responder.name === 'live';
  $('modeReplay').setAttribute('aria-pressed', String(!live));
  $('modeLive').setAttribute('aria-pressed', String(live));
  $('modeLive').disabled = !ui.canLive;
  $('modeLive').title = ui.canLive ? '' : 'Needs the local server and an API key. See the README.';
  $('error').hidden = !ui.error;
  $('error').textContent = ui.error;
  drawProfile();
  drawRecs();
  drawLog();
}

$('modeReplay').addEventListener('click', () => reset(replayResponder));
$('modeLive').addEventListener('click', () => reset(liveResponder));
$('reset').addEventListener('click', () => reset());

drawHistory();
render();
liveAvailable().then((ok) => { ui.canLive = ok; render(); });
