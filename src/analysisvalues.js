class AnalysisValue {
  constructor(value) {
    this.value = value;
  }
}

class NumberValue extends AnalysisValue {}
class StringValue extends AnalysisValue {}
class BooleanValue extends AnalysisValue {}

class AnalysisBlock {
  constructor(instructions = []) {
    this.instructions = instructions;
  }
}

class EventBlock extends AnalysisBlock {
  opcode;
  inputs = {};
  fields = {};
}

class Instruction {
  opcode;
  inputs = {};
  fields = {};
}

module.exports = {
  AnalysisValue,
  NumberValue,
  StringValue,
  BooleanValue,
  AnalysisBlock,
  EventBlock,
  Instruction,
};
