const { generate } = require("./id");

class Project {
  extensions = [];
  meta = new Meta();
  monitors = [];
  targets = [];
}

class Meta {
  agent = "sbc";
  semver = "3.0.0";
  vm = "13.7.3-svg";
}

class Target {
  blocks = {};
  broadcasts = {};
  comments = {};
  costumes = [];
  currentCostume = 0;
  direction = 90;
  draggable = false;
  isStage = false;
  layerOrder = 0;
  lists = {};
  name = generate("sprite");
  rotationStyle = "all around";
  size = 100;
  sounds = [];
  variables = {};
  visible = true;
  volume = 100;
  x = 0;
  y = 0;
  tempo = 60;
  textToSpeechLanguage = null;
  videoStat = "on";
  videoTransparency = 50;
}

class Costume {
  name = generate("costume");
  dataFormat = "svg";
  assetId;
  md5ext;
  rotationCenterX = 240;
  rotationCenterY = 180;
  bitmapResolution = 1;
}

class Sound {
  name = generate("sound");
  assetId;
  dataFormat = "wav";
  format;
  rate = 48000;
  sampleCount;
  md5ext;
}

class Block {
  opcode;
  next;
  parent;
  inputs = {};
  fields = {};
  shadow = false;
  topLevel = false;
  x = 0;
  y = 0;
}

module.exports = {
  Project,
  Meta,
  Target,
  Costume,
  Sound,
  Block,
  unobscuredShadow: 1,
  noShadow: 2,
  obscuredShadow: 3,
  number: 4,
  color: 9,
  text: 10,
  broadcast: 11,
  variable: 12,
  list: 13,
};
