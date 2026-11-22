import test from "node:test";
import assert from "node:assert/strict";
import * as FX from "../js/fx.mjs";

test("il modulo si importa in Node senza DOM e senza audio", () => {
  assert.equal(typeof FX.play, "function");
  assert.equal(FX.audioState(), "none");
  assert.equal(FX.rain === undefined, false);
});

test("play registra il suono anche senza AudioContext e non lancia", () => {
  FX.play("ok");
  FX.play("coin");
  FX.play("inesistente");
  assert.deepEqual(FX.soundLog.slice(-3), ["ok", "coin", "inesistente"]);
});

test("setMuted / isMuted funzionano anche senza localStorage", () => {
  FX.setMuted(true);
  assert.equal(FX.isMuted(), true);
  FX.setMuted(false);
  assert.equal(FX.isMuted(), false);
});

test("coinCount cresce con la serie, con un tetto", () => {
  assert.equal(FX.coinCount(1), 12);
  assert.ok(FX.coinCount(2) > FX.coinCount(1));
  assert.ok(FX.coinCount(3) > FX.coinCount(2));
  assert.equal(FX.coinCount(50), FX.coinCount(7));
  assert.ok(FX.coinCount(0) === FX.coinCount(1));
  assert.ok(FX.BIG_WIN_COINS > FX.coinCount(50));
});

test("countSteps: monotono, finisce esattamente sul valore finale", () => {
  for (const [from, to] of [[0, 100], [200, 300], [1250, 1350], [5, 5]]) {
    const st = FX.countSteps(from, to);
    assert.equal(st.at(-1), to);
    for (let i = 1; i < st.length; i++) assert.ok(st[i] >= st[i - 1]);
    assert.ok(st[0] >= from && st[0] <= to);
  }
  assert.equal(FX.countSteps(0, 100, 5).length, 5);
});

test("melodie: note con frequenza e durata valide", () => {
  for (const [name, notes] of Object.entries(FX.MELODIES)) {
    assert.ok(notes.length >= 2, name);
    for (const [f, d] of notes) assert.ok(f > 100 && f < 4000 && d > 0.03 && d < 0.5, `${name} ${f} ${d}`);
  }
  assert.ok(FX.MELODIES.win.length > FX.MELODIES.ok.length);
});
