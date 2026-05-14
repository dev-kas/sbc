module.exports = {
  // variables
  variable: {
    opcode: "data_variable",
    type: "reporter",
    fields: { VARIABLE: 0 },
  },
  setVariableTo: {
    opcode: "data_setvariableto",
    type: "command",
    inputs: { VALUE: 0 },
    fields: { VARIABLE: 0 },
  },
  changeVariableBy: {
    opcode: "data_changevariableby",
    type: "command",
    inputs: { VALUE: 0 },
    fields: { VARIABLE: 0 },
  },
  showVariable: {
    opcode: "data_showvariable",
    type: "command",
    fields: { VARIABLE: 0 },
  },
  hideVariable: {
    opcode: "data_hidevariable",
    type: "command",
    fields: { VARIABLE: 0 },
  },

  // lists
  listContents: {
    opcode: "data_listcontents",
    type: "reporter",
    fields: { LIST: 0 },
  },
  addToList: {
    opcode: "data_addtolist",
    type: "command",
    inputs: { ITEM: 0 },
    fields: { LIST: 0 },
  },
  deleteOfList: {
    opcode: "data_deleteoflist",
    type: "command",
    inputs: { INDEX: 0 },
    fields: { LIST: 0 },
  },
  deleteAllOfList: {
    opcode: "data_deletealloflist",
    type: "command",
    fields: { LIST: 0 },
  },
  insertAtList: {
    opcode: "data_insertatlist",
    type: "command",
    inputs: { ITEM: 0, INDEX: 1 },
    fields: { LIST: 0 },
  },
  replaceItemOfList: {
    opcode: "data_replaceitemoflist",
    type: "command",
    inputs: { INDEX: 0, ITEM: 1 },
    fields: { LIST: 0 },
  },
  itemOfList: {
    opcode: "data_itemoflist",
    type: "reporter",
    inputs: { INDEX: 0 },
    fields: { LIST: 0 },
  },
  itemNumOfList: {
    opcode: "data_itemnumoflist",
    type: "reporter",
    inputs: { ITEM: 0 },
    fields: { LIST: 0 },
  },
  lengthOfList: {
    opcode: "data_lengthoflist",
    type: "reporter",
    fields: { LIST: 0 },
  },
  listContainsItem: {
    opcode: "data_listcontainsitem",
    type: "boolean",
    inputs: { ITEM: 0 },
    fields: { LIST: 0 },
  },
  showList: {
    opcode: "data_showlist",
    type: "command",
    fields: { LIST: 0 },
  },
  hideList: {
    opcode: "data_hidelist",
    type: "command",
    fields: { LIST: 0 },
  },
};
