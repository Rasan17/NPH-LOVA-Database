/**
 * NPH & LOVA DATABASE ADAPTER
 * Transparently bridges Tauri Rust SQLite Backend and Browser Local Persistence.
 */

import { SCHEMA_SQL } from "./schema.js";

export class DBAdapter {
  constructor() {
    this.isTauri = typeof window !== "undefined" && (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);
    this.localDB = null;
  }

  async init() {
    if (this.isTauri) {
      console.log("⚡ Running in native Tauri desktop environment with Rust SQLite.");
      return;
    }

    console.log("🌐 Running in universal browser mode. Initializing local storage database.");
    this.initLocalStorageDB();
  }

  initLocalStorageDB() {
    const raw = localStorage.getItem("nph_lova_db_json");
    if (raw) {
      try {
        this.localDB = JSON.parse(raw);
        console.log("Loaded existing local database with", this.localDB.patients?.length || 0, "patients.");
        return;
      } catch (e) {
        console.error("Failed to parse local storage DB, resetting.", e);
      }
    }

    // Default structure with pre-loaded clinical demonstrator patients
    this.localDB = {
      patients: [],
      medical_surgical_history: [],
      clinical_presentation: [],
      differential_exclusions: [],
      neuroimaging: [],
      csf_studies: [],
      surgical_treatment: [],
      shunt_adjustments: [],
      clinical_scores_followup: [],
      complications_and_revisions: []
    };

    this.seedDemonstratorPatients();
    this.saveLocal();
  }

  saveLocal() {
    if (!this.isTauri && this.localDB) {
      localStorage.setItem("nph_lova_db_json", JSON.stringify(this.localDB));
    }
  }

  seedDemonstratorPatients() {
    // -------------------------------------------------------------
    // DEMO PATIENT 1: Classic Idiopathic NPH (iNPH)
    // -------------------------------------------------------------
    const p1 = {
      id: 1,
      study_id: "iNPH-2026-001",
      hospital_number: "RNH-789412",
      first_name: "Arthur",
      last_name: "Pendelton",
      dob: "1952-04-12",
      age_at_onset: 72,
      age_at_presentation: 74,
      gender: "Male",
      ethnicity: "Caucasian",
      handedness: "Right",
      head_circumference_cm: 56.5, // Normal adult male head circumference
      height_cm: 175,
      weight_kg: 82,
      bmi: 26.8,
      abdominal_girth_cm: 94,
      diagnosis_type: "iNPH (Idiopathic)",
      secondary_cause: "",
      notes: "Classical Hakims triad. Significant gait apraxia and urge incontinence.",
      created_at: "2026-01-15 10:30:00"
    };

    const hist1 = {
      id: 1,
      patient_id: 1,
      prev_neck_surgery: 0,
      prev_neck_details: "",
      prev_chest_surgery: 0,
      prev_chest_details: "",
      prev_abdominal_surgery: 1,
      prev_abdominal_details: "Open appendectomy in 1978. No peritonitis; peritoneal cavity verified suitable for VP shunt.",
      prev_head_injury: 0,
      prev_head_injury_details: "",
      prev_neurosurgery: 0,
      prev_neurosurgery_details: "",
      prev_cns_infection: 0,
      prev_cns_infection_details: "",
      obesity_status: "Overweight (BMI 26.8)",
      hypertension: 1,
      diabetes_type_2: 1,
      ischemic_heart_disease: 0,
      sleep_apnea: 0,
      anticoagulant_use: 0,
      anticoagulant_details: "",
      antiplatelet_use: 1,
      antiplatelet_details: "Aspirin 75mg daily (paused 7 days pre-op)",
      metformin_use: 1,
      metformin_dose_mg: 1000,
      metformin_duration_months: 48,
      metformin_notes: "Long-standing metformin therapy for T2D. Glymphatic CSF clearance biomarker study enrollee.",
      other_medications: "Ramipril 5mg OD, Atorvastatin 20mg ON"
    };

    const pres1 = {
      id: 1,
      patient_id: 1,
      presentation_date: "2026-01-15",
      symptom_duration_months: 18,
      first_noted_symptom: "Gait instability and frequent tripping",
      gait_disturbance: 1,
      gait_phenotype: "Magnetic, wide-based, shuffling gait with outward rotated feet and difficulty initiating turns.",
      falls_frequency: "Weekly",
      mobility_aid: "Single walking stick",
      timed_10m_walk_seconds: 19.4,
      timed_10m_walk_steps: 28,
      tug_seconds: 24.2,
      cognitive_impairment: 1,
      cognitive_phenotype: "Subcortical frontal dysexecutive syndrome, psychomotor slowing, apathy, reduced verbal fluency.",
      moca_score: 21,
      mmse_score: 24,
      fab_score: 11,
      urinary_symptoms: 1,
      urinary_phenotype: "Urge incontinence, frequency, nocturia x 4",
      headache_present: 0,
      headache_details: "No chronic headaches",
      visual_symptoms: "None",
      cranial_nerve_findings: "Normal cranial nerves. No vertical gaze palsy."
    };

    const diff1 = {
      id: 1,
      patient_id: 1,
      neurology_review_performed: 1,
      neurology_review_date: "2026-01-20",
      neurologist_name: "Dr. E. Vance, Consultant Neurologist",
      alzheimers_excluded: 1,
      alzheimers_evidence: "No predominant cortical memory loss or hippocampal atrophy on volumetric MRI. Preserved episodic recall with cues.",
      ftd_excluded: 1,
      ftd_evidence: "No behavioral disinhibition or primary semantic aphasia.",
      vascular_dementia_excluded: 1,
      vascular_evidence: "Minor Fazekas 1 deep white matter changes insufficient to account for severity of gait apraxia.",
      lewy_body_excluded: 1,
      lewy_body_evidence: "No visual hallucinations, no REM sleep disorder, no fluctuating cognition.",
      parkinsons_excluded: 1,
      parkinsons_evidence: "No resting pill-rolling tremor, no cogwheel rigidity, poor arm swing bilateral.",
      psp_excluded: 1,
      psp_evidence: "Vertical saccades and pursuit completely intact on neuro-ophthalmology exam.",
      msa_cbd_excluded: 1,
      msa_cbd_evidence: "No autonomic failure, orthostatic hypotension absent, no alien limb sign.",
      spinal_pathology_reviewed: 1,
      cervical_myelopathy_excluded: 1,
      cervical_mri_findings: "Cervical spine MRI: Normal cord caliber, no signal hyperintensity, Hoffmann sign negative.",
      lumbar_stenosis_excluded: 1,
      lumbar_mri_findings: "Lumbar MRI: Age-related disc bulge L4/5 without critical spinal canal stenosis.",
      peripheral_neuropathy_excluded: 1,
      neuropathy_evidence: "Vibration sense preserved at great toes, ankle jerks present.",
      concluding_summary: "Confirmed pure Idiopathic NPH phenotype without confounding neurodegenerative or spine pathology."
    };

    const img1 = {
      id: 1,
      patient_id: 1,
      imaging_date: "2026-01-22",
      modality: "MRI",
      evans_index: 0.38,
      callosal_angle_deg: 74.0,
      desh_present: 1,
      high_convexity_tightness: 1,
      sylvian_fissure_dilation: 1,
      temporal_horn_dilation: 1,
      temporal_horn_width_mm: 5.5,
      periventricular_hyperintensity: "Fazekas 2 (moderate halo, periventricular trans-ependymal CSF edema)",
      aqueductal_flow_void: "Marked hyperdynamic jet on T2 axial",
      third_ventricle_downward_bowing: 0,
      aqueductal_stenosis_or_web: 0,
      prepontine_arachnoid_membranes: 0,
      prepontine_membrane_details: "Normal prepontine cistern anatomy.",
      sella_turcica_expansion: 0,
      calvarial_thinning_expansion: 0,
      inph_radscale_score: 10,
      radscale_breakdown_json: JSON.stringify({ evans: 1, temporalHorns: 1, callosalAngle: 2, periventricular: 1, sylvianFissures: 2, highConvexity: 2, focalSulci: 1 }),
      radiology_report_summary: "Classic DESH configuration with acute callosal angle (74 deg), Evans index 0.38, tight parasagittal convexity sulci. iNPH Radscale 10/12."
    };

    const csf1 = {
      id: 1,
      patient_id: 1,
      study_type: "Diagnostic Tap Test (LP)",
      study_date: "2026-01-28",
      opening_pressure_mmh2o: 145,
      closing_pressure_mmh2o: 60,
      volume_drained_ml: 45,
      drainage_duration_hours: 1,
      infusion_rout: 16.8, // Abnormal CSF outflow resistance
      infusion_p0: 10.5,
      infusion_pvi: 22.0,
      b_waves_observed: 1,
      b_waves_percentage: 28.5,
      pre_gait_10m_sec: 19.4,
      post_gait_10m_sec: 13.1, // 32.5% speed improvement
      gait_improvement_pct: 32.5,
      pre_moca: 21,
      post_moca: 24,
      tap_test_verdict: "Positive (>= 20% improvement)",
      complications: "None. Patient tolerated 45 mL drainage well without low-pressure headache."
    };

    const surg1 = {
      id: 1,
      patient_id: 1,
      mdt_date: "2026-02-04",
      mdt_decision: "Surgery Recommended",
      surgery_date: "2026-02-18",
      lead_surgeon: "Dr G Narenthiran",
      procedure_category: "Cerebrospinal Fluid Shunt",
      procedure_type: "Ventriculoperitoneal (VP) Shunt",
      ventricular_entry_site: "Right frontal Kocher's point",
      etv_fenestration_details: "N/A (VP Shunt)",
      shunt_manufacturer: "Miethke / B. Braun",
      shunt_model: "proGAV 2.0 with proSA Anti-Gravity Device",
      initial_valve_setting: "120 mmH2O (12 cmH2O)",
      initial_antigravity_valve_setting: "20 cmH2O (Gravitational Unit)",
      distal_catheter_site: "Peritoneal cavity via mini-laparotomy",
      antibiotic_impregnated_catheter: 1,
      neuronavigation_used: 1,
      intraop_complications: "None. Clean ventricular puncture on first pass with clear CSF under normal pressure."
    };

    const adj1 = [
      {
        id: 1,
        patient_id: 1,
        treatment_id: 1,
        adjustment_date: "2026-03-25",
        clinician_name: "Dr G Narenthiran",
        indication: "Underdrainage (Worsening Gait/Incontinence)",
        previous_differential_setting: "120 mmH2O",
        new_differential_setting: "100 mmH2O",
        previous_antigravity_setting: "20 cmH2O",
        new_antigravity_setting: "20 cmH2O",
        verification_method: "Magnetic Compass / Tool Reader",
        clinical_response_post_adjustment: "Significant Improvement",
        adjustment_notes: "Gait speed had plateaued. Differential pressure decreased by 20 mmH2O. Noticeable reduction in magnetic shuffling within 72 hours."
      },
      {
        id: 2,
        patient_id: 1,
        treatment_id: 1,
        adjustment_date: "2026-05-10",
        clinician_name: "Dr G Narenthiran",
        indication: "Overdrainage (Subdural / Postural Headache)",
        previous_differential_setting: "100 mmH2O",
        new_differential_setting: "110 mmH2O",
        previous_antigravity_setting: "20 cmH2O",
        new_antigravity_setting: "25 cmH2O",
        verification_method: "Magnetic Compass / Tool Reader",
        clinical_response_post_adjustment: "Significant Improvement",
        adjustment_notes: "Mild upright headache in afternoons. Anti-gravity setting increased from 20 to 25 cmH2O to prevent siphon effect while standing. Complete symptom resolution."
      }
    ];

    const follow1 = [
      {
        id: 1,
        patient_id: 1,
        assessment_date: "2026-01-15",
        timepoint: "Pre-Operative Baseline",
        inphgs_gait: 3,
        inphgs_cognition: 2,
        inphgs_incontinence: 3,
        inphgs_total: 8,
        kiefer_gait: 4,
        kiefer_cognition: 2,
        kiefer_incontinence: 3,
        kiefer_headache: 0,
        kiefer_dizziness: 1,
        kiefer_total: 10,
        timed_10m_walk_sec: 19.4,
        timed_10m_steps: 28,
        tug_sec: 24.2,
        moca_score: 21,
        mrs_score: 3,
        patient_satisfaction_pgii: 4,
        family_caregiver_satisfaction: 3,
        caregiver_burden_notes: "Spouse assisting with toileting and transfers due to fear of falling.",
        triad_gait_improvement: "Unchanged",
        triad_cognition_improvement: "Unchanged",
        triad_continence_improvement: "Unchanged"
      },
      {
        id: 2,
        patient_id: 1,
        assessment_date: "2026-05-20",
        timepoint: "Post-Op 3-Month",
        inphgs_gait: 1,
        inphgs_cognition: 1,
        inphgs_incontinence: 1,
        inphgs_total: 3,
        kiefer_gait: 1,
        kiefer_cognition: 1,
        kiefer_incontinence: 1,
        kiefer_headache: 0,
        kiefer_dizziness: 0,
        kiefer_total: 3,
        timed_10m_walk_sec: 12.2,
        timed_10m_steps: 18,
        tug_sec: 14.5,
        moca_score: 26,
        mrs_score: 1,
        patient_satisfaction_pgii: 1, // Very Much Better
        family_caregiver_satisfaction: 5, // Very Satisfied
        caregiver_burden_notes: "Patient now walks independently without stick outdoors. Continence fully restored.",
        triad_gait_improvement: "Markedly Improved",
        triad_cognition_improvement: "Mildly Improved",
        triad_continence_improvement: "Markedly Improved"
      }
    ];

    // -------------------------------------------------------------
    // DEMO PATIENT 2: Classic Adult LOVA (Long-Standing Overt Ventriculomegaly)
    // -------------------------------------------------------------
    const p2 = {
      id: 2,
      study_id: "LOVA-2026-002",
      hospital_number: "WGH-441209",
      first_name: "Eleanor",
      last_name: "Montgomery",
      dob: "1977-08-23",
      age_at_onset: 46,
      age_at_presentation: 49,
      gender: "Female",
      ethnicity: "Caucasian",
      handedness: "Right",
      head_circumference_cm: 59.8, // Significant Adult Macrocephaly (>56cm for females)
      height_cm: 168,
      weight_kg: 68,
      bmi: 24.1,
      abdominal_girth_cm: 80,
      diagnosis_type: "LOVA (Long-Standing Overt Ventriculomegaly)",
      secondary_cause: "Congenital / infantile compensated aqueductal stenosis decompensated in adult life",
      notes: "Pronounced adult macrocephaly (OFC 59.8 cm). Adult decompensation with episodic headaches and gait apraxia.",
      created_at: "2026-02-10 14:15:00"
    };

    const hist2 = {
      id: 2,
      patient_id: 2,
      prev_neck_surgery: 0,
      prev_neck_details: "",
      prev_chest_surgery: 0,
      prev_chest_details: "",
      prev_abdominal_surgery: 0,
      prev_abdominal_details: "",
      prev_head_injury: 0,
      prev_head_injury_details: "",
      prev_neurosurgery: 0,
      prev_neurosurgery_details: "No prior shunts. Childhood history of large head size needing larger hats.",
      prev_cns_infection: 0,
      prev_cns_infection_details: "",
      obesity_status: "Normal weight (BMI 24.1)",
      hypertension: 0,
      diabetes_type_2: 0,
      ischemic_heart_disease: 0,
      sleep_apnea: 0,
      anticoagulant_use: 0,
      anticoagulant_details: "",
      antiplatelet_use: 0,
      antiplatelet_details: "",
      metformin_use: 0,
      metformin_dose_mg: 0,
      metformin_duration_months: 0,
      metformin_notes: "None",
      other_medications: "Paracetamol PRN"
    };

    const pres2 = {
      id: 2,
      patient_id: 2,
      presentation_date: "2026-02-10",
      symptom_duration_months: 24,
      first_noted_symptom: "Progressive morning pressure headaches and clumsiness in walking",
      gait_disturbance: 1,
      gait_phenotype: "Slow, cautious, wide-based gait with reduced stride length and postural instability on unlevel ground.",
      falls_frequency: "Rarely",
      mobility_aid: "None",
      timed_10m_walk_seconds: 14.8,
      timed_10m_walk_steps: 22,
      tug_seconds: 17.5,
      cognitive_impairment: 1,
      cognitive_phenotype: "Mild concentration difficulties, mental fatigue, preserved orientation and language.",
      moca_score: 25,
      mmse_score: 28,
      fab_score: 14,
      urinary_symptoms: 1,
      urinary_phenotype: "Occasional urgency, no frank incontinence",
      headache_present: 1,
      headache_details: "Episodic morning bitemporal pressure headaches, aggravated by coughing, straining and recumbency.",
      visual_symptoms: "Transient visual obscurations on standing up. Fundoscopy shows no acute papilledema but mild optic disc pallor.",
      cranial_nerve_findings: "Intact cranial nerves. Normal eye movements."
    };

    const diff2 = {
      id: 2,
      patient_id: 2,
      neurology_review_performed: 1,
      neurology_review_date: "2026-02-14",
      neurologist_name: "Dr. K. Richards, Consultant Neurologist",
      alzheimers_excluded: 1,
      alzheimers_evidence: "Young age (49), normal episodic memory, normal hippocampal volumes.",
      ftd_excluded: 1,
      ftd_evidence: "Intact executive function and social behavior.",
      vascular_dementia_excluded: 1,
      vascular_evidence: "No white matter ischemic disease on MRI.",
      lewy_body_excluded: 1,
      lewy_body_evidence: "No extrapyramidal signs or hallucinations.",
      parkinsons_excluded: 1,
      parkinsons_evidence: "No bradykinesia or rigidity.",
      psp_excluded: 1,
      psp_evidence: "Normal vertical supranuclear gaze.",
      msa_cbd_excluded: 1,
      msa_cbd_evidence: "No cerebellar or autonomic signs.",
      spinal_pathology_reviewed: 1,
      cervical_myelopathy_excluded: 1,
      cervical_mri_findings: "Cervical spine clear.",
      lumbar_stenosis_excluded: 1,
      lumbar_mri_findings: "Normal lumbar spine canal caliber.",
      peripheral_neuropathy_excluded: 1,
      neuropathy_evidence: "Normal nerve conduction studies.",
      concluding_summary: "Classic adult decompensation of Long-Standing Overt Ventriculomegaly in Adults (LOVA). Surgical candidate for ETV."
    };

    const img2 = {
      id: 2,
      patient_id: 2,
      imaging_date: "2026-02-18",
      modality: "MRI",
      evans_index: 0.49, // Massive ventriculomegaly
      callosal_angle_deg: 58.0,
      desh_present: 0, // LOVA does NOT show classic elderly DESH
      high_convexity_tightness: 0,
      sylvian_fissure_dilation: 1,
      temporal_horn_dilation: 1,
      temporal_horn_width_mm: 8.2,
      periventricular_hyperintensity: "Fazekas 0 (minimal)",
      aqueductal_flow_void: "Markedly absent flow void across cerebral aqueduct",
      third_ventricle_downward_bowing: 1, // Classic LOVA sign
      aqueductal_stenosis_or_web: 1, // Aqueductal web
      prepontine_arachnoid_membranes: 1, // Distorted prepontine webs
      prepontine_membrane_details: "Severe downward herniation of third ventricle floor into interpeduncular cistern with thickened prepontine arachnoid membranes.",
      sella_turcica_expansion: 1, // Expanded sella
      calvarial_thinning_expansion: 1, // Adult calvarial expansion
      inph_radscale_score: 7,
      radscale_breakdown_json: JSON.stringify({ evans: 1, temporalHorns: 2, callosalAngle: 2, periventricular: 0, sylvianFissures: 1, highConvexity: 0, focalSulci: 1 }),
      radiology_report_summary: "High-resolution CISS/FIESTA MRI confirms membranous aqueductal web, massive triventricular hydrocephalus with normal 4th ventricle, downward third ventricle bowing, expanded sella, and adult macrocephaly. Diagnostic of LOVA."
    };

    const csf2 = {
      id: 2,
      patient_id: 2,
      study_type: "Infusion Study (Rout)",
      study_date: "2026-02-22",
      opening_pressure_mmh2o: 210, // Elevated opening pressure typical of LOVA
      closing_pressure_mmh2o: 130,
      volume_drained_ml: 30,
      drainage_duration_hours: 1,
      infusion_rout: 24.5, // Highly elevated outflow resistance
      infusion_p0: 15.2,
      infusion_pvi: 18.0,
      b_waves_observed: 1,
      b_waves_percentage: 42.0,
      pre_gait_10m_sec: 14.8,
      post_gait_10m_sec: 11.2,
      gait_improvement_pct: 24.3,
      pre_moca: 25,
      post_moca: 27,
      tap_test_verdict: "Positive (>= 20% improvement)",
      complications: "None."
    };

    const surg2 = {
      id: 2,
      patient_id: 2,
      mdt_date: "2026-02-26",
      mdt_decision: "Surgery Recommended",
      surgery_date: "2026-03-12",
      lead_surgeon: "Dr G Narenthiran",
      procedure_category: "Neuroendoscopy (ETV)",
      procedure_type: "ETV with Disruption of Prepontine Arachnoid Membranes",
      ventricular_entry_site: "Right Kocher's point (precisely planned trajectory for Liliequist membrane)",
      etv_fenestration_details: "Third ventricle floor expanded and thin. Sharp fenestration between infundibular recess and basilar tip. Fogarty 3F balloon inflated to 6mm stoma. Thickened Liliequist membrane and prepontine arachnoid bands opened to ensure wide communication with prepontine cistern.",
      shunt_manufacturer: "None (ETV)",
      shunt_model: "Endoscopic Third Ventriculostomy",
      initial_valve_setting: "N/A",
      initial_antigravity_valve_setting: "N/A",
      distal_catheter_site: "N/A (Endoscopic Stoma)",
      antibiotic_impregnated_catheter: 0,
      neuronavigation_used: 1,
      intraop_complications: "None. Basilar artery bifurcation and bilateral oculomotor nerves clearly visualized. Excellent CSF pulsation through stoma."
    };

    const follow2 = [
      {
        id: 3,
        patient_id: 2,
        assessment_date: "2026-02-10",
        timepoint: "Pre-Operative Baseline",
        inphgs_gait: 2,
        inphgs_cognition: 1,
        inphgs_incontinence: 1,
        inphgs_total: 4,
        kiefer_gait: 2,
        kiefer_cognition: 1,
        kiefer_incontinence: 1,
        kiefer_headache: 3,
        kiefer_dizziness: 1,
        kiefer_total: 8,
        timed_10m_walk_sec: 14.8,
        timed_10m_steps: 22,
        tug_sec: 17.5,
        moca_score: 25,
        mrs_score: 2,
        patient_satisfaction_pgii: 4,
        family_caregiver_satisfaction: 3,
        caregiver_burden_notes: "Headache preventing full-time employment.",
        triad_gait_improvement: "Unchanged",
        triad_cognition_improvement: "Unchanged",
        triad_continence_improvement: "Unchanged"
      },
      {
        id: 4,
        patient_id: 2,
        assessment_date: "2026-06-15",
        timepoint: "Post-Op 3-Month",
        inphgs_gait: 0,
        inphgs_cognition: 0,
        inphgs_incontinence: 0,
        inphgs_total: 0,
        kiefer_gait: 0,
        kiefer_cognition: 0,
        kiefer_incontinence: 0,
        kiefer_headache: 0,
        kiefer_dizziness: 0,
        kiefer_total: 0,
        timed_10m_walk_sec: 9.8,
        timed_10m_steps: 15,
        tug_sec: 10.2,
        moca_score: 29,
        mrs_score: 0,
        patient_satisfaction_pgii: 1, // Very Much Better
        family_caregiver_satisfaction: 5, // Very Satisfied
        caregiver_burden_notes: "Complete resolution of morning headaches. Walking velocity normal. Returned to work full time.",
        triad_gait_improvement: "Markedly Improved",
        triad_cognition_improvement: "Markedly Improved",
        triad_continence_improvement: "Markedly Improved"
      }
    ];

    this.localDB.patients.push(p1, p2);
    this.localDB.medical_surgical_history.push(hist1, hist2);
    this.localDB.clinical_presentation.push(pres1, pres2);
    this.localDB.differential_exclusions.push(diff1, diff2);
    this.localDB.neuroimaging.push(img1, img2);
    this.localDB.csf_studies.push(csf1, csf2);
    this.localDB.surgical_treatment.push(surg1, surg2);
    this.localDB.shunt_adjustments.push(...adj1);
    this.localDB.clinical_scores_followup.push(...follow1);
  }

  async select(sql, params = []) {
    if (this.isTauri && window.__TAURI__?.core?.invoke) {
      return await window.__TAURI__.core.invoke("select_sql", { sql, params });
    }

    // Local JSON query interpreter for browser mode
    return this.queryLocal(sql, params);
  }

  async execute(sql, params = []) {
    if (this.isTauri && window.__TAURI__?.core?.invoke) {
      return await window.__TAURI__.core.invoke("execute_sql", { sql, params });
    }

    const res = this.executeLocal(sql, params);
    this.saveLocal();
    return res;
  }

  queryLocal(sql, params) {
    const s = sql.trim().toLowerCase();
    
    // Select all patients
    if (s.includes("from patients") && !s.includes("where id =")) {
      return this.localDB.patients.map(p => ({ ...p }));
    }

    // Select single patient
    if (s.includes("from patients where id =")) {
      const id = parseInt(params[0] || sql.match(/id\s*=\s*(\d+)/i)?.[1], 10);
      return this.localDB.patients.filter(p => p.id === id);
    }

    // Generic table lookup by patient_id
    const tables = [
      "medical_surgical_history",
      "clinical_presentation",
      "differential_exclusions",
      "neuroimaging",
      "csf_studies",
      "surgical_treatment",
      "shunt_adjustments",
      "clinical_scores_followup",
      "complications_and_revisions"
    ];

    for (const tbl of tables) {
      if (s.includes(`from ${tbl}`)) {
        if (s.includes("where patient_id =")) {
          const pid = parseInt(params[0] || sql.match(/patient_id\s*=\s*(\d+)/i)?.[1], 10);
          return (this.localDB[tbl] || []).filter(r => r.patient_id === pid);
        }
        return (this.localDB[tbl] || []).map(r => ({ ...r }));
      }
    }

    return [];
  }

  executeLocal(sql, params) {
    // Basic local mock execution for web demo
    console.log("Local Execute:", sql, params);
    return { rows_affected: 1, last_insert_id: Date.now() };
  }

  exportJSON() {
    return JSON.stringify(this.localDB, null, 2);
  }

  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.patients && Array.isArray(data.patients)) {
        this.localDB = data;
        this.saveLocal();
        return true;
      }
    } catch (e) {
      console.error("Invalid JSON import", e);
    }
    return false;
  }
}

export const db = new DBAdapter();
