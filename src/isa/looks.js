module.exports = {
  sayForSecs: {
    opcode: "looks_sayforsecs",
    type: "command",
    inputs: { MESSAGE: 0, SECS: 1 },
  },
  say: {
    opcode: "looks_say",
    type: "command",
    inputs: { MESSAGE: 0 },
  },
  thinkForSecs: {
    opcode: "looks_thinkforsecs",
    type: "command",
    inputs: { MESSAGE: 0, SECS: 1 },
  },
  think: {
    opcode: "looks_think",
    type: "command",
    inputs: { MESSAGE: 0 },
  },
  switchCostumeTo: {
    opcode: "looks_switchcostumeto",
    type: "command",
    inputs: { COSTUME: 0 },
  },
  nextCostume: {
    opcode: "looks_nextcostume",
    type: "command",
  },
  switchBackdropTo: {
    opcode: "looks_switchbackdropto",
    type: "command",
    inputs: { BACKDROP: 0 },
  },
  switchBackdropToAndWait: {
    opcode: "looks_switchbackdroptoandwait",
    type: "command",
    inputs: { BACKDROP: 0 },
  },
  nextBackdrop: {
    opcode: "looks_nextbackdrop",
    type: "command",
  },
  changeSizeBy: {
    opcode: "looks_changesizeby",
    type: "command",
    inputs: { CHANGE: 0 },
  },
  setSizeTo: {
    opcode: "looks_setsizeto",
    type: "command",
    inputs: { SIZE: 0 },
  },
  changeEffectBy: {
    opcode: "looks_changeeffectby",
    type: "command",
    inputs: { CHANGE: 0 },
    fields: { EFFECT: 0 },
  },
  setEffectTo: {
    opcode: "looks_seteffectto",
    type: "command",
    inputs: { VALUE: 0 },
    fields: { EFFECT: 0 },
  },
  clearGraphicEffects: {
    opcode: "looks_cleargraphiceffects",
    type: "command",
  },
  show: {
    opcode: "looks_show",
    type: "command",
  },
  hide: {
    opcode: "looks_hide",
    type: "command",
  },
  goToFrontBack: {
    opcode: "looks_gotofrontback",
    type: "command",
    fields: { FRONT_BACK: 0 },
  },
  goForwardBackwardLayers: {
    opcode: "looks_goforwardbackwardlayers",
    type: "command",
    inputs: { NUM: 0 },
    fields: { FORWARD_BACKWARD: 0 },
  },
  costumeNumberName: {
    opcode: "looks_costumenumbername",
    type: "reporter",
    fields: { NUMBER_NAME: 0 },
  },
  backdropNumberName: {
    opcode: "looks_backdropnumbername",
    type: "reporter",
    fields: { NUMBER_NAME: 0 },
  },
  size: {
    opcode: "looks_size",
    type: "reporter",
  },
};
