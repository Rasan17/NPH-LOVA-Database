/**
 * NPH & LOVA CLINICAL SCORING & DIAGNOSTIC ENGINES
 * Includes iNPH Radscale, iNPHGS, Kiefer Scale, Evans Index, Tap Test Dynamics, and LOVA Diagnostic Index.
 */

export const ScoringEngines = {
  /**
   * Calculates the iNPH Radscale (0 - 12)
   * Based on Kockum et al. (2018) / European iNPH Consortium
   */
  calcRadscale({
    evansIndex = 0,
    temporalHornMm = 0,
    callosalAngleDeg = 120,
    periventricularHyperintensity = false,
    sylvianFissureDilation = false,
    highConvexityTightness = false,
    focalSulcalDilation = false
  }) {
    let score = 0;
    const breakdown = {};

    // 1. Evans index (>= 0.30)
    if (evansIndex >= 0.30) {
      score += 1;
      breakdown.evans = 1;
    } else {
      breakdown.evans = 0;
    }

    // 2. Temporal horn width (>= 6mm: 2pts, 4-5.9mm: 1pt)
    if (temporalHornMm >= 6.0) {
      score += 2;
      breakdown.temporalHorns = 2;
    } else if (temporalHornMm >= 4.0) {
      score += 1;
      breakdown.temporalHorns = 1;
    } else {
      breakdown.temporalHorns = 0;
    }

    // 3. Callosal angle (< 90 deg: 2pts, 90-100 deg: 1pt)
    if (callosalAngleDeg < 90) {
      score += 2;
      breakdown.callosalAngle = 2;
    } else if (callosalAngleDeg <= 100) {
      score += 1;
      breakdown.callosalAngle = 1;
    } else {
      breakdown.callosalAngle = 0;
    }

    // 4. Periventricular hyperintensities (1pt)
    if (periventricularHyperintensity) {
      score += 1;
      breakdown.periventricular = 1;
    } else {
      breakdown.periventricular = 0;
    }

    // 5. Sylvian fissure enlargement (2pts)
    if (sylvianFissureDilation) {
      score += 2;
      breakdown.sylvianFissures = 2;
    } else {
      breakdown.sylvianFissures = 0;
    }

    // 6. Tight high-convexity sulci (DESH component) (2pts)
    if (highConvexityTightness) {
      score += 2;
      breakdown.highConvexity = 2;
    } else {
      breakdown.highConvexity = 0;
    }

    // 7. Focal sulcal dilation (2pts)
    if (focalSulcalDilation) {
      score += 2;
      breakdown.focalSulci = 2;
    } else {
      breakdown.focalSulci = 0;
    }

    let interpretation = "Low probability of shunt-responsive iNPH (Score < 8)";
    if (score >= 10) {
      interpretation = "Classic DESH pattern: Highly probable shunt-responsive iNPH (Score >= 10)";
    } else if (score >= 8) {
      interpretation = "Probable shunt-responsive iNPH (Score 8 - 9)";
    }

    return { score, breakdown, interpretation };
  },

  /**
   * Calculates the iNPH Grading Scale (iNPHGS) Total (0 - 12)
   */
  calcInphgs(gait = 0, cognition = 0, incontinence = 0) {
    const g = Math.max(0, Math.min(4, parseInt(gait, 10) || 0));
    const c = Math.max(0, Math.min(4, parseInt(cognition, 10) || 0));
    const u = Math.max(0, Math.min(4, parseInt(incontinence, 10) || 0));
    const total = g + c + u;

    let severity = "Normal / Asymptomatic (0)";
    if (total >= 9) severity = "Severe triad impairment (9 - 12)";
    else if (total >= 5) severity = "Moderate impairment (5 - 8)";
    else if (total >= 1) severity = "Mild impairment (1 - 4)";

    return { total, gait: g, cognition: c, incontinence: u, severity };
  },

  /**
   * Calculates Kiefer NPH Scale (0 - 20)
   */
  calcKiefer({ gait = 0, cognition = 0, incontinence = 0, headache = 0, dizziness = 0 }) {
    const total = (parseInt(gait, 10) || 0) +
                  (parseInt(cognition, 10) || 0) +
                  (parseInt(incontinence, 10) || 0) +
                  (parseInt(headache, 10) || 0) +
                  (parseInt(dizziness, 10) || 0);

    return { total };
  },

  /**
   * Evaluates CSF Tap Test Gait Improvement
   */
  calcTapTest(preSec, postSec, preSteps = null, postSteps = null) {
    if (!preSec || !postSec || preSec <= 0) return null;
    const speedImprovementPct = ((preSec - postSec) / preSec) * 100;
    let stepImprovementPct = null;
    if (preSteps && postSteps && preSteps > 0) {
      stepImprovementPct = ((preSteps - postSteps) / preSteps) * 100;
    }

    let verdict = "Negative (< 10% change in walking speed)";
    let isPositive = false;
    if (speedImprovementPct >= 20.0) {
      verdict = "Strongly Positive (>= 20% improvement in speed) — High shunt response predicted";
      isPositive = true;
    } else if (speedImprovementPct >= 10.0) {
      verdict = "Weakly Positive (10 - 20% improvement in speed)";
      isPositive = true;
    } else if (speedImprovementPct <= -10.0) {
      verdict = "Paradoxical deterioration post-tap";
    }

    return {
      speedImprovementPct: parseFloat(speedImprovementPct.toFixed(1)),
      stepImprovementPct: stepImprovementPct ? parseFloat(stepImprovementPct.toFixed(1)) : null,
      verdict,
      isPositive
    };
  },

  /**
   * Calculates LOVA Diagnostic Triad & Macrocephaly Index
   * Distinguishes adult LOVA from classical elderly iNPH
   */
  evalLovaFeatures({
    gender = "Male",
    headCircumferenceCm = 0,
    aqueductalStenosis = false,
    thirdVentricleDownwardBowing = false,
    prepontineArachnoidMembranes = false,
    sellaTurcicaExpansion = false,
    calvarialThinning = false
  }) {
    const isMale = gender === "Male";
    const macrocephalyCutoff = isMale ? 58.0 : 56.0;
    const isMacrocephalic = headCircumferenceCm >= macrocephalyCutoff;

    let lovaScore = 0;
    const features = [];

    if (isMacrocephalic) {
      lovaScore += 3;
      features.push(`Adult Macrocephaly (OFC ${headCircumferenceCm}cm >= ${macrocephalyCutoff}cm: +3)`);
    }
    if (aqueductalStenosis) {
      lovaScore += 3;
      features.push("Aqueductal web / membranous stenosis (+3)");
    }
    if (thirdVentricleDownwardBowing) {
      lovaScore += 2;
      features.push("Downward bulging of third ventricle floor into interpeduncular cistern (+2)");
    }
    if (prepontineArachnoidMembranes) {
      lovaScore += 2;
      features.push("Thickened / distorted prepontine arachnoid membranes (Liliequist) (+2)");
    }
    if (sellaTurcicaExpansion) {
      lovaScore += 1;
      features.push("Expanded / eroded sella turcica (+1)");
    }
    if (calvarialThinning) {
      lovaScore += 1;
      features.push("Chronic calvarial thinning / expansion (+1)");
    }

    let verdict = "Unlikely LOVA (Features favour standard iNPH or other)";
    let firstLineProcedure = "Ventriculoperitoneal (VP) Shunt with Anti-Gravity Valve";

    if (lovaScore >= 6) {
      verdict = "Definite LOVA (Long-Standing Overt Ventriculomegaly in Adults)";
      firstLineProcedure = "Endoscopic Third Ventriculostomy (ETV) with prepontine membrane disruption";
    } else if (lovaScore >= 4) {
      verdict = "Probable LOVA / Complex Ventriculomegaly";
      firstLineProcedure = "ETV or VP Shunt (Consider MRI PC-flow and ICP monitoring)";
    }

    return {
      lovaScore,
      isMacrocephalic,
      macrocephalyCutoff,
      features,
      verdict,
      firstLineProcedure
    };
  }
};
