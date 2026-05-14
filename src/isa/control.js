module.exports = {
  wait: {
    opcode: "control_wait",
    type: "command",
    inputs: { DURATION: 0 },
  },
  repeat: {
    opcode: "control_repeat",
    type: "command",
    inputs: { TIMES: 0 },
  },
  forever: {
    opcode: "control_forever",
    type: "command",
  },
  if: {
    opcode: "control_if",
    type: "command",
  },
  ifElse: {
    opcode: "control_if_else",
    type: "command",
  },
  waitUntil: {
    opcode: "control_wait_until",
    type: "command",
  },
  repeatUntil: {
    opcode: "control_repeat_until",
    type: "command",
  },
  stop: {
    opcode: "control_stop",
    type: "command",
    fields: { STOP_OPTION: 0 },
  },
  startAsClone: {
    opcode: "control_start_as_clone",
    type: "hat",
  },
  createCloneOf: {
    opcode: "control_create_clone_of",
    type: "command",
    inputs: { CLONE_OPTION: 0 },
  },
  deleteThisClone: {
    opcode: "control_delete_this_clone",
    type: "command",
  },
};
