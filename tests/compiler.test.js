const test = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeSource,
  compileSource,
  compileWithDriver,
  readProjectFromSb3,
  testOptions,
} = require("./helpers");

test("analyzer tracks stage and sprite state, procedures, lists, and unreachable code", () => {
  const source = `
    global score = 0;
    global names = ["Ada", "Grace"];

    func addScore(amount) {
      score = score + amount;
    }

    sprite Player {
      local speed = 10;
      whenFlagClicked() {
        addScore(speed);
        names.push("Katherine");
      }
    }
  `;
  const analyzer = analyzeSource(source);

  assert.ok(analyzer.targets.has("Stage"));
  assert.ok(analyzer.targets.has("Player"));
  assert.ok(analyzer.procedures.has("addScore"));
  assert.equal(analyzer.targets.get("Stage").variables[0].name, "score");
  assert.equal(analyzer.targets.get("Stage").lists[0].name, "names");
  assert.equal(analyzer.targets.get("Player").variables[0].name, "speed");

  assert.throws(
    () =>
      analyzeSource(`
        whenFlagClicked() {
          forever { wait(1); }
          say("unreachable");
        }
      `),
    /unreachable code/,
  );
});

test("compiler emits Scratch project JSON for control flow, broadcasts, lists, and procedures", () => {
  const project = compileSource(`
    global score = 0;
    global names = ["Ada", "Grace"];

    whenFlagClicked() {
      broadcast("start");
    }

    func warp addScore(amount) {
      score = score + amount;
    }

    sprite Player {
      local speed = 10;

      whenBroadcastReceived("start") {
        if (touchingObject("edge")) {
          turnRight(15);
        } else {
          moveSteps(speed);
        }

        repeat(2) {
          addScore(names.length());
        }
      }
    }
  `);

  assert.equal(project.targets.length, 2);
  const stage = project.targets.find((target) => target.name === "Stage");
  const player = project.targets.find((target) => target.name === "Player");
  assert.ok(stage);
  assert.ok(player);
  assert.deepEqual(Object.values(stage.broadcasts), ["start"]);
  assert.equal(Object.keys(stage.variables).length, 1);
  assert.equal(Object.keys(stage.lists).length, 1);

  const opcodes = Object.values(player.blocks).map((block) => block.opcode);
  assert.ok(opcodes.includes("event_whenbroadcastreceived"));
  assert.ok(opcodes.includes("control_if_else"));
  assert.ok(opcodes.includes("control_repeat"));
  assert.ok(opcodes.includes("procedures_call"));
  assert.ok(opcodes.includes("sensing_touchingobjectmenu"));
});

test("compiler covers repeat-until, unary expressions, sensing_of mutation, stop mutation, assets, and dynamic list indexes", () => {
  const project = compileSource(
    `
      global i = 0;
      global values = [1, 2, 3];

      whenFlagClicked() {
        repeat until(!(i < 3)) {
          say(values[i]);
          i = i + 1;
        }

        say(of("x position", "Stage"));
        stop("all");
      }
    `,
    "features.sbc",
    {
      ...testOptions(),
      assets: [
        {
          spriteName: "Stage",
          name: "Backdrop",
          md5: "abc123",
          ext: "png",
          internalFilename: "abc123.png",
        },
        {
          spriteName: "Stage",
          name: "Pop",
          md5: "def456",
          ext: "wav",
          internalFilename: "def456.wav",
        },
      ],
    },
  );

  const stage = project.targets[0];
  assert.equal(stage.costumes[0].assetId, "abc123");
  assert.equal(stage.sounds[0].assetId, "def456");

  const blocks = Object.values(stage.blocks);
  assert.ok(blocks.some((block) => block.opcode === "control_repeat_until"));
  assert.ok(blocks.some((block) => block.opcode === "operator_not"));
  assert.ok(blocks.some((block) => block.opcode === "sensing_of" && block.mutation.string === "x position"));
  assert.ok(blocks.some((block) => block.opcode === "control_stop" && block.mutation.hasnext === "false"));
  assert.ok(blocks.some((block) => block.opcode === "data_itemoflist"));
});

test("compiler driver can dump intermediate stages and write SB3 archives", async () => {
  const files = {
    "main.sbc": Buffer.from(`
      #define MESSAGE "driver"
      global score = 1;
      whenFlagClicked() {
        say(MESSAGE);
      }
    `),
  };

  const preprocessFs = await compileWithDriver(files, "main.sbc", { preprocessOnly: true });
  assert.equal(await preprocessFs.exists("main.sb3"), false);

  const compileFs = await compileWithDriver(files, "main.sbc", {
    outFile: "out.sb3",
    assets: [],
  });
  assert.equal(await compileFs.exists("out.sb3"), true);
  const project = await readProjectFromSb3(await compileFs.read("out.sb3"));
  assert.equal(project.targets.length, 1);
  assert.equal(project.targets[0].name, "Stage");
});

test("compiler driver supports every dump stage, skipPreprocess, default output names, and asset packaging warnings", async () => {
  const source = Buffer.from("global score = 1;\nwhenFlagClicked() { say(\"hi\"); }\n");
  const files = { "main.sbc": source };

  for (const optionName of ["lexOnly", "parseOnly", "analyzeOnly", "compileOnly"]) {
    const adapter = await compileWithDriver(files, "main.sbc", { [optionName]: true });
    assert.equal(await adapter.exists("main.sb3"), false);
  }

  const skipped = await compileWithDriver(
    { "main.sbc": Buffer.from("#define VALUE 1\nglobal score = VALUE;\n") },
    "main.sbc",
    { skipPreprocess: true },
  );
  assert.equal(await skipped.exists("main.sb3"), false);

  const packaged = await compileWithDriver(files, "main.sbc", {
    assets: [
      {
        spriteName: "Stage",
        name: "Missing",
        md5: "missing",
        ext: "png",
        internalFilename: "missing.png",
      },
    ],
  });
  assert.equal(await packaged.exists("main.sb3"), true);
});

test("analyzer validates unknown aliases and missing required arguments", () => {
  assert.throws(() => analyzeSource("whenFlagClicked() { doesNotExist(); }"), /unknown opcode alias/);
  assert.throws(() => analyzeSource("whenFlagClicked() { moveSteps(); }"), /requires 1 arguments/);
});

test("werror promotes warnings from compiler driver step options", async () => {
  const fs = await compileWithDriver(
    { "main.sbc": Buffer.from("#unknown\nwhenFlagClicked() {}\n") },
    "main.sbc",
    { werror: true },
  );
  assert.equal(await fs.exists("main.sb3"), false);
});
