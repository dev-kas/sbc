module.exports = {
  playUntilDone: {
    opcode: "sound_playuntildone",
    type: "command",
    inputs: { SOUND_MENU: 0 },
  },
  play: {
    opcode: "sound_play",
    type: "command",
    inputs: { SOUND_MENU: 0 },
  },
  stopAllSounds: {
    opcode: "sound_stopallsounds",
    type: "command",
  },
  changeEffectBy: {
    opcode: "sound_changeeffectby",
    type: "command",
    inputs: { VALUE: 0 },
    fields: { EFFECT: 0 },
  },
  setEffectTo: {
    opcode: "sound_seteffectto",
    type: "command",
    inputs: { VALUE: 0 },
    fields: { EFFECT: 0 },
  },
  clearEffects: {
    opcode: "sound_cleareffects",
    type: "command",
  },
  changeVolumeBy: {
    opcode: "sound_changevolumeby",
    type: "command",
    inputs: { VOLUME: 0 },
  },
  setVolumeTo: {
    opcode: "sound_setvolumeto",
    type: "command",
    inputs: { VOLUME: 0 },
  },
  volume: {
    opcode: "sound_volume",
    type: "reporter",
  },
};
