module.exports = {
  definition: {
    opcode: "procedures_definition",
    type: "hat",
  },
  prototype: {
    opcode: "procedures_prototype",
    type: "shadow",
  },
  call: {
    opcode: "procedures_call",
    type: "command",
  },
  argumentReporterStringNumber: {
    opcode: "argument_reporter_string_number",
    type: "reporter",
    fields: { VALUE: 0 },
  },
  argumentReporterBoolean: {
    opcode: "argument_reporter_boolean",
    type: "boolean",
    fields: { VALUE: 0 },
  },
};
