const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { compileWithDriver, readProjectFromSb3 } = require("./helpers");

const examples = [
  {
    name: "hello-stage",
    files: ["examples/hello-stage.sbc"],
    entrypoint: "examples/hello-stage.sbc",
    expectedTargets: ["Stage"],
  },
  {
    name: "sprites-broadcast",
    files: ["examples/sprites-broadcast.sbc"],
    entrypoint: "examples/sprites-broadcast.sbc",
    expectedTargets: ["Stage", "Player", "Announcer"],
  },
  {
    name: "lists-and-procedures",
    files: ["examples/lists-and-procedures.sbc"],
    entrypoint: "examples/lists-and-procedures.sbc",
    expectedTargets: ["Stage"],
  },
  {
    name: "preprocessor-demo",
    files: ["examples/preprocessor-demo.sbc", "examples/shared.sbc"],
    entrypoint: "examples/preprocessor-demo.sbc",
    expectedTargets: ["Stage"],
  },
];

for (const example of examples) {
  test(`example project compiles: ${example.name}`, async () => {
    const files = {};
    for (const filename of example.files) {
      files[filename] = await fs.readFile(path.join(process.cwd(), filename));
    }

    const outFile = `${example.name}.sb3`;
    const adapter = await compileWithDriver(files, example.entrypoint, { outFile });
    assert.equal(await adapter.exists(outFile), true);

    const project = await readProjectFromSb3(await adapter.read(outFile));
    assert.deepEqual(
      project.targets.map((target) => target.name),
      example.expectedTargets,
    );
    for (const target of project.targets) {
      assert.ok(Object.keys(target.blocks).length > 0, `${target.name} should have blocks`);
    }
  });
}
