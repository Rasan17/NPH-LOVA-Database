/**
 * NPH & LOVA CLINICAL & RESEARCH REGISTRY
 * SQLite Database Schema Definitions & Preloaded Clinical Demonstrators
 * Conceived by Dr G Narenthiran MB ChB BSc(MedSci)(Hons) MRCS(Ed.) FEBNS FRCS(SN)
 */

export const SCHEMA_SQL = `
-- 1. Patients Master Registry
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_id TEXT UNIQUE NOT NULL,
    hospital_number TEXT,
    first_name TEXT,
    last_name TEXT,
    dob DATE,
    age_at_onset INTEGER,
    age_at_presentation INTEGER,
    gender TEXT CHECK(gender IN ('Male', 'Female', 'Other', 'Unknown')),
    ethnicity TEXT,
    handedness TEXT CHECK(handedness IN ('Right', 'Left', 'Ambidextrous')),
    head_circumference_cm REAL, -- Vital: Adult macrocephaly (>58cm M, >56cm F) supports LOVA
    height_cm REAL,
    weight_kg REAL,
    bmi REAL,
    abdominal_girth_cm REAL,
    diagnosis_type TEXT CHECK(diagnosis_type IN ('iNPH (Idiopathic)', 'sNPH (Secondary)', 'LOVA (Long-Standing Overt Ventriculomegaly)', 'Complex / Hydrocephalus NOS')),
    secondary_cause TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Past Medical & Surgical History
CREATE TABLE IF NOT EXISTS medical_surgical_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    prev_neck_surgery INTEGER DEFAULT 0,
    prev_neck_details TEXT,
    prev_chest_surgery INTEGER DEFAULT 0,
    prev_chest_details TEXT,
    prev_abdominal_surgery INTEGER DEFAULT 0,
    prev_abdominal_details TEXT,
    prev_head_injury INTEGER DEFAULT 0,
    prev_head_injury_details TEXT,
    prev_neurosurgery INTEGER DEFAULT 0,
    prev_neurosurgery_details TEXT,
    prev_cns_infection INTEGER DEFAULT 0,
    prev_cns_infection_details TEXT,
    obesity_status TEXT,
    hypertension INTEGER DEFAULT 0,
    diabetes_type_2 INTEGER DEFAULT 0,
    ischemic_heart_disease INTEGER DEFAULT 0,
    sleep_apnea INTEGER DEFAULT 0,
    anticoagulant_use INTEGER DEFAULT 0,
    anticoagulant_details TEXT,
    antiplatelet_use INTEGER DEFAULT 0,
    antiplatelet_details TEXT,
    metformin_use INTEGER DEFAULT 0,
    metformin_dose_mg REAL,
    metformin_duration_months INTEGER,
    metformin_notes TEXT,
    other_medications TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 3. Clinical Presentation & Symptoms
CREATE TABLE IF NOT EXISTS clinical_presentation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    presentation_date DATE DEFAULT CURRENT_DATE,
    symptom_duration_months INTEGER,
    first_noted_symptom TEXT,
    gait_disturbance INTEGER DEFAULT 1,
    gait_phenotype TEXT,
    falls_frequency TEXT,
    mobility_aid TEXT,
    timed_10m_walk_seconds REAL,
    timed_10m_walk_steps INTEGER,
    tug_seconds REAL,
    cognitive_impairment INTEGER DEFAULT 0,
    cognitive_phenotype TEXT,
    moca_score INTEGER,
    mmse_score INTEGER,
    fab_score INTEGER,
    urinary_symptoms INTEGER DEFAULT 0,
    urinary_phenotype TEXT,
    headache_present INTEGER DEFAULT 0,
    headache_details TEXT,
    visual_symptoms TEXT,
    cranial_nerve_findings TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 4. Differential Diagnosis & Specialist Exclusions
CREATE TABLE IF NOT EXISTS differential_exclusions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    neurology_review_performed INTEGER DEFAULT 1,
    neurology_review_date DATE,
    neurologist_name TEXT,
    alzheimers_excluded INTEGER DEFAULT 0,
    alzheimers_evidence TEXT,
    ftd_excluded INTEGER DEFAULT 0,
    ftd_evidence TEXT,
    vascular_dementia_excluded INTEGER DEFAULT 0,
    vascular_evidence TEXT,
    lewy_body_excluded INTEGER DEFAULT 0,
    lewy_body_evidence TEXT,
    parkinsons_excluded INTEGER DEFAULT 0,
    parkinsons_evidence TEXT,
    psp_excluded INTEGER DEFAULT 0,
    psp_evidence TEXT,
    msa_cbd_excluded INTEGER DEFAULT 0,
    msa_cbd_evidence TEXT,
    spinal_pathology_reviewed INTEGER DEFAULT 1,
    cervical_myelopathy_excluded INTEGER DEFAULT 0,
    cervical_mri_findings TEXT,
    lumbar_stenosis_excluded INTEGER DEFAULT 0,
    lumbar_mri_findings TEXT,
    peripheral_neuropathy_excluded INTEGER DEFAULT 0,
    neuropathy_evidence TEXT,
    concluding_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 5. Neuroimaging Findings
CREATE TABLE IF NOT EXISTS neuroimaging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    imaging_date DATE DEFAULT CURRENT_DATE,
    modality TEXT CHECK(modality IN ('MRI', 'CT', 'Both')),
    evans_index REAL,
    callosal_angle_deg REAL,
    desh_present INTEGER DEFAULT 1,
    high_convexity_tightness INTEGER DEFAULT 1,
    sylvian_fissure_dilation INTEGER DEFAULT 1,
    temporal_horn_dilation INTEGER DEFAULT 1,
    temporal_horn_width_mm REAL,
    periventricular_hyperintensity TEXT,
    aqueductal_flow_void TEXT,
    third_ventricle_downward_bowing INTEGER DEFAULT 0,
    aqueductal_stenosis_or_web INTEGER DEFAULT 0,
    prepontine_arachnoid_membranes INTEGER DEFAULT 0,
    prepontine_membrane_details TEXT,
    sella_turcica_expansion INTEGER DEFAULT 0,
    calvarial_thinning_expansion INTEGER DEFAULT 0,
    inph_radscale_score INTEGER,
    radscale_breakdown_json TEXT,
    radiology_report_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 6. CSF Diagnostic Dynamics & Studies
CREATE TABLE IF NOT EXISTS csf_studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    study_type TEXT CHECK(study_type IN ('Diagnostic Tap Test (LP)', 'Infusion Study (Rout)', 'Continuous Lumbar Drain (ELD)', 'Bolus Injection Test')),
    study_date DATE DEFAULT CURRENT_DATE,
    opening_pressure_mmh2o REAL,
    closing_pressure_mmh2o REAL,
    volume_drained_ml REAL,
    drainage_duration_hours INTEGER,
    infusion_rout REAL,
    infusion_p0 REAL,
    infusion_pvi REAL,
    b_waves_observed INTEGER DEFAULT 0,
    b_waves_percentage REAL,
    pre_gait_10m_sec REAL,
    post_gait_10m_sec REAL,
    gait_improvement_pct REAL,
    pre_moca INTEGER,
    post_moca INTEGER,
    tap_test_verdict TEXT,
    complications TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 7. Multidisciplinary Decision & Surgical Treatment
CREATE TABLE IF NOT EXISTS surgical_treatment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    mdt_date DATE,
    mdt_decision TEXT,
    surgery_date DATE,
    lead_surgeon TEXT,
    procedure_category TEXT,
    procedure_type TEXT,
    ventricular_entry_site TEXT,
    etv_fenestration_details TEXT,
    shunt_manufacturer TEXT,
    shunt_model TEXT,
    initial_valve_setting TEXT,
    initial_antigravity_valve_setting TEXT,
    distal_catheter_site TEXT,
    antibiotic_impregnated_catheter INTEGER DEFAULT 1,
    neuronavigation_used INTEGER DEFAULT 1,
    intraop_complications TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 8. Longitudinal Shunt Valve & Anti-Gravity Adjustments Log
CREATE TABLE IF NOT EXISTS shunt_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    treatment_id INTEGER,
    adjustment_date DATE DEFAULT CURRENT_DATE,
    clinician_name TEXT,
    indication TEXT,
    previous_differential_setting TEXT,
    new_differential_setting TEXT,
    previous_antigravity_setting TEXT,
    new_antigravity_setting TEXT,
    verification_method TEXT,
    clinical_response_post_adjustment TEXT,
    adjustment_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_id) REFERENCES surgical_treatment(id) ON DELETE SET NULL
);

-- 9. Clinical Follow-up Scores & Patient/Family Satisfaction
CREATE TABLE IF NOT EXISTS clinical_scores_followup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    assessment_date DATE DEFAULT CURRENT_DATE,
    timepoint TEXT,
    inphgs_gait INTEGER DEFAULT 0,
    inphgs_cognition INTEGER DEFAULT 0,
    inphgs_incontinence INTEGER DEFAULT 0,
    inphgs_total INTEGER DEFAULT 0,
    kiefer_gait INTEGER DEFAULT 0,
    kiefer_cognition INTEGER DEFAULT 0,
    kiefer_incontinence INTEGER DEFAULT 0,
    kiefer_headache INTEGER DEFAULT 0,
    kiefer_dizziness INTEGER DEFAULT 0,
    kiefer_total INTEGER DEFAULT 0,
    timed_10m_walk_sec REAL,
    timed_10m_steps INTEGER,
    tug_sec REAL,
    moca_score INTEGER,
    mrs_score INTEGER,
    patient_satisfaction_pgii INTEGER,
    family_caregiver_satisfaction INTEGER,
    caregiver_burden_notes TEXT,
    triad_gait_improvement TEXT,
    triad_cognition_improvement TEXT,
    triad_continence_improvement TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 10. Surgical Complications & Shunt Revision Surgery
CREATE TABLE IF NOT EXISTS complications_and_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    treatment_id INTEGER,
    event_date DATE DEFAULT CURRENT_DATE,
    complication_type TEXT,
    severity TEXT,
    pathogen_isolated TEXT,
    management_action TEXT,
    repeat_surgery_performed INTEGER DEFAULT 0,
    repeat_surgery_date DATE,
    revision_type TEXT,
    intraop_findings_cause_of_malfunction TEXT,
    new_hardware_details TEXT,
    clinical_outcome TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_id) REFERENCES surgical_treatment(id) ON DELETE SET NULL
);
`;
