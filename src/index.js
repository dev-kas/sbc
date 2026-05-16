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

events.whenFlagClicked() {
	local score = 0;
	local bonus = 5;

	score = score + bonus;
	score = score + 1;
}

whenThisSpriteClicked() {
	local score = 10;
	local bonus = 2;

	score = score + bonus;
	score = score + 1;
}

events.whenKeyPressed("sp" + "a" + "" + "ce") {
	score = score + 50;
}

whenFlagClicked() {
	goToXY(50, 50);
}
`;

code = `
local x = 0;
local y = 180;
local vx = 0;
local vy = 0;
local g = 0 - 0.981;
local ay = g;
local ax = 0;

whenGreaterThan("timer", 0) {
	vy = vy + ay;
	vx = vx + ax;
	ax = ax * 0.2;
	x = x + vx; y = y + vy;
	goToXY(x, y);
	resetTimer();
}

whenKeyPressed("d") {
	ax = ax + 5;
}

whenKeyPressed("a") {
	ax = ax - 5;
}

whenKeyPressed("r") {
	x = 0;
	y = 180;
	vx = 0;
	vy = 10;
	ax = 0;
}

whenKeyPressed("space") {
	vy = 15;
}
`;

code = `
local output = "default";
local middle = 50;
local high = 100;
local low = 0;
whenFlagClicked {
	local value = random(low, high);
	if (value >= middle) {
		if (value == middle) {
			output = "eq";
		} else {
			output = "gt";
		}
	} else {
		output = "lt";
	}
}
`;

code = `
whenFlagClicked {
	meow();
}

func meow () {
	say("meow");
}
`;

code = `
whenFlagClicked { say("stage"); }

sprite Player {
	whenFlagClicked { say("plr"); }
}

sprite Enemy {
	whenFlagClicked { say("enemy"); }
}
`;

code = `
global global_total = 0;
global global_multiplier = 10;

sprite sprite1 {
    local a = 5;
    local b = 2;
    local local_result = 0;

    whenFlagClicked {
        a = a * global_multiplier; 
        b = a / b;
        local_result = a + b;
        global_total = local_result;
    }
}

sprite sprite2 {
    local press_count = 0;
    local internal_score = 100;

    whenKeyPressed("space") {
        press_count = press_count + 1;
        internal_score = internal_score - global_multiplier;
    }
    
    whenKeyPressed("r") {
        press_count = 0;
        internal_score = 100;
    }
}
`;

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
