const test = require("node:test");
const assert = require("node:assert/strict");
const { Preprocessor } = require("../src/preprocessor");
const { createMemoryFs, testOptions } = require("./helpers");

test("preprocessor expands object and function macros while preserving strings and comments", async () => {
  const fs = await createMemoryFs({});
  const options = testOptions();
  const pre = new Preprocessor(fs, options);
  const output = await pre.process(
    [
      "#define VALUE 42",
      "#define DOUBLE(x) ((x) * 2)",
      "global a = VALUE;",
      "global b = DOUBLE(5);",
      'global text = "VALUE"; // VALUE should not expand in this comment',
    ].join("\n"),
    "main.sbc",
  );

  assert.match(output, /global a = 42;/);
  assert.match(output, /global b = \(\(5\) \* 2\);/);
  assert.match(output, /global text = "VALUE"; \/\/ VALUE should not expand/);
});

test("preprocessor handles includes, relative paths, and pragma once", async () => {
  const fs = await createMemoryFs({
    "src/main.sbc": Buffer.from('#include "defs.sbc"\n#include "defs.sbc"\nglobal value = VALUE;\n'),
    "src/defs.sbc": Buffer.from("#pragma once\n#define VALUE 7\n"),
  });
  const pre = new Preprocessor(fs, testOptions());
  const output = await pre.process(await fs.read("src/main.sbc", "utf8"), "src/main.sbc");

  assert.equal((output.match(/#pragma once/g) || []).length, 0);
  assert.match(output, /global value = 7;/);
});

test("preprocessor evaluates conditional directives", async () => {
  const fs = await createMemoryFs({});
  const pre = new Preprocessor(fs, testOptions());
  const output = await pre.process(
    [
      "#define FEATURE 1",
      "#ifdef FEATURE",
      "global enabled = true;",
      "#else",
      "global enabled = false;",
      "#endif",
      "#ifndef MISSING",
      "global fallback = 1;",
      "#endif",
      "#if defined(FEATURE) && FEATURE",
      "global checked = 1;",
      "#elif 1",
      "global checked = 2;",
      "#endif",
    ].join("\n"),
    "main.sbc",
  );

  assert.match(output, /global enabled = true;/);
  assert.doesNotMatch(output, /global enabled = false;/);
  assert.match(output, /global fallback = 1;/);
  assert.match(output, /global checked = 1;/);
  assert.doesNotMatch(output, /global checked = 2;/);
});

test("preprocessor supports undef, inactive branches, line continuations, and path normalization", async () => {
  const fs = await createMemoryFs({});
  const pre = new Preprocessor(fs, testOptions());
  const output = await pre.process(
    [
      "#define OLD 1",
      "#undef OLD",
      "#ifdef OLD",
      "global old = true;",
      "#else",
      "global old = false;",
      "#endif",
      "#if 0",
      "#define SKIPPED 1",
      "global skipped = SKIPPED;",
      "#endif",
      "#define SUM(a, b) a + \\",
      "b",
      "global total = SUM(1, 2);",
    ].join("\n"),
    "main.sbc",
  );

  assert.match(output, /global old = false;/);
  assert.doesNotMatch(output, /global old = true;/);
  assert.doesNotMatch(output, /global skipped/);
  assert.match(output, /global total = 1 \+ 2;/);
  assert.equal(pre.resolvePath("src/nested/main.sbc", "../shared/defs.sbc"), "src/shared/defs.sbc");
  assert.equal(pre.resolvePath("main.sbc", "../defs.sbc"), "../defs.sbc");
});

test("preprocessor reports warnings and fatal errors through separate handlers", async () => {
  const fs = await createMemoryFs({});
  const options = testOptions();
  const pre = new Preprocessor(fs, options);

  await pre.process("#unknown thing\n", "main.sbc");
  assert.equal(options.warnings.length, 1);
  assert.match(options.warnings[0], /unknown directive/);

  await assert.rejects(
    () => pre.process('#include "missing.sbc"\n', "main.sbc"),
    /cannot find include file/,
  );
  await assert.rejects(() => pre.process("#error stop\n", "main.sbc"), /#error stop/);
  await assert.rejects(() => pre.process("#if (\n#endif\n", "main.sbc"), /invalid expression/);
  await assert.rejects(() => pre.process("#if 1\n", "main.sbc"), /unterminated #if/);
});
