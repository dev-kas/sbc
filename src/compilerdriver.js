const path = require("path");
const JSZip = require("jszip");
const { Lexer } = require("./lexer");
const { Parser } = require("./parser");
const { Analyzer } = require("./analyzer");
const { Compiler } = require("./compiler");
const { Preprocessor } = require("./preprocessor");
const { merge } = require("./utils");

class CompilationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CompilationError";
  }
}

const defaults = {
  // pipeline control
  skipPreprocess: false,
  preprocessOnly: false,
  lexOnly: false,
  parseOnly: false,
  analyzeOnly: false,
  compileOnly: false,

  // error handling
  werror: false,

  // output
  outFile: null,
  assets: [],
};

class CompilerDriver {
  constructor(fs, options) {
    this.fs = fs;
    this.options = merge(defaults, options);
  }

  _createStepOptions() {
    return {
      ...this.options,
      warn: (msg) => {
        if (this.options.werror) {
          throw new CompilationError(`[WERROR] ${msg}`);
        } else {
          console.warn(`[WARN] ${msg}`);
        }
      },
      error: (msg) => {
        throw new CompilationError(`[ERROR] ${msg}`);
      },
    };
  }

  _dump(data) {
    const output =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);
    console.log(output);
    return output;
  }

  async compile(filename) {
    try {
      const stepOpts = this._createStepOptions();

      // read
      let code = await this.fs.read(filename, "utf8");

      // preprocess
      if (!this.options.skipPreprocess) {
        const preprocessor = new Preprocessor(this.fs, stepOpts);
        code = await preprocessor.process(code, filename);
      }

      if (this.options.preprocessOnly) {
        return this._dump(code);
      }

      // lex
      const lexer = new Lexer(stepOpts);
      lexer.load(code, stepOpts);
      const tokens = lexer.lex();

      if (this.options.lexOnly) {
        return this._dump(tokens);
      }

      // parse
      const parser = new Parser(stepOpts);
      const ast = parser.parse(tokens, filename, code);

      if (this.options.parseOnly) {
        return this._dump(ast);
      }

      // analyze
      const analyzer = new Analyzer(stepOpts);
      analyzer.analyze(code, ast);

      if (this.options.analyzeOnly) {
        return this._dump(analyzer);
      }

      // compile
      const compiler = new Compiler(stepOpts);
      const compiled = compiler.compile(analyzer);

      if (this.options.compileOnly) {
        return this._dump(compiled);
      }

      // bundle
      await this.postprocess(compiled, filename, stepOpts);
    } catch (err) {
      if (err instanceof CompilationError) {
        console.error(`compilation failed:\n${err.message}`);
      } else {
        console.error(
          "FATAL ERROR: this is likely an engine error and you should open an issue",
        );
        console.error(err);
        throw err;
      }
    }
  }

  async postprocess(compiledObj, sourceFilename, stepOpts) {
    const zip = new JSZip();

    zip.file("project.json", JSON.stringify(compiledObj));

    if (this.options.assets && this.options.assets.length > 0) {
      for (const assetPath of this.options.assets) {
        try {
          const exists = await this.fs.exists(assetPath);
          if (!exists) {
            stepOpts.warn(`Asset not found, skipping: ${assetPath}`);
            continue;
          }

          const assetData = await this.fs.read(assetPath);
          const baseName = path.basename(assetPath);
          zip.file(baseName, assetData);
        } catch (assetErr) {
          stepOpts.warn(
            `Failed to include asset ${assetPath}: ${assetErr.message}`,
          );
        }
      }
    }

    let outName = this.options.outFile;
    if (!outName) {
      const parsedPath = path.parse(sourceFilename);
      outName = path.join(parsedPath.dir, `${parsedPath.name}.sb3`);
    }

    const content = await zip.generateAsync({ type: "nodebuffer" });
    await this.fs.write(outName, content);

    console.log(`\nSuccessfully compiled and bundled -> ${outName}`);
  }
}

module.exports = { CompilerDriver, CompilationError };
