/**
 * NPH & LOVA DATABASE ADAPTER (Unified Browser & Native Tauri SQLite Bridge)
 * Multi-disciplinary NPH & LOVA Database
 * Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)
 * Copyright 2026, Dr G Narenthiran, g_narenthiran@hotmail.com, all rights reserved.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DatabaseAdapter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class DatabaseAdapterImpl {
    constructor() {
      this.isTauri = typeof window !== 'undefined' && 
        (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);
      this.localDB = null;
      this.STORAGE_KEY = 'nph_lova_clinical_db_v2';
    }

    async init() {
      if (this.isTauri && window.__TAURI__?.core?.invoke) {
        console.log("⚡ [DB] Initialized in native Tauri desktop container with SQLite.");
        return true;
      }

      console.log("🌐 [DB] Initialized in universal browser storage engine.");
      this.initLocalStore();
      return true;
    }

    initLocalStore() {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        try {
          this.localDB = JSON.parse(raw);
          if (this.localDB.patients && Array.isArray(this.localDB.patients)) {
            // Ensure child tables exist
            if (!this.localDB.adjustments) this.localDB.adjustments = [];
            if (!this.localDB.reviews) this.localDB.reviews = [];
            if (!this.localDB.complications) this.localDB.complications = [];
            if (!this.localDB.revision_surgeries) this.localDB.revision_surgeries = [];
            if (!this.localDB.other_surgeries) this.localDB.other_surgeries = [];
            return;
          }
        } catch (e) {
          console.error("Local DB parse error, re-seeding demonstrators.", e);
        }
      }

      this.seedDemonstratorData();
      this.persistLocal();
    }

    persistLocal() {
      if (this.localDB) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.localDB));
      }
    }

    seedDemonstratorData() {
      // 1. Arthur Pendelton (iNPH)
      const p1 = {
        id: "pat-inph-001",
        mrn: "NPH-2026-001",
        first_name: "Arthur",
        last_name: "Pendelton",
        diagnosis_category: "iNPH",
        dob: "1952-04-12",
        age: 74,
        gender: "Male",
        handedness: "Right",
        head_circumference: 57.2,
        height: 174,
        weight: 79,
        childhood_large_hat_size: false,
        delayed_motor_milestones: false,
        craniofacial_disproportion: false,
        presentation_date: "2026-01-14",
        consultant_surgeon: "Dr G Narenthiran",
        consultant_neurologist: "Dr Eleanor Vance",

        // History
        prev_neck_surgery: false,
        prev_neck_notes: "",
        prev_chest_surgery: false,
        prev_chest_notes: "",
        prev_abdo_surgery: true,
        prev_abdo_notes: "Elective laparoscopic cholecystectomy in 2018; peritoneum healthy without dense adhesions.",
        prev_head_injury: false,
        prev_head_injury_notes: "",
        prev_neurosurgery: false,
        prev_neurosurgery_notes: "",
        prev_cns_infection: false,
        prev_cns_infection_notes: "",
        prev_sah: false,
        prev_sah_notes: "",

        // Metformin
        metformin_status: "Active",
        metformin_daily_dose: "500mg bd (1000mg)",
        metformin_duration_years: 4.5,
        metformin_indication: "Type 2 Diabetes",
        metformin_glymphatic_notes: "Good glycemic control. Stable ventricular size over 18 months prior to symptomatic transition.",
        obesity_status: false,
        obesity_grade: "None",
        anticoagulation_antiplatelet: "Aspirin 75mg od (withheld 7 days pre-op)",
        comorbidities_other: "Hypertension (well controlled with ACE inhibitor), Mild hyperlipidemia",

        // Presentation
        gait_severity: "3 - Requires Walking Aid",
        gait_magnetic: true,
        gait_broad_based: true,
        gait_short_steps: true,
        gait_turning_steps: true,
        gait_freezing: false,
        gait_falls: true,
        falls_frequency: "3 falls over past 6 months",
        cog_severity: "2 - Mild Executive / Bradyphrenia",
        cog_bradyphrenia: true,
        cog_executive: true,
        cog_apathy: true,
        cog_attention: true,
        cog_retrieval: true,
        baseline_moca: 21,
        baseline_mmse: 24,
        urinary_severity: "2 - Occasional Incontinence",
        urinary_urgency: true,
        urinary_nocturia: true,
        urinary_lack_concern: false,
        urinary_fecal: false,
        lova_headache: false,
        lova_headache_desc: "",
        lova_visual_obscurations: false,
        lova_visual_desc: "",
        lova_papilledema: false,
        lova_papilledema_grade: "Absent",
        symptoms_duration_months: 18,

        // Differential
        excl_ad: "Excluded",
        excl_pd: "Excluded",
        excl_psp: "Excluded",
        excl_msa: "Excluded",
        excl_dlb: "Excluded",
        excl_vad: "Concomitant Small Vessel Disease",
        dopamine_challenge: "No Response (Expected in NPH)",
        excl_csm: "Excluded (Normal Spine MRI)",
        excl_lss: "Co-existing Lumbar Stenosis",
        excl_neuropathy: "Excluded (Normal Sensation)",
        spine_imaging_summary: "MRI cervical spine shows no cord compression. Lumbar MRI shows L4/5 disc bulge without central canal stenosis.",
        mdt_date: "2026-01-28",
        mdt_decision: "Recommend Shunt Surgery",
        mdt_confidence: "Definite Responder (>80%)",
        mdt_notes: "Classic DESH pattern, positive tap test (+29% improvement in 10m walk time), consensus to proceed with programmable VP shunt.",

        // Imaging
        evans_index: 0.38,
        callosal_angle: 76,
        temporal_horns_width: 6.4,
        third_ventricle_width: 13.8,
        desh_tight_vertex: true,
        desh_sylvian_dilation: true,
        desh_focal_sulcal_dilation: true,
        lova_aqueduct_stenosis: false,
        lova_prepontine_membranes: false,
        lova_third_ventricle_bowing: false,
        lova_sella_expansion: false,
        lova_calvarial_thinning: false,
        lova_flow_void: false,
        imaging_modality: "3T MRI Brain (with 3D CISS/FIESTA)",
        radscale_evans: 1,
        radscale_temporal: 2,
        radscale_callosal: 1,
        radscale_periventricular: 1,
        radscale_high_convexity: 1,
        radscale_sylvian: 1,
        radscale_focal_sulci: 1,

        // CSF Dynamics
        tap_date: "2026-02-04",
        tap_volume: 45,
        tap_opening_pressure: "14 cmH2O (10.3 mmHg)",
        tap_closing_pressure: "4 cmH2O",
        tap_pre_walk_time: 19.8,
        tap_pre_walk_steps: 32,
        tap_post_walk_time: 14.1,
        tap_post_walk_steps: 23,
        tap_pre_moca: 21,
        tap_post_moca: 25,
        tap_cognitive_notes: "Spouse reported immediate clarity; patient stated feet felt significantly lighter.",
        inf_rout: 18.4,
        inf_p0: 10.2,
        inf_plateau: 34.5,
        inf_pvi: 18.2,
        inf_b_waves: true,
        eld_duration: null,
        eld_hourly_rate: null,
        eld_total_volume: null,
        eld_clinical_response: "Not Performed",
        csf_lab_results: "Protein 0.38 g/L, Glucose 3.9 mmol/L, WCC 0, no malignant cells.",

        // Surgery & Hardware
        surg_procedure_type: "Ventriculoperitoneal (VP) Shunt",
        surg_date: "2026-02-18",
        surg_operating_surgeon: "Dr G Narenthiran",
        surg_cranial_entry: "Right Frontal (Kocher's Point)",
        surg_navigation: "Electromagnetic Frameless (Stealth / Kick)",
        surg_liliequist_disrupted: false,
        shunt_manufacturer: "Miethke (Aesculap)",
        shunt_model: "proGAV 2.0 with proSA",
        shunt_initial_dp: "10 cmH2O",
        shunt_initial_ag: "20 cmH2O",
        shunt_catheter_type: "Bactiseal (Rifampicin/Clindamycin)",
        shunt_reservoir: "Integrated Pre-chamber",
        shunt_serial_number: "SN-94820-2026",
        surg_operative_notes: "Clear CSF under pulsatile pressure. Ventricular catheter passed smoothly at 5.5 cm into frontal horn. Distal peritoneal catheter tunneled without resistance.",
        surg_postop_course: "Smooth post-op recovery. Mobilized on post-op day 1 without orthostatic dizziness. Discharged day 2.",

        // Outcomes
        inphgs_pre_gait: 3,
        inphgs_pre_cog: 2,
        inphgs_pre_urin: 2,
        inphgs_post_gait: 1,
        inphgs_post_cog: 1,
        inphgs_post_urin: 0,
        kiefer_pre_gait: 5,
        kiefer_pre_cog: 3,
        kiefer_pre_urin: 2,
        kiefer_pre_ha: 0,
        kiefer_pre_diz: 1,
        kiefer_post_gait: 1,
        kiefer_post_cog: 1,
        kiefer_post_urin: 0,
        kiefer_post_ha: 0,
        kiefer_post_diz: 0
      };

      // 2. Margaret Davies (LOVA)
      const p2 = {
        id: "pat-lova-002",
        mrn: "LOVA-2026-002",
        first_name: "Margaret",
        last_name: "Davies",
        diagnosis_category: "LOVA",
        dob: "1968-09-22",
        age: 57,
        gender: "Female",
        handedness: "Right",
        head_circumference: 59.8, // Marked macrocephaly for female (>56 threshold)
        height: 165,
        weight: 68,
        childhood_large_hat_size: true,
        delayed_motor_milestones: true,
        craniofacial_disproportion: true,
        presentation_date: "2026-02-03",
        consultant_surgeon: "Dr G Narenthiran",
        consultant_neurologist: "Dr Marcus Ward",

        // History
        prev_neck_surgery: false,
        prev_neck_notes: "",
        prev_chest_surgery: false,
        prev_chest_notes: "",
        prev_abdo_surgery: false,
        prev_abdo_notes: "No prior abdominal surgery",
        prev_head_injury: false,
        prev_head_injury_notes: "",
        prev_neurosurgery: false,
        prev_neurosurgery_notes: "",
        prev_cns_infection: false,
        prev_cns_infection_notes: "",
        prev_sah: false,
        prev_sah_notes: "",

        metformin_status: "Never",
        metformin_daily_dose: "",
        metformin_duration_years: null,
        metformin_indication: "N/A",
        metformin_glymphatic_notes: "Non-diabetic",
        obesity_status: false,
        obesity_grade: "None",
        anticoagulation_antiplatelet: "None",
        comorbidities_other: "Migrainous tendency in youth, mild asthma",

        // Presentation
        gait_severity: "2 - Moderate Difficulty",
        gait_magnetic: false,
        gait_broad_based: true,
        gait_short_steps: false,
        gait_turning_steps: true,
        gait_freezing: false,
        gait_falls: false,
        falls_frequency: "Occasional unsteadiness on uneven ground",
        cog_severity: "1 - Subjective Complaints",
        cog_bradyphrenia: false,
        cog_executive: true,
        cog_apathy: false,
        cog_attention: false,
        cog_retrieval: true,
        baseline_moca: 26,
        baseline_mmse: 28,
        urinary_severity: "1 - Pollakisuria / Urgency",
        urinary_urgency: true,
        urinary_nocturia: true,
        urinary_lack_concern: false,
        urinary_fecal: false,
        lova_headache: true,
        lova_headache_desc: "Throbbing morning headache waking patient at 05:00, aggravated by coughing and leaning forward.",
        lova_visual_obscurations: true,
        lova_visual_desc: "Transient greying out of vision lasting 3-5 seconds upon standing.",
        lova_papilledema: true,
        lova_papilledema_grade: "Grade 1-2",
        symptoms_duration_months: 36,

        // Differential
        excl_ad: "Excluded",
        excl_pd: "Excluded",
        excl_psp: "Excluded",
        excl_msa: "Excluded",
        excl_dlb: "Excluded",
        excl_vad: "Excluded",
        dopamine_challenge: "Not Performed",
        excl_csm: "Excluded (Normal Spine MRI)",
        excl_lss: "Excluded",
        excl_neuropathy: "Excluded (Normal Sensation)",
        spine_imaging_summary: "Normal cervical and lumbar neuroaxis.",
        mdt_date: "2026-02-12",
        mdt_decision: "Recommend ETV + Disruption of Membranes",
        mdt_confidence: "Definite Responder (>80%)",
        mdt_notes: "Classic LOVA anatomy with severe aqueductal stenosis, expanded sella, calvarial scalloping, and macrocephaly. Optimal candidate for neuroendoscopy.",

        // Imaging
        evans_index: 0.46,
        callosal_angle: 88,
        temporal_horns_width: 8.2,
        third_ventricle_width: 17.5,
        desh_tight_vertex: false,
        desh_sylvian_dilation: false,
        desh_focal_sulcal_dilation: false,
        lova_aqueduct_stenosis: true,
        lova_prepontine_membranes: true,
        lova_third_ventricle_bowing: true,
        lova_sella_expansion: true,
        lova_calvarial_thinning: true,
        lova_flow_void: true,
        imaging_modality: "3T MRI Brain (with 3D CISS/FIESTA)",
        radscale_evans: 1,
        radscale_temporal: 2,
        radscale_callosal: 1,
        radscale_periventricular: 0,
        radscale_high_convexity: 0,
        radscale_sylvian: 0,
        radscale_focal_sulci: 0,

        // CSF Dynamics
        tap_date: "2026-02-16",
        tap_volume: 35,
        tap_opening_pressure: "24 cmH2O (High normal / elevated)",
        tap_closing_pressure: "10 cmH2O",
        tap_pre_walk_time: 15.2,
        tap_pre_walk_steps: 22,
        tap_post_walk_time: 13.8,
        tap_post_walk_steps: 20,
        tap_pre_moca: 26,
        tap_post_moca: 27,
        tap_cognitive_notes: "Morning headache resolved completely for 48 hours following the lumbar puncture.",
        inf_rout: 14.8,
        inf_p0: 16.5,
        inf_plateau: 38.0,
        inf_pvi: 14.5,
        inf_b_waves: true,
        eld_duration: null,
        eld_hourly_rate: null,
        eld_total_volume: null,
        eld_clinical_response: "Not Performed",
        csf_lab_results: "Protein 0.28 g/L, Glucose 4.1 mmol/L, cells normal.",

        // Surgery
        surg_procedure_type: "ETV + Disruption of Prepontine Arachnoid Membranes",
        surg_date: "2026-03-02",
        surg_operating_surgeon: "Dr G Narenthiran",
        surg_cranial_entry: "Right Frontal (Kocher's Point)",
        surg_navigation: "Optical Frameless Neuronavigation",
        surg_liliequist_disrupted: true,
        shunt_manufacturer: "Other",
        shunt_model: "Endoscopic Third Ventriculostomy (No Shunt Hardware)",
        shunt_initial_dp: "N/A (ETV)",
        shunt_initial_ag: "N/A (ETV)",
        shunt_catheter_type: "Standard Barium Impregnated Silicone",
        shunt_reservoir: "None",
        shunt_serial_number: "ETV-PRIMARY",
        surg_operative_notes: "Rigid neuroendoscopy via right Kocher burr hole. Downward bowed, attenuated third ventricle floor fenestrated between mamillary bodies and infundibular recess. Thickened prepontine arachnoid membranes (Membrane of Liliequist) meticulously disrupted, exposing basilar artery and anterior pontine surface with vigorous CSF flow.",
        surg_postop_course: "Immediate cessation of morning headaches and visual obscurations. Uncomplicated discharge on day 2.",

        // Outcomes
        inphgs_pre_gait: 2,
        inphgs_pre_cog: 1,
        inphgs_pre_urin: 1,
        inphgs_post_gait: 0,
        inphgs_post_cog: 0,
        inphgs_post_urin: 0,
        kiefer_pre_gait: 3,
        kiefer_pre_cog: 1,
        kiefer_pre_urin: 1,
        kiefer_pre_ha: 2,
        kiefer_pre_diz: 1,
        kiefer_post_gait: 0,
        kiefer_post_cog: 0,
        kiefer_post_urin: 0,
        kiefer_post_ha: 0,
        kiefer_post_diz: 0
      };

      // Demonstrator Adjustments for Arthur Pendelton
      const a1 = {
        id: "adj-demo-001",
        patient_id: "pat-inph-001",
        adjustment_date: "2026-03-24",
        operator: "Dr G Narenthiran",
        reason_for_adjustment: "Overdrainage (Postural headache / slit ventricles)",
        old_differential_setting: "10 cmH2O",
        new_differential_setting: "12 cmH2O",
        old_antigravity_setting: "20 cmH2O",
        new_antigravity_setting: "25 cmH2O",
        clinical_response: "Postural low-pressure discomfort resolved completely within 48h; gait improvements maintained."
      };

      // Demonstrator Review
      const r1 = {
        id: "rev-demo-001",
        patient_id: "pat-inph-001",
        review_date: "2026-03-30",
        interval_name: "6 Weeks Post-Op",
        gait_improvement_status: "Markedly Improved",
        walk_time_seconds: 13.5,
        cognitive_improvement_status: "Improved",
        moca_score: 25,
        urinary_improvement_status: "Resolved / Dry",
        patient_pgi_i: "1 - Very Much Better",
        caregiver_satisfaction: "5 - Extremely Satisfied",
        mrs_score: 1,
        notes: "Patient walked into clinic without cane. Wife expressed immense gratitude for restored independence."
      };

      // Demonstrator Revision Surgery record
      const rev1 = {
        id: "revsurg-demo-001",
        patient_id: "pat-inph-001",
        surgery_date: "2026-04-10",
        lead_surgeon: "Dr G Narenthiran",
        assistant_surgeon: "Mr S Campbell",
        revision_indication: "Overdrainage Complication (Subdural Hygroma)",
        components_revised: "Anti-Gravity Unit Added / Replaced",
        cranial_entry_site: "Right Frontal (Kocher's Point)",
        valve_manufacturer: "Miethke (Aesculap)",
        new_hardware_model: "Miethke proSA added to existing proGAV unit",
        new_differential_setting: "12 cmH2O",
        new_antigravity_setting: "25 cmH2O",
        new_catheter_type: "Bactiseal (Rifampicin/Clindamycin)",
        operative_findings: "Smooth retroauricular incision. Proximal ventricular catheter aspirated easily with clear sparkling CSF. ProSA gravitational valve spliced into retroauricular line.",
        csf_microbiology_sent: true,
        immediate_outcome: "Post-operative CT showed progressive reduction of hygroma. Patient asymptomatic."
      };

      // Demonstrator Other Surgery record
      const oth1 = {
        id: "othsurg-demo-001",
        patient_id: "pat-inph-001",
        procedure_date: "2026-04-12",
        procedure_name: "Burr Hole Evacuation of Subdural Hygroma / Collection",
        surgical_category: "Neurosurgery - Cranial",
        lead_surgeon: "Dr G Narenthiran",
        anesthesia_type: "Local Anesthesia + Sedation",
        indication: "Symptomatic right frontal hygroma with 9mm mass effect.",
        operative_summary: "Right frontal burr hole drainage. Copious clear xanthochromic subdural fluid evacuated under low pressure. Subdural space irrigated until return clear.",
        complications: "None",
        clinical_outcome: "Uneventful recovery. Full brain re-expansion documented on follow-up imaging."
      };

      this.localDB = {
        patients: [p1, p2],
        adjustments: [a1],
        reviews: [r1],
        complications: [],
        revision_surgeries: [rev1],
        other_surgeries: [oth1]
      };
    }

    // --- PATIENTS CRUD ---
    async getAllPatients() {
      if (this.isTauri && window.__TAURI__?.core?.invoke) {
        try {
          const rows = await window.__TAURI__.core.invoke("select_sql", {
            sql: "SELECT * FROM patients ORDER BY created_at DESC",
            params: []
          });
          return rows || [];
        } catch (e) {
          console.warn("Tauri select_sql error, falling back to local store:", e);
        }
      }
      return (this.localDB?.patients || []).map(p => ({ ...p }));
    }

    async getPatientById(id) {
      if (this.isTauri && window.__TAURI__?.core?.invoke) {
        try {
          const rows = await window.__TAURI__.core.invoke("select_sql", {
            sql: "SELECT * FROM patients WHERE id = ? LIMIT 1",
            params: [id]
          });
          if (rows && rows.length > 0) return rows[0];
        } catch (e) {
          console.warn("Tauri getPatientById error:", e);
        }
      }
      return (this.localDB?.patients || []).find(p => String(p.id) === String(id)) || null;
    }

    async savePatient(patientData) {
      if (!patientData.id) {
        patientData.id = `pat-${Date.now()}`;
      }

      if (this.isTauri && window.__TAURI__?.core?.invoke) {
        try {
          // Native Tauri save
          await window.__TAURI__.core.invoke("execute_sql", {
            sql: `INSERT OR REPLACE INTO patients (
              id, mrn, first_name, last_name, diagnosis_category, dob, age, gender, handedness,
              head_circumference, height, weight, childhood_large_hat_size, delayed_motor_milestones,
              craniofacial_disproportion, presentation_date, consultant_surgeon, consultant_neurologist,
              prev_neck_surgery, prev_neck_notes, prev_chest_surgery, prev_chest_notes,
              prev_abdo_surgery, prev_abdo_notes, prev_head_injury, prev_head_injury_notes,
              prev_neurosurgery, prev_neurosurgery_notes, prev_cns_infection, prev_cns_infection_notes,
              prev_sah, prev_sah_notes, metformin_status, metformin_daily_dose, metformin_duration_years,
              metformin_indication, metformin_glymphatic_notes, obesity_status, obesity_grade,
              anticoagulation_antiplatelet, comorbidities_other, gait_severity, gait_magnetic,
              gait_broad_based, gait_short_steps, gait_turning_steps, gait_freezing, gait_falls,
              falls_frequency, cog_severity, cog_bradyphrenia, cog_executive, cog_apathy,
              cog_attention, cog_retrieval, baseline_moca, baseline_mmse, urinary_severity,
              urinary_urgency, urinary_nocturia, urinary_lack_concern, urinary_fecal, lova_headache,
              lova_headache_desc, lova_visual_obscurations, lova_visual_desc, lova_papilledema,
              lova_papilledema_grade, symptoms_duration_months, excl_ad, excl_pd, excl_psp,
              excl_msa, excl_dlb, excl_vad, dopamine_challenge, excl_csm, excl_lss, excl_neuropathy,
              spine_imaging_summary, mdt_date, mdt_decision, mdt_confidence, mdt_notes,
              evans_index, callosal_angle, temporal_horns_width, third_ventricle_width,
              desh_tight_vertex, desh_sylvian_dilation, desh_focal_sulcal_dilation,
              lova_aqueduct_stenosis, lova_prepontine_membranes, lova_third_ventricle_bowing,
              lova_sella_expansion, lova_calvarial_thinning, lova_flow_void, imaging_modality,
              radscale_evans, radscale_temporal, radscale_callosal, radscale_periventricular,
              radscale_high_convexity, radscale_sylvian, radscale_focal_sulci, tap_date,
              tap_volume, tap_opening_pressure, tap_closing_pressure, tap_pre_walk_time,
              tap_pre_walk_steps, tap_post_walk_time, tap_post_walk_steps, tap_pre_moca,
              tap_post_moca, tap_cognitive_notes, inf_rout, inf_p0, inf_plateau, inf_pvi,
              inf_b_waves, eld_duration, eld_hourly_rate, eld_total_volume, eld_clinical_response,
              csf_lab_results, surg_procedure_type, surg_date, surg_operating_surgeon,
              surg_cranial_entry, surg_navigation, surg_liliequist_disrupted, shunt_manufacturer,
              shunt_model, shunt_initial_dp, shunt_initial_ag, shunt_catheter_type, shunt_reservoir,
              shunt_serial_number, surg_operative_notes, surg_postop_course, inphgs_pre_gait,
              inphgs_pre_cog, inphgs_pre_urin, inphgs_post_gait, inphgs_post_cog, inphgs_post_urin,
              kiefer_pre_gait, kiefer_pre_cog, kiefer_pre_urin, kiefer_pre_ha, kiefer_pre_diz,
              kiefer_post_gait, kiefer_post_cog, kiefer_post_urin, kiefer_post_ha, kiefer_post_diz
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )`,
            params: Object.values(patientData)
          });
        } catch (e) {
          console.warn("Tauri patient save fallback to local:", e);
        }
      }

      // Local Store update
      const idx = this.localDB.patients.findIndex(p => String(p.id) === String(patientData.id));
      if (idx >= 0) {
        this.localDB.patients[idx] = { ...patientData };
      } else {
        this.localDB.patients.unshift({ ...patientData });
      }
      this.persistLocal();
      return true;
    }

    async deletePatient(id) {
      if (this.isTauri && window.__TAURI__?.core?.invoke) {
        try {
          await window.__TAURI__.core.invoke("execute_sql", {
            sql: "DELETE FROM patients WHERE id = ?",
            params: [id]
          });
        } catch (e) {
          console.warn("Tauri delete error:", e);
        }
      }

      this.localDB.patients = this.localDB.patients.filter(p => String(p.id) !== String(id));
      this.localDB.adjustments = this.localDB.adjustments.filter(a => String(a.patient_id) !== String(id));
      this.localDB.reviews = this.localDB.reviews.filter(r => String(r.patient_id) !== String(id));
      this.localDB.complications = this.localDB.complications.filter(c => String(c.patient_id) !== String(id));
      this.localDB.revision_surgeries = (this.localDB.revision_surgeries || []).filter(r => String(r.patient_id) !== String(id));
      this.localDB.other_surgeries = (this.localDB.other_surgeries || []).filter(o => String(o.patient_id) !== String(id));
      this.persistLocal();
      return true;
    }

    // --- SHUNT ADJUSTMENTS ---
    async getAllAdjustments() {
      return (this.localDB?.adjustments || []).map(a => ({ ...a }));
    }

    async getAdjustmentsForPatient(patientId) {
      return (this.localDB?.adjustments || [])
        .filter(a => String(a.patient_id) === String(patientId))
        .sort((a, b) => new Date(b.adjustment_date) - new Date(a.adjustment_date));
    }

    async saveAdjustment(adjData) {
      if (!adjData.id) adjData.id = `adj-${Date.now()}`;
      if (!this.localDB.adjustments) this.localDB.adjustments = [];
      const idx = this.localDB.adjustments.findIndex(a => a.id === adjData.id);
      if (idx >= 0) this.localDB.adjustments[idx] = { ...adjData };
      else this.localDB.adjustments.unshift({ ...adjData });
      this.persistLocal();
      return true;
    }

    async deleteAdjustment(id) {
      this.localDB.adjustments = (this.localDB.adjustments || []).filter(a => a.id !== id);
      this.persistLocal();
      return true;
    }

    // --- CLINIC REVIEWS ---
    async getReviewsForPatient(patientId) {
      return (this.localDB?.reviews || [])
        .filter(r => String(r.patient_id) === String(patientId))
        .sort((a, b) => new Date(b.review_date) - new Date(a.review_date));
    }

    async saveReview(reviewData) {
      if (!reviewData.id) reviewData.id = `rev-${Date.now()}`;
      if (!this.localDB.reviews) this.localDB.reviews = [];
      const idx = this.localDB.reviews.findIndex(r => r.id === reviewData.id);
      if (idx >= 0) this.localDB.reviews[idx] = { ...reviewData };
      else this.localDB.reviews.unshift({ ...reviewData });
      this.persistLocal();
      return true;
    }

    async deleteReview(id) {
      this.localDB.reviews = (this.localDB.reviews || []).filter(r => r.id !== id);
      this.persistLocal();
      return true;
    }

    // --- COMPLICATIONS ---
    async getComplicationsForPatient(patientId) {
      return (this.localDB?.complications || [])
        .filter(c => String(c.patient_id) === String(patientId))
        .sort((a, b) => new Date(b.onset_date) - new Date(a.onset_date));
    }

    async saveComplication(compData) {
      if (!compData.id) compData.id = `comp-${Date.now()}`;
      if (!this.localDB.complications) this.localDB.complications = [];
      const idx = this.localDB.complications.findIndex(c => c.id === compData.id);
      if (idx >= 0) this.localDB.complications[idx] = { ...compData };
      else this.localDB.complications.unshift({ ...compData });
      this.persistLocal();
      return true;
    }

    async deleteComplication(id) {
      this.localDB.complications = (this.localDB.complications || []).filter(c => c.id !== id);
      this.persistLocal();
      return true;
    }

    // --- NEW: REVISION SHUNT SURGERIES ---
    async getRevisionSurgeriesForPatient(patientId) {
      return (this.localDB?.revision_surgeries || [])
        .filter(r => String(r.patient_id) === String(patientId))
        .sort((a, b) => new Date(b.surgery_date) - new Date(a.surgery_date));
    }

    async saveRevisionSurgery(revData) {
      if (!revData.id) revData.id = `revsurg-${Date.now()}`;
      if (!this.localDB.revision_surgeries) this.localDB.revision_surgeries = [];
      const idx = this.localDB.revision_surgeries.findIndex(r => r.id === revData.id);
      if (idx >= 0) this.localDB.revision_surgeries[idx] = { ...revData };
      else this.localDB.revision_surgeries.unshift({ ...revData });
      this.persistLocal();
      return true;
    }

    async deleteRevisionSurgery(id) {
      this.localDB.revision_surgeries = (this.localDB.revision_surgeries || []).filter(r => r.id !== id);
      this.persistLocal();
      return true;
    }

    // --- NEW: OTHER SURGERIES & PROCEDURES ---
    async getOtherSurgeriesForPatient(patientId) {
      return (this.localDB?.other_surgeries || [])
        .filter(o => String(o.patient_id) === String(patientId))
        .sort((a, b) => new Date(b.procedure_date) - new Date(a.procedure_date));
    }

    async saveOtherSurgery(otherData) {
      if (!otherData.id) otherData.id = `othsurg-${Date.now()}`;
      if (!this.localDB.other_surgeries) this.localDB.other_surgeries = [];
      const idx = this.localDB.other_surgeries.findIndex(o => o.id === otherData.id);
      if (idx >= 0) this.localDB.other_surgeries[idx] = { ...otherData };
      else this.localDB.other_surgeries.unshift({ ...otherData });
      this.persistLocal();
      return true;
    }

    async deleteOtherSurgery(id) {
      this.localDB.other_surgeries = (this.localDB.other_surgeries || []).filter(o => o.id !== id);
      this.persistLocal();
      return true;
    }

    // --- EXPORT & IMPORT ---
    async exportFullDatabase() {
      return {
        metadata: {
          app: "Multi-disciplinary NPH & LOVA Database",
          author: "Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)",
          exported_at: new Date().toISOString(),
          version: "1.0.0"
        },
        patients: this.localDB.patients || [],
        adjustments: this.localDB.adjustments || [],
        reviews: this.localDB.reviews || [],
        complications: this.localDB.complications || [],
        revision_surgeries: this.localDB.revision_surgeries || [],
        other_surgeries: this.localDB.other_surgeries || []
      };
    }

    async importFullDatabase(data) {
      if (!data || !data.patients) throw new Error("Invalid NPH & LOVA Registry backup format.");
      this.localDB = {
        patients: data.patients || [],
        adjustments: data.adjustments || [],
        reviews: data.reviews || [],
        complications: data.complications || [],
        revision_surgeries: data.revision_surgeries || [],
        other_surgeries: data.other_surgeries || []
      };
      this.persistLocal();
      return true;
    }
  }

  return new DatabaseAdapterImpl();
}));
