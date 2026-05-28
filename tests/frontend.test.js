const test = require("node:test");
const assert = require("node:assert/strict");
const { Lexer, TokenType } = require("../src/lexer");
const ast = require("../src/ast");
const { parseSource, testOptions } = require("./helpers");

test("lexer tokenizes keywords, literals, comments, operators, and unknown symbols", () => {
  const options = testOptions();
  const lexer = new Lexer(options);
  lexer.load('global score = 10;\n// comment\nif (score >= 10 && true) { say("ok"); }\n@');
  const tokens = lexer.lex();

  assert.ok(tokens.some((token) => token.type === TokenType.GLOBAL));
  assert.ok(tokens.some((token) => token.type === TokenType.NUMBER && token.raw === "10"));
  assert.ok(tokens.some((token) => token.type === TokenType.COMPARISONOPERATOR && token.raw === ">="));
  assert.ok(tokens.some((token) => token.type === TokenType.BOOLEAN && token.raw === "true"));
  assert.ok(tokens.some((token) => token.type === TokenType.STRING && token.raw === "ok"));
  assert.equal(tokens.at(-1).type, TokenType.EOF);
  assert.equal(options.warnings.length, 1);
  assert.match(options.warnings[0], /unknown char/);
});

test("parser builds AST for declarations, sprites, events, procedures, lists, and control flow", () => {
  const source = `
    global list = [1, 2];

    func warp stepBy(amount) {
      repeat(amount) {
        moveSteps(list[0]);
      }
    }

    sprite Player {
      local speed = 3;

      whenFlagClicked() {
        if (!(speed == 0)) {
          forever {
            stepBy(speed);
          }
        } else {
          say('stopped');
        }
      }
    }
  `;
  const program = parseSource(source);

  assert.ok(program instanceof ast.Program);
  assert.ok(program.body[0] instanceof ast.VariableDeclaration);
  assert.ok(program.body[1] instanceof ast.FunctionDeclaration);
  assert.equal(program.body[1].warp, true);
  assert.ok(program.body[2] instanceof ast.SpriteDeclaration);
  const event = program.body[2].body.find((node) => node instanceof ast.EventHook);
  assert.ok(event.block.body[0] instanceof ast.IfStatement);
  assert.ok(event.block.body[0].pass.body[0] instanceof ast.ForeverStatement);
});

test("parser reports useful syntax errors", () => {
  assert.throws(() => parseSource("local x = 1;"), /did you mean 'global'/);
  assert.throws(() => parseSource("global = 1;"), /expected IDENT/);
  assert.throws(() => parseSource("global x = ;"), /unexpected token/);
});
