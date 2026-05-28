const assert = require("node:assert/strict");
const JSZip = require("jszip");
const { MemoryAdapter } = require("fs-adapters");
const {
  Lexer,
  Parser,
  Analyzer,
  Compiler,
  CompilerDriver,
} = {
  Lexer: require("../src/lexer").Lexer,
  Parser: require("../src/parser").Parser,
  Analyzer: require("../src/analyzer").Analyzer,
  Compiler: require("../src/compiler").Compiler,
  CompilerDriver: require("../src/compilerdriver").CompilerDriver,
};

function testOptions() {
  const warnings = [];
  return {
    warnings,
    warn(message) {
      warnings.push(message);
    },
    error(message) {
      throw new Error(message);
    },
  };
}

function parseSource(source, filename = "test.sbc", options = testOptions()) {
  const lexer = new Lexer(options);
  lexer.load(source);
  const tokens = lexer.lex();
  const parser = new Parser(options);
  return parser.parse(tokens, filename, source);
}

function analyzeSource(source, filename = "test.sbc", options = testOptions()) {
  const ast = parseSource(source, filename, options);
  const analyzer = new Analyzer(options);
  analyzer.analyze(source, ast);
  return analyzer;
}

function compileSource(source, filename = "test.sbc", options = testOptions()) {
  const analyzer = analyzeSource(source, filename, options);
  const compiler = new Compiler(options);
  return compiler.compile(analyzer);
}

async function createMemoryFs(files) {
  const adapter = new MemoryAdapter(files);
  await adapter.init();
  return adapter;
}

async function compileWithDriver(files, entrypoint, options = {}) {
  const adapter = await createMemoryFs(files);
  const driver = new CompilerDriver(adapter, options);
  await driver.compile(entrypoint);
  return adapter;
}

async function readProjectFromSb3(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const projectFile = zip.file("project.json");
  assert.ok(projectFile, "project.json should exist in the archive");
  return JSON.parse(await projectFile.async("string"));
}

module.exports = {
  testOptions,
  parseSource,
  analyzeSource,
  compileSource,
  createMemoryFs,
  compileWithDriver,
  readProjectFromSb3,
};
