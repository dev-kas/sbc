const { Lexer } = require("./lexer");
const { Parser } = require("./parser");
const { Analyzer } = require("./analyzer");
const { Compiler } = require("./compiler");

let code = `
global counter = 0;

sprite Player {
    local score = 10;

    whenFlagClicked {
    	local test = 5;
        forever {
            local step = 1;
            counter = counter + step;
            looks.say(counter);
	    step = step + 1;
        }
    }
}
`;

code = code.trim();
console.log("CODE:");
console.log(code.trim());

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
