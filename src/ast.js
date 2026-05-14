class Program {
  body;
}

class EventHook {
  ident;
  args;
  body;
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
};
