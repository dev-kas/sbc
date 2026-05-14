const { Lexer } = require("./lexer");
const { Parser } = require("./parser");
const { Analyzer } = require("./analyzer");
const { Compiler } = require("./compiler");
const scratch = require("./scratch");

let code = `
//----- Green flag events ---------------------------------------------------------------------------------------------
global my_variable = 0;

WhenGreenFlagClicked()
{
    Motion.TurnRight(30);
    Motion.TurnLeft(15);
    Looks.Say("Hello!", .3);
    Event.BroadcastAndWait("message1");
    my_variable += 1;
    Looks.Say(Operator.Join("my variable is ", my_variable));
}


//----- Key pressed events --------------------------------------------------------------------------------------------

WhenKeyPressed(space)
{
    my_variable = 0;
}


//----- Broadcast received events -------------------------------------------------------------------------------------

WhenBroadcastReceived("message1")
{
    Looks.Think("Hmm...", .2);
}

WhenBroadcastReceived("test )")
{
    Looks.Show();
}


//----- Orphaned blocks -----------------------------------------------------------------------------------------------

Event.Broadcast("test )");
`;

code = `
// let this be a comment
global var = "hello" + " " + "world" + 1;
local dog = 69420; // nice
local sneakyBug = true;
local test = 1+2+3;
global nice = test * 10 + test * 3/2;

WhenGreenFlagClicked() {
	// TODO...
	var = var + "lol";
	dog = dog * 696969 - 42;
	dog = dog / 420;
	sneakyBug = (((84 / 3) + (7 * 12) - (19 - 4) * 2) > (((45 + 15) / 3) * 4 - 27)) < (((9 * 11) - (64 / 8) + 5 * (3 + 2)) - 200);
}
`;

code = `
global score = 100;

WhenGreenFlagClicked() {
	local score = 0;
	local bonus = 5;

	score = score + bonus;
	score = score + 1;
}

WhenThisSpriteClicked() {
	local score = 10;
	local bonus = 2;

	score = score + bonus;
	score = score + 1;
}
WhenStartAsClone() {
	score = score + 50;
}
`;

code = `
local score = 0;
events.whenKeyPressed("space") {
	score = score + 1;
}
`;

console.log("CODE:");
console.log(code);

const lexer = new Lexer();
lexer.load(code);
const tokens = lexer.lex();
console.log("TOKENS:");
console.dir(tokens, { depth: null });

const parser = new Parser();
const ast = parser.parse(tokens, "main");
console.log("AST:");
console.dir(ast, { depth: null });

const analyzer = new Analyzer();
analyzer.analyze(ast);
console.log("ANALYSIS:");
console.dir(analyzer, { depth: null });

const compiler = new Compiler();
const compiled = compiler.compile(analyzer);
compiled.targets[0].costumes.push(new scratch.Costume());
compiled.targets[0].costumes[0].assetId = "87ec29ad216c0074c731d581c7f40c39";
compiled.targets[0].costumes[0].md5ext = "87ec29ad216c0074c731d581c7f40c39.svg";
compiled.targets[1].costumes.push(new scratch.Costume());
compiled.targets[1].costumes[0].assetId = "6f0c9b9f05092d28f36191d7e68d84a3";
compiled.targets[1].costumes[0].md5ext = "6f0c9b9f05092d28f36191d7e68d84a3.svg";

console.log("COMPILED:");
console.log(JSON.stringify(compiled));
