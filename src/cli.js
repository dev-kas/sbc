const { Command } = require("commander");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const pkg = require("../package.json");
const { MemoryAdapter } = require("fs-adapters");
const { CompilerDriver } = require("./compilerdriver");
const { sprintf } = require("./utils");

const program = new Command();

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
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
    "-a, --asset <string>",
    "explicitly allow an asset file in the format spritename:pathtofile:costumeorsoundname (can be used multiple times)",
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

    const structuredAssets = [];

    // sandbox: read, hash, and structure asset files explicitly allowed by the user
    for (const assetStr of options.asset) {
      const firstColon = assetStr.indexOf(":");
      const lastColon = assetStr.lastIndexOf(":");

      if (firstColon === -1 || firstColon === lastColon) {
        console.error(
          sprintf(
            "invalid asset format `%s`. expected format: spritename:pathtofile:assetname",
            assetStr,
          ),
        );
        process.exit(1);
      }

      const spriteName = assetStr.substring(0, firstColon);
      const filePath = assetStr.substring(firstColon + 1, lastColon);
      const assetName = assetStr.substring(lastColon + 1);

      try {
        const fileBuffer = await fs.readFile(filePath);

        const md5 = crypto.createHash("md5").update(fileBuffer).digest("hex");
        const ext = path.extname(filePath).slice(1) || "png";
        const internalFilename = `${md5}.${ext}`;
        memFsState[internalFilename] = fileBuffer;

        structuredAssets.push({
          spriteName,
          name: assetName,
          md5,
          ext,
          internalFilename,
        });
      } catch (err) {
        console.error(
          sprintf("could not read asset file `%s`: %s", filePath, err.message),
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
      assets: structuredAssets,
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
