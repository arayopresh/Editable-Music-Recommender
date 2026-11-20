import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../public/core.js';
import { pickTracks, tagsFor, isLimiting, replayResponder } from '../public/replay.js';
import { HISTORY, SCRIPT } from '../public/data.js';

// testing testing 123
const fresh = () => {
  const s = core.createState();

  core.setAIProfile(s, Script.profile);
  return s;
};

const ambientLine = (s) => s.lines.find((l) => tagsFor(l.text).includes('ambient'));

test('first profile is all AI lines', () => {
  const s = fresh();

  assert.equal(s.lines.length, 5);

  assert.ok(s.lines.every((l) => l.author === 'ai'));
});



test('editing a line marks it as the user edit and keeps the AI wording', () => {

  const s = fresh();
  const line = ambientLine(s);


  core.editLine(s, line.id, 'Ambient only for sleep');
  assert.equal(line.author, 'user');
  assert.equal(line.original, 'Prefers slow ambient music');
  core.restoreLine(s, line.id);
  assert.equal(line.author, 'ai');
  assert.equal(line.text, 'Prefers slow ambient music');


});

test('guard blocks a model rewrite of a user edit', () => {
  const s = fresh();
  const line = ambientLine(s);


  core.editLine(s, line.id, 'Ambient only for sleep');

  const r = core.applyModelProposals(s, [{ text: 'Prefers slow ambient music most of the time', replacesId: line.id }]);

  assert.equal(r.blocked, 1);
  assert.equal(s.suggestions.length, 0);
  assert.equal(line.text, 'Ambient only for sleep');


});



test('model output never changes the profile directly', () => {
  const s = fresh();
  const before = JSON.stringify(s.lines);
  const line = ambientLine(s);


  core.applyModelProposals(s, [
    { text: 'Recently started playing jazz', replacesId: null },
    { text: 'Prefers slow ambient music most of the time', replacesId: line.id },
  ]);


  assert.equal(JSON.stringify(s.lines), before);
  assert.deepEqual(s.suggestions.map((x) => x.kind), ['add', 'revise']);


});

test('accepting applies a suggestion, dismissing does not', () => {
  const s = fresh();


  core.applyModelProposals(s, [{ text: 'Recently started playing jazz', replacesId: null }, { text: 'Likes house music', replacesId: null }]);
  const [a, b] = s.suggestions;


  core.acceptSuggestion(s, a.id);
  core.dismissSuggestion(s, b.id);
  assert.equal(s.lines.length, 6);
  assert.equal(s.lines.at(-1).author, 'ai');
  assert.ok(!s.lines.some((l) => l.text === 'Likes house music'));

});



test('a rewrite suggestion is void if the user edits the line before accepting', () => {
  const s = fresh();


  const line = ambientLine(s);
  core.applyModelProposals(s, [{ text: 'Prefers slow ambient music most of the time', replacesId: line.id }]);
  const sid = s.suggestions[0].id;
  core.editLine(s, line.id, 'Ambient only for sleep');
  assert.equal(core.acceptSuggestion(s, sid), false);
  assert.equal(line.text, 'Ambient only for sleep');


});



test('a removed line is not suggested again', () => {


  const s = fresh();
  core.deleteLine(s, ambientLine(s).id);
  const r = core.applyModelProposals(s, [{ text: 'Prefers slow ambient music', replacesId: null }]);
  assert.equal(r.skipped, 1);

  assert.equal(s.suggestions.length, 0);


});

test('recommendations must name an existing line', () => {
  const s = fresh();


  const { kept, dropped } = core.checkRecommendations(s, [
    { title: 'A', artist: 'B', lineId: s.lines[0].id },
    { title: 'C', artist: 'D', lineId: 'nope' },

    { title: 'A', artist: 'B', lineId: s.lines[0].id },

  ]);

  assert.equal(kept.length, 1);
  assert.equal(dropped, 2);

});


test('replay recommender gives five tracks, one per line, none already heard', () => {
  const s = fresh();
  const tracks = pickTracks(s.lines, History);

  assert.equal(tracks.length, 5);
  assert.equal(new Set(tracks.map((t) => t.lineId)).size, 5);
  assert.ok(tracks.every((t) => !HISTORY.some((h) => h.title === t.title)));

});


test('limiting the ambient line removes ambient tracks', () => {
  const s = fresh();
  const line = ambientLine(s);

  assert.ok(pickTracks(s.lines, HISTORY).some((t) => t.lineId === line.id));
  core.editLine(s, line.id, 'Ambient only for sleep, not for everyday listening');
  assert.ok(isLimiting(line.text));
  const tracks = pickTracks(s.lines, HISTORY);
  assert.equal(tracks.length, 5);
  assert.ok(!tracks.some((t) => t.lineId === line.id));


});



test('scripted proposal after an edit ends in one suggestion and one block', async () => {

  const s = fresh();
  core.editLine(s, ambientLine(s).id, 'Ambient only for sleep');
  const r = core.applyModelProposals(s, await replayResponder.propose(s.lines));
  assert.equal(r.suggested, 1);
  assert.equal(r.blocked, 1);


});

test('real tracks from a pool are preferred and keep their catalogue data', () => {

  const s = fresh();
  const pools = { ukrap: [{ title: 'Real Track', artist: 'Real Artist', seedArtist: 'Dave', catalogue: { status: 'found', link: 'x' } }] };
  const tracks = pickTracks(s.lines, HISTORY, pools);
  const first = tracks.find((t) => t.title === 'Real Track');


  assert.ok(first);
  assert.equal(first.catalogue.status, 'found');
  assert.match(first.reason, /Similar to Dave/);
  assert.equal(core.checkRecommendations(s, tracks).kept[0].catalogue.status, 'found');

});



test('a pool track already in the history is not recommended', () => {
  const s = fresh();
  const pools = { ukrap: [{ title: 'Location', artist: 'Dave', seedArtist: 'Dave', catalogue: { status: 'found' } }] };
  assert.ok(!pickTracks(s.lines, HISTORY, pools).some((t) => t.title === 'Location'));
});
