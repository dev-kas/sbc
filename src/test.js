const scratch = require("./scratch");
const { generate } = require("./id");

const project = new scratch.Project();

// stage
const stage = new scratch.Target();
stage.name = "Stage";
stage.isStage = true;
const stageCostume = new scratch.Costume();
stageCostume.assetId = "87ec29ad216c0074c731d581c7f40c39";
stageCostume.md5ext = "87ec29ad216c0074c731d581c7f40c39.svg";
stage.costumes.push(stageCostume);
project.targets.push(stage);

// sprite
const sprite = new scratch.Target();
sprite.layerOrder = 1;
const spriteCostume = new scratch.Costume();
spriteCostume.assetId = "6f0c9b9f05092d28f36191d7e68d84a3";
spriteCostume.md5ext = "6f0c9b9f05092d28f36191d7e68d84a3.svg";
sprite.costumes.push(spriteCostume);
project.targets.push(sprite);

// when green flag clicked
const wgfc = new scratch.Block();
wgfc.opcode = "event_whenflagclicked";
wgfc.topLevel = true;
const wgfc_id = generate("block");
sprite.blocks[wgfc_id] = wgfc;

// move (10) steps
const movesteps = new scratch.Block();
movesteps.opcode = "motion_movesteps";
movesteps.parent = wgfc_id;
movesteps.inputs["STEPS"] = [
  scratch.InputStatus.SHADOW,
  [scratch.MathValues.NUMBER, "10"],
];
const ms_id = generate("block");
sprite.blocks[ms_id] = movesteps;
wgfc.next = ms_id;

// output
console.log(JSON.stringify(project));
