# sbc

`sbc` builds Scratch 3 (`.sb3`) projects from text-based source files.

It can be used in two ways:

- As a CLI compiler with `npx @dev-kas/sbc` or `npm install @dev-kas/sbc -g`.
- As a library with `npm install @dev-kas/sbc` and `require("@dev-kas/sbc")`.

The compiler pipeline is:

```text
source -> preprocessor -> lexer -> parser -> analyzer -> compiler -> .sb3
```

## Installation

Run without installing globally:

```sh
npx @dev-kas/sbc main.sbc
```

Install the CLI globally:

```sh
npm install @dev-kas/sbc -g
sbc main.sbc
```

Install as a project dependency:

```sh
npm install @dev-kas/sbc
```

## CLI Usage

Compile a source file to `main.sb3`:

```sh
sbc main.sbc
```

Write to a specific output path:

```sh
sbc main.sbc -o game.sb3
```

Pass multiple source files. The first file is the main entrypoint. Additional
files are made available to the virtual filesystem for `#include`.

```sh
sbc main.sbc shared.sbc sprites/player.sbc
```

Stop after a pipeline stage:

```sh
sbc main.sbc -E
sbc main.sbc --lex-only
sbc main.sbc --parse-only
sbc main.sbc --analyze-only
sbc main.sbc -c
```

Options:

| Option | Description |
| --- | --- |
| `-o, --output <file>` | Write output to a specific file. |
| `-E` | Stop after preprocessing and print the preprocessed source. |
| `--lex-only` | Stop after lexing and print tokens. |
| `--parse-only` | Stop after parsing and print the AST. |
| `--analyze-only` | Stop after analysis and print analyzer state. |
| `-c` | Compile to Scratch project JSON only; do not create an `.sb3` zip. |
| `--no-preprocess` | Skip the preprocessor. |
| `--werror` | Treat warnings as errors. |
| `-a, --asset <spec>` | Add a costume or sound asset. Can be repeated. |

Asset specs use this format:

```text
spritename:path/to/file:assetname
```

Examples:

```sh
sbc main.sbc \
  -a Stage:assets/backdrop.svg:Backdrop \
  -a Player:assets/player.png:Player \
  -a Player:assets/jump.wav:Jump
```

The compiler packages image assets as costumes and audio assets as sounds. Image
extensions currently recognized as costumes are `png`, `svg`, `jpeg`, `jpg`,
`bmp`, and `gif`. Audio extensions currently recognized as sounds are `wav`,
`wave`, and `mp3`.

## Quick Example

```js
global score = 0;
global messages = ["hello", "scratch"];

whenFlagClicked() {
  say("Starting!");
  broadcast("started");
}

func warp addScore(amount) {
  score = score + amount;
}

sprite Player {
  local speed = 10;

  whenFlagClicked() {
    forever {
      moveSteps(speed);

      if (touchingObject("edge")) {
        turnRight(15);
      }
    }
  }

  whenBroadcastReceived("started") {
    addScore(1);
    messages.push("player ready");
  }
}
```

## Language Overview

Statements usually end with semicolons. Block statements such as `if`,
`forever`, and `repeat` do not.

```js
global score = 0;

whenFlagClicked() {
  score = score + 1;
  say("Score changed");
}
```

### Comments

Line comments use `//`.

```js
// This is ignored by the lexer.
global lives = 3;
```

### Values

Supported literal values:

```js
global n = 123;
global text = "hello";
global yes = true;
global no = false;
global list = [1, "two", true];
```

Strings can use single or double quotes.

### Variables

Use `global` for Stage-level variables and `local` for variables scoped to the
current block or sprite.

```js
global score = 0;

whenFlagClicked() {
  local stepSize = 10;
  moveSteps(stepSize);
}
```

At the top level, only `global` declarations are allowed. Use `local` inside
event hooks, functions, sprites, and nested blocks.

Inside a sprite, `local` variables are sprite-local. `global` variables declared
inside a sprite are still placed on the Stage.

### Assignment

```js
global score = 0;

whenFlagClicked() {
  score = score + 1;
}
```

Assignments compile to Scratch `data_setvariableto` blocks.

### Expressions

Arithmetic:

```js
global value = 1 + 2 * 3;
global negative = -value;
```

Comparisons and logic:

```js
global ready = true;

whenFlagClicked() {
  if (ready && score >= 10) {
    say("ready");
  }
}
```

Supported operators:

| Kind | Operators |
| --- | --- |
| Arithmetic | `+`, `-`, `*`, `/` |
| Comparison | `>`, `<`, `>=`, `<=`, `==`, `!=` |
| Logic | `&&`, `||`, `!` |

Constant expressions are folded during analysis when possible.

### Event Hooks

Event hooks are top-level or sprite-level blocks that compile to Scratch hat
blocks.

```js
whenFlagClicked() {
  say("green flag");
}

whenKeyPressed("space") {
  say("space");
}

whenBroadcastReceived("message") {
  say("received");
}
```

Top-level event hooks belong to the Stage. Event hooks inside `sprite` blocks
belong to that sprite.

### Sprites

Use `sprite Name { ... }` to create a Scratch sprite target.

```js
sprite Player {
  local speed = 10;

  whenFlagClicked() {
    moveSteps(speed);
  }
}
```

The Stage target is always named `Stage`.

### Control Flow

`if`:

```js
if (score > 10) {
  say("high score");
}
```

`if` / `else`:

```js
if (score > 10) {
  say("high score");
} else {
  say("keep going");
}
```

`forever`:

```js
forever {
  moveSteps(10);
}
```

`repeat`:

```js
repeat(10) {
  turnRight(36);
}
```

`repeat until`:

```js
repeat until(touchingObject("edge")) {
  moveSteps(5);
}
```

The analyzer reports unreachable code after terminating instructions such as
`forever`, `stop(...)`, and `deleteThisClone()`.

### Lists

Array literals create Scratch lists:

```js
global names = ["Ada", "Grace", "Katherine"];
```

Indexing is zero-based in source code and converted to Scratch's one-based list
indexes during compilation:

```js
say(names[0]);
```

List helper methods:

```js
names.add("Dorothy");
names.push("Mary");
names.remove(0);
names.delete(1);
say(names.length());
```

### Custom Procedures

Use `func` to define custom Scratch blocks:

```js
func addScore(amount) {
  score = score + amount;
}

whenFlagClicked() {
  addScore(10);
}
```

Use `func warp` for a procedure that runs without screen refresh:

```js
func warp drawFast(size) {
  repeat(size) {
    moveSteps(1);
  }
}
```

Procedure arguments are available as reporter inputs inside the procedure body.

### Calling Scratch Blocks

Scratch blocks are called by friendly aliases. For example:

```js
moveSteps(10);
turnRight(15);
say("hello");
wait(1);
```

Aliases can be unqualified when unique, or namespace-qualified:

```js
motion.moveSteps(10);
looks.say("hello");
control.wait(1);
```

## Scratch Alias Reference

The aliases below are the names the analyzer can resolve to Scratch opcodes.
Many are pleasant to call directly. A few data, menu, and effect blocks are
thin wrappers around Scratch field/input metadata, so prefer the higher-level
language features shown above when they exist.

### Events

```js
whenFlagClicked()
whenKeyPressed(key)
whenStageClicked()
whenThisSpriteClicked()
whenBackdropSwitchesTo(backdrop)
whenGreaterThan(menu, value)
whenBroadcastReceived(name)
broadcast(name)
broadcastAndWait(name)
```

### Motion

```js
moveSteps(steps)
turnRight(degrees)
turnLeft(degrees)
goTo(to)
goToXY(x, y)
glideTo(seconds, to)
glideSecsToXY(seconds, x, y)
pointInDirection(direction)
pointTowards(target)
changeXBy(dx)
setX(x)
changeYBy(dy)
setY(y)
ifOnEdgeBounce()
setRotationStyle(style)
xPosition
yPosition
direction
```

Reporter aliases such as `xPosition`, `yPosition`, and `direction` can be used
as expressions:

```js
say(xPosition);
```

### Looks

```js
sayForSecs(message, seconds)
say(message)
thinkForSecs(message, seconds)
think(message)
switchCostumeTo(costume)
nextCostume()
switchBackdropTo(backdrop)
switchBackdropToAndWait(backdrop)
nextBackdrop()
changeSizeBy(change)
setSizeTo(size)
changeEffectBy(...)
setEffectTo(...)
clearGraphicEffects()
show()
hide()
goToFrontBack(...)
goForwardBackwardLayers(...)
costumeNumberName(...)
backdropNumberName(...)
size
```

### Sound

```js
playUntilDone(sound)
play(sound)
stopAllSounds()
changeEffectBy(...)
setEffectTo(...)
clearEffects()
changeVolumeBy(volume)
setVolumeTo(volume)
volume
```

Some aliases have the same name in different namespaces, such as
`looks.changeEffectBy` and `sound.changeEffectBy`. Use namespace-qualified names
when needed.

### Control

```js
wait(seconds)
repeat(times)
forever()
if()
ifElse()
waitUntil()
repeatUntil()
stop(option)
startAsClone()
createCloneOf(target)
deleteThisClone()
```

Prefer the language syntax for `repeat`, `forever`, and `if` instead of calling
the raw aliases directly.

### Sensing

```js
touchingObject(target)
touchingColor(color)
colorIsTouchingColor(color1, color2)
distanceTo(target)
askAndWait(question)
answer
keyPressed(key)
mouseDown
mouseX
mouseY
setDragMode(mode)
loudness
timer
resetTimer()
of(property, object)
current(menu)
daysSince2000
online
username
```

Scratch magic menu values are accepted for relevant inputs:

```js
touchingObject("mouse-pointer")
touchingObject("edge")
goTo("random-position")
createCloneOf("myself")
```

These are converted to the internal Scratch values such as `_mouse_`,
`_edge_`, `_random_`, and `_myself_`.

### Operators

```js
add(a, b)
subtract(a, b)
multiply(a, b)
divide(a, b)
random(from, to)
gt(a, b)
lt(a, b)
equals(a, b)
and(a, b)
or(a, b)
not(value)
join(a, b)
letterOf(index, string)
length(string)
contains(string, substring)
mod(a, b)
round(value)
mathOp(operator, value)
```

Prefer source operators like `+`, `-`, `*`, `/`, `>`, `<`, `==`, `&&`, `||`,
and `!` where they are clearer.

### Variables and Lists

```js
variable(...)
setVariableTo(...)
changeVariableBy(...)
showVariable(...)
hideVariable(...)
listContents(...)
addToList(...)
deleteOfList(...)
deleteAllOfList(...)
insertAtList(...)
replaceItemOfList(...)
itemOfList(...)
itemNumOfList(...)
lengthOfList(...)
listContainsItem(...)
showList(...)
hideList(...)
```

Prefer declarations, assignments, list indexing, and list helper methods for
normal code.

## Preprocessor

The preprocessor is enabled by default.

Object macros:

```c
#define START_SCORE 10
global score = START_SCORE;
```

Function-like macros:

```c
#define DOUBLE(x) ((x) * 2)
global size = DOUBLE(10);
```

Includes:

```c
#include "shared.sbc"
```

When using the CLI, included files must be passed on the command line so they
are available in the compiler's virtual filesystem:

```sh
sbc main.sbc shared.sbc
```

Conditional compilation:

```c
#define DEBUG 1

#if DEBUG
whenFlagClicked() {
  say("debug");
}
#endif
```

Supported directives:

```c
#define NAME value
#define NAME(arg) value
#undef NAME
#include "file"
#pragma once
#ifdef NAME
#ifndef NAME
#if expression
#elif expression
#else
#endif
#error message
```

Unknown directives produce warnings. Fatal preprocessor errors, including
`#error` and missing includes, are reported through the compiler error handler.
Use `--werror` to promote warnings to errors.

## Library API

Install locally:

```sh
npm install @dev-kas/sbc
```

Import the package:

```js
const sbc = require("@dev-kas/sbc");
```

The package exports:

```js
{
  preprocessor,
  lexer,
  parser,
  analyzer,
  compiler,
  compilerdriver,
  utils,
  scratch,
  analysisvalue,
  ast,
  isa,
  adapters,
  version
}
```

### High-Level API: CompilerDriver

`CompilerDriver` is the easiest way to build on the compiler.

```js
const fs = require("fs/promises");
const { MemoryAdapter } = require("@dev-kas/sbc").adapters;
const { CompilerDriver } = require("@dev-kas/sbc").compilerdriver;

async function build() {
  const files = {
    "main.sbc": Buffer.from(`
      global score = 0;

      whenFlagClicked() {
        say("hello");
      }
    `),
  };

  const virtualFs = new MemoryAdapter(files);
  await virtualFs.init();

  const driver = new CompilerDriver(virtualFs, {
    outFile: "main.sb3",
  });

  await driver.compile("main.sbc");

  const sb3 = await virtualFs.read("main.sb3");
  await fs.writeFile("main.sb3", sb3);
}

build().catch(console.error);
```

Driver options:

```js
{
  skipPreprocess: false,
  preprocessOnly: false,
  lexOnly: false,
  parseOnly: false,
  analyzeOnly: false,
  compileOnly: false,
  werror: false,
  outFile: null,
  assets: []
}
```

`compileOnly: true` returns/dumps Scratch project JSON instead of writing an
`.sb3` archive.

### Structured Assets

Assets passed to the compiler should already be present in the virtual
filesystem under `internalFilename`.

```js
const assets = [
  {
    spriteName: "Player",
    name: "Player",
    md5: "file-md5-hash",
    ext: "png",
    internalFilename: "file-md5-hash.png",
  },
];
```

The CLI creates this structure automatically by reading asset files, hashing
them, and adding them to the virtual filesystem.

### Manual Pipeline API

You can run each stage yourself:

```js
const {
  preprocessor: { Preprocessor },
  lexer: { Lexer },
  parser: { Parser },
  analyzer: { Analyzer },
  compiler: { Compiler },
} = require("@dev-kas/sbc");

const options = {
  warn: (msg) => console.warn(msg),
  error: (msg) => {
    throw new Error(msg);
  },
};

async function compileSource(fs, filename) {
  let code = await fs.read(filename, "utf8");

  const pre = new Preprocessor(fs, options);
  code = await pre.process(code, filename);

  const lexer = new Lexer(options);
  lexer.load(code);
  const tokens = lexer.lex();

  const parser = new Parser(options);
  const ast = parser.parse(tokens, filename, code);

  const analyzer = new Analyzer(options);
  analyzer.analyze(code, ast);

  const compiler = new Compiler(options);
  return compiler.compile(analyzer);
}
```

### Scratch Model API

`scratch` exports constructors for Scratch project JSON structures:

```js
const { scratch } = require("@dev-kas/sbc");

const project = new scratch.Project();
const target = new scratch.Target();
const block = new scratch.Block();
```

Exports include:

```js
Project
Meta
Target
Costume
Sound
Block
Monitor
InputStatus
MathValues
```

### ISA API

`isa` exposes the alias tables used by the analyzer:

```js
const { isa } = require("@dev-kas/sbc");

console.log(isa.motion.moveSteps.opcode); // motion_movesteps
console.log(isa.events.whenFlagClicked.type); // hat
```

This is useful for tooling, editor support, autocomplete, or custom validation.

## Examples

The `examples/` directory contains small projects that exercise different parts
of the language and compiler.

| File | Demonstrates |
| --- | --- |
| `examples/hello-stage.sbc` | Stage scripts, global variables, event hooks, assignment, `join(...)`, and stage click handling. |
| `examples/sprites-broadcast.sbc` | Multiple sprites, sprite-local variables, broadcasts, motion, waits, and shared global state. |
| `examples/lists-and-procedures.sbc` | Scratch lists, zero-based list indexing, list helper methods, custom procedures, and `func warp`. |
| `examples/preprocessor-demo.sbc` | `#include`, `#pragma once`, object macros, and compiling with multiple source files. |
| `examples/shared.sbc` | Shared preprocessor definitions used by `preprocessor-demo.sbc`. |

Compile all examples into a temporary output directory:

```sh
mkdir -p /tmp/sbc-examples

sbc examples/hello-stage.sbc \
  -o /tmp/sbc-examples/hello-stage.sb3

sbc examples/sprites-broadcast.sbc \
  -o /tmp/sbc-examples/sprites-broadcast.sb3

sbc examples/lists-and-procedures.sbc \
  -o /tmp/sbc-examples/lists-and-procedures.sb3

sbc examples/preprocessor-demo.sbc examples/shared.sbc \
  -o /tmp/sbc-examples/preprocessor-demo.sb3
```

If you are working from a cloned checkout before installing the package
globally, use the built CLI directly after `npm install` and `npm run build`:

```sh
node dist/cli.js examples/hello-stage.sbc \
  -o /tmp/sbc-examples/hello-stage.sb3
```

Then open the generated `.sb3` files in Scratch.

## Best Practices

- Keep Stage-level state in `global` variables.
- Keep sprite behavior inside `sprite Name { ... }` blocks.
- Use namespace-qualified aliases when two categories expose the same name.
- Prefer language syntax for control flow instead of raw control aliases.
- Prefer source operators over operator block aliases for readable expressions.
- Use zero-based list indexes in source code; the compiler converts them for Scratch.
- Pass all include files explicitly to the CLI.
- Use `--parse-only`, `--analyze-only`, and `-c` when debugging compiler output.
- Use `--werror` in automated builds if warnings should fail the build.
- Use `func warp` only for procedures that should run without screen refresh.

## Notes and Limitations

- The current package is CommonJS.
- The current repository does not include committed tests.
- Sound asset metadata currently uses placeholder `rate` and `sampleCount`
  values during compilation.
- The CLI reads source files and assets into a virtual filesystem before
  compiling. Include files must be explicitly supplied.
- `dist/` is generated by `npm run build` and is the only directory published by
  the package.
