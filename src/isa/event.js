module.exports = {
  whenFlagClicked: {
    opcode: "event_whenflagclicked",
    type: "hat",
  },
  whenKeyPressed: {
    opcode: "event_whenkeypressed",
    type: "hat",
    fields: { KEY_OPTION: 0 },
  },
  whenStageClicked: {
    opcode: "event_whenstageclicked",
    type: "hat",
  },
  whenThisSpriteClicked: {
    opcode: "event_whenthisspriteclicked",
    type: "hat",
  },
  whenBackdropSwitchesTo: {
    opcode: "event_whenbackdropswitchestop",
    type: "hat",
    fields: { BACKDROP: 0 },
  },
  whenGreaterThan: {
    opcode: "event_whengreaterthan",
    type: "hat",
    fields: { WHENGREATERTHANMENU: 0 },
    inputs: { VALUE: 1 },
  },
  whenBroadcastReceived: {
    opcode: "event_whenbroadcastreceived",
    type: "hat",
    fields: { BROADCAST_OPTION: 0 },
  },
  broadcast: {
    opcode: "event_broadcast",
    type: "command",
    inputs: { BROADCAST_INPUT: 0 },
    fields: {},
  },
  broadcastAndWait: {
    opcode: "event_broadcastandwait",
    type: "command",
    inputs: { BROADCAST_INPUT: 0 },
    fields: {},
  },
};
