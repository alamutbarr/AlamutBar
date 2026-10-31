import test from "node:test";
import assert from "node:assert/strict";
import {
  KYC_SHIPMENT_MISSING,
  KYC_SHIPMENT_PENDING,
  KYC_SHIPMENT_REJECTED,
  POSTAL_CODE_REQUIRED,
  ownerCanCreateShipment,
  ownerKycShipmentIssue,
  ownerPostalShipmentIssue,
  ownerShipmentBlockers,
} from "./ownerKycGate.js";

test("unverified owners cannot create a shipment and get a KYC error", () => {
  assert.equal(ownerCanCreateShipment({ verification_status: "PENDING" }), false);
  assert.equal(ownerKycShipmentIssue({}), KYC_SHIPMENT_MISSING);
  assert.equal(
    ownerKycShipmentIssue({ verification_status: "PENDING", kyc: { documents: [] } }),
    KYC_SHIPMENT_MISSING,
  );
});

test("uploaded but unreviewed documents wait for approval", () => {
  const user = {
    verification_status: "PENDING",
    kyc: {
      verificationStatus: "PENDING",
      documents: [
        { required: true, url: "/a.jpg", status: "PENDING" },
        { required: true, url: "/b.jpg", status: "PENDING" },
      ],
    },
  };
  assert.equal(ownerCanCreateShipment(user), false);
  assert.equal(ownerKycShipmentIssue(user), KYC_SHIPMENT_PENDING);
});

test("rejected identity documents tell the owner to fix profile KYC", () => {
  assert.equal(
    ownerKycShipmentIssue({ verification_status: "REJECTED" }),
    KYC_SHIPMENT_REJECTED,
  );
});

test("verified owners still need a 10-digit postal code before creating a shipment", () => {
  const user = { verification_status: "VERIFIED", kyc: { verificationStatus: "VERIFIED" } };
  assert.equal(ownerKycShipmentIssue(user), "");
  assert.equal(ownerPostalShipmentIssue(user), POSTAL_CODE_REQUIRED);
  assert.equal(ownerCanCreateShipment(user), false);
  assert.deepEqual(ownerShipmentBlockers(user), [
    { code: "POSTAL_CODE_REQUIRED", message: POSTAL_CODE_REQUIRED },
  ]);
});

test("verified owners with a postal code may create a shipment", () => {
  const user = {
    verification_status: "VERIFIED",
    postal_code: "1234567890",
    kyc: { verificationStatus: "VERIFIED" },
  };
  assert.equal(ownerCanCreateShipment(user), true);
  assert.equal(ownerKycShipmentIssue(user), "");
  assert.equal(ownerPostalShipmentIssue(user), "");
  assert.deepEqual(ownerShipmentBlockers(user), []);
});

test("unverified owners get both KYC and postal blockers when postal is missing", () => {
  const blockers = ownerShipmentBlockers({ verification_status: "PENDING" });
  assert.equal(blockers.length, 2);
  assert.equal(blockers[0].code, "KYC_REQUIRED");
  assert.equal(blockers[1].code, "POSTAL_CODE_REQUIRED");
  assert.equal(blockers[1].message, POSTAL_CODE_REQUIRED);
});
