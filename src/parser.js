const { sprintf } = require("./utils");
const { TokenType } = require("./lexer");
const {
  Program,
  EventHook,
  AssignmentStatement,
  Identifier,
  NumberPrimitive,
  StringPrimitive,
  BooleanPrimitive,
  VariableDeclaration,
  ComparisonExpression,
  BinaryExpression,
  CallExpression,
} = require("./ast");

class Parser {
  constructor() {
    this.reset();
  }

  reset() {
    this.tokens = [];
    this.label = "unknown";
  }

  at() {
    return this.tokens[0];
  }

  advance() {
    return this.tokens.shift();
  }

  match(...types) {
    return types.includes(this.at().type);
  }

  peek(n = 1) {
    return this.tokens[n] || { type: TokenType.EOF };
  }

  expect(type) {
    const token = this.at();
    if (token.type !== type)
      throw new Error(
        sprintf(
          "unexpected token `%s` at pos %d, expected %s, got %s",
          token.raw,
          token.start,
          type,
          token.type,
        ),
      );
    return this.advance();
  }

  parse(tokens, label) {
    this.tokens = tokens;
    this.label = label;
    return this.parseProgram();
  }

  parseProgram() {
    const program = new Program();
    program.start = this.at().start;
    program.body = [];
    while (this.at().type !== TokenType.EOF) {
      const tld = this.parseTopLevelDeclaration();
      program.body.push(tld);
    }
    program.end = this.expect(TokenType.EOF).end;
    return program;
  }

  parseTopLevelDeclaration() {
    // could be global/local variable declaration
    // or a top-level event hook block
    if (this.match(TokenType.GLOBAL, TokenType.LOCAL)) {
      const ast = this.parseVariableDeclaration();
      const semi = this.expect(TokenType.SEMICOLON);
      ast.end = semi.end;
      return ast;
    } else if (this.match(TokenType.IDENT)) {
      return this.parseEventHook();
    }
  }

  parseArguments() {
    // (expr, expr, ...)
    this.expect(TokenType.LPAREN);
    const expressions = [];
    while (
      this.at().type !== TokenType.RPAREN &&
      this.at().type !== TokenType.EOF
    ) {
      expressions.push(this.parseExpression());
      if (
        this.at().type !== TokenType.RPAREN &&
        this.at().type !== TokenType.EOF
      ) {
        this.expect(TokenType.COMMA);
      } else {
        break;
      }
    }
    this.expect(TokenType.RPAREN);
    return expressions;
  }

  parseIdentifier() {
    const token = this.expect(TokenType.IDENT);
    const node = new Identifier(token.raw);
    node.start = token.start;
    node.end = token.end;
    return node;
  }

  parseEventHook() {
    // name(...expr) { ...stmt }
    const ast = new EventHook();
    const startToken = this.at();
    ast.ident = this.parseIdentifier();
    ast.start = startToken.start;
    if (this.at().type === TokenType.LPAREN) {
      ast.args = this.parseArguments();
    } else this.args = [];
    this.expect(TokenType.LBRACE);
    ast.body = [];
    while (!this.match(TokenType.EOF, TokenType.RBRACE)) {
      ast.body.push(this.parseStatement());
    }
    const endToken = this.expect(TokenType.RBRACE);
    ast.end = endToken.end;
    return ast;
  }

  parseStatement() {
    let result = null;
    switch (this.at().type) {
      case TokenType.GLOBAL:
      case TokenType.LOCAL:
        result = this.parseVariableDeclaration();
        break;
      case TokenType.IDENT:
        if (this.peek().type === TokenType.LPAREN) {
          result = this.parseCallExpression();
        } else {
          result = this.parseAssignmentStatement();
        }
        break;
      default:
        result = this.parseExpression();
        break;
    }
    const semi = this.expect(TokenType.SEMICOLON);
    if (result) result.end = semi.end;
    return result;
  }

  parseExpression() {
    return this.parseComparisonExpression();
  }

  parseAssignmentStatement() {
    // ident = expression;
    const ast = new AssignmentStatement();
    const startToken = this.at();
    ast.ident = this.parseIdentifier();
    ast.start = startToken.start;
    this.expect(TokenType.EQUAL);
    ast.value = this.parseExpression();
    ast.end = ast.value.end;
    return ast;
  }

  parsePrimaryExpression() {
    let token = this.advance();
    let node;
    const start = token.start;
    switch (token.type) {
      case TokenType.IDENT:
        if (this.peek().type === TokenType.LPAREN) {
          return this.parseCallExpression();
        }
        node = new Identifier(token.raw);
        break;
      case TokenType.NUMBER:
        node = new NumberPrimitive(token.raw);
        break;
      case TokenType.STRING:
        node = new StringPrimitive(token.raw);
        break;
      case TokenType.BOOLEAN:
        node = new BooleanPrimitive(token.raw);
        break;
      case TokenType.LPAREN:
        node = this.parseExpression();
        token = this.expect(TokenType.RPAREN);
        break;
      default:
        throw new Error(
          sprintf(
            "unexpected token `%s` (%s) at pos %d",
            token.raw,
            token.type,
            token.start,
          ),
        );
    }
    node.start = start;
    node.end = token.end;
    return node;
  }

  parseVariableDeclaration() {
    // global/local ident = expr
    const ast = new VariableDeclaration();
    ast.start = this.at().start;
    ast.global = true;

    if (this.match(TokenType.LOCAL)) {
      ast.global = false;
      this.advance();
    } else {
      this.expect(TokenType.GLOBAL);
    }

    ast.ident = this.parseIdentifier();
    this.expect(TokenType.EQUAL);
    ast.expr = this.parseExpression();
    ast.end = ast.expr.end;
    return ast;
  }

  parseComparisonExpression() {
    let lhs = this.parseAdditiveExpression();
    while (this.at().type === TokenType.COMPARISONOPERATOR) {
      const ast = new ComparisonExpression();
      ast.operator = this.advance().raw;
      ast.rhs = this.parseAdditiveExpression();
      ast.lhs = lhs;
      ast.start = ast.lhs.start;
      ast.end = ast.rhs.end;
      lhs = ast;
    }
    return lhs;
  }

  parseAdditiveExpression() {
    let lhs = this.parseMultiplicativeExpression();
    while (
      this.at().type === TokenType.BINARYOPERATOR &&
      "+-".includes(this.at().raw)
    ) {
      const ast = new BinaryExpression();
      ast.operator = this.advance().raw;
      ast.rhs = this.parseMultiplicativeExpression();
      ast.lhs = lhs;
      ast.start = ast.lhs.start;
      ast.end = ast.rhs.end;
      lhs = ast;
    }
    return lhs;
  }

  parseMultiplicativeExpression() {
    let lhs = this.parsePrimaryExpression();
    while (
      this.at().type === TokenType.BINARYOPERATOR &&
      "*/".includes(this.at().raw)
    ) {
      const ast = new BinaryExpression();
      ast.operator = this.advance().raw;
      ast.rhs = this.parsePrimaryExpression();
      ast.lhs = lhs;
      ast.start = ast.lhs.start;
      ast.end = ast.rhs.end;
      lhs = ast;
    }
    return lhs;
  }

  parseCallExpression() {
    const node = new CallExpression();
    node.start = this.at().start;
    node.callee = this.parseIdentifier();
    node.args = this.parseArguments();
    node.end = this.at().start;
    return node;
  }
}

module.exports = { Parser };
