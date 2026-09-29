use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
    pub db_path: PathBuf,
}

#[derive(Serialize, Deserialize)]
pub struct QueryResult {
    pub rows_affected: usize,
    pub last_insert_id: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QueryRow {
    pub columns: Vec<String>,
    pub values: Vec<serde_json::Value>,
}

impl Database {
    pub fn init(app_data_dir: PathBuf) -> Result<Self> {
        fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
        let db_path = app_data_dir.join("nph_lova_registry.db");

        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;

        let db = Database {
            conn: Mutex::new(conn),
            db_path,
        };

        db.run_migrations()?;
        Ok(db)
    }

    pub fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            r#"
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
                prev_abdominal_details TEXT, -- Laparotomies, peritonitis, adhesions (affects VP suitability)
                prev_head_injury INTEGER DEFAULT 0,
                prev_head_injury_details TEXT,
                prev_neurosurgery INTEGER DEFAULT 0,
                prev_neurosurgery_details TEXT,
                prev_cns_infection INTEGER DEFAULT 0,
                prev_cns_infection_details TEXT, -- Meningitis, ventriculitis
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
                metformin_notes TEXT, -- User requested: Metformin and glymphatic clearance / neuroprotection
                other_medications TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

            -- 3. Clinical Presentation & Symptoms
            CREATE TABLE IF NOT EXISTS clinical_presentation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                presentation_date DATE DEFAULT CURRENT_DATE,
                symptom_duration_months INTEGER,
                first_noted_symptom TEXT,
                gait_disturbance INTEGER DEFAULT 1,
                gait_phenotype TEXT, -- Magnetic, broad-based, shuffling, apraxic, freezing
                falls_frequency TEXT,
                mobility_aid TEXT,
                timed_10m_walk_seconds REAL,
                timed_10m_walk_steps INTEGER,
                tug_seconds REAL,
                cognitive_impairment INTEGER DEFAULT 0,
                cognitive_phenotype TEXT, -- Subcortical dysexecutive, psychomotor slowing, apathy, memory
                moca_score INTEGER,
                mmse_score INTEGER,
                fab_score INTEGER,
                urinary_symptoms INTEGER DEFAULT 0,
                urinary_phenotype TEXT, -- Urgency, frequency, urge incontinence, continuous incontinence
                headache_present INTEGER DEFAULT 0,
                headache_details TEXT, -- Morning, Valsalva, postural; common in LOVA decompensation
                visual_symptoms TEXT, -- Obscurations, diplopia, papilledema history
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
                psp_evidence TEXT, -- Vertical gaze palsy check
                msa_cbd_excluded INTEGER DEFAULT 0,
                msa_cbd_evidence TEXT,
                spinal_pathology_reviewed INTEGER DEFAULT 1,
                cervical_myelopathy_excluded INTEGER DEFAULT 0,
                cervical_mri_findings TEXT, -- Cord compression, hyperreflexia vs NPH
                lumbar_stenosis_excluded INTEGER DEFAULT 0,
                lumbar_mri_findings TEXT, -- Neurogenic claudication vs NPH gait
                peripheral_neuropathy_excluded INTEGER DEFAULT 0,
                neuropathy_evidence TEXT,
                concluding_summary TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

            -- 5. Neuroimaging Findings (CT / MRI Biomarkers)
            CREATE TABLE IF NOT EXISTS neuroimaging (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                imaging_date DATE DEFAULT CURRENT_DATE,
                modality TEXT CHECK(modality IN ('MRI', 'CT', 'Both')),
                evans_index REAL, -- > 0.30
                callosal_angle_deg REAL, -- Normal 100-120, iNPH < 90 deg
                desh_present INTEGER DEFAULT 1, -- Disproportionately Enlarged Subarachnoid space Hydrocephalus
                high_convexity_tightness INTEGER DEFAULT 1,
                sylvian_fissure_dilation INTEGER DEFAULT 1,
                temporal_horn_dilation INTEGER DEFAULT 1,
                temporal_horn_width_mm REAL,
                periventricular_hyperintensity TEXT, -- Fazekas 0-3 / trans-ependymal edema
                aqueductal_flow_void TEXT, -- Absent, normal, prominent hyperdynamic jet
                third_ventricle_downward_bowing INTEGER DEFAULT 0, -- Bulging into interpeduncular cistern (LOVA)
                aqueductal_stenosis_or_web INTEGER DEFAULT 0, -- Primary LOVA pathology
                prepontine_arachnoid_membranes INTEGER DEFAULT 0, -- Membrane of Liliequist / prepontine webs
                prepontine_membrane_details TEXT,
                sella_turcica_expansion INTEGER DEFAULT 0, -- LOVA sign
                calvarial_thinning_expansion INTEGER DEFAULT 0, -- Adult macrocephaly (LOVA)
                inph_radscale_score INTEGER, -- 0 to 12
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
                infusion_rout REAL, -- Resistance to CSF outflow mmHg/(mL/min)
                infusion_p0 REAL,
                infusion_pvi REAL,
                b_waves_observed INTEGER DEFAULT 0,
                b_waves_percentage REAL,
                pre_gait_10m_sec REAL,
                post_gait_10m_sec REAL,
                gait_improvement_pct REAL,
                pre_moca INTEGER,
                post_moca INTEGER,
                tap_test_verdict TEXT CHECK(tap_test_verdict IN ('Positive (>= 20% improvement)', 'Weakly Positive (10-20%)', 'Negative (< 10%)', 'Equivocal / Inconclusive')),
                complications TEXT, -- Post-LP headache, radicular pain, CSF leak
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

            -- 7. Multidisciplinary Decision & Surgical Treatment
            CREATE TABLE IF NOT EXISTS surgical_treatment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                mdt_date DATE,
                mdt_decision TEXT CHECK(mdt_decision IN ('Surgery Recommended', 'Conservative / Watchful Waiting', 'Further Diagnostic Tests Required', 'Surgically Unsuitable')),
                surgery_date DATE,
                lead_surgeon TEXT,
                procedure_category TEXT CHECK(procedure_category IN ('Cerebrospinal Fluid Shunt', 'Neuroendoscopy (ETV)', 'Combined ETV + Shunt', 'Shunt Revision / Removal')),
                procedure_type TEXT CHECK(procedure_type IN (
                    'Ventriculoperitoneal (VP) Shunt',
                    'Lumboperitoneal (LP) Shunt',
                    'Ventriculoatrial (VA) Shunt',
                    'Ventriculopleural (VPL) Shunt',
                    'Endoscopic Third Ventriculostomy (ETV)',
                    'ETV with Disruption of Prepontine Arachnoid Membranes',
                    'Secondary ETV after Shunt Malfunction',
                    'Shunt Revision (Proximal / Distal / Valve)',
                    'Shunt Removal / Externalization'
                )),
                ventricular_entry_site TEXT, -- Right Kocher, Left Kocher, Right Keen, Left Keen
                etv_fenestration_details TEXT, -- Stoma size, Liliequist membrane opened, prepontine bands divided
                shunt_manufacturer TEXT, -- Miethke, Codman, Medtronic, Sophysa
                shunt_model TEXT, -- proGAV 2.0, proSA, Certas Plus, Strata, Polaris
                initial_valve_setting TEXT, -- Opening differential pressure
                initial_antigravity_valve_setting TEXT, -- Gravitational unit setting (e.g. 20 cmH2O)
                distal_catheter_site TEXT, -- Peritoneal cavity, right atrium, pleural cavity
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
                indication TEXT CHECK(indication IN ('Overdrainage (Subdural / Postural Headache)', 'Underdrainage (Worsening Gait/Incontinence)', 'Slit Ventricle Syndrome', 'Routine Titration', 'Post-Op Optimization')),
                previous_differential_setting TEXT,
                new_differential_setting TEXT,
                previous_antigravity_setting TEXT,
                new_antigravity_setting TEXT,
                verification_method TEXT CHECK(verification_method IN ('Magnetic Compass / Tool Reader', 'Plain Skull Radiograph (X-Ray)', 'Clinical Palpation / Visual')),
                clinical_response_post_adjustment TEXT CHECK(clinical_response_post_adjustment IN ('Significant Improvement', 'Mild Improvement', 'Unchanged', 'Deteriorated', 'Awaiting Review')),
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
                timepoint TEXT CHECK(timepoint IN ('Pre-Operative Baseline', 'Post-Tap Test', 'Post-Op 1-Month', 'Post-Op 3-Month', 'Post-Op 6-Month', 'Post-Op 1-Year', 'Post-Op 2-Year', 'Annual Review', 'Post-Revision')),
                -- iNPH Grading Scale (iNPHGS)
                inphgs_gait INTEGER CHECK(inphgs_gait BETWEEN 0 AND 4),
                inphgs_cognition INTEGER CHECK(inphgs_cognition BETWEEN 0 AND 4),
                inphgs_incontinence INTEGER CHECK(inphgs_incontinence BETWEEN 0 AND 4),
                inphgs_total INTEGER GENERATED ALWAYS AS (inphgs_gait + inphgs_cognition + inphgs_incontinence) STORED,
                -- Kiefer NPH Scale (0 - 20)
                kiefer_gait INTEGER CHECK(kiefer_gait BETWEEN 0 AND 6),
                kiefer_cognition INTEGER CHECK(kiefer_cognition BETWEEN 0 AND 4),
                kiefer_incontinence INTEGER CHECK(kiefer_incontinence BETWEEN 0 AND 4),
                kiefer_headache INTEGER CHECK(kiefer_headache BETWEEN 0 AND 3),
                kiefer_dizziness INTEGER CHECK(kiefer_dizziness BETWEEN 0 AND 3),
                kiefer_total INTEGER GENERATED ALWAYS AS (kiefer_gait + kiefer_cognition + kiefer_incontinence + kiefer_headache + kiefer_dizziness) STORED,
                -- Objective Function
                timed_10m_walk_sec REAL,
                timed_10m_steps INTEGER,
                tug_sec REAL,
                moca_score INTEGER,
                mrs_score INTEGER CHECK(mrs_score BETWEEN 0 AND 6), -- modified Rankin Scale
                -- Patient & Family Satisfaction
                patient_satisfaction_pgii INTEGER CHECK(patient_satisfaction_pgii BETWEEN 1 AND 7), -- 1 Very Much Better, 4 No Change, 7 Very Much Worse
                family_caregiver_satisfaction INTEGER CHECK(family_caregiver_satisfaction BETWEEN 1 AND 5), -- 1 Very Dissatisfied, 5 Very Satisfied
                caregiver_burden_notes TEXT,
                triad_gait_improvement TEXT CHECK(triad_gait_improvement IN ('Markedly Improved', 'Mildly Improved', 'Unchanged', 'Deteriorated')),
                triad_cognition_improvement TEXT CHECK(triad_cognition_improvement IN ('Markedly Improved', 'Mildly Improved', 'Unchanged', 'Deteriorated')),
                triad_continence_improvement TEXT CHECK(triad_continence_improvement IN ('Markedly Improved', 'Mildly Improved', 'Unchanged', 'Deteriorated')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

            -- 10. Surgical Complications & Shunt Revision Surgery
            CREATE TABLE IF NOT EXISTS complications_and_revisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                treatment_id INTEGER,
                event_date DATE DEFAULT CURRENT_DATE,
                complication_type TEXT CHECK(complication_type IN (
                    'Subdural Hygroma (Overdrainage)',
                    'Subdural Hematoma (Overdrainage)',
                    'Shunt Infection (CSF Culture Positive)',
                    'Wound Breakdown / Skin Erosion',
                    'Proximal (Ventricular) Catheter Obstruction',
                    'Valve Malfunction / Occlusion',
                    'Distal Catheter Migration / Disconnection',
                    'Peritoneal Pseudocyst / Malabsorption',
                    'Intra-abdominal Visceral Perforation',
                    'Low-Pressure Postural Headache',
                    'Slit Ventricle Syndrome',
                    'Post-Operative Seizure',
                    'Other'
                )),
                severity TEXT CHECK(severity IN ('Mild (Conservative Observation)', 'Moderate (Requires Shunt Adjustment)', 'Severe (Requires Re-Operation / Hospitalization)')),
                pathogen_isolated TEXT, -- In case of shunt infection
                management_action TEXT,
                repeat_surgery_performed INTEGER DEFAULT 0,
                repeat_surgery_date DATE,
                revision_type TEXT CHECK(revision_type IN (
                    'Proximal (Ventricular) Catheter Revision',
                    'Distal (Peritoneal/Atrial) Catheter Revision',
                    'Valve Replacement / Upgrade to Anti-Gravity',
                    'Complete Shunt System Exchange',
                    'Shunt Externalization & Subsequent Re-implantation',
                    'Conversion to Endoscopic Third Ventriculostomy (ETV)',
                    'Burr Hole Drainage of Subdural Hematoma',
                    'None / Conservative'
                )),
                intraop_findings_cause_of_malfunction TEXT, -- Choroid plexus occlusion, fibrin plug, disconnected connector
                new_hardware_details TEXT,
                clinical_outcome TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (treatment_id) REFERENCES surgical_treatment(id) ON DELETE SET NULL
            );

            -- 11. Medical Treatments (Medical Mx)
            CREATE TABLE IF NOT EXISTS medical_treatments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                treatment_date DATE DEFAULT CURRENT_DATE,
                clinician TEXT,
                management_strategy TEXT,
                drugs_json TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

            -- 12. Revision Shunt Surgeries
            CREATE TABLE IF NOT EXISTS revision_surgeries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                revision_date DATE DEFAULT CURRENT_DATE,
                operating_surgeon TEXT,
                revision_indication TEXT,
                components_revised TEXT,
                valve_manufacturer TEXT,
                new_hardware_details TEXT,
                new_dp_setting TEXT,
                new_ag_setting TEXT,
                intraop_findings TEXT,
                clinical_outcome TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

            -- 13. Other Collateral Surgeries
            CREATE TABLE IF NOT EXISTS other_surgeries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                procedure_date DATE DEFAULT CURRENT_DATE,
                operating_surgeon TEXT,
                procedure_name TEXT NOT NULL,
                indication TEXT,
                findings TEXT,
                clinical_outcome TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

            -- 14. User Accounts & Access Control (RBAC)
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT CHECK(role IN ('Developer', 'Administrator', 'User')) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            );

            -- 15. Encrypted Audit Log Ledger (Immutable)
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                action TEXT NOT NULL,
                resource TEXT,
                record_id TEXT,
                details TEXT,
                encrypted_payload TEXT NOT NULL,
                signature_hash TEXT NOT NULL,
                prev_hash TEXT NOT NULL
            );

            -- 16. Database Design & Custom Schema Definitions
            CREATE TABLE IF NOT EXISTS db_design_schema (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                field_name TEXT NOT NULL,
                field_type TEXT NOT NULL,
                default_value TEXT,
                description TEXT,
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes for high-speed indexing & instant clinical queries
            CREATE INDEX IF NOT EXISTS idx_patients_study_id ON patients(study_id);
            CREATE INDEX IF NOT EXISTS idx_patients_diag ON patients(diagnosis_type);
            CREATE INDEX IF NOT EXISTS idx_clinical_scores_patient ON clinical_scores_followup(patient_id);
            CREATE INDEX IF NOT EXISTS idx_shunt_adjustments_patient ON shunt_adjustments(patient_id);
            CREATE INDEX IF NOT EXISTS idx_csf_studies_patient ON csf_studies(patient_id);
            CREATE INDEX IF NOT EXISTS idx_complications_patient ON complications_and_revisions(patient_id);
            "#
        )?;

        Ok(())
    }
}
