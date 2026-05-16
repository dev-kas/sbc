#!/usr/bin/env node

const { Command } = require("commander");
const fs = require("fs/promises");
const path = require("path");
const package = require("../package.json");
const { MemoryAdapter } = require("fs-adapters");
const { CompilerDriver } = require("./compilerdriver");
const { sprintf } = require("./utils");

const program = new Command();

program
  .name(package.name)
  .description(package.description)
  .argument(
    "<files...>",
    "input source files (the first file is the main entrypoint)",
  )

  .option("-o, --output <file>", "place the output into <file>")

  .option("-E", "stop after the preprocessing stage; do not run the compiler")
  .option("--lex-only", "stop after the lexing stage; dump tokens")
  .option("--parse-only", "stop after the parsing stage; dump AST")
  .option("--analyze-only", "stop after the analysis stage; dump symbol table")
  .option("-c", "compile only; do not bundle into an SB3 archive (dumps JSON)")

  .option("--no-preprocess", "do not process the file with the preprocessor")
  .option("--werror", "make all warnings into errors")

  .option(
    "-a, --asset <path>",
    "explicitly allow an asset file in the final sb3 (can be used multiple times)",
    (val, prev) => prev.concat([val]),
    [],
  )

  .action(async (files, options) => {
    const mainEntrypoint = files[0];
    const memFsState = {};

    // sandbox: read only source files explicitly allowed by the user
    for (const file of files) {
      try {
        memFsState[file] = await fs.readFile(file);
      } catch (err) {
        console.error(
          sprintf("could not read source file `%s`: %s", file, err.message),
        );
        process.exit(1);
      }
    }

    // sandbox: read only asset files explicitly allowed by the user
    for (const asset of options.asset) {
      try {
        memFsState[asset] = await fs.readFile(asset);
      } catch (err) {
        console.error(
          sprintf("could not read asset file `%s`: %s", asset, err.message),
        );
        process.exit(1);
      }
    }

    const virtualFs = new MemoryAdapter(memFsState);
    await virtualFs.init();

    const driverOpts = {
      outFile: options.output,
      preprocessOnly: !!options.E,
      lexOnly: !!options.lexOnly,
      parseOnly: !!options.parseOnly,
      analyzeOnly: !!options.analyzeOnly,
      compileOnly: !!options.c,
      skipPreprocess: !options.preprocess,
      werror: !!options.werror,
      assets: options.asset,
    };

    const driver = new CompilerDriver(virtualFs, driverOpts);

    try {
      await driver.compile(mainEntrypoint);
      const isFullCompile =
        !options.E &&
        !options.lexOnly &&
        !options.parseOnly &&
        !options.analyzeOnly &&
        !options.c;

      if (isFullCompile) {
        let outName = options.output;
        if (!outName) {
          const parsedPath = path.parse(mainEntrypoint);
          outName = path.join(parsedPath.dir, `${parsedPath.name}.sb3`);
        }

        if (await virtualFs.exists(outName)) {
          const finalBuffer = await virtualFs.read(outName);
          await fs.writeFile(outName, finalBuffer);
        }
      }
    } catch (err) {
      process.exit(1);
    }
  });

program.parse(process.argv);
