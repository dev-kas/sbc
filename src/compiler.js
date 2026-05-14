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

        target.variables[id] = [sprintf("%s\n%s", name, id), val.value || 0];
      });
    });

    analysis.blocks.forEach((eventBlock) => {
      this.compileEvent(eventBlock, this.mainSprite);
    });

    return this.project;
  }

  compileEvent(eventBlock, target) {
    const hat = new scratch.Block();
    hat.opcode = this.mapEventOpcode(eventBlock.name);
    hat.topLevel = true;

    const hatId = generate("block");
    target.blocks[hatId] = hat;

    let previousBlockId = hatId;

    eventBlock.instructions.forEach((inst) => {
      const currentBlockId = this.compileInstruction(
        inst,
        target,
        previousBlockId,
      );

      target.blocks[previousBlockId].next = currentBlockId;
      previousBlockId = currentBlockId;
    });
  }

  compileInstruction(inst, target, parentId) {
    const blockId = generate("block");
    const block = new scratch.Block();
    block.opcode = inst.opcode;
    block.parent = parentId;

    for (const [key, value] of Object.entries(inst.inputs)) {
      block.inputs[key] = this.compileInput(value, target, blockId);
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

  mapEventOpcode(name) {
    const maps = {
      WhenGreenFlagClicked: "event_whenflagclicked",
      WhenThisSpriteClicked: "event_whenthisspriteclicked",
      WhenStartAsClone: "control_start_as_clone",
    };
    return maps[name] || name;
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
}

module.exports = { Compiler };
