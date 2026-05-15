module.exports = {
  touchingObject: {
    opcode: "sensing_touchingobject",
    type: "boolean",
    inputs: { TOUCHINGOBJECTMENU: 0 },
    menus: { TOUCHINGOBJECTMENU: "sensing_touchingobjectmenu" },
  },
  touchingColor: {
    opcode: "sensing_touchingcolor",
    type: "boolean",
    inputs: { COLOR: 0 },
  },
  colorIsTouchingColor: {
    opcode: "sensing_coloristouchingcolor",
    type: "boolean",
    inputs: { COLOR: 0, COLOR2: 1 },
  },
  distanceTo: {
    opcode: "sensing_distanceto",
    type: "reporter",
    inputs: { DISTANCETOMENU: 0 },
  },
  askAndWait: {
    opcode: "sensing_askandwait",
    type: "command",
    inputs: { QUESTION: 0 },
  },
  answer: {
    opcode: "sensing_answer",
    type: "reporter",
  },
  keyPressed: {
    opcode: "sensing_keypressed",
    type: "boolean",
    inputs: { KEY_OPTION: 0 },
  },
  mouseDown: {
    opcode: "sensing_mousedown",
    type: "boolean",
  },
  mouseX: {
    opcode: "sensing_mousex",
    type: "reporter",
  },
  mouseY: {
    opcode: "sensing_mousey",
    type: "reporter",
  },
  setDragMode: {
    opcode: "sensing_setdragmode",
    type: "command",
    fields: { DRAG_MODE: 0 },
  },
  loudness: {
    opcode: "sensing_loudness",
    type: "reporter",
  },
  timer: {
    opcode: "sensing_timer",
    type: "reporter",
  },
  resetTimer: {
    opcode: "sensing_resettimer",
    type: "command",
  },
  of: {
    opcode: "sensing_of",
    type: "reporter",
    inputs: { OBJECT: 0 },
    fields: { PROPERTY: 0 },
  },
  current: {
    opcode: "sensing_current",
    type: "reporter",
    fields: { CURRENTMENU: 0 },
  },
  daysSince2000: {
    opcode: "sensing_dayssince2000",
    type: "reporter",
  },
  online: {
    opcode: "sensing_online",
    type: "boolean",
  },
  username: {
    opcode: "sensing_username",
    type: "reporter",
  },
};
