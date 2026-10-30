import test from "node:test";
import assert from "node:assert/strict";
import { KYC_MAX_BYTES, kycFileIssue } from "./kycFile.js";

test("kyc rejects oversized and non-image files with a Persian message", () => {
  assert.match(kycFileIssue({ type: "image/jpeg", size: KYC_MAX_BYTES + 1 }), /۵ مگابایت/);
  assert.match(kycFileIssue({ type: "application/pdf", size: 1000 }), /JPG/);
  assert.equal(kycFileIssue({ type: "image/png", size: 1024 }), "");
});
