class Generator {
  constructor() {
    this.counter = 0;
  }

  generate(prefix = "id") {
    this.counter++;
    return prefix + "-" + this.counter.toString(36);
  }
}

const generator = new Generator();

module.exports = {
  generate(...args) {
    return generator.generate(...args);
  },
  Generator,
};
