const { Lexer } = require("./lexer");
const { Parser } = require("./parser");
const { Analyzer } = require("./analyzer");
const { Compiler } = require("./compiler");
const { Preprocessor } = require("./preprocessor");

const { MemoryAdapter } = require("fs-adapters");

let code = `
#include "stage.txt"

global counter = 0;

global didUsePreprocessorHere = __PREPROCESSOR__;

sprite Player {
	local score = 10;

	whenFlagClicked {
		local test = 5;

		sayForSecs(didUsePreprocessorHere, 1);

		forever {
			local step = 1;
			counter = counter + step;
			say(gravity);
			step = step + 1;
		}
	}
}
`;

console.log("CODE:");
console.log(code);

const preprocessor = new Preprocessor(
  new MemoryAdapter({
    "stage.txt": `
		#pragma once
		#include "globals.txt"
		whenFlagClicked {
			say("i am stage");
		}
	`,
    "globals.txt": `
		#pragma once
		global gravity = -9.8;
	`,
  }),
);

preprocessor.process(code, "main").then((code) => {
  console.log("PREPROCESSED");
  console.log(code);

  const lexer = new Lexer();
  lexer.load(code);
  const tokens = lexer.lex();
  console.log("TOKENS:");
  console.dir(tokens, { depth: null });

  const parser = new Parser();
  const ast = parser.parse(tokens, "main", code);
  console.log("AST:");
  console.dir(ast, { depth: null });

  const analyzer = new Analyzer();
  analyzer.analyze(code, ast);
  console.log("ANALYSIS:");
  console.dir(analyzer, { depth: null });

  const compiler = new Compiler();
  const compiled = compiler.compile(analyzer);

  console.log("COMPILED:");
  console.log(JSON.stringify(compiled));
});
