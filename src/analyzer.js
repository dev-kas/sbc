const { sprintf } = require("./utils");
const { generate } = require("./id");
const {
  AnalysisValue,
  StringValue,
  NumberValue,
  BooleanValue,
  EventBlock,
  Instruction,
} = require("./analysisvalues");
const { ComparisonExpression, BinaryExpression } = require("./ast");

class Scope {
  constructor(parent = null) {
    this.parent = parent;
    this.variables = new Map();
    this.varIDs = new Map();
    this.globals = new Set();
  }

  define(name, value, global = false) {
    this.variables.set(name, value);
    this.varIDs.set(name, generate("variable"));
    if (global) this.globals.add(name);
  }

  set(name, value) {
    if (this.variables.has(name) && this.varIDs.has(name)) {
      return this.variables.set(name, value);
    }
    const scope = this.resolve(name);
    return scope.set(name, value);
  }

  get(name) {
    if (this.variables.has(name) && this.varIDs.has(name)) {
      return { value: this.variables.get(name), id: this.varIDs.get(name) };
    }
    const scope = this.resolve(name);
    return scope.get(name);
  }

  resolve(name) {
    if (this.variables.has(name) && this.varIDs.has(name)) return this;
    if (this.parent) return this.parent.resolve(name);
    throw new Error(sprintf("cannot resolve variable `%s`", name));
  }
}

class Analyzer {
  constructor() {
    this.reset();
  }

  reset() {
    this.blocks = [];
    this.scopes = [];
    this.currentScope = null;
  }

  analyze(node) {
    return this.visit(node);
  }

  visit(node) {
    const visitor = this[`visit${node.constructor.name}`];
    if (visitor) {
      return visitor.call(this, node);
    }
    throw new Error("visitor undefined for " + node.constructor.name);
  }

  visitProgram(node) {
    this.currentScope = new Scope();
    this.scopes.push(this.currentScope);

    node.body.forEach((child) => {
      this.visit(child);
    });
  }

  visitEventHook(node) {
    const block = new EventBlock();
    block.name = node.ident.symbol;

    const parentScope = this.currentScope;
    this.currentScope = new Scope(parentScope);

    node.body.forEach((child) => {
      const result = this.visit(child);
      if (result instanceof Instruction) {
        block.instructions.push(result);
      }
    });

    this.scopes.push(this.currentScope);
    this.currentScope = parentScope;
    this.blocks.push(block);
  }

  visitVariableDeclaration(node) {
    const foldedValue = this.visit(node.expr);
    this.currentScope.define(node.ident.symbol, foldedValue, node.global);
  }

  visitAssignmentStatement(node) {
    const variable = this.currentScope.get(node.ident.symbol);
    const foldedValue = this.visit(node.value);

    const instruction = new Instruction();
    instruction.opcode = "data_setvariableto";
    instruction.fields.VARIABLE = [node.ident.symbol, variable.id];

    instruction.inputs.VALUE = foldedValue;

    return instruction;
  }

  visitIdentifier(node) {
    return this.currentScope.get(node.symbol);
  }

  visitNumberPrimitive(node) {
    return new NumberValue(Number(node.raw));
  }
  visitStringPrimitive(node) {
    return new StringValue(node.raw);
  }
  visitBooleanPrimitive(node) {
    return new BooleanValue(node.raw === "true");
  }

  visitBinaryExpression(node) {
    const left = this.visit(node.lhs);
    const right = this.visit(node.rhs);

    if (left instanceof AnalysisValue && right instanceof AnalysisValue) {
      const lVal = left.value;
      const rVal = right.value;
      switch (node.operator) {
        case "+":
          return left instanceof StringValue || right instanceof StringValue
            ? new StringValue(lVal + rVal)
            : new NumberValue(lVal + rVal);
        case "-":
          return new NumberValue(lVal - rVal);
        case "*":
          return new NumberValue(lVal * rVal);
        case "/":
          return new NumberValue(lVal / rVal);
      }
    }

    const newNode = new BinaryExpression();
    newNode.operator = node.operator;
    newNode.lhs = left;
    newNode.rhs = right;
    return newNode;
  }

  visitComparisonExpression(node) {
    const left = this.visit(node.lhs);
    const right = this.visit(node.rhs);

    if (left instanceof AnalysisValue && right instanceof AnalysisValue) {
      const lVal = left.value;
      const rVal = right.value;
      switch (node.operator) {
        case ">":
          return new BooleanValue(lVal > rVal);
        case "<":
          return new BooleanValue(lVal < rVal);
      }
    }

    const newNode = new ComparisonExpression();
    newNode.operator = node.operator;
    newNode.lhs = left;
    newNode.rhs = right;
    return newNode;
  }
}

module.exports = {
  Analyzer,
  Scope,
};
