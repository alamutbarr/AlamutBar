function calculatePenalty({
  delayMinutes = 0,
  stepMinutes = 30,
  perStep = 0,
  capRatio = 0.15,
  freight = 0,
  forceMajeure = false,
} = {}) {
  const minutes = Math.max(0, Number(delayMinutes) || 0);
  const step = Math.max(1, Number(stepMinutes) || 30);
  if (forceMajeure || minutes <= 0) {
    return { amount: 0, steps: 0, capped: false, billableMinutes: 0 };
  }
  const steps = Math.floor(minutes / step);
  const raw = steps * (Number(perStep) || 0);
  const fare = Number(freight) || 0;
  const cap = fare > 0 ? Math.round(fare * (Number(capRatio) || 0)) : null;
  const capped = cap != null && raw > cap;
  return {
    amount: capped ? cap : raw,
    steps,
    capped,
    billableMinutes: steps * step,
  };
}

module.exports = { calculatePenalty };
