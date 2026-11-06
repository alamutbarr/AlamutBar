import test from "node:test";
import assert from "node:assert/strict";
import { formatRialAsTomanAmount } from "./currency.util.js";

test("confirm page shows cargo value in toman, not rial with an extra zero", () => {
  assert.equal(formatRialAsTomanAmount(100_000_000), "10,000,000");
  assert.equal(formatRialAsTomanAmount("50000000"), "5,000,000");
  assert.equal(formatRialAsTomanAmount(""), "");
});
