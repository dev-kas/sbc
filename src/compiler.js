const scratch = require("./scratch");
const { generate } = require("./id");
const { NumberValue, StringValue, BooleanValue } = require("./analysisvalues");
const { BinaryExpression, ComparisonExpression } = require("./ast");
const { sprintf } = require("./utils");

class Compiler {
  constructor() {
    this.reset();
  }

  reset() {
    this.project = new scratch.Project();

    this.stage = new scratch.Target();
    this.stage.name = "Stage";
    this.stage.isStage = true;
    this.project.targets.push(this.stage);

    this.mainSprite = new scratch.Target();
    this.mainSprite.layerOrder = 1;
    this.project.targets.push(this.mainSprite);
  }

  compile(analysis) {
    this.reset();

    analysis.scopes.forEach((scope) => {
      scope.variables.forEach((val, name) => {
        const id = scope.varIDs.get(name);
        const target = scope.globals.has(name) ? this.stage : this.mainSprite;

        let initialValue = 0;
        let current = val;
        while (current && current.id) current = current.value;

        if (current && typeof current === "object" && "value" in current) {
          initialValue = current.value;
        } else if (current !== undefined) {
          initialValue = current;
        }

        target.variables[id] = [sprintf("%s\n%s", name, id), initialValue];
      });
    });

    analysis.blocks.forEach((eventBlock) => {
      this.compileEvent(eventBlock, this.mainSprite);
    });

    return this.project;
  }

  compileEvent(eventBlock, target) {
    const hatId = generate("block");
    const hat = new scratch.Block();
    hat.opcode = eventBlock.opcode;
    hat.topLevel = true;
    hat.fields = eventBlock.fields;

    for (const [key, value] of Object.entries(eventBlock.inputs)) {
      hat.inputs[key] = this.compileInput(value, target, hatId);
    }

    target.blocks[hatId] = hat;

    const firstBodyBlockId = this.compileInstructionList(
      eventBlock.instructions,
      target,
      hatId,
    );

    hat.next = firstBodyBlockId;
  }

  compileInstruction(inst, target, parentId) {
    const blockId = generate("block");
    const block = new scratch.Block();
    block.opcode = inst.opcode;
    block.parent = parentId;

    for (const [key, value] of Object.entries(inst.inputs)) {
      block.inputs[key] = this.compileInput(value, target, blockId);
    }

    if (inst.opcode === "control_forever" && inst.body) {
      const substackId = this.compileInstructionList(
        inst.body,
        target,
        blockId,
      );
      if (substackId) {
        block.inputs.SUBSTACK = [3, substackId, [4, ""]];
      }
    }

    block.fields = inst.fields;
    target.blocks[blockId] = block;
    return blockId;
  }

  compileInput(val, target, parentId) {
    if (val instanceof NumberValue) {
      return [1, [4, val.value.toString()]];
    }
    if (val instanceof StringValue) {
      return [1, [10, val.value]];
    }
    if (val instanceof BooleanValue) {
      return [1, [10, val.value.toString()]];
    }

    if (
      val instanceof BinaryExpression ||
      val instanceof ComparisonExpression
    ) {
      const expressionBlockId = this.compileExpression(val, target, parentId);
      return [3, expressionBlockId, [4, ""]];
    }

    if (val && val.id) {
      const blockId = generate("block");
      target.blocks[blockId] = {
        opcode: "data_variable",
        fields: { VARIABLE: [val.symbol || "unknown", val.id] },
        parent: parentId,
        inputs: {},
        next: null,
        topLevel: false,
        shadow: false,
      };
      return [3, blockId, [4, ""]];
    }

    return [1, [10, ""]];
  }

  compileExpression(expr, target, parentId) {
    const blockId = generate("block");
    const block = {
      opcode: this.mapOperatorOpcode(expr.operator),
      parent: parentId,
      inputs: {},
      fields: {},
      next: null,
      topLevel: false,
      shadow: false,
    };

    const isLogic = [">", "<", "=="].includes(expr.operator);
    const in1 = isLogic ? "OPERAND1" : "NUM1";
    const in2 = isLogic ? "OPERAND2" : "NUM2";

    block.inputs[in1] = this.compileInput(expr.lhs, target, blockId);
    block.inputs[in2] = this.compileInput(expr.rhs, target, blockId);

    target.blocks[blockId] = block;
    return blockId;
  }

  mapOperatorOpcode(op) {
    const maps = {
      "+": "operator_add",
      "-": "operator_subtract",
      "*": "operator_multiply",
      "/": "operator_divide",
      ">": "operator_gt",
      "<": "operator_lt",
    };
    return maps[op];
  }

  compileInstructionList(instructions, target, parentId) {
    if (instructions.length === 0) return null;

    let firstBlockId = null;
    let lastBlockId = null;

    instructions.forEach((inst, index) => {
      const currentParentId = index === 0 ? parentId : lastBlockId;

      const currentBlockId = this.compileInstruction(
        inst,
        target,
        currentParentId,
      );

      if (index === 0) {
        firstBlockId = currentBlockId;
      } else {
        target.blocks[lastBlockId].next = currentBlockId;
      }

      lastBlockId = currentBlockId;
    });

    return firstBlockId;
  }
}

module.exports = { Compiler };
