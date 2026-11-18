export const business = {
  operator: process.env.BUSINESS_OPERATOR_NAME?.trim(),
  email: process.env.BUSINESS_CONTACT_EMAIL?.trim(),
  retention: process.env.BUSINESS_RETENTION_NOTICE?.trim(),
  terms: process.env.BUSINESS_TERMS_NOTICE?.trim(),
};
