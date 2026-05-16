/**
 * @template {string} T
 * @param {T[]} arr
 * @returns {{ [K in keyof { [P in T]: P }]: { [P in T]: P }[K] }}
 */
function enumify(arr) {
  if (!Array.isArray(arr))
    throw new TypeError("argument 'arr' must be a type of Array");
  const enums = {};
  for (const k of arr) {
    if (typeof k !== "string")
      throw new TypeError("argument 'arr' must be an array of Strings");
    if (k in enums) throw new Error(`duplicate enum key: ${k}`);
    enums[k] = k;
  }
  return Object.freeze(enums);
}

function indexToLineCol(text, index) {
  if (index < 0 || index > text.length) {
    throw new RangeError("index out of range");
  }

  let line = 1;
  let col = 1;

  for (let i = 0; i < index; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }

  return { line, col };
}

function sprintf(fmt, ...args) {
  let argIndex = 0;

  return fmt.replace(
    /%([\-+0]*)(\d+)?(?:\.(\d+))?([%sdifxXbocj])/g,
    (_, flags, width, precision, type) => {
      if (type === "%") return "%";

      if (argIndex >= args.length) {
        throw new Error("sprintf: too few arguments");
      }

      let value = args[argIndex++];
      let out = "";

      switch (type) {
        case "s":
          out = String(value);
          if (precision != null) {
            out = out.slice(0, Number(precision));
          }
          break;

        case "d":
        case "i":
          out = Math.trunc(Number(value)).toString(10);
          break;

        case "f":
          out =
            precision != null
              ? Number(value).toFixed(Number(precision))
              : String(Number(value));
          break;

        case "x":
          out = Math.trunc(Number(value)).toString(16);
          break;

        case "X":
          out = Math.trunc(Number(value)).toString(16).toUpperCase();
          break;

        case "b":
          out = Math.trunc(Number(value)).toString(2);
          break;

        case "o":
          out = Math.trunc(Number(value)).toString(8);
          break;

        case "c":
          if (typeof value === "number") {
            out = String.fromCharCode(value);
          } else {
            out = String(value)[0] || "";
          }
          break;

        case "j":
          out = JSON.stringify(value);
          break;

        default:
          out = String(value);
      }

      // sign
      if (flags.includes("+") && /^[dif]$/.test(type) && Number(value) >= 0) {
        out = "+" + out;
      }

      width = width ? Number(width) : 0;

      if (out.length < width) {
        const leftAlign = flags.includes("-");
        const zeroPad = flags.includes("0") && !leftAlign;

        const padChar = zeroPad ? "0" : " ";
        const padding = padChar.repeat(width - out.length);

        out = leftAlign ? out + padding : padding + out;
      }

      return out;
    },
  );
}

function merge(a, b) {
  const out = { ...a };

  for (const key in b) {
    const av = a[key];
    const bv = b[key];

    if (
      av &&
      bv &&
      typeof av === "object" &&
      typeof bv === "object" &&
      !Array.isArray(av) &&
      !Array.isArray(bv)
    ) {
      out[key] = merge(av, bv);
    } else {
      out[key] = bv;
    }
  }

  return out;
}

module.exports = {
  enumify,
  indexToLineCol,
  sprintf,
  merge,
};
