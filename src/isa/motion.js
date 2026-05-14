module.exports = {
  moveSteps: {
    opcode: "motion_movesteps",
    type: "command",
    inputs: { STEPS: 0 },
  },
  turnRight: {
    opcode: "motion_turnright",
    type: "command",
    inputs: { DEGREES: 0 },
  },
  turnLeft: {
    opcode: "motion_turnleft",
    type: "command",
    inputs: { DEGREES: 0 },
  },
  goTo: {
    opcode: "motion_goto",
    type: "command",
    inputs: { TO: 0 },
  },
  goToXY: {
    opcode: "motion_gotoxy",
    type: "command",
    inputs: { X: 0, Y: 1 },
  },
  glideTo: {
    opcode: "motion_glideto",
    type: "command",
    inputs: { SECS: 0, TO: 1 },
  },
  glideSecsToXY: {
    opcode: "motion_glidesecstoxy",
    type: "command",
    inputs: { SECS: 0, X: 1, Y: 2 },
  },
  pointInDirection: {
    opcode: "motion_pointindirection",
    type: "command",
    inputs: { DIRECTION: 0 },
  },
  pointTowards: {
    opcode: "motion_pointtowards",
    type: "command",
    inputs: { TOWARDS: 0 },
  },
  changeXBy: {
    opcode: "motion_changexby",
    type: "command",
    inputs: { DX: 0 },
  },
  setX: {
    opcode: "motion_setx",
    type: "command",
    inputs: { X: 0 },
  },
  changeYBy: {
    opcode: "motion_changeyby",
    type: "command",
    inputs: { DY: 0 },
  },
  setY: {
    opcode: "motion_sety",
    type: "command",
    inputs: { Y: 0 },
  },
  ifOnEdgeBounce: {
    opcode: "motion_ifonedgebounce",
    type: "command",
  },
  setRotationStyle: {
    opcode: "motion_setrotationstyle",
    type: "command",
    fields: { STYLE: 0 },
  },
  xPosition: {
    opcode: "motion_xposition",
    type: "reporter",
  },
  yPosition: {
    opcode: "motion_yposition",
    type: "reporter",
  },
  direction: {
    opcode: "motion_direction",
    type: "reporter",
  },
};
