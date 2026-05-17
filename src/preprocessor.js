const { sprintf } = require("./utils");

class Preprocessor {
  constructor(fs, options) {
    this.reset();
    this.fs = fs;
    this.options = options;
    this.error =
      options?.error ||
      ((e) => {
        throw new Error(e);
      });
    this.error = options?.warn || console.warn;
  }

  reset() {
    this.macros = new Map();
    this.pragmaOnceFiles = new Set();
    this.macros.set("__PREPROCESSOR__", { type: "object", value: "1" });
  }

  async process(source, currentFile = "main") {
    const rawLines = source.split(/\r?\n/);
    const lines = [];
    let buffer = "";

    for (let i = 0; i < rawLines.length; i++) {
      if (rawLines[i].endsWith("\\")) {
        buffer += rawLines[i].slice(0, -1);
        lines.push(""); // blank so line count remians same
      } else {
        lines.push(buffer + rawLines[i]);
        buffer = "";
      }
    }

    let output = [];

    const conditionStack = [{ active: true, handled: true }];
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      let line = lines[i];
      let trimmed = line.trim();

      const isEmitting = conditionStack[conditionStack.length - 1].active;

      // directives
      if (trimmed.startsWith("#")) {
        try {
          const result = await this.handleDirective(
            trimmed,
            currentFile,
            lineNum,
            conditionStack,
          );
          if (result && result.includeContent !== undefined) {
            output.push(result.includeContent);
          } else {
            output.push(""); // preserve line coune
          }
        } catch (err) {
          this.error(
            sprintf(
              "%s:%d: fatal error: %s",
              currentFile,
              lineNum,
              err.message,
            ),
          );
        }
        continue;
      }

      // emit and expansion
      if (isEmitting) {
        try {
          output.push(this.expandMacros(line));
        } catch (err) {
          this.error(
            sprintf(
              "%s:%d: macro expansion error: %s",
              currentFile,
              lineNum,
              err.message,
            ),
          );
        }
      } else {
        output.push("");
      }
    }

    if (conditionStack.length > 1) {
      this.error(
        sprintf(
          "%s: fatal error: unterminated #if block at end of file",
          currentFile,
        ),
      );
    }

    return output.join("\n");
  }

  async handleDirective(line, currentFile, lineNum, stack) {
    const match = line.match(/^#\s*([a-zA-Z]+)\s*(.*)$/);
    if (!match) return;

    const directive = match[1].toLowerCase();
    const args = match[2].trim();
    const parentState =
      stack.length > 1 ? stack[stack.length - 2].active : true;
    const currentState = stack[stack.length - 1];

    // conditions
    switch (directive) {
      case "ifdef":
      case "ifndef": {
        if (!parentState) {
          stack.push({ active: false, handled: true });
          return;
        }
        const exists = this.macros.has(args.split(/\s+/)[0]);
        const isTrue = directive === "ifdef" ? exists : !exists;
        stack.push({ active: isTrue, handled: isTrue });
        return;
      }
      case "if": {
        if (!parentState) {
          stack.push({ active: false, handled: true });
          return;
        }
        const isTrue = this.evaluateCondition(args);
        stack.push({ active: isTrue, handled: isTrue });
        return;
      }
      case "elif": {
        if (stack.length === 1) this.error("#elif without #if");
        if (!parentState) return;

        if (currentState.handled) {
          currentState.active = false;
        } else {
          const isTrue = this.evaluateCondition(args);
          currentState.active = isTrue;
          if (isTrue) currentState.handled = true;
        }
        return;
      }
      case "else": {
        if (stack.length === 1) this.error("#else without #if");
        if (!parentState) return;

        currentState.active = !currentState.handled;
        currentState.handled = true;
        return;
      }
      case "endif": {
        if (stack.length === 1) this.error("#endif without #if");
        stack.pop();
        return;
      }
    }

    if (!currentState.active) return;

    // active directives
    switch (directive) {
      case "define": {
        this.parseDefine(args);
        break;
      }
      case "undef": {
        this.macros.delete(args.split(/\s+/)[0]);
        break;
      }
      case "pragma": {
        if (args === "once") {
          this.pragmaOnceFiles.add(currentFile);
        }
        break;
      }
      case "error": {
        this.error(sprintf("#error %s", args));
      }
      case "include": {
        return { includeContent: await this.handleInclude(args, currentFile) };
      }
      default:
        this.warn(
          sprintf(
            "warning: unknown directive '#%s' at %s:%d",
            directive,
            currentFile,
            lineNum,
          ),
        );
    }
  }

  parseDefine(args) {
    // #define MACRO(x, y) value
    const funcMatch = args.match(/^([a-zA-Z_]\w*)\(([^)]*)\)\s*(.*)$/);
    if (funcMatch) {
      const name = funcMatch[1];
      const macroArgs = funcMatch[2]
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      const value = funcMatch[3];
      this.macros.set(name, {
        type: "function",
        args: macroArgs,
        value: value,
      });
      return;
    }

    // #define MACRO value
    const objMatch = args.match(/^([a-zA-Z_]\w*)(?:\s+(.*))?$/);
    if (objMatch) {
      this.macros.set(objMatch[1], {
        type: "object",
        value: objMatch[2] || "1",
      });
    }
  }

  async handleInclude(args, currentFile) {
    //  #include "filename"
    //  no <filename> for now umm maybe do that later
    const match = args.match(/^"([^"]+)"$/);
    if (!match)
      throw new Error('invalid #include syntax; expected #include "filename"');

    const filename = match[1];
    const fullPath = this.resolvePath(currentFile, filename);

    if (!(await this.fs.exists(fullPath))) {
      throw new Error(sprintf("cannot find include file '%s'", filename));
    }

    if (this.pragmaOnceFiles.has(fullPath)) {
      return ""; // skip for #pragma once
    }

    const source = await this.fs.read(fullPath, "utf8");
    return await this.process(source, fullPath);
  }

  evaluateCondition(expr) {
    // defined(MACRO) or defined MACRO
    let processed = expr.replace(
      /defined\s*\(\s*([a-zA-Z_]\w*)\s*\)/g,
      (m, id) => (this.macros.has(id) ? "1" : "0"),
    );
    processed = processed.replace(/defined\s+([a-zA-Z_]\w*)/g, (m, id) =>
      this.macros.has(id) ? "1" : "0",
    );

    // expand macro
    processed = this.expandMacros(processed);
    processed = processed.replace(/\b[a-zA-Z_]\w*\b/g, "0");
    try {
      return !!new Function(`return (${processed});`)(); // safe cuz cleaned
    } catch (e) {
      throw new Error(sprintf("invalid expression in #if: '%s'", expr));
    }
  }

  expandMacros(text, activeExpansions = new Set()) {
    const tokenizer =
      /("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\/\/.*)|([a-zA-Z_]\w*)/g;

    let result = text;
    let expandedSomething = true;

    while (expandedSomething) {
      expandedSomething = false;
      let newResult = "";
      let lastIndex = 0;

      let match;
      tokenizer.lastIndex = 0;

      while ((match = tokenizer.exec(result)) !== null) {
        if (match[1]) continue;
        const id = match[2];
        if (this.macros.has(id) && !activeExpansions.has(id)) {
          const macro = this.macros.get(id);

          if (macro.type === "object") {
            newResult += result.substring(lastIndex, match.index) + macro.value;
            lastIndex = tokenizer.lastIndex;
            expandedSomething = true;
            activeExpansions.add(id);
          } else if (macro.type === "function") {
            // look-ahead for '('
            const tail = result.substring(tokenizer.lastIndex);
            const openParenMatch = tail.match(/^\s*\(/);

            if (openParenMatch) {
              const argStringStart =
                tokenizer.lastIndex + openParenMatch[0].length;
              let parens = 1;
              let argStringEnd = argStringStart;

              while (parens > 0 && argStringEnd < result.length) {
                if (result[argStringEnd] === "(") parens++;
                if (result[argStringEnd] === ")") parens--;
                argStringEnd++;
              }

              if (parens === 0) {
                const rawArgs = result.substring(
                  argStringStart,
                  argStringEnd - 1,
                );
                const args = rawArgs.split(",").map((s) => s.trim());

                let expandedValue = macro.value;
                macro.args.forEach((argName, idx) => {
                  const argValue = args[idx] !== undefined ? args[idx] : "";
                  const argRegex = new RegExp(`\\b${argName}\\b`, "g");
                  expandedValue = expandedValue.replace(argRegex, argValue);
                });

                newResult +=
                  result.substring(lastIndex, match.index) + expandedValue;
                lastIndex = argStringEnd;
                tokenizer.lastIndex = argStringEnd;
                expandedSomething = true;
                activeExpansions.add(id);
              }
            }
          }
        }
      }

      newResult += result.substring(lastIndex);
      result = newResult;
    }

    return result;
  }

  // NOTE: forward-slash only
  resolvePath(baseFile, relativeFile) {
    const lastSlash = baseFile.lastIndexOf("/");
    const baseDir = lastSlash === -1 ? "" : baseFile.substring(0, lastSlash);

    const parts = baseDir ? baseDir.split("/") : [];
    const relParts = relativeFile.split("/");

    for (const part of relParts) {
      if (part === "." || part === "") continue;
      if (part === "..") {
        if (parts.length > 0 && parts[parts.length - 1] !== "..") {
          parts.pop();
        } else {
          parts.push("..");
        }
      } else {
        parts.push(part);
      }
    }
    return parts.join("/");
  }
}

module.exports = { Preprocessor };
