import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../js/collection.mjs";
import { CHAPTERS } from "../js/progress.mjs";

const chs = (...passed) => CHAPTERS.map((c) => ({ id: c.id, everPassed: passed.includes(c.id) }));

test("ogni capitolo sblocca esattamente un oggetto, l'esame ne sblocca altri due", () => {
  for (const ch of CHAPTERS) assert.equal(C.ITEMS.filter((i) => i.chapter === ch.id).length, 1, ch.id);
  assert.equal(C.ITEMS.filter((i) => i.exam).length, 2);
  assert.equal(new Set(C.ITEMS.map((i) => i.id)).size, C.ITEMS.length);
  for (const i of C.ITEMS) { assert.ok(C.TYPES[i.type] && i.joke && i.name); assert.match(C.artFor(i), /^<svg/); }
  assert.deepEqual(new Set(C.ITEMS.map((i) => i.type)), new Set(["car", "tattoo", "outfit"]));
});

test("sblocchi: capitoli superati almeno una volta e voto dell'esame", () => {
  assert.deepEqual(C.unlockedIds(chs()), []);
  assert.deepEqual(C.unlockedIds(chs("warm", "ops")), ["tat-ruote", "auto-torre"]);
  assert.ok(C.unlockedIds(chs(), [{ grade: 6 }]).includes("occhiali"));
  assert.ok(!C.unlockedIds(chs(), [{ grade: 5.5 }]).includes("occhiali"));
  const rich = C.unlockedIds(chs(...CHAPTERS.map((c) => c.id)), [{ grade: 4 }, { grade: 9.5 }]);
  assert.equal(rich.length, C.ITEMS.length);
});

test("novità e come si sblocca", () => {
  assert.deepEqual(C.newlyUnlocked(["tat-ruote"], ["tat-ruote", "giubbotto"]).map((i) => i.id), ["giubbotto"]);
  assert.match(C.howToUnlock(C.itemById("auto-torre"), CHAPTERS), /capitolo 4.*Operazioni/);
  assert.match(C.howToUnlock(C.itemById("tat-ruote"), CHAPTERS), /riscaldamento/);
  assert.match(C.howToUnlock(C.itemById("auto-oro"), CHAPTERS), /almeno 9/);
});
