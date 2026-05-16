const { sprintf, indexToLineCol } = require("./utils");
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
  Block,
  ForeverStatement,
  IfStatement,
  RepeatStatement,
  UnaryExpression,
  ArrayLiteral,
  ListAccessNode,
  FunctionDeclaration,
  SpriteDeclaration,
} = require("./ast");

class Parser {
  constructor() {
    this.reset();
  }

  reset() {
    this.tokens = [];
    this.label = "unknown";
    this.source = "";
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
          "unexpected token `%s` on line %d, expected %s, got %s",
          token.raw,
          indexToLineCol(this.source, token.start).line,
          type,
          token.type,
        ),
      );
    return this.advance();
  }

  parse(tokens, label, code) {
    this.tokens = tokens;
    this.label = label;
    this.source = code;
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
    // or a top-level event hook block (for stage)
    // or sprite declaration
    if (this.match(TokenType.GLOBAL, TokenType.LOCAL)) {
      const ast = this.parseVariableDeclaration();
      const semi = this.expect(TokenType.SEMICOLON);
      ast.end = semi.end;
      return ast;
    } else if (this.match(TokenType.IDENT)) {
      return this.parseEventHook();
    } else if (this.match(TokenType.FUNC)) {
      return this.parseFunctionDeclaration();
    } else if (this.match(TokenType.SPRITE)) {
      return this.parseSpriteDeclaration();
    }
  }

  parseSpriteDeclaration() {
    this.expect(TokenType.SPRITE);
    const name = this.parseIdentifier();
    const node = new SpriteDeclaration();
    node.name = name.symbol;

    this.expect(TokenType.LBRACE);
    node.body = [];
    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      if (this.match(TokenType.GLOBAL, TokenType.LOCAL)) {
        const decl = this.parseVariableDeclaration();
        this.expect(TokenType.SEMICOLON);
        node.body.push(decl);
      } else if (this.match(TokenType.FUNC)) {
        node.body.push(this.parseFunctionDeclaration());
      } else {
        node.body.push(this.parseEventHook());
      }
    }
    this.expect(TokenType.RBRACE);
    return node;
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

  parseBlock() {
    const ast = new Block();
    const startToken = this.expect(TokenType.LBRACE);
    ast.body = [];
    while (!this.match(TokenType.EOF, TokenType.RBRACE)) {
      ast.body.push(this.parseStatement());
    }
    const endToken = this.expect(TokenType.RBRACE);
    ast.start = startToken.start;
    ast.end = endToken.end;
    return ast;
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
    ast.block = this.parseBlock();
    ast.end = this.at().start;
    return ast;
  }

  parseStatement() {
    let result = null;
    let ignoreSemi = false;
    switch (this.at().type) {
      case TokenType.GLOBAL:
      case TokenType.LOCAL:
        result = this.parseVariableDeclaration();
        break;
      case TokenType.IDENT:
        if (this.peek().type === TokenType.EQUAL) {
          result = this.parseAssignmentStatement();
        } else {
          result = this.parseExpression();
        }
        break;
      case TokenType.FOREVER:
        result = this.parseForeverStatement();
        ignoreSemi = true;
        break;
      case TokenType.IF:
        result = this.parseIfStatement();
        ignoreSemi = true;
        break;
      case TokenType.REPEAT:
        result = this.parseRepeatStatement();
        ignoreSemi = true;
        break;
      default:
        result = this.parseExpression();
        break;
    }
    if (!ignoreSemi) {
      const semi = this.expect(TokenType.SEMICOLON);
      if (result) result.end = semi.end;
    } else {
      if (result) result.end = this.at().start;
    }
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
    let token = this.at();

    if (
      token.type === TokenType.IDENT &&
      this.peek().type === TokenType.LPAREN
    ) {
      return this.parseCallExpression();
    } else if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayLiteral();
    } else if (
      token.type === TokenType.IDENT &&
      this.peek().type === TokenType.LBRACKET
    ) {
      const ident = this.parseIdentifier();
      this.expect(TokenType.LBRACKET);
      const index = this.parseExpression();
      this.expect(TokenType.RBRACKET);
      const node = new ListAccessNode(ident, index);
      node.start = ident.start;
      return node;
    }

    this.advance();

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
            "unexpected token `%s` (%s) at line %d",
            token.raw,
            token.type,
            indexToLineCol(this.source, token.start).line,
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
    let lhs = this.parseUnaryExpression();
    while (
      this.at().type === TokenType.BINARYOPERATOR &&
      "*/".includes(this.at().raw)
    ) {
      const ast = new BinaryExpression();
      ast.operator = this.advance().raw;
      ast.rhs = this.parseUnaryExpression();
      ast.lhs = lhs;
      ast.start = ast.lhs.start;
      ast.end = ast.rhs.end;
      lhs = ast;
    }
    return lhs;
  }

  parseUnaryExpression() {
    if (
      this.match(TokenType.NOT) ||
      (this.match(TokenType.BINARYOPERATOR) && this.at().raw === "-")
    ) {
      const node = new UnaryExpression();
      node.start = this.at().start;
      node.operator = this.advance().raw;
      node.rhs = this.parseUnaryExpression();
      node.end = node.rhs.end;
      return node;
    }
    return this.parsePrimaryExpression();
  }

  parseCallExpression() {
    const node = new CallExpression();
    node.start = this.at().start;
    node.callee = this.parseIdentifier();
    node.args = this.parseArguments();
    node.end = this.at().start;
    return node;
  }

  parseForeverStatement() {
    const node = new ForeverStatement();
    node.start = this.expect(TokenType.FOREVER).start;
    node.block = this.parseBlock();
    node.end = this.at().start;
    return node;
  }

  parseIfStatement() {
    const node = new IfStatement();
    node.start = this.advance().start; // if
    this.expect(TokenType.LPAREN);
    node.cond = this.parseExpression();
    this.expect(TokenType.RPAREN);
    node.pass = this.parseBlock();
    if (this.at().type === TokenType.ELSE) {
      this.advance(); // else
      node.fail = this.parseBlock();
    }
    node.end = this.at().start;
    return node;
  }

  parseRepeatStatement() {
    const node = new RepeatStatement();
    node.start = this.advance().start; // repeat

    if (this.match(TokenType.IDENT) && this.at().raw === "until") {
      this.advance(); // until
      this.expect(TokenType.LPAREN);
      node.untilCond = this.parseExpression();
      this.expect(TokenType.RPAREN);
    } else {
      this.expect(TokenType.LPAREN);
      node.timesCount = this.parseExpression();
      this.expect(TokenType.RPAREN);
    }

    node.block = this.parseBlock();
    node.end = this.at().start;
    return node;
  }

  parseArrayLiteral() {
    const start = this.expect(TokenType.LBRACKET).start;
    const elements = [];
    while (!this.match(TokenType.RBRACKET) && !this.match(TokenType.EOF)) {
      elements.push(this.parseExpression());
      if (this.match(TokenType.COMMA)) {
        this.advance();
      } else break;
    }
    const end = this.expect(TokenType.RBRACKET);
    const arr = new ArrayLiteral(elements);
    arr.start = start;
    arr.end = end;
    return arr;
  }

  parseFunctionDeclaration() {
    const decl = new FunctionDeclaration();
    this.expect(TokenType.FUNC);

    if (this.at().type === TokenType.IDENT && this.at().raw === "warp") {
      decl.warp = true;
      this.advance();
    }

    decl.name = this.parseIdentifier();

    this.expect(TokenType.LPAREN);
    decl.params = [];
    while (!this.match(TokenType.RPAREN) && !this.match(TokenType.EOF)) {
      decl.params.push(this.parseIdentifier().symbol);
      if (this.match(TokenType.COMMA)) {
        this.advance();
      } else {
        break;
      }
    }
    this.expect(TokenType.RPAREN);

    decl.block = this.parseBlock();

    return decl;
  }
}

module.exports = { Parser };
