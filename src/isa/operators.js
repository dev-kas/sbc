module.exports = {
  add: {
    opcode: "operator_add",
    type: "reporter",
    inputs: { NUM1: 0, NUM2: 1 },
  },
  subtract: {
    opcode: "operator_subtract",
    type: "reporter",
    inputs: { NUM1: 0, NUM2: 1 },
  },
  multiply: {
    opcode: "operator_multiply",
    type: "reporter",
    inputs: { NUM1: 0, NUM2: 1 },
  },
  divide: {
    opcode: "operator_divide",
    type: "reporter",
    inputs: { NUM1: 0, NUM2: 1 },
  },
  random: {
    opcode: "operator_random",
    type: "reporter",
    inputs: { FROM: 0, TO: 1 },
  },
  gt: {
    opcode: "operator_gt",
    type: "boolean",
    inputs: { OPERAND1: 0, OPERAND2: 1 },
  },
  lt: {
    opcode: "operator_lt",
    type: "boolean",
    inputs: { OPERAND1: 0, OPERAND2: 1 },
  },
  equals: {
    opcode: "operator_equals",
    type: "boolean",
    inputs: { OPERAND1: 0, OPERAND2: 1 },
  },
  and: {
    opcode: "operator_and",
    type: "boolean",
    inputs: { OPERAND1: 0, OPERAND2: 1 },
  },
  or: {
    opcode: "operator_or",
    type: "boolean",
    inputs: { OPERAND1: 0, OPERAND2: 1 },
  },
  not: {
    opcode: "operator_not",
    type: "boolean",
    inputs: { OPERAND: 0 },
  },
  join: {
    opcode: "operator_join",
    type: "reporter",
    inputs: { STRING1: 0, STRING2: 1 },
  },
  letterOf: {
    opcode: "operator_letter_of",
    type: "reporter",
    inputs: { LETTER: 0, STRING: 1 },
  },
  length: {
    opcode: "operator_length",
    type: "reporter",
    inputs: { STRING: 0 },
  },
  contains: {
    opcode: "operator_contains",
    type: "boolean",
    inputs: { STRING1: 0, STRING2: 1 },
  },
  mod: {
    opcode: "operator_mod",
    type: "reporter",
    inputs: { NUM1: 0, NUM2: 1 },
  },
  round: {
    opcode: "operator_round",
    type: "reporter",
    inputs: { NUM: 0 },
  },
  mathOp: {
    opcode: "operator_mathop",
    type: "reporter",
    inputs: { NUM: 0 },
    fields: { OPERATOR: 0 },
  },
};
