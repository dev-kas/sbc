const test = require("node:test");
const assert = require("node:assert/strict");
const { enumify, indexToLineCol, sprintf, merge } = require("../src/utils");
const { Generator, generate } = require("../src/id");
const scratch = require("../src/scratch");
const api = require("../src/index");

test("enumify creates frozen string enums and rejects invalid input", () => {
  const values = enumify(["ONE", "TWO"]);
  assert.deepEqual(values, { ONE: "ONE", TWO: "TWO" });
  assert.ok(Object.isFrozen(values));
  assert.throws(() => enumify("ONE"), /Array/);
  assert.throws(() => enumify(["ONE", "ONE"]), /duplicate/);
  assert.throws(() => enumify(["ONE", 2]), /Strings/);
});

test("indexToLineCol maps character offsets to one-based source positions", () => {
  const source = "one\ntwo\nthree";
  assert.deepEqual(indexToLineCol(source, 0), { line: 1, col: 1 });
  assert.deepEqual(indexToLineCol(source, 4), { line: 2, col: 1 });
  assert.deepEqual(indexToLineCol(source, source.length), { line: 3, col: 6 });
  assert.throws(() => indexToLineCol(source, -1), /out of range/);
});

test("sprintf handles common format specifiers, width, precision, and literals", () => {
  assert.equal(sprintf("%s %d %.2f %%", "v", 12.9, 3.14159), "v 12 3.14 %");
  assert.equal(sprintf("%04x", 10), "000a");
  assert.equal(sprintf("%-5s!", "a"), "a    !");
  assert.equal(sprintf("%+d", 5), "+5");
  assert.equal(sprintf("%X %b %o %c %j", 255, 5, 8, 65, { a: 1 }), 'FF 101 10 A {"a":1}');
  assert.throws(() => sprintf("%s %s", "only one"), /too few/);
});

test("merge recursively merges plain objects without mutating the base object", () => {
  const base = { a: 1, nested: { x: 1, y: 2 }, arr: [1] };
  const result = merge(base, { nested: { y: 3 }, arr: [2], b: 2 });
  assert.deepEqual(result, { a: 1, nested: { x: 1, y: 3 }, arr: [2], b: 2 });
  assert.deepEqual(base, { a: 1, nested: { x: 1, y: 2 }, arr: [1] });
});

test("id generators produce stable prefixed base36 sequences", () => {
  const gen = new Generator();
  assert.equal(gen.generate("x"), "x-1");
  assert.equal(gen.generate("x"), "x-2");
  assert.match(generate("global"), /^global-[0-9a-z]+$/);
});

test("scratch model classes expose Scratch-compatible defaults", () => {
  const project = new scratch.Project();
  const target = new scratch.Target();
  const costume = new scratch.Costume();
  const sound = new scratch.Sound();
  const block = new scratch.Block();
  const monitor = new scratch.Monitor();

  assert.deepEqual(project.extensions, []);
  assert.equal(project.meta.semver, "3.0.0");
  assert.equal(target.size, 100);
  assert.equal(target.visible, true);
  assert.equal(costume.dataFormat, "svg");
  assert.equal(sound.dataFormat, "wav");
  assert.equal(block.topLevel, false);
  assert.equal(monitor.visible, true);
  assert.equal(scratch.InputStatus.SHADOW, 1);
  assert.equal(scratch.MathValues.STRING, 10);
});

test("public index exports the compiler surface", () => {
  assert.equal(api.version, require("../package.json").version);
  assert.equal(typeof api.lexer.Lexer, "function");
  assert.equal(typeof api.parser.Parser, "function");
  assert.equal(typeof api.compiler.Compiler, "function");
  assert.equal(api.isa.motion.moveSteps.opcode, "motion_movesteps");
});
