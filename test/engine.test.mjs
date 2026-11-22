import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.mjs";

test("conversioni base: compiti del prof", () => {
  assert.equal(E.toBin(23), "10111");
  assert.equal(E.toBin(32), "100000");
  assert.equal(E.toBin(77), "1001101");
  assert.equal(E.toBin(99), "1100011");
  assert.equal(E.toBin(132), "10000100");
  assert.equal(E.toBin(155), "10011011"); // libro p.20 es.3
  assert.equal(E.fromBin("10001101"), 141); // libro p.20 es.2
  assert.equal(E.toBin(24), "11000"); // libro p.20 "un esercizio al volo"
  assert.equal(E.bitsNeeded(1000), 10); // libro p.20 es.4
});

test("round trip toBase/fromBase per tutte le basi", () => {
  for (const base of [2, 8, 16]) {
    for (let n = 0; n < 2000; n++) assert.equal(E.fromBase(E.toBase(n, base), base), n);
  }
});

test("fromBase rifiuta cifre non valide", () => {
  assert.ok(Number.isNaN(E.fromBase("102", 2)));
  assert.ok(Number.isNaN(E.fromBase("9", 8)));
  assert.ok(Number.isNaN(E.fromBase("", 2)));
});

test("passaggi: pesi e divisioni ricostruiscono lo stesso binario", () => {
  for (let n = 1; n < 500; n++) {
    assert.equal(E.weightSteps(n).map((s) => s.bit).join(""), E.toBin(n));
    assert.equal(E.divisionSteps(n).map((s) => s.remainder).reverse().join(""), E.toBin(n));
  }
});

test("binToDecSteps: 11010 = 26", () => {
  const r = E.binToDecSteps("11010");
  assert.equal(r.total, 26);
  assert.deepEqual(r.parts.map((p) => p.value), [16, 8, 2]);
});

test("operazioni dei compiti, verificate in decimale", () => {
  const add = [[23, 7], [12, 8], [33, 12], [41, 29], [27, 19], [61, 18], [49, 34], [56, 37]];
  for (const [a, b] of add) assert.equal(E.fromBin(E.addBinary(E.toBin(a), E.toBin(b)).result), a + b);
  const sub = [[45, 14], [16, 1], [64, 13], [256, 105], [64, 27], [256, 87]];
  for (const [a, b] of sub) assert.equal(E.fromBin(E.subBinary(E.toBin(a), E.toBin(b)).result), a - b);
  const mul = [[6, 5], [11, 7], [15, 15], [15, 13], [14, 15], [13, 15]];
  for (const [a, b] of mul) assert.equal(E.fromBin(E.mulBinary(E.toBin(a), E.toBin(b)).result), a * b);
});

test("divisioni dei compiti (anche con resto)", () => {
  assert.deepEqual(E.divBinary("111100", "110"), { quotient: "1010", remainder: "0" });
  assert.deepEqual(E.divBinary("1001", "100"), { quotient: "10", remainder: "1" });
  assert.deepEqual(E.divBinary("11001", "1000"), { quotient: "11", remainder: "1" });
  assert.deepEqual(E.divBinary(E.toBin(19), E.toBin(8)), { quotient: "10", remainder: "11" });
  assert.deepEqual(E.divBinary(E.toBin(26), E.toBin(3)), { quotient: "1000", remainder: "10" });
  assert.throws(() => E.divBinary("1", "0"));
});

test("addBinary: riporti e lunghezze diverse", () => {
  assert.equal(E.addBinary("1", "1").result, "10");
  assert.equal(E.addBinary("111", "1").result, "1000");
  assert.equal(E.addBinary("0", "0").result, "0");
});

test("ottale/esadecimale dai compiti", () => {
  assert.equal(E.groupsToBin("347", 8).bin, "11100111");
  assert.equal(E.groupsToBin("625", 8).bin, "110010101");
  assert.equal(E.groupsToBin("562", 8).bin, "101110010");
  assert.equal(E.groupsToBin("BA0", 16).bin, "101110100000");
  assert.equal(E.binToGroups("11001111", 8).map((g) => g.digit).join(""), "317");
  assert.equal(E.binToGroups("1011101", 16).map((g) => g.digit).join(""), "5D");
  // 351 in base 8 -> binario e esadecimale
  const bin351 = E.groupsToBin("351", 8).bin;
  assert.equal(bin351, "11101001");
  assert.equal(E.binToGroups(bin351, 16).map((g) => g.digit).join(""), "E9");
});

test("virgola: 12,3125 e 1011,011", () => {
  assert.equal(E.decimalToBinaryPoint("12,3125"), "1100.0101");
  assert.equal(E.binaryPointToDecimal("1011,011"), 11.375);
  assert.equal(E.decimalToBinaryPoint("0.5"), "0.1");
  assert.equal(E.decimalToBinaryPoint("7"), "111");
  assert.equal(E.fracToBin(0.1, 8).exact, false); // periodica: si ferma a maxBits
});

test("ordinamento compito 9: 128(10), 3A(16), 10110(2), 56(8)", () => {
  const vals = [
    ["128", E.fromBase("128", 10)],
    ["3A", E.fromBase("3A", 16)],
    ["10110", E.fromBin("10110")],
    ["56", E.fromBase("56", 8)],
  ];
  assert.deepEqual(vals.map((v) => v[1]), [128, 58, 22, 46]);
  assert.deepEqual(vals.sort((a, b) => a[1] - b[1]).map((v) => v[0]), ["10110", "56", "3A", "128"]);
});

test("normalizzazione risposte", () => {
  assert.ok(E.sameNumberString(" 0101 ", "101"));
  assert.ok(E.sameNumberString("1100,0101", "1100.0101"));
  assert.ok(E.sameNumberString("ba0", "BA0"));
  assert.ok(!E.sameNumberString("101", "100"));
});
