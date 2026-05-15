class Program {
  body;
}

class EventHook {
  ident;
  args;
  block;
}

class AssignmentStatement {
  ident;
  value;
}

class Identifier {
  constructor(symbol) {
    this.symbol = symbol;
  }
}

class NumberPrimitive {
  constructor(raw) {
    this.raw = raw;
  }
}

class StringPrimitive {
  constructor(raw) {
    this.raw = raw;
  }
}

class BooleanPrimitive {
  constructor(raw) {
    this.raw = raw;
  }
}

class VariableDeclaration {
  global;
  ident;
  expr;
}

class ComparisonExpression {
  operator;
  lhs;
  rhs;
}

class BinaryExpression {
  operator;
  lhs;
  rhs;
}

class CallExpression {
  callee;
  args;
}

class ForeverStatement {
  block;
}

class Block {
  body;
}

class IfStatement {
  cond;
  pass;
  fail;
}

class RepeatStatement {
  untilCond;
  timesCount;
  block;
}

module.exports = {
  EventHook,
  Program,
  AssignmentStatement,
  Identifier,
  NumberPrimitive,
  StringPrimitive,
  BooleanPrimitive,
  VariableDeclaration,
  ComparisonExpression,
  BinaryExpression,
  CallExpression,
  ForeverStatement,
  Block,
  IfStatement,
  RepeatStatement,
};
