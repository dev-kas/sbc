const { sprintf, indexToLineCol } = require("./utils");
const isa = require("./isa");
const { generate } = require("./id");
const {
  AnalysisValue,
  StringValue,
  NumberValue,
  BooleanValue,
  EventBlock,
  Instruction,
} = require("./analysisvalues");
const {
  ComparisonExpression,
  BinaryExpression,
  ArrayLiteral,
  FunctionDeclaration,
  SpriteDeclaration,
} = require("./ast");

const TERMINATORS = [
  "control_forever",
  "control_stop",
  "control_delete_this_clone",
];

class Scope {
  constructor(parent = null) {
    this.parent = parent;
    this.variables = new Map();
    this.varIDs = new Map();
    this.lists = new Map();
    this.listIDs = new Map();
    this.globals = new Set();
  }

  define(name, value, global = false) {
    this.variables.set(name, value);
    this.varIDs.set(name, generate("variable"));
    if (global) this.globals.add(name);
  }

  defineList(name, value, global = false) {
    this.lists.set(name, value);
    this.listIDs.set(name, generate("list"));
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
      return {
        value: this.variables.get(name),
        id: this.varIDs.get(name),
        symbol: name,
      };
    }
    const scope = this.resolve(name);
    return scope.get(name);
  }

  getList(name) {
    if (this.listIDs.has(name)) {
      return { id: this.listIDs.get(name), symbol: name };
    }
    if (this.parent) return this.parent.getList(name);
    throw new Error(sprintf("cannot resolve list `%s`", name));
  }

  resolve(name) {
    if (this.variables.has(name) && this.varIDs.has(name)) return this;
    if (this.parent) return this.parent.resolve(name);
    throw new Error(sprintf("cannot resolve variable `%s`", name));
  }
}

class Analyzer {
  constructor(options) {
    this.options = options;
    this.error =
      options?.error ||
      ((e) => {
        throw new Error(e);
      });
    this.reset();
  }

  reset() {
    this.blocks = [];
    this.scopes = [];
    this.currentScope = null;
    this.procedures = new Map();
    this.source = "";
    this.targets = new Map();

    this.targets.set("Stage", { blocks: [], variables: [], lists: [] });
    this.currentTarget = "Stage";
  }

  analyze(source, node) {
    this.source = source;
    return this.visit(node);
  }

  visit(node) {
    const visitor = this[`visit${node.constructor.name}`];
    if (visitor) {
      return visitor.call(this, node);
    }
    throw new Error("visitor undefined for " + node.constructor.name);
  }

  visitSpriteDeclaration(node) {
    const prevTarget = this.currentTarget;
    const prevScope = this.currentScope;

    this.currentTarget = node.name;
    this.currentScope = new Scope(prevScope);
    if (!this.targets.has(this.currentTarget)) {
      this.targets.set(this.currentTarget, {
        blocks: [],
        variables: [],
        lists: [],
      });
    }

    node.body.forEach((child) => this.visit(child));
    this.currentScope = prevScope;
    this.currentTarget = prevTarget;
  }

  visitProgram(node) {
    this.currentScope = new Scope();
    this.scopes.push(this.currentScope);

    const registerProcedures = (statements) => {
      statements.forEach((child) => {
        if (child instanceof FunctionDeclaration) {
          const name = child.name.symbol;
          const proccode =
            name +
            (child.params.length > 0
              ? " " + child.params.map(() => "%s").join(" ")
              : "");
          this.procedures.set(name, {
            params: child.params,
            proccode: proccode,
            warp: child.warp,
          });
        } else if (child instanceof SpriteDeclaration) {
          registerProcedures(child.body);
        }
      });
    };

    registerProcedures(node.body);
    node.body.forEach((child) => {
      this.visit(child);
    });
  }

  lookupISA(opcodeAlias) {
    const parts = opcodeAlias.split(".");

    if (parts.length > 1) {
      const namespace = parts.shift();
      const name = parts.join(".");

      const ns = isa[namespace];
      if (!ns) {
        this.error(sprintf("unknown opcode namespace `%s`", namespace));
      }

      const opcode = ns[name];
      if (!opcode) {
        this.error(
          sprintf(
            "unknown opcode alias `%s` under namespace `%s`",
            name,
            namespace,
          ),
        );
      }

      return opcode;
    }

    for (const ns of Object.values(isa)) {
      if (opcodeAlias in ns) {
        return ns[opcodeAlias];
      }
    }

    this.error(sprintf("unknown opcode alias `%s`", opcodeAlias));
  }

  visitEventHook(node) {
    const block = new EventBlock();
    const name = node.ident.symbol;
    const isaEntry = this.lookupISA(name);

    block.opcode = isaEntry.opcode;

    if (isaEntry.fields) {
      for (const [fieldName, argIndex] of Object.entries(isaEntry.fields)) {
        const argNode = node.args[argIndex];
        if (argNode) {
          const evaluated = this.visit(argNode);
          let finalValue;

          if (
            evaluated &&
            evaluated.id &&
            evaluated.value instanceof AnalysisValue
          ) {
            finalValue = evaluated.value.value;
          } else if (evaluated instanceof AnalysisValue) {
            finalValue = evaluated.value;
          } else {
            finalValue = String(evaluated.raw || "");
          }

          block.fields[fieldName] = [finalValue, null];
        }
      }
    }

    if (isaEntry.inputs) {
      for (const [inputName, argIndex] of Object.entries(isaEntry.inputs)) {
        const argNode = node.args[argIndex];
        if (argNode) {
          block.inputs[inputName] = this.visit(argNode);
        }
      }
    }

    block.instructions = this.visitBlock(node.block);
    this.targets.get(this.currentTarget).blocks.push(block);
  }

  visitVariableDeclaration(node) {
    const evaluatedValue = this.visit(node.expr);

    if (node.expr instanceof ArrayLiteral) {
      this.currentScope.defineList(
        node.ident.symbol,
        evaluatedValue,
        node.global,
      );

      const targetName = node.global ? "Stage" : this.currentTarget;
      const listInfo = this.currentScope.getList(node.ident.symbol);
      this.targets.get(targetName).lists.push({
        name: listInfo.symbol,
        id: listInfo.id,
        value: evaluatedValue,
      });
    } else {
      let finalValue = evaluatedValue;
      if (finalValue && finalValue.id) {
        finalValue = finalValue.value;
      }
      this.currentScope.define(node.ident.symbol, finalValue, node.global);

      const targetName = node.global ? "Stage" : this.currentTarget;
      const varInfo = this.currentScope.get(node.ident.symbol);
      this.targets.get(targetName).variables.push({
        name: varInfo.symbol,
        id: varInfo.id,
        value: varInfo.value,
      });
    }

    if (!node.global && this.currentScope.parent !== null) {
      const variable = this.currentScope.get(node.ident.symbol);
      const instruction = new Instruction();
      instruction.opcode = "data_setvariableto";
      instruction.fields.VARIABLE = [node.ident.symbol, variable.id];
      instruction.inputs.VALUE = evaluatedValue;
      return instruction;
    }
  }

  visitAssignmentStatement(node) {
    const variable = this.currentScope.get(node.ident.symbol);
    const foldedValue = this.visit(node.value);

    if (foldedValue instanceof AnalysisValue) {
      this.currentScope.set(node.ident.symbol, foldedValue);
    }

    const instruction = new Instruction();
    instruction.opcode = "data_setvariableto";
    instruction.fields.VARIABLE = [node.ident.symbol, variable.id];
    instruction.inputs.VALUE = foldedValue;

    return instruction;
  }

  visitIdentifier(node) {
    try {
      return this.currentScope.get(node.symbol);
    } catch (e) {
      if (
        this.currentScope.parameters &&
        this.currentScope.parameters.has(node.symbol)
      ) {
        const inst = new Instruction();
        inst.opcode = "argument_reporter_string_number";
        inst.fields.VALUE = [node.symbol, null];
        return inst;
      }
      try {
        const isaEntry = this.lookupISA(node.symbol);
        if (isaEntry.type === "reporter" || isaEntry.type === "boolean") {
          const instruction = new Instruction();
          instruction.opcode = isaEntry.opcode;
          return instruction;
        }
      } catch (isaError) {
        throw e;
      }
      throw e;
    }
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

    if (
      left instanceof AnalysisValue &&
      !left.id &&
      right instanceof AnalysisValue &&
      !right.id
    ) {
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
        case ">=":
          return new BooleanValue(lVal >= rVal);
        case "<=":
          return new BooleanValue(lVal <= rVal);
        case "==":
          return new BooleanValue(lVal == rVal);
        case "!=":
          return new BooleanValue(lVal != rVal);
        case "&&":
          return new BooleanValue(lVal && rVal);
        case "||":
          return new BooleanValue(lVal || rVal);
      }
    }

    const createNot = (innerInst) => {
      const notInst = new Instruction();
      notInst.opcode = "operator_not";
      notInst.inputs.OPERAND = innerInst;
      return notInst;
    };

    const createBin = (op, l, r) => {
      const inst = new ComparisonExpression();
      inst.operator = op;
      inst.lhs = l;
      inst.rhs = r;
      return inst;
    };

    // abstractions
    switch (node.operator) {
      case ">=":
        return createNot(createBin("<", left, right));
      case "<=":
        return createNot(createBin(">", left, right));
      case "!=":
        return createNot(createBin("==", left, right));
      case "==":
        const eq = new Instruction();
        eq.opcode = "operator_equals";
        eq.inputs.OPERAND1 = left;
        eq.inputs.OPERAND2 = right;
        return eq;
      case "&&":
        const and = new Instruction();
        and.opcode = "operator_and";
        and.inputs.OPERAND1 = left;
        and.inputs.OPERAND2 = right;
        return and;
      case "||":
        const or = new Instruction();
        or.opcode = "operator_or";
        or.inputs.OPERAND1 = left;
        or.inputs.OPERAND2 = right;
        return or;
    }

    const newNode = new ComparisonExpression();
    newNode.operator = node.operator;
    newNode.lhs = left;
    newNode.rhs = right;
    return newNode;
  }

  visitCallExpression(node) {
    const name = node.callee.symbol;

    if (this.procedures.has(name)) {
      const proc = this.procedures.get(name);
      const inst = new Instruction();
      inst.opcode = "procedures_call";
      inst.proccode = proc.proccode;
      inst.warp = proc.warp;

      node.args.forEach((arg, i) => {
        inst.inputs[`arg${i}`] = this.visit(arg);
      });

      return inst;
    }

    // abstractions
    if (name.includes(".")) {
      const parts = name.split(".");
      const prefix = parts[0];
      const method = parts.slice(1).join(".");

      let list = null;
      try {
        list = this.currentScope.getList(prefix);
      } catch (e) {}

      if (list) {
        if (method === "add" || method === "push") {
          const inst = new Instruction();
          inst.opcode = "data_addtolist";
          inst.inputs.ITEM = this.visit(node.args[0]);
          inst.fields.LIST = [list.symbol, list.id];
          return inst;
        }
        if (method === "remove" || method === "delete") {
          const inst = new Instruction();
          inst.opcode = "data_deleteoflist";
          const visitedIndex = this.visit(node.args[0]);
          if (visitedIndex instanceof NumberValue) {
            inst.inputs.INDEX = new NumberValue(visitedIndex.value + 1);
          } else {
            const add = new BinaryExpression();
            add.operator = "+";
            add.lhs = visitedIndex;
            add.rhs = new NumberValue(1);
            inst.inputs.INDEX = add;
          }
          inst.fields.LIST = [list.symbol, list.id];
          return inst;
        }
        if (method === "length") {
          const inst = new Instruction();
          inst.opcode = "data_lengthoflist";
          inst.fields.LIST = [list.symbol, list.id];
          return inst;
        }
      }
    }

    const isaEntry = this.lookupISA(name);

    let maxArgIndex = -1;
    if (isaEntry.inputs) {
      Object.values(isaEntry.inputs).forEach(
        (idx) => (maxArgIndex = Math.max(maxArgIndex, idx)),
      );
    }
    if (isaEntry.fields) {
      Object.values(isaEntry.fields).forEach(
        (idx) => (maxArgIndex = Math.max(maxArgIndex, idx)),
      );
    }

    const requiredCount = maxArgIndex + 1;
    if (node.args.length < requiredCount) {
      this.error(
        sprintf(
          "block `%s` requires %d arguments, but only %d were provided on line %d",
          name,
          requiredCount,
          node.args.length,
          indexToLineCol(this.source, node.start).line,
        ),
      );
    }

    const instruction = new Instruction();
    instruction.opcode = isaEntry.opcode;
    instruction.meta = isaEntry;

    if (isaEntry.inputs) {
      for (const [inputName, argIndex] of Object.entries(isaEntry.inputs)) {
        instruction.inputs[inputName] = this.visit(node.args[argIndex]);
      }
    }

    if (isaEntry.fields) {
      for (const [fieldName, argIndex] of Object.entries(isaEntry.fields)) {
        const argNode = node.args[argIndex];
        instruction.fields[fieldName] = [argNode.raw || argNode.symbol, null];
      }
    }

    return instruction;
  }

  visitForeverStatement(node) {
    const instruction = new Instruction();
    instruction.opcode = "control_forever";
    instruction.body = this.visitBlock(node.block);
    return instruction;
  }

  analyzeInstructions(body) {
    const instructions = [];
    let terminated = false;

    body.forEach((child) => {
      const result = this.visit(child);
      if (result instanceof Instruction) {
        if (terminated) {
          this.error(
            sprintf(
              "unreachable code on line %d",
              indexToLineCol(this.source, child.start).line,
            ),
          );
        }
        instructions.push(result);
        if (TERMINATORS.includes(result.opcode)) {
          terminated = true;
        }
      }
    });
    return instructions;
  }

  visitIfStatement(node) {
    const instruction = new Instruction();
    instruction.inputs.CONDITION = this.visit(node.cond);

    if (node.fail) {
      instruction.opcode = "control_if_else";
      instruction.body = this.visitBlock(node.pass);
      instruction.elseBody = this.visitBlock(node.fail);
    } else {
      instruction.opcode = "control_if";
      instruction.body = this.visitBlock(node.pass);
    }
    return instruction;
  }

  visitRepeatStatement(node) {
    const instruction = new Instruction();

    if (node.untilCond) {
      instruction.opcode = "control_repeat_until";
      instruction.inputs.CONDITION = this.visit(node.untilCond);
    } else if (node.timesCount) {
      instruction.opcode = "control_repeat";
      instruction.inputs.TIMES = this.visit(node.timesCount);
    }

    instruction.body = this.analyzeInstructions(node.block.body);
    return instruction;
  }

  visitUnaryExpression(node) {
    const rhs = this.visit(node.rhs);

    if (node.operator === "!" || node.operator === "not") {
      if (rhs instanceof BooleanValue) {
        return new BooleanValue(!rhs.value);
      }
      const instruction = new Instruction();
      instruction.opcode = "operator_not";
      instruction.meta = isa.operators.not;
      instruction.inputs.OPERAND = rhs;
      return instruction;
    }

    if (node.operator === "-") {
      if (rhs instanceof NumberValue) {
        return new NumberValue(-rhs.value);
      }
      const sub = new BinaryExpression();
      sub.operator = "-";
      sub.lhs = new NumberValue(0);
      sub.rhs = rhs;
      return sub;
    }
  }

  visitListAccessNode(node) {
    const list = this.currentScope.getList(node.ident.symbol);
    const instruction = new Instruction();
    instruction.opcode = "data_itemoflist";

    const visitedIndex = this.visit(node.index);

    if (visitedIndex instanceof NumberValue) {
      instruction.inputs.INDEX = new NumberValue(visitedIndex.value + 1);
    } else {
      const add = new BinaryExpression();
      add.operator = "+";
      add.lhs = visitedIndex;
      add.rhs = new NumberValue(1);
      instruction.inputs.INDEX = add;
    }

    instruction.fields.LIST = [list.symbol, list.id];
    return instruction;
  }

  visitArrayLiteral(node) {
    return node.elements.map((element) => {
      let val = this.visit(element);
      if (val && val.id) {
        val = val.value;
      }
      return val;
    });
  }

  visitFunctionDeclaration(node) {
    const procData = this.procedures.get(node.name.symbol);

    const block = new EventBlock();
    block.opcode = "procedures_definition";
    block.proccode = procData.proccode;
    block.params = node.params;
    block.warp = procData.warp;

    const parentScope = this.currentScope;
    this.currentScope = new Scope(parentScope);
    this.currentScope.parameters = new Set(node.params);

    block.instructions = this.analyzeInstructions(node.block.body);

    this.scopes.push(this.currentScope);
    this.currentScope = parentScope;
    this.targets.get(this.currentTarget).blocks.push(block);
  }

  visitBlock(node) {
    const parentScope = this.currentScope;
    this.currentScope = new Scope(parentScope);

    const instructions = [];
    let terminated = false;
    node.body.forEach((child) => {
      const result = this.visit(child);
      if (result instanceof Instruction) {
        if (terminated) {
          this.error(
            sprintf(
              "unreachable code detected on line %d",
              indexToLineCol(this.source, child.start).line,
            ),
          );
        }

        instructions.push(result);
        if (TERMINATORS.includes(result.opcode)) {
          terminated = true;
        }
      }
    });

    this.currentScope = parentScope;
    return instructions;
  }
}

module.exports = {
  Analyzer,
  Scope,
};
