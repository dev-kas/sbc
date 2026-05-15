const { enumify, indexToLineCol, sprintf } = require("./utils");

const states = enumify(["DEFAULT", "NUMBER", "STRING", "COMMENT", "IDENT"]);
const TokenType = enumify([
  "SYMBOL",
  "NUMBER",
  "STRING",
  "IDENT",
  "DOT",
  "LBRACE",
  "RBRACE",
  "LBRACKET",
  "RBRACKET",
  "LPAREN",
  "RPAREN",
  "SEMICOLON",
  "COMMA",
  "EQUAL",
  "LOCAL",
  "GLOBAL",
  "BOOLEAN",
  "EOF",
  "COMPARISONOPERATOR",
  "BINARYOPERATOR",
  "FOREVER",
  "IF",
  "ELSE",
]);

const isWhitespace = (c) => /\s/.test(c);
const isAlpha = (c) => /[a-zA-Z]/.test(c);
const isDigit = (c) => /[0-9]/.test(c);
const isIdentCompliant = (c) => /[a-zA-Z0-9_$\.]/.test(c);

const singleCharTokenMap = {
  "{": TokenType.LBRACE,
  "}": TokenType.RBRACE,
  "(": TokenType.LPAREN,
  ")": TokenType.RPAREN,
  "[": TokenType.LBRACKET,
  "]": TokenType.RBRACKET,
  ".": TokenType.DOT,
  ";": TokenType.SEMICOLON,
  ",": TokenType.COMMA,
  "=": TokenType.EQUAL,
  ">": TokenType.COMPARISONOPERATOR,
  "<": TokenType.COMPARISONOPERATOR,
  "+": TokenType.BINARYOPERATOR,
  "-": TokenType.BINARYOPERATOR,
  "/": TokenType.BINARYOPERATOR,
  "*": TokenType.BINARYOPERATOR,
};

const keywordIdentMap = {
  local: TokenType.LOCAL,
  global: TokenType.GLOBAL,
  true: TokenType.BOOLEAN,
  false: TokenType.BOOLEAN,
  forever: TokenType.FOREVER,
  if: TokenType.IF,
  else: TokenType.ELSE,
};

class Lexer {
  constructor() {
    this.reset();
  }

  reset() {
    this.code = "";
    this.state = states.DEFAULT;
    this.tokens = [];
    this.tokenStart = 0;
  }

  load(code) {
    this.code = code;
  }

  lex() {
    let buffer = "";
    let i = 0;
    while (i < this.code.length) {
      const c = this.code[i];

      if (this.state === states.DEFAULT) {
        if (isWhitespace(c)) {
          i++;
        } else if (!isDigit(c) && (isAlpha(c) || c === "_" || c === "$")) {
          this.state = states.IDENT;
          this.tokenStart = i;
          buffer = c;
          i++;
        } else if (isDigit(c)) {
          this.state = states.NUMBER;
          this.tokenStart = i;
          buffer = c;
          i++;
        } else if (c === '"' || c === "'") {
          this.state = states.STRING;
          this.tokenStart = i;
          buffer = c;
          i++;
        } else if (c === "/" && this.code[i + 1] === "/") {
          this.state = states.COMMENT;
          i += 2;
        } else {
          const tokenFromMap = singleCharTokenMap[c];
          if (!tokenFromMap) {
            console.warn(
              sprintf(
                "warn: unknown char `%s` (0x%x) at line %d col %d",
                c,
                c.charCodeAt(0),
                ...Object.values(indexToLineCol(this.code, i)),
              ),
            );
          }
          this.tokens.push({
            type: tokenFromMap || TokenType.SYMBOL,
            raw: c,
            start: i,
            end: i + 1,
          });
          i++;
        }
      } else if (this.state === states.IDENT) {
        if (isIdentCompliant(c)) {
          buffer += c;
          i++;
        } else {
          this.tokens.push({
            type: keywordIdentMap[buffer] || TokenType.IDENT,
            raw: buffer,
            start: this.tokenStart,
            end: i,
          });
          buffer = "";
          this.state = states.DEFAULT;
        }
      } else if (this.state === states.NUMBER) {
        if (isDigit(c) || (c === "." && !buffer.includes("."))) {
          buffer += c;
          i++;
        } else {
          this.tokens.push({
            type: TokenType.NUMBER,
            raw: buffer,
            start: this.tokenStart,
            end: i,
          });
          buffer = "";
          this.state = states.DEFAULT;
        }
      } else if (this.state === states.STRING) {
        const quote = buffer[0];
        if (c === "\\") {
          const next = this.code[i + 1];
          if (next !== undefined) {
            buffer += "\\" + next;
            i += 2;
          } else {
            i++;
          }
        } else if (c === quote) {
          this.tokens.push({
            type: TokenType.STRING,
            raw: buffer.slice(1),
            start: this.tokenStart,
            end: i + 1,
          });
          buffer = "";
          this.state = states.DEFAULT;
          i++;
        } else {
          buffer += c;
          i++;
        }
      } else if (this.state === states.COMMENT) {
        if (c !== "\n") {
          i++;
        } else {
          this.state = states.DEFAULT;
          i++;
        }
      }
    }

    if (this.state === states.IDENT) {
      this.tokens.push({
        type: keywordIdentMap[buffer] || TokenType.IDENT,
        raw: buffer,
        start: this.tokenStart,
        end: i,
      });
    } else if (this.state === states.NUMBER) {
      this.tokens.push({
        type: TokenType.NUMBER,
        raw: buffer,
        start: this.tokenStart,
        end: i,
      });
    }

    this.tokens.push({ type: TokenType.EOF, raw: "", start: i, end: i });
    return this.tokens;
  }
}

module.exports = { Lexer, TokenType };
