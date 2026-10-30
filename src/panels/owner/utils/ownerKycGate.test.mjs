import test from "node:test";
import assert from "node:assert/strict";
import {
  KYC_SHIPMENT_MISSING,
  KYC_SHIPMENT_PENDING,
  KYC_SHIPMENT_REJECTED,
  ownerCanCreateShipment,
  ownerKycShipmentIssue,
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

test("verified owners may create a shipment", () => {
  const user = { verification_status: "VERIFIED", kyc: { verificationStatus: "VERIFIED" } };
  assert.equal(ownerCanCreateShipment(user), true);
  assert.equal(ownerKycShipmentIssue(user), "");
});
