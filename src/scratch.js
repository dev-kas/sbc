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
  videoState = "on";
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
  next = null;
  parent = null;
  inputs = {};
  fields = {};
  shadow = false;
  topLevel = false;
  x = 0;
  y = 0;
  mutation;
}

class Monitor {
  id;
  mode = "default"; // "default", "large", "slider", or "list"
  opcode; // "data_variable" or "data_listcontents"
  params = {};
  spriteName = null;
  value = 0;
  width = 0;
  height = 0;
  x = 5;
  y = 5;
  visible = true;
  sliderMin = 0;
  sliderMax = 100;
  isDiscrete = true;
}

const InputStatus = {
  SHADOW: 1,
  NO_SHADOW: 2,
  BLOCK: 3,
};

const MathValues = {
  NUMBER: 4,
  POSITIVE_NUMBER: 5,
  POSITIVE_INTEGER: 6,
  INTEGER: 7,
  ANGLE: 8,
  COLOR: 9,
  STRING: 10,
  BROADCAST: 11,
  VARIABLE: 12,
  LIST: 13,
};

module.exports = {
  Project,
  Meta,
  Target,
  Costume,
  Sound,
  Block,
  Monitor,
  InputStatus,
  MathValues,
};
