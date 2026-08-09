/**
 * Safe arithmetic evaluator for the secretary's calculator tool.
 * Supports + - * / ( ) and decimal numbers — nothing else, no eval.
 * Recursive descent; throws on any invalid input.
 */
export function safeCalculate(expression: string): number {
  // strip currency symbols, thousands separators and whitespace the model
  // may pass through ("3 × ₪7,800" → "3*7800")
  const cleaned = expression
    .replace(/[₪,\s]/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");
  if (!/^[\d+\-*/().]+$/.test(cleaned) || cleaned.length > 200) {
    throw new Error("invalid expression");
  }

  let pos = 0;

  function parseExpression(): number {
    let value = parseTerm();
    while (pos < cleaned.length) {
      const op = cleaned[pos];
      if (op !== "+" && op !== "-") break;
      pos++;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (pos < cleaned.length) {
      const op = cleaned[pos];
      if (op !== "*" && op !== "/") break;
      pos++;
      const rhs = parseFactor();
      if (op === "/" && rhs === 0) throw new Error("division by zero");
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseFactor(): number {
    if (cleaned[pos] === "-") {
      pos++;
      return -parseFactor();
    }
    if (cleaned[pos] === "(") {
      pos++;
      const value = parseExpression();
      if (cleaned[pos] !== ")") throw new Error("unbalanced parentheses");
      pos++;
      return value;
    }
    const match = /^\d+(\.\d+)?/.exec(cleaned.slice(pos));
    if (!match) throw new Error("expected number");
    pos += match[0].length;
    return Number(match[0]);
  }

  const result = parseExpression();
  if (pos !== cleaned.length || !Number.isFinite(result)) {
    throw new Error("invalid expression");
  }
  return result;
}
