const scratch = require("./scratch");
const { generate } = require("./id");
const {
  NumberValue,
  StringValue,
  BooleanValue,
  Instruction,
} = require("./analysisvalues");
const { BinaryExpression, ComparisonExpression } = require("./ast");
const { sprintf } = require("./utils");

const SCRATCH_MAGIC_STRINGS = {
  "mouse-pointer": "_mouse_",
  "random-position": "_random_",
  edge: "_edge_",
  myself: "_myself_",
  Stage: "_stage_",
};

class Compiler {
  constructor() {
    this.reset();
  }

  reset() {
    this.project = new scratch.Project();
    this.stage = this._createTarget("Stage", true);
    this.mainSprite = this._createTarget("Sprite1", false);
    this.project.targets = [this.stage, this.mainSprite];
  }

  _createTarget(name, isStage) {
    const t = new scratch.Target();
    t.name = name;
    t.isStage = isStage;
    t.layerOrder = isStage ? 0 : 1;
    return t;
  }

  compile(analysis) {
    this.reset();

    analysis.scopes.forEach((scope) => {
      scope.variables.forEach((val, name) => {
        const id = scope.varIDs.get(name);
        const target = scope.globals.has(name) ? this.stage : this.mainSprite;

        let initial = val;
        while (initial && initial.id) initial = initial.value;
        const finalValue =
          initial && typeof initial === "object" && "value" in initial
            ? initial.value
            : (initial ?? 0);

        target.variables[id] = [sprintf("%s\n%s", name, id), finalValue];
      });

      scope.lists.forEach((val, name) => {
        const id = scope.listIDs.get(name);
        const target = scope.globals.has(name) ? this.stage : this.mainSprite;
        const rawValues = val.map((v) => v.value);
        target.lists[id] = [name, rawValues];
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

    if (eventBlock.opcode === "procedures_definition") {
      const prototypeId = generate("prototype");

      const argNames = eventBlock.params || [];
      const argIds = argNames.map((_, i) => `arg${i}`);
      const argDefaults = argNames.map(() => "");

      target.blocks[prototypeId] = {
        opcode: "procedures_prototype",
        next: null,
        parent: hatId,
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false,
        mutation: {
          tagName: "mutation",
          children: [],
          proccode: eventBlock.proccode,
          argumentnames: JSON.stringify(argNames),
          argumentids: JSON.stringify(argIds),
          argumentdefaults: JSON.stringify(argDefaults),
          warp: eventBlock.warp ? "true" : "false",
        },
      };

      hat.inputs.custom_block = [2, prototypeId];
    }

    for (const [key, val] of Object.entries(eventBlock.inputs)) {
      hat.inputs[key] = this.compileInput(val, target, hatId);
    }

    target.blocks[hatId] = hat;
    hat.next = this.compileInstructionList(
      eventBlock.instructions,
      target,
      hatId,
    );
  }

  compileInstruction(inst, target, parentId) {
    const blockId = generate("block");
    const block = new scratch.Block();
    block.opcode = inst.opcode;
    block.parent = parentId;
    block.fields = inst.fields;

    for (const [key, val] of Object.entries(inst.inputs)) {
      const menuOpcode = inst.meta?.menus?.[key];
      if (
        menuOpcode &&
        (val instanceof StringValue || val instanceof NumberValue)
      ) {
        const menuId = generate("menu");
        const rawValue = val.value.toString();
        const sanitizedValue = SCRATCH_MAGIC_STRINGS[rawValue] || rawValue;
        target.blocks[menuId] = {
          opcode: menuOpcode,
          next: null,
          parent: blockId,
          inputs: {},
          fields: { [key]: [sanitizedValue, null] },
          shadow: true,
          topLevel: false,
        };
        block.inputs[key] = [scratch.InputStatus.SHADOW, menuId];
      } else {
        block.inputs[key] = this.compileInput(val, target, blockId);
      }
    }

    if (inst.opcode === "procedures_call") {
      const argIds = Object.keys(inst.inputs);

      block.mutation = {
        tagName: "mutation",
        children: [],
        proccode: inst.proccode,
        argumentids: JSON.stringify(argIds),
        warp: inst.warp ? "true" : "false",
      };
    }

    if (inst.opcode === "control_stop") {
      const opt = block.fields.STOP_OPTION
        ? block.fields.STOP_OPTION[0]
        : "all";
      const isCap = opt !== "other scripts in sprite";
      block.mutation = {
        tagName: "mutation",
        children: [],
        hasnext: isCap ? "false" : "true",
      };
      if (isCap) block.next = null;
    } else if (inst.opcode === "sensing_of") {
      block.mutation = {
        tagName: "mutation",
        children: [],
        string: block.fields.PROPERTY[0],
      };
    }

    const substacks = { body: "SUBSTACK", elseBody: "SUBSTACK2" };
    for (const [prop, inputName] of Object.entries(substacks)) {
      if (inst[prop]) {
        const subId = this.compileInstructionList(inst[prop], target, blockId);
        if (subId)
          block.inputs[inputName] = [scratch.InputStatus.BLOCK, subId, null];
      }
    }

    target.blocks[blockId] = block;
    return blockId;
  }

  compileInput(val, target, parentId) {
    if (val instanceof NumberValue)
      return [
        scratch.InputStatus.SHADOW,
        [scratch.MathValues.NUMBER, val.value.toString()],
      ];
    if (val instanceof StringValue)
      return [
        scratch.InputStatus.SHADOW,
        [scratch.MathValues.STRING, val.value],
      ];
    if (val instanceof BooleanValue)
      return [
        scratch.InputStatus.SHADOW,
        [scratch.MathValues.STRING, val.value.toString()],
      ];

    if (
      val instanceof Instruction ||
      val instanceof BinaryExpression ||
      val instanceof ComparisonExpression
    ) {
      const isInst = val instanceof Instruction;
      const blockId = isInst
        ? this.compileInstruction(val, target, parentId)
        : this.compileExpression(val, target, parentId);

      const type = isInst
        ? val.meta?.type
        : this._isLogicalOp(val.operator)
          ? "boolean"
          : "reporter";
      const shadow =
        type === "boolean" ? null : [scratch.MathValues.STRING, ""];

      return [scratch.InputStatus.BLOCK, blockId, shadow];
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
      return [
        scratch.InputStatus.BLOCK,
        blockId,
        [scratch.MathValues.STRING, ""],
      ];
    }

    if (val.opcode === "argument_reporter_string_number") {
      const blockId = generate("block");
      target.blocks[blockId] = {
        opcode: val.opcode,
        parent: parentId,
        fields: val.fields,
        inputs: {},
        next: null,
        topLevel: false,
        shadow: false,
      };
      return [
        scratch.InputStatus.BLOCK,
        blockId,
        [scratch.MathValues.STRING, ""],
      ];
    }

    return [scratch.InputStatus.SHADOW, [scratch.MathValues.STRING, ""]];
  }

  compileExpression(expr, target, parentId) {
    const blockId = generate("block");
    const opcode = this._mapOp(expr.operator);
    const isLogic = this._isLogicalOp(expr.operator);

    const block = {
      opcode,
      parent: parentId,
      fields: {},
      next: null,
      topLevel: false,
      shadow: false,
      inputs: {
        [isLogic ? "OPERAND1" : "NUM1"]: this.compileInput(
          expr.lhs,
          target,
          blockId,
        ),
        [isLogic ? "OPERAND2" : "NUM2"]: this.compileInput(
          expr.rhs,
          target,
          blockId,
        ),
      },
    };

    target.blocks[blockId] = block;
    return blockId;
  }

  _isLogicalOp(op) {
    return [">", "<", "==", "&&", "||"].includes(op);
  }

  _mapOp(op) {
    const maps = {
      "+": "operator_add",
      "-": "operator_subtract",
      "*": "operator_multiply",
      "/": "operator_divide",
      ">": "operator_gt",
      "<": "operator_lt",
      "==": "operator_equals",
    };
    return maps[op] || op;
  }

  compileInstructionList(instructions, target, parentId) {
    if (!instructions || instructions.length === 0) return null;
    let firstId = null,
      lastId = null;

    instructions.forEach((inst, i) => {
      const currId = this.compileInstruction(
        inst,
        target,
        i === 0 ? parentId : lastId,
      );
      if (i === 0) firstId = currId;
      else target.blocks[lastId].next = currId;
      lastId = currId;
    });
    return firstId;
  }
}

module.exports = { Compiler };
