export type CalibrationSample = {
  displayedWeight: number;
  selectedAsBestExplanation: boolean;
  usable: boolean | null;
};

export type CalibrationSummary = {
  samples: number;
  labeledOutcomes: number;
  meanDisplayedWeight: number;
  observedSelectionRate: number | null;
  expectedCalibrationError: number | null;
  usefulnessRate: number | null;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function expectedCalibrationError(samples: CalibrationSample[], bins = 5) {
  const labeled = samples.filter((sample) => Number.isFinite(sample.displayedWeight));
  if (!labeled.length) return null;

  let weightedError = 0;
  for (let bin = 0; bin < bins; bin += 1) {
    const low = bin / bins;
    const high = (bin + 1) / bins;
    const rows = labeled.filter((sample) => {
      const p = clamp01(sample.displayedWeight / 100);
      return bin === bins - 1 ? p >= low && p <= high : p >= low && p < high;
    });

    if (!rows.length) continue;
    const confidence = rows.reduce((sum, row) => sum + clamp01(row.displayedWeight / 100), 0) / rows.length;
    const observed = rows.filter((row) => row.selectedAsBestExplanation).length / rows.length;
    weightedError += (rows.length / labeled.length) * Math.abs(confidence - observed);
  }

  return Number(weightedError.toFixed(4));
}

export function summarizeCalibration(samples: CalibrationSample[]): CalibrationSummary {
  const labeledOutcomes = samples.length;
  const meanDisplayedWeight = samples.length
    ? samples.reduce((sum, row) => sum + row.displayedWeight, 0) / samples.length
    : 0;
  const usefulness = samples.filter((row) => row.usable !== null);

  return {
    samples: samples.length,
    labeledOutcomes,
    meanDisplayedWeight: Number(meanDisplayedWeight.toFixed(2)),
    observedSelectionRate: samples.length
      ? Number((samples.filter((row) => row.selectedAsBestExplanation).length / samples.length).toFixed(4))
      : null,
    expectedCalibrationError: expectedCalibrationError(samples),
    usefulnessRate: usefulness.length
      ? Number((usefulness.filter((row) => row.usable).length / usefulness.length).toFixed(4))
      : null,
  };
}
