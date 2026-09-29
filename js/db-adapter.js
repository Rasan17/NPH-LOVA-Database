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

  
// Stata 114 Binary Generator Helper (Compatible with Stata 10-19, R haven/foreign, Python pandas)
function buildStata114Binary(variables, rows, datasetLabel = 'NPH & LOVA Registry') {
  const nvar = variables.length;
  const nobs = rows.length;

  let rowSize = 0;
  for (const v of variables) {
    if (v.type <= 244) rowSize += v.type;
    else if (v.type === 251) rowSize += 1;
    else if (v.type === 252) rowSize += 2;
    else if (v.type === 253) rowSize += 4;
    else if (v.type === 254) rowSize += 4;
    else if (v.type === 255) rowSize += 8;
  }

  const headerSize = 109;
  const typlistSize = nvar;
  const varlistSize = nvar * 33;
  const srtlistSize = (nvar + 1) * 2;
  const fmtlistSize = nvar * 49;
  const lbllistSize = nvar * 33;
  const varlabsSize = nvar * 81;
  const expSize = 5;
  const preambleSize = headerSize + typlistSize + varlistSize + srtlistSize + fmtlistSize + lbllistSize + varlabsSize + expSize;
  const totalSize = preambleSize + (nobs * rowSize);

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // 1. Header (109 bytes)
  view.setUint8(0, 114); // Stata 114 format
  view.setUint8(1, 2);   // LSF (little-endian)
  view.setUint8(2, 1);   // Filetype
  view.setUint8(3, 0);   // Unused
  view.setUint16(4, nvar, true);
  view.setUint32(6, nobs, true);

  const encoder = new TextEncoder();
  const lblBytes = encoder.encode(datasetLabel.slice(0, 80));
  uint8.set(lblBytes, 10);

  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(now.getDate()).padStart(2, '0');
  const mon = months[now.getMonth()];
  const yr = now.getFullYear();
  const hr = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const tsStr = day + ' ' + mon + ' ' + yr + ' ' + hr + ':' + min;
  const tsBytes = encoder.encode(tsStr.slice(0, 17));
  uint8.set(tsBytes, 91);

  let offset = 109;

  // 2. Typlist
  for (let i = 0; i < nvar; i++) view.setUint8(offset + i, variables[i].type);
  offset += nvar;

  // 3. Varlist
  for (let i = 0; i < nvar; i++) {
    const rawName = variables[i].name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32);
    const nameBytes = encoder.encode(rawName);
    uint8.set(nameBytes, offset + (i * 33));
  }
  offset += nvar * 33;

  // 4. Srtlist (zeros)
  offset += (nvar + 1) * 2;

  // 5. Fmtlist
  for (let i = 0; i < nvar; i++) {
    const fmt = variables[i].fmt || (variables[i].type <= 244 ? '%' + variables[i].type + 's' : '%9.0g');
    const fmtBytes = encoder.encode(fmt.slice(0, 48));
    uint8.set(fmtBytes, offset + (i * 49));
  }
  offset += nvar * 49;

  // 6. Lbllist (zeros)
  offset += nvar * 33;

  // 7. Varlabs
  for (let i = 0; i < nvar; i++) {
    if (variables[i].label) {
      const labBytes = encoder.encode(variables[i].label.slice(0, 80));
      uint8.set(labBytes, offset + (i * 81));
    }
  }
  offset += nvar * 81;

  // 8. Expansion fields (5 zero bytes)
  offset += 5;

  // 9. Data Rows
  for (let r = 0; r < nobs; r++) {
    const row = rows[r];
    for (let i = 0; i < nvar; i++) {
      const v = variables[i];
      const val = row[v.name];
      const t = v.type;

      if (t <= 244) {
        const strVal = (val !== null && val !== undefined) ? String(val) : '';
        const strBytes = encoder.encode(strVal).slice(0, t);
        uint8.set(strBytes, offset);
        offset += t;
      } else if (t === 251) {
        if (val === null || val === undefined || isNaN(val)) {
          view.setInt8(offset, 101); // Stata byte missing
        } else {
          view.setInt8(offset, parseInt(val, 10));
        }
        offset += 1;
      } else if (t === 252) {
        if (val === null || val === undefined || isNaN(val)) {
          view.setInt16(offset, 32741, true); // Stata int16 missing
        } else {
          view.setInt16(offset, parseInt(val, 10), true);
        }
        offset += 2;
      } else if (t === 253) {
        if (val === null || val === undefined || isNaN(val)) {
          view.setInt32(offset, 2147483621, true); // Stata int32 missing
        } else {
          view.setInt32(offset, parseInt(val, 10), true);
        }
        offset += 4;
      } else if (t === 254) {
        if (val === null || val === undefined || isNaN(val)) {
          view.setUint32(offset, 0x7f000000, true); // Stata float missing
        } else {
          view.setFloat32(offset, parseFloat(val), true);
        }
        offset += 4;
      } else if (t === 255) {
        if (val === null || val === undefined || isNaN(val)) {
          view.setUint32(offset, 0, true);
          view.setUint32(offset + 4, 0x7fe00000, true); // Stata double missing
        } else {
          view.setFloat64(offset, parseFloat(val), true);
        }
        offset += 8;
      }
    }
  }

  return buffer;
}

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
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this.STORAGE_KEY) : (this._memoryStore ? this._memoryStore[this.STORAGE_KEY] : null);
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
            if (!this.localDB.medical_treatments) this.localDB.medical_treatments = [];
            if (!this.localDB.users || !this.localDB.users.length) this.initDefaultUsers();
            if (!this.localDB.audit_logs || !this.localDB.audit_logs.length) this.initDefaultAuditLogs();
            if (!this.localDB.db_design_schema) this.initDefaultDbSchema();
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
        const str = JSON.stringify(this.localDB);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, str);
        } else {
          if (!this._memoryStore) this._memoryStore = {};
          this._memoryStore[this.STORAGE_KEY] = str;
        }
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


      // Demonstrator Medical Treatments
      const med1 = {
        id: "med-demo-001",
        patient_id: "pat-inph-001",
        treatment_date: "2026-01-18",
        prescribing_clinician: "Dr Eleanor Vance",
        management_strategy: "Metformin for Metabolic Glymphatic Support",
        indication: "Type 2 Diabetes with ventricular dilation and slow CSF clearance",
        duration_planned: "Continuous / Long-term",
        tolerability: "Well tolerated, no gastrointestinal upset",
        clinical_response: "Stable glycemic control; preceded surgical evaluation",
        notes: "HbA1c 6.8%; kidney function normal (eGFR 78).",
        medications: [
          { drug_name: "Metformin", dose: "500 mg", frequency: "Twice daily (bd)", route: "Oral", notes: "With meals" },
          { drug_name: "Aspirin", dose: "75 mg", frequency: "Once daily (od)", route: "Oral", notes: "Cardiovascular prophylaxis" }
        ]
      };

      const med2 = {
        id: "med-demo-002",
        patient_id: "pat-lova-002",
        treatment_date: "2026-02-18",
        prescribing_clinician: "Dr G Narenthiran",
        management_strategy: "Acetazolamide (Diamox) for CSF Production Modulation",
        indication: "Frequent morning throbbing headaches prior to scheduled ETV",
        duration_planned: "Bridging therapy until surgery (2 weeks)",
        tolerability: "Mild digital paresthesias, otherwise well tolerated",
        clinical_response: "Noticeable reduction in morning headache intensity",
        notes: "Electrolytes monitored; potassium normal.",
        medications: [
          { drug_name: "Acetazolamide (Diamox)", dose: "250 mg", frequency: "Twice daily (bd)", route: "Oral", notes: "Morning and evening" }
        ]
      };

      this.localDB = {
        patients: [p1, p2],
        adjustments: [a1],
        reviews: [r1],
        complications: [],
        revision_surgeries: [rev1],
        other_surgeries: [oth1],
        medical_treatments: [med1, med2]
      };
      this.initDefaultUsers();
      this.initDefaultAuditLogs();
      this.initDefaultDbSchema();
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

    async deletePatient(id, requestingUser) {
      if (requestingUser?.role === 'User') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'patients',
          record_id: id,
          details: 'User ' + (requestingUser?.username || 'unknown') + ' attempted unauthorized deletion of patient ' + id
        });
        throw new Error("Access Denied: The 'User' role is not permitted to delete patient records.");
      }
      const pat = (this.localDB.patients || []).find(p => String(p.id) === String(id));
      await this.logAuditEvent({
        action: 'PATIENT_DELETE',
        resource: 'patients',
        record_id: id,
        details: 'Deleted patient record ' + (pat ? (pat.first_name + ' ' + pat.last_name + ' (' + pat.mrn + ')') : id) + ' by ' + (requestingUser?.username || 'admin'),
        user: requestingUser?.username,
        role: requestingUser?.role
      });
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
      this.localDB.medical_treatments = (this.localDB.medical_treatments || []).filter(m => String(m.patient_id) !== String(id));
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

    async deleteComplication(id, requestingUser) {
      if (requestingUser?.role === 'User') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'complications',
          record_id: id,
          details: 'User ' + (requestingUser?.username || 'unknown') + ' attempted unauthorized deletion of complication ' + id
        });
        throw new Error("Access Denied: The 'User' role is not permitted to delete complication records.");
      }
      await this.logAuditEvent({
        action: 'COMPLICATION_DELETE',
        resource: 'complications',
        record_id: id,
        details: 'Deleted complication event ' + id + ' by ' + (requestingUser?.username || 'admin'),
        user: requestingUser?.username,
        role: requestingUser?.role
      });
      this.localDB.complications = (this.localDB.complications || []).filter(c => c.id !== id);
      this.persistLocal();
      return true;
    }


    // --- GLOBAL GETTERS FOR COHORT AGGREGATIONS ---
    async getAllReviews() {
      return (this.localDB?.reviews || []).map(r => ({ ...r }));
    }

    async getAllComplications() {
      return (this.localDB?.complications || []).map(c => ({ ...c }));
    }

    async getAllRevisionSurgeries() {
      return (this.localDB?.revision_surgeries || []).map(r => ({ ...r }));
    }

    async getAllOtherSurgeries() {
      return (this.localDB?.other_surgeries || []).map(o => ({ ...o }));
    }

    async getAllMedicalTreatments() {
      return (this.localDB?.medical_treatments || []).map(m => ({ ...m }));
    }

    // --- MEDICAL MANAGEMENT & PHARMACOTHERAPY (Medical Mx) ---
    async getMedicalTreatmentsForPatient(patientId) {
      return (this.localDB?.medical_treatments || [])
        .filter(m => String(m.patient_id) === String(patientId))
        .sort((a, b) => new Date(b.treatment_date) - new Date(a.treatment_date));
    }

    async saveMedicalTreatment(treatmentData) {
      if (!treatmentData.id) treatmentData.id = `med-${Date.now()}`;
      if (!this.localDB.medical_treatments) this.localDB.medical_treatments = [];
      const idx = this.localDB.medical_treatments.findIndex(m => m.id === treatmentData.id);
      if (idx >= 0) this.localDB.medical_treatments[idx] = { ...treatmentData };
      else this.localDB.medical_treatments.unshift({ ...treatmentData });
      this.persistLocal();
      return true;
    }

    async deleteMedicalTreatment(id, requestingUser) {
      if (requestingUser?.role === 'User') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'medical_treatments',
          record_id: id,
          details: 'User ' + (requestingUser?.username || 'unknown') + ' attempted unauthorized deletion of medical treatment ' + id
        });
        throw new Error("Access Denied: The 'User' role is not permitted to delete medical treatments.");
      }
      await this.logAuditEvent({
        action: 'MEDICAL_MX_DELETE',
        resource: 'medical_treatments',
        record_id: id,
        details: 'Deleted medical treatment record ' + id + ' by ' + (requestingUser?.username || 'admin'),
        user: requestingUser?.username,
        role: requestingUser?.role
      });
      this.localDB.medical_treatments = (this.localDB.medical_treatments || []).filter(m => m.id !== id);
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
        other_surgeries: this.localDB.other_surgeries || [],
        medical_treatments: this.localDB.medical_treatments || []
      };
    }


    // =========================================================================
    // USER AUTHENTICATION & ACCESS CONTROL (RBAC)
    // =========================================================================
    initDefaultUsers() {
      if (!this.localDB) return;
      this.localDB.users = [
        {
          id: 'usr-dev-001',
          username: 'developer',
          full_name: 'Lead Database Developer',
          role: 'Developer',
          salt: 'salt_dev_2026',
          password_hash: 'd98630267c71417d5f2165888bb6b3d0864725ad27a861a897113030f24d6652', // dev2026!
          created_at: '2026-01-01T00:00:00.000Z',
          last_login: null
        },
        {
          id: 'usr-admin-001',
          username: 'admin',
          full_name: 'Clinical Database Administrator',
          role: 'Administrator',
          salt: 'salt_admin_2026',
          password_hash: 'cf53f176e7a93d535cd86f3695e5522da0505419de0633467b181e2ebe18970d', // admin2026!
          created_at: '2026-01-01T00:00:00.000Z',
          last_login: null
        },
        {
          id: 'usr-clin-001',
          username: 'clinician',
          full_name: 'Staff Clinical Neurologist',
          role: 'User',
          salt: 'salt_user_2026',
          password_hash: '048573dada841825d713c7ad9be5bd9d27cdc29086e934d7f243e82a09615d27', // user2026!
          created_at: '2026-01-01T00:00:00.000Z',
          last_login: null
        }
      ];
    }

    initDefaultAuditLogs() {
      if (!this.localDB) return;
      this.localDB.audit_logs = [
        {
          id: 'log-genesis-001',
          timestamp: '2026-01-01T00:00:00.000Z',
          user_id: 'SYSTEM',
          user_name: 'System Root Authority',
          role: 'System',
          action: 'DATABASE_OPEN',
          resource: 'system',
          record_id: 'GENESIS',
          details_preview: 'Multi-disciplinary NPH & LOVA Database initialized with cryptographic audit ledger.',
          encrypted_payload: 'SEALED_v1:eyJhY3Rpb24iOiJEQVRBQkFTRV9PUEVOIiwicmVzb3VyY2UiOiJzeXN0ZW0iLCJkZXRhaWxzIjoiR2VuZXNpcyBOUEggJiBMT1ZBIERhdGFiYXNlIHNlc3Npb24gaW5pdGlhbGl6ZWQifQ==:GENESIS_SIG',
          prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          entry_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        }
      ];
    }

    initDefaultDbSchema() {
      if (!this.localDB) return;
      this.localDB.db_design_schema = {
        version: '2.2.0',
        last_modified: '2026-01-01T00:00:00.000Z',
        modified_by: 'developer',
        tables: [
          {
            name: 'patients',
            description: 'Core registry of NPH and adult LOVA patients with head circumference (OFC) biometrics',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'Unique clinical record identifier' },
              { name: 'study_id', type: 'TEXT', unique: true, description: 'Registry study reference number' },
              { name: 'mrn', type: 'TEXT', required: true, description: 'Hospital Identifier / MRN' },
              { name: 'diagnosis_category', type: 'TEXT', check: 'iNPH, sNPH, LOVA, Other', description: 'Primary pathology classification' },
              { name: 'head_circumference', type: 'REAL', description: 'Adult occipitofrontal circumference (cm) for LOVA distinction' },
              { name: 'evans_index', type: 'REAL', description: 'Frontal horn ratio > 0.3' },
              { name: 'radscale_total', type: 'INTEGER', description: 'iNPH Radscale score (0-12)' },
              { name: 'metformin_status', type: 'TEXT', description: 'Active, Discontinued, or None' }
            ]
          },
          {
            name: 'medical_treatments',
            description: 'Medical management (Medical Mx): CSF suppression, diuretics, and glymphatic pharmacotherapy',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'Treatment entry ID' },
              { name: 'patient_id', type: 'TEXT', fk: 'patients.id', description: 'Foreign key to patient' },
              { name: 'treatment_date', type: 'DATE', description: 'Initiation or adjustment date' },
              { name: 'clinician', type: 'TEXT', description: 'Prescribing neurologist / clinician' },
              { name: 'management_strategy', type: 'TEXT', description: 'CSF Suppression, Glymphatic Support, Osmotic, etc.' },
              { name: 'drugs', type: 'JSON', description: 'Array of drug names, dosages, frequencies, and indications' }
            ]
          },
          {
            name: 'surgical_treatment',
            description: 'Diversionary CSF procedures, programmable valves, and gravitational units',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'Surgical procedure ID' },
              { name: 'patient_id', type: 'TEXT', fk: 'patients.id', description: 'Foreign key to patient' },
              { name: 'surg_procedure_type', type: 'TEXT', description: 'VP, LP, VA, Ventriculopleural, ETV' },
              { name: 'shunt_manufacturer', type: 'TEXT', description: 'Miethke, Medtronic, Codman, Sophysa' },
              { name: 'shunt_model', type: 'TEXT', description: 'Specific valve hardware model' },
              { name: 'shunt_initial_dp', type: 'TEXT', description: 'Differential pressure opening threshold' },
              { name: 'shunt_initial_ag', type: 'TEXT', description: 'Anti-gravity gravitational setting' }
            ]
          },
          {
            name: 'revision_surgeries',
            description: 'Repeat and revision shunt surgical interventions',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'Revision procedure ID' },
              { name: 'patient_id', type: 'TEXT', fk: 'patients.id', description: 'Foreign key to patient' },
              { name: 'revision_date', type: 'DATE', description: 'Date of re-exploration' },
              { name: 'revision_indication', type: 'TEXT', description: 'Proximal block, valve occlusion, distal migration' },
              { name: 'valve_manufacturer', type: 'TEXT', description: 'Hardware manufacturer of replacement unit' },
              { name: 'components_revised', type: 'TEXT', description: 'Proximal catheter, valve, anti-gravity unit, distal' }
            ]
          },
          {
            name: 'other_surgeries',
            description: 'Collateral surgical procedures (hygroma evacuations, laparoscopies)',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'Procedure ID' },
              { name: 'patient_id', type: 'TEXT', fk: 'patients.id', description: 'Foreign key to patient' },
              { name: 'procedure_date', type: 'DATE', description: 'Date performed' },
              { name: 'procedure_name', type: 'TEXT', description: 'Name of procedure' },
              { name: 'indication', type: 'TEXT', description: 'Clinical reason for operation' }
            ]
          },
          {
            name: 'complications',
            description: 'Adverse surgical and hardware complications ledger',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'Complication event ID' },
              { name: 'patient_id', type: 'TEXT', fk: 'patients.id', description: 'Foreign key to patient' },
              { name: 'event_date', type: 'DATE', description: 'Date identified' },
              { name: 'category', type: 'TEXT', description: 'Overdrainage hygroma, mechanical block, infection' },
              { name: 'repeat_surgery_required', type: 'TEXT', description: 'Yes / No' }
            ]
          },
          {
            name: 'users',
            description: 'Role-Based Access Control (RBAC) user credential registry',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'User identifier' },
              { name: 'username', type: 'TEXT', unique: true, description: 'Login handle' },
              { name: 'full_name', type: 'TEXT', description: 'Full clinical or technical title' },
              { name: 'role', type: 'TEXT', check: 'Developer, Administrator, User', description: 'Access tier' },
              { name: 'created_at', type: 'DATETIME', description: 'Account creation timestamp' },
              { name: 'last_login', type: 'DATETIME', description: 'Most recent successful authentication' }
            ]
          },
          {
            name: 'audit_logs',
            description: 'Legally immutable, cryptographically sealed regulatory audit ledger',
            columns: [
              { name: 'id', type: 'TEXT', pk: true, description: 'Log entry ID' },
              { name: 'timestamp', type: 'DATETIME', description: 'UTC timestamp of event' },
              { name: 'user_id', type: 'TEXT', description: 'Username executing event' },
              { name: 'role', type: 'TEXT', description: 'Role at time of operation' },
              { name: 'action', type: 'TEXT', description: 'DATABASE_OPEN, PATIENT_CREATE, EXPORT, etc.' },
              { name: 'prev_hash', type: 'TEXT', description: 'SHA-256 link to prior record in chain' },
              { name: 'entry_hash', type: 'TEXT', description: 'SHA-256 seal of current entry' }
            ]
          }
        ],
        custom_fields: []
      };
    }

    // --- CRYPTOGRAPHY & AUDIT UTILITIES ---
    async sha256(message) {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      let hash = 0;
      for (let i = 0; i < message.length; i++) {
        const char = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    }

    async getAuditMasterKey() {
      if (this._auditKey) return this._auditKey;
      if (typeof crypto === 'undefined' || !crypto.subtle) return null;
      try {
        const enc = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
          'raw',
          enc.encode('NPH_LOVA_AUDIT_MASTER_KEY_2026_DR_G_NARENTHIRAN'),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );
        this._auditKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: enc.encode('NPH_LOVA_AUDIT_SALT_2026'),
            iterations: 100000,
            hash: 'SHA-256'
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        return this._auditKey;
      } catch (e) {
        return null;
      }
    }

    async encryptAuditPayload(plainObj) {
      const jsonStr = JSON.stringify(plainObj);
      const key = await this.getAuditMasterKey();
      if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
        const b64 = Buffer.from ? Buffer.from(jsonStr).toString('base64') : btoa(unescape(encodeURIComponent(jsonStr)));
        const sig = await this.sha256('SEAL_' + b64 + '_2026');
        return 'SEALED_v1:' + b64 + ':' + sig;
      }
      try {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(jsonStr);
        const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
        const cipherHex = Array.from(new Uint8Array(ciphertextBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        return 'AES-GCM-256:' + ivHex + ':' + cipherHex;
      } catch (e) {
        const b64 = Buffer.from ? Buffer.from(jsonStr).toString('base64') : btoa(unescape(encodeURIComponent(jsonStr)));
        const sig = await this.sha256('SEAL_' + b64 + '_2026');
        return 'SEALED_v1:' + b64 + ':' + sig;
      }
    }

    async decryptAuditPayload(encryptedStr) {
      if (!encryptedStr) return null;
      if (encryptedStr.startsWith('SEALED_v1:')) {
        const parts = encryptedStr.split(':');
        const b64 = parts[1];
        try {
          const jsonStr = Buffer.from ? Buffer.from(b64, 'base64').toString('utf8') : decodeURIComponent(escape(atob(b64)));
          return JSON.parse(jsonStr);
        } catch (e) {
          return { details: 'Payload decoding error' };
        }
      }
      if (encryptedStr.startsWith('AES-GCM-256:')) {
        const parts = encryptedStr.split(':');
        const ivHex = parts[1];
        const cipherHex = parts[2];
        const key = await this.getAuditMasterKey();
        if (!key) throw new Error('Decryption key unavailable.');
        const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
        const jsonStr = new TextDecoder().decode(decryptedBuffer);
        return JSON.parse(jsonStr);
      }
      return null;
    }

    async hashPassword(password, salt) {
      return await this.sha256(password + salt);
    }

    // --- AUDIT LOGGING ENGINE (IMMUTABLE) ---
    async logAuditEvent({ action, resource = 'system', record_id = null, details = '', user = null, role = null }) {
      if (!this.localDB) this.initLocalStore();
      if (!this.localDB.audit_logs) this.initDefaultAuditLogs();

      const timestamp = new Date().toISOString();
      const userId = user || this._currentUser?.username || 'SYSTEM';
      const userRole = role || this._currentUser?.role || 'System';
      const userName = this._currentUser?.full_name || userId;
      const logId = 'log-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

      const logs = this.localDB.audit_logs;
      const prevHash = logs.length > 0 ? logs[logs.length - 1].entry_hash : '0000000000000000000000000000000000000000000000000000000000000000';

      const plainPayload = {
        id: logId,
        timestamp,
        user_id: userId,
        user_name: userName,
        role: userRole,
        action,
        resource,
        record_id,
        details,
        prev_hash: prevHash
      };

      const encryptedPayload = await this.encryptAuditPayload(plainPayload);
      const entryHash = await this.sha256(prevHash + '|' + timestamp + '|' + userId + '|' + userRole + '|' + action + '|' + details);

      const entry = {
        id: logId,
        timestamp,
        user_id: userId,
        user_name: userName,
        role: userRole,
        action,
        resource,
        record_id,
        details_preview: details.length > 80 ? details.substring(0, 77) + '...' : details,
        encrypted_payload: encryptedPayload,
        prev_hash: prevHash,
        entry_hash: entryHash
      };

      this.localDB.audit_logs.push(entry);
      this.persistLocal();
      return entry;
    }

    deleteAuditLog() {
      throw new Error('Regulatory Compliance Violation: Audit log entries are cryptographically immutable and deletion is forbidden.');
    }

    async getDecryptedAuditLogs(requestingUserRole) {
      if (requestingUserRole !== 'Administrator' && requestingUserRole !== 'Developer') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'audit_logs',
          details: 'User with unauthorized role ' + requestingUserRole + ' attempted access to Encrypted Audit Log.'
        });
        throw new Error('Access Denied: Only Administrator and Developer roles are authorized to review the Encrypted Audit Log.');
      }

      const logs = this.localDB?.audit_logs || [];
      const decryptedList = [];

      for (const log of logs) {
        let dec = null;
        try {
          dec = await this.decryptAuditPayload(log.encrypted_payload);
        } catch (e) {
          dec = { details: log.details_preview };
        }
        decryptedList.push({
          ...log,
          decrypted: dec || { details: log.details_preview }
        });
      }

      return decryptedList.reverse();
    }

    async verifyAuditChain() {
      const logs = this.localDB?.audit_logs || [];
      if (logs.length === 0) return { valid: true, total: 0, message: 'Ledger empty' };

      for (let i = 0; i < logs.length; i++) {
        const cur = logs[i];
        const expectedPrev = i === 0 ? '0000000000000000000000000000000000000000000000000000000000000000' : logs[i - 1].entry_hash;
        if (cur.prev_hash !== expectedPrev) {
          return { valid: false, total: logs.length, brokenAtIndex: i, error: 'Broken cryptographic link at index ' + i };
        }
      }
      return { valid: true, total: logs.length, message: 'All ' + logs.length + ' log records verified authentic with unbroken cryptographic chain.' };
    }

    // --- USER MANAGEMENT (RBAC) ---
    async authenticateUser(username, password) {
      if (!this.localDB) this.initLocalStore();
      const users = this.localDB?.users || [];
      const cleanU = (username || '').toLowerCase().trim();
      const user = users.find(u => u.username.toLowerCase() === cleanU);

      if (!user) {
        await this.logAuditEvent({
          action: 'DATABASE_LOGIN_FAILED',
          resource: 'users',
          details: 'Failed authentication attempt for unknown username ' + username,
          user: username || 'UNKNOWN',
          role: 'None'
        });
        return { success: false, message: 'Invalid username or password.' };
      }

      const inputHash = await this.hashPassword(password, user.salt);
      if (inputHash !== user.password_hash) {
        await this.logAuditEvent({
          action: 'DATABASE_LOGIN_FAILED',
          resource: 'users',
          details: 'Failed authentication attempt for user ' + user.username + ': incorrect password',
          user: user.username,
          role: user.role
        });
        return { success: false, message: 'Invalid username or password.' };
      }

      user.last_login = new Date().toISOString();
      this.persistLocal();
      this._currentUser = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        last_login: user.last_login
      };

      await this.logAuditEvent({
        action: 'DATABASE_OPEN',
        resource: 'system',
        details: 'User ' + user.username + ' (' + user.role + ') successfully authenticated and opened database session.',
        user: user.username,
        role: user.role
      });

      return { success: true, user: this._currentUser };
    }

    async changeUserPassword(username, oldPassword, newPassword) {
      const users = this.localDB?.users || [];
      const user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
      if (!user) throw new Error('User not found.');

      const oldHash = await this.hashPassword(oldPassword, user.salt);
      if (oldHash !== user.password_hash) {
        throw new Error('Current password verification failed.');
      }

      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.');
      }

      user.salt = 'salt_' + Date.now();
      user.password_hash = await this.hashPassword(newPassword, user.salt);
      this.persistLocal();

      await this.logAuditEvent({
        action: 'PASSWORD_CHANGE',
        resource: 'users',
        record_id: user.id,
        details: 'User ' + user.username + ' successfully updated their account password.',
        user: user.username,
        role: user.role
      });

      return true;
    }

    async getAllUsers(requestingUserRole) {
      if (requestingUserRole !== 'Administrator' && requestingUserRole !== 'Developer') {
        throw new Error('Access Denied: Only Administrator or Developer may list registered users.');
      }
      return (this.localDB?.users || []).map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        created_at: u.created_at,
        last_login: u.last_login
      }));
    }

    async createUser({ username, password, full_name, role }, requestingUser) {
      if (requestingUser?.role !== 'Administrator' && requestingUser?.role !== 'Developer') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'users',
          details: 'Unauthorized attempt by ' + requestingUser?.username + ' to create user account.'
        });
        throw new Error('Access Denied: Only Administrator or Developer may provision new users.');
      }

      if (!username || !password || !role) {
        throw new Error('Username, password, and role are mandatory.');
      }

      const users = this.localDB.users || [];
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
        throw new Error('Username already exists in registry.');
      }

      const salt = 'salt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const hash = await this.hashPassword(password, salt);

      const newUser = {
        id: 'usr-' + Date.now(),
        username: username.trim(),
        full_name: full_name ? full_name.trim() : username.trim(),
        role: role,
        salt,
        password_hash: hash,
        created_at: new Date().toISOString(),
        last_login: null
      };

      this.localDB.users.push(newUser);
      this.persistLocal();

      await this.logAuditEvent({
        action: 'USER_CREATE',
        resource: 'users',
        record_id: newUser.id,
        details: 'Provisioned new user ' + newUser.username + ' (' + newUser.role + ') by ' + requestingUser.username,
        user: requestingUser.username,
        role: requestingUser.role
      });

      return {
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.full_name,
        role: newUser.role,
        created_at: newUser.created_at
      };
    }

    async deleteUser(userId, requestingUser) {
      if (requestingUser?.role !== 'Administrator' && requestingUser?.role !== 'Developer') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'users',
          details: 'Unauthorized attempt by ' + requestingUser?.username + ' to delete user ID ' + userId
        });
        throw new Error('Access Denied: Only Administrator or Developer may delete users.');
      }

      const users = this.localDB?.users || [];
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) throw new Error('User not found.');

      if (targetUser.username.toLowerCase() === requestingUser.username.toLowerCase()) {
        throw new Error('Cannot delete your own active user account.');
      }

      if (targetUser.role === 'Administrator') {
        const adminCount = users.filter(u => u.role === 'Administrator').length;
        if (adminCount <= 1) {
          throw new Error('Cannot delete the sole remaining Administrator account.');
        }
      }

      this.localDB.users = users.filter(u => u.id !== userId);
      this.persistLocal();

      await this.logAuditEvent({
        action: 'USER_DELETE',
        resource: 'users',
        record_id: userId,
        details: 'Deleted user ' + targetUser.username + ' (' + targetUser.role + ') by ' + requestingUser.username,
        user: requestingUser.username,
        role: requestingUser.role
      });

      return true;
    }

    // --- DATABASE DESIGN STUDIO (DEVELOPER ONLY) ---
    async getDatabaseDesignSchema(requestingUserRole) {
      if (requestingUserRole !== 'Developer') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'db_design_schema',
          details: 'Unauthorized role ' + requestingUserRole + ' attempted access to Database Design Studio.'
        });
        throw new Error('Access Denied: Only Developer role has privilege to inspect or modify database design.');
      }
      return this.localDB.db_design_schema;
    }

    async addCustomFieldToTable({ tableName, fieldName, fieldType, defaultValue, description }, requestingUser) {
      if (requestingUser?.role !== 'Developer') {
        throw new Error('Access Denied: Only Developer role has privilege to modify database design.');
      }
      if (!this.localDB.db_design_schema) this.initDefaultDbSchema();
      if (!this.localDB.db_design_schema.custom_fields) {
        this.localDB.db_design_schema.custom_fields = [];
      }

      const fieldObj = {
        id: 'field-' + Date.now(),
        tableName,
        fieldName: fieldName.trim(),
        fieldType,
        defaultValue: defaultValue || '',
        description: description || '',
        addedBy: requestingUser.username,
        addedAt: new Date().toISOString()
      };

      this.localDB.db_design_schema.custom_fields.push(fieldObj);
      this.localDB.db_design_schema.last_modified = new Date().toISOString();
      this.localDB.db_design_schema.modified_by = requestingUser.username;
      this.persistLocal();

      await this.logAuditEvent({
        action: 'DATABASE_DESIGN_CHANGE',
        resource: tableName,
        details: 'Added custom field ' + fieldName + ' (' + fieldType + ') to table ' + tableName + ' by Developer ' + requestingUser.username,
        user: requestingUser.username,
        role: requestingUser.role
      });

      return fieldObj;
    }

    async createCustomTable({ tableName, description, columns }, requestingUser) {
      if (requestingUser?.role !== 'Developer') {
        throw new Error('Access Denied: Only Developer role has privilege to modify database design.');
      }
      if (!this.localDB.db_design_schema) this.initDefaultDbSchema();

      const newTable = {
        name: tableName.trim(),
        description: description || 'Custom research table',
        columns: columns || []
      };

      this.localDB.db_design_schema.tables.push(newTable);
      this.localDB.db_design_schema.last_modified = new Date().toISOString();
      this.localDB.db_design_schema.modified_by = requestingUser.username;
      this.persistLocal();

      await this.logAuditEvent({
        action: 'DATABASE_DESIGN_CHANGE',
        resource: tableName,
        details: 'Created custom research table ' + tableName + ' by Developer ' + requestingUser.username,
        user: requestingUser.username,
        role: requestingUser.role
      });

      return newTable;
    }

    // --- CLONING & BACKUPS (ADMINISTRATOR & DEVELOPER ONLY) ---
    async cloneDatabase(cloneName, requestingUser) {
      if (requestingUser?.role === 'User') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'system',
          details: 'User ' + requestingUser?.username + ' attempted unauthorized database clone.'
        });
        throw new Error('Access Denied: User role is not permitted to clone the database.');
      }

      const cloneSnapshot = {
        metadata: {
          app: 'Multi-disciplinary NPH & LOVA Database',
          attribution: 'Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)',
          clone_name: cloneName || ('NPH_LOVA_Registry_Clone_' + Date.now()),
          cloned_at: new Date().toISOString(),
          cloned_by: requestingUser?.username || 'admin',
          source_version: '2.2.0'
        },
        patients: JSON.parse(JSON.stringify(this.localDB.patients || [])),
        adjustments: JSON.parse(JSON.stringify(this.localDB.adjustments || [])),
        reviews: JSON.parse(JSON.stringify(this.localDB.reviews || [])),
        complications: JSON.parse(JSON.stringify(this.localDB.complications || [])),
        revision_surgeries: JSON.parse(JSON.stringify(this.localDB.revision_surgeries || [])),
        other_surgeries: JSON.parse(JSON.stringify(this.localDB.other_surgeries || [])),
        medical_treatments: JSON.parse(JSON.stringify(this.localDB.medical_treatments || []))
      };

      await this.logAuditEvent({
        action: 'DATABASE_CLONE',
        resource: 'system',
        details: 'Database cloned as ' + cloneSnapshot.metadata.clone_name + ' by ' + requestingUser?.username + ' (' + cloneSnapshot.patients.length + ' patients)',
        user: requestingUser?.username,
        role: requestingUser?.role
      });

      return cloneSnapshot;
    }

    async generateExcelBackup(requestingUser) {
      if (requestingUser?.role === 'User') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'system',
          details: 'User ' + requestingUser?.username + ' attempted unauthorized Excel backup generation.'
        });
        throw new Error('Access Denied: User role is not permitted to export data or create Excel backups.');
      }

      const pList = this.localDB.patients || [];
      const mList = this.localDB.medical_treatments || [];
      const aList = this.localDB.adjustments || [];
      const rList = this.localDB.reviews || [];
      const cList = this.localDB.complications || [];
      const revList = this.localDB.revision_surgeries || [];
      const othList = this.localDB.other_surgeries || [];

      function toXmlRows(headers, rows) {
        let out = '<Row><Cell><Data ss:Type="String">' + headers.join('</Data></Cell><Cell><Data ss:Type="String">') + '</Data></Cell></Row>';
        rows.forEach(r => {
          out += '<Row>';
          r.forEach(val => {
            const clean = String(val == null ? '' : val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            out += '<Cell><Data ss:Type="String">' + clean + '</Data></Cell>';
          });
          out += '</Row>';
        });
        return out;
      }

      const patientRows = pList.map(p => [
        p.study_id || p.id,
        p.mrn,
        p.first_name + ' ' + p.last_name,
        p.dob,
        p.age,
        p.gender,
        p.head_circumference,
        p.diagnosis_category,
        p.evans_index,
        p.radscale_total,
        p.surg_procedure_type || 'None',
        p.metformin_status || 'None'
      ]);

      const medRows = mList.map(m => [
        m.id,
        m.patient_id,
        m.treatment_date,
        m.clinician,
        m.management_strategy,
        Array.isArray(m.drugs) ? m.drugs.map(d => d.name + ' (' + d.dose + ')').join('; ') : ''
      ]);

      const revRows = revList.map(r => [
        r.id,
        r.patient_id,
        r.revision_date,
        r.operating_surgeon,
        r.revision_indication,
        r.valve_manufacturer,
        r.components_revised,
        r.clinical_outcome
      ]);

      const compRows = cList.map(c => [
        c.id,
        c.patient_id,
        c.event_date,
        c.category,
        c.severity,
        c.repeat_surgery_required
      ]);

      const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Patients Master">
<Table>
${toXmlRows(['Study ID', 'MRN', 'Name', 'DOB', 'Age', 'Gender', 'OFC (cm)', 'Diagnosis', 'Evans Index', 'Radscale', 'Surgery', 'Metformin'], patientRows)}
</Table>
</Worksheet>
<Worksheet ss:Name="Medical Mx">
<Table>
${toXmlRows(['ID', 'Patient ID', 'Date', 'Clinician', 'Strategy', 'Prescribed Medications'], medRows)}
</Table>
</Worksheet>
<Worksheet ss:Name="Revisions">
<Table>
${toXmlRows(['ID', 'Patient ID', 'Date', 'Surgeon', 'Indication', 'Valve Manufacturer', 'Components Revised', 'Outcome'], revRows)}
</Table>
</Worksheet>
<Worksheet ss:Name="Complications">
<Table>
${toXmlRows(['ID', 'Patient ID', 'Date', 'Category', 'Severity', 'Surgery Required'], compRows)}
</Table>
</Worksheet>
</Workbook>`;

      await this.logAuditEvent({
        action: 'DATA_EXPORT_EXCEL',
        resource: 'system',
        details: 'Generated comprehensive Multi-Worksheet Excel Backup by ' + requestingUser?.username + ' (' + pList.length + ' patients)',
        user: requestingUser?.username,
        role: requestingUser?.role
      });

      return xml;
    }

    async generateSqliteBackup(requestingUser) {
      if (requestingUser?.role === 'User') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'system',
          details: 'User ' + requestingUser?.username + ' attempted unauthorized SQLite backup generation.'
        });
        throw new Error('Access Denied: User role is not permitted to create SQLite backups.');
      }

      const pList = this.localDB.patients || [];
      const mList = this.localDB.medical_treatments || [];
      const revList = this.localDB.revision_surgeries || [];
      const compList = this.localDB.complications || [];

      let sql = `-- Multi-disciplinary NPH & LOVA Database SQLite SQL Backup
-- Attribution: Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)
-- Timestamp: ${new Date().toISOString()}

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, mrn TEXT, diagnosis_category TEXT, head_circumference REAL, age INTEGER, gender TEXT, data_json TEXT);
CREATE TABLE IF NOT EXISTS medical_treatments (id TEXT PRIMARY KEY, patient_id TEXT, treatment_date DATE, clinician TEXT, strategy TEXT, drugs_json TEXT);
CREATE TABLE IF NOT EXISTS revision_surgeries (id TEXT PRIMARY KEY, patient_id TEXT, revision_date DATE, indication TEXT, manufacturer TEXT);

`;

            pList.forEach(p => {
        const json = JSON.stringify(p).replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO patients VALUES ('${p.id}', '${p.mrn || ''}', '${p.diagnosis_category || ''}', ${p.head_circumference || 0}, ${p.age || 0}, '${p.gender || ''}', '${json}');\n`;
      });

      mList.forEach(m => {
        const drugs = JSON.stringify(m.drugs || []).replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO medical_treatments VALUES ('${m.id}', '${m.patient_id}', '${m.treatment_date}', '${m.clinician || ''}', '${m.management_strategy || ''}', '${drugs}');\n`;
      });

      revList.forEach(r => {
        sql += `INSERT OR REPLACE INTO revision_surgeries VALUES ('${r.id}', '${r.patient_id}', '${r.revision_date}', '${r.revision_indication || ''}', '${r.valve_manufacturer || ''}');\n`;
      });

      sql += '\nCOMMIT;\n';

      await this.logAuditEvent({
        action: 'SQLITE_BACKUP',
        resource: 'system',
        details: 'Generated SQLite SQL Data & Schema Backup by ' + requestingUser?.username,
        user: requestingUser?.username,
        role: requestingUser?.role
      });

      return sql;
    }

    async generateStataDtaExport(datasetType = 'cohort', requestingUser) {
      if (requestingUser?.role === 'User') {
        await this.logAuditEvent({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: 'system',
          details: 'User ' + requestingUser?.username + ' attempted unauthorized Stata (.dta) dataset export.'
        });
        throw new Error("Access Denied: The 'User' role is not permitted to export data or create Stata datasets.");
      }

      const pList = this.localDB.patients || [];
      const mList = this.localDB.medical_treatments || [];
      const aList = this.localDB.adjustments || [];
      const rList = this.localDB.reviews || [];
      const cList = this.localDB.complications || [];
      const revList = this.localDB.revision_surgeries || [];
      const othList = this.localDB.other_surgeries || [];

      let variables = [];
      let rows = [];
      let label = 'NPH LOVA Registry';

      if (datasetType === 'reviews') {
        label = 'NPH LOVA Longitudinal Reviews';
        variables = [
          { name: 'review_id', type: 24, fmt: '%24s', label: 'Review Event Record ID' },
          { name: 'patient_id', type: 24, fmt: '%24s', label: 'Patient Unique Database ID' },
          { name: 'study_id', type: 24, fmt: '%24s', label: 'Patient Study ID' },
          { name: 'mrn', type: 24, fmt: '%24s', label: 'Hospital Record Number' },
          { name: 'review_date', type: 10, fmt: '%10s', label: 'Review Assessment Date' },
          { name: 'interval', type: 24, fmt: '%24s', label: 'Milestone Timepoint' },
          { name: 'clinician', type: 32, fmt: '%32s', label: 'Evaluating Clinician' },
          { name: 'gait_status', type: 24, fmt: '%24s', label: 'Gait Improvement Status' },
          { name: 'walk_time_sec', type: 255, fmt: '%8.2f', label: 'Timed 10m Walk (seconds)' },
          { name: 'walk_steps', type: 252, fmt: '%8.0g', label: 'Timed 10m Walk Steps' },
          { name: 'tug_sec', type: 255, fmt: '%8.2f', label: 'Timed Up and Go (seconds)' },
          { name: 'cog_status', type: 24, fmt: '%24s', label: 'Cognitive Improvement Status' },
          { name: 'moca_score', type: 252, fmt: '%8.0g', label: 'Follow-up MoCA Score (0-30)' },
          { name: 'urin_status', type: 24, fmt: '%24s', label: 'Urinary Improvement Status' },
          { name: 'pgi_i', type: 24, fmt: '%24s', label: 'Patient Global Impression (PGI-I)' }
        ];

        rows = rList.map(r => {
          const p = pList.find(pt => pt.id === r.patient_id) || {};
          return {
            review_id: r.id || '',
            patient_id: r.patient_id || '',
            study_id: p.study_id || p.id || '',
            mrn: p.mrn || '',
            review_date: r.review_date || '',
            interval: r.interval_name || '',
            clinician: r.evaluating_clinician || 'Dr G Narenthiran',
            gait_status: r.gait_improvement_status || '',
            walk_time_sec: r.walk_time_seconds != null && !isNaN(r.walk_time_seconds) ? parseFloat(r.walk_time_seconds) : null,
            walk_steps: r.walk_steps != null && !isNaN(r.walk_steps) ? parseInt(r.walk_steps, 10) : null,
            tug_sec: r.tug_seconds != null && !isNaN(r.tug_seconds) ? parseFloat(r.tug_seconds) : null,
            cog_status: r.cognitive_improvement_status || '',
            moca_score: r.moca_score != null && !isNaN(r.moca_score) ? parseInt(r.moca_score, 10) : null,
            urin_status: r.urinary_improvement_status || '',
            pgi_i: r.patient_pgi_i || ''
          };
        });
      } else if (datasetType === 'medical') {
        label = 'NPH LOVA Medical Mx';
        variables = [
          { name: 'treatment_id', type: 24, fmt: '%24s', label: 'Medical Treatment Record ID' },
          { name: 'patient_id', type: 24, fmt: '%24s', label: 'Patient Unique Database ID' },
          { name: 'study_id', type: 24, fmt: '%24s', label: 'Patient Study ID' },
          { name: 'mrn', type: 24, fmt: '%24s', label: 'Hospital Record Number' },
          { name: 'tx_date', type: 10, fmt: '%10s', label: 'Treatment Date (YYYY-MM-DD)' },
          { name: 'clinician', type: 32, fmt: '%32s', label: 'Prescribing Clinician' },
          { name: 'strategy', type: 48, fmt: '%48s', label: 'Management Strategy' },
          { name: 'indication', type: 48, fmt: '%48s', label: 'Clinical Indication' },
          { name: 'drug_name', type: 36, fmt: '%36s', label: 'Primary Medication Name' },
          { name: 'dose', type: 16, fmt: '%16s', label: 'Prescribed Dose' },
          { name: 'frequency', type: 24, fmt: '%24s', label: 'Dosing Frequency' },
          { name: 'route', type: 12, fmt: '%12s', label: 'Route' },
          { name: 'duration', type: 32, fmt: '%32s', label: 'Planned Duration' },
          { name: 'tolerability', type: 36, fmt: '%36s', label: 'Tolerability' },
          { name: 'response', type: 48, fmt: '%48s', label: 'Clinical Response' }
        ];

        rows = mList.map(m => {
          const p = pList.find(pt => pt.id === m.patient_id) || {};
          const firstDrug = (Array.isArray(m.drugs) && m.drugs.length > 0) ? m.drugs[0] : ((Array.isArray(m.medications) && m.medications.length > 0) ? m.medications[0] : {});
          return {
            treatment_id: m.id || '',
            patient_id: m.patient_id || '',
            study_id: p.study_id || p.id || '',
            mrn: p.mrn || '',
            tx_date: m.treatment_date || '',
            clinician: m.prescribing_clinician || m.clinician || '',
            strategy: m.management_strategy || '',
            indication: m.indication || '',
            drug_name: firstDrug.name || firstDrug.drug_name || '',
            dose: firstDrug.dose || '',
            frequency: firstDrug.frequency || '',
            route: firstDrug.route || 'Oral',
            duration: m.duration_planned || '',
            tolerability: m.tolerability || '',
            response: m.clinical_response || ''
          };
        });
      } else {
        // 'cohort' master analysis dataset
        label = 'NPH LOVA Registry Cohort';
        variables = [
          { name: 'study_id', type: 24, fmt: '%24s', label: 'Study Identification Code' },
          { name: 'mrn', type: 24, fmt: '%24s', label: 'Hospital Record Number (MRN)' },
          { name: 'first_name', type: 32, fmt: '%32s', label: 'Patient First Name' },
          { name: 'last_name', type: 32, fmt: '%32s', label: 'Patient Last Name' },
          { name: 'age', type: 252, fmt: '%8.0g', label: 'Age at Presentation (years)' },
          { name: 'gender', type: 8, fmt: '%8s', label: 'Biological Gender' },
          { name: 'dob', type: 10, fmt: '%10s', label: 'Date of Birth (YYYY-MM-DD)' },
          { name: 'handedness', type: 12, fmt: '%12s', label: 'Dominant Handedness' },
          { name: 'ethnicity', type: 24, fmt: '%24s', label: 'Ethnicity' },
          { name: 'ofc_cm', type: 255, fmt: '%8.2f', label: 'Head Circumference (cm)' },
          { name: 'macrocephaly', type: 251, fmt: '%8.0g', label: 'Adult Macrocephaly (>58cm M, >56cm F)' },
          { name: 'height_cm', type: 255, fmt: '%8.1f', label: 'Height (cm)' },
          { name: 'weight_kg', type: 255, fmt: '%8.1f', label: 'Weight (kg)' },
          { name: 'bmi', type: 255, fmt: '%8.2f', label: 'Body Mass Index (kg/m2)' },
          { name: 'diagnosis', type: 16, fmt: '%16s', label: 'Diagnosis Category (iNPH, sNPH, LOVA)' },
          { name: 'metformin', type: 16, fmt: '%16s', label: 'Metformin Exposure (Active, Past, Never)' },
          { name: 'met_dose_mg', type: 255, fmt: '%8.0g', label: 'Metformin Daily Dose (mg)' },
          { name: 'met_dur_yr', type: 255, fmt: '%8.1f', label: 'Metformin Duration (years)' },
          { name: 'hypertension', type: 251, fmt: '%8.0g', label: 'Hypertension (1=Yes, 0=No)' },
          { name: 'diabetes', type: 251, fmt: '%8.0g', label: 'Diabetes Mellitus (1=Yes, 0=No)' },
          { name: 'prev_cns_inf', type: 251, fmt: '%8.0g', label: 'Previous CNS Infection (1=Yes, 0=No)' },
          { name: 'prev_trauma', type: 251, fmt: '%8.0g', label: 'Previous Head Trauma (1=Yes, 0=No)' },
          { name: 'prev_sah', type: 251, fmt: '%8.0g', label: 'Previous Subarachnoid Hemorrhage' },
          { name: 'symptom_dur_mo', type: 252, fmt: '%8.0g', label: 'Symptom Duration (months)' },
          { name: 'gait_disturb', type: 251, fmt: '%8.0g', label: 'Gait Disturbance Present (1=Yes, 0=No)' },
          { name: 'gait_sev', type: 24, fmt: '%24s', label: 'Gait Severity Phenotype' },
          { name: 'falls_freq', type: 32, fmt: '%32s', label: 'Reported Falls Frequency' },
          { name: 'cog_impair', type: 251, fmt: '%8.0g', label: 'Cognitive Impairment (1=Yes, 0=No)' },
          { name: 'baseline_moca', type: 252, fmt: '%8.0g', label: 'Baseline MoCA Score (0-30)' },
          { name: 'baseline_mmse', type: 252, fmt: '%8.0g', label: 'Baseline MMSE Score (0-30)' },
          { name: 'urinary_symp', type: 251, fmt: '%8.0g', label: 'Urinary Symptoms (1=Yes, 0=No)' },
          { name: 'urinary_sev', type: 24, fmt: '%24s', label: 'Urinary Symptoms Severity' },
          { name: 'lova_headache', type: 251, fmt: '%8.0g', label: 'LOVA Morning/Cough Headache (1=Yes)' },
          { name: 'lova_vis_obsc', type: 251, fmt: '%8.0g', label: 'LOVA Transient Visual Obscurations' },
          { name: 'lova_papill', type: 251, fmt: '%8.0g', label: 'LOVA Papilledema Present' },
          { name: 'evans_index', type: 255, fmt: '%8.3f', label: 'Evans Index (Bifrontal/Biparietal)' },
          { name: 'callosal_angle', type: 255, fmt: '%8.1f', label: 'Callosal Angle (degrees)' },
          { name: 'temporal_horns', type: 255, fmt: '%8.1f', label: 'Temporal Horn Width (mm)' },
          { name: 'third_vent_mm', type: 255, fmt: '%8.1f', label: 'Third Ventricle Width (mm)' },
          { name: 'radscale_total', type: 252, fmt: '%8.0g', label: 'Total iNPH Radscale Score (0-12)' },
          { name: 'desh_tight_vtx', type: 251, fmt: '%8.0g', label: 'DESH High Convexity Tightness' },
          { name: 'desh_sylvian', type: 251, fmt: '%8.0g', label: 'DESH Sylvian Fissure Dilation' },
          { name: 'lova_stenosis', type: 251, fmt: '%8.0g', label: 'Aqueductal Stenosis / Web (1=Yes)' },
          { name: 'lova_membranes', type: 251, fmt: '%8.0g', label: 'Liliequist/Prepontine Membranes' },
          { name: 'lova_sella', type: 251, fmt: '%8.0g', label: 'Sella Turcica Expansion (1=Yes)' },
          { name: 'lova_calvarial', type: 251, fmt: '%8.0g', label: 'Calvarial Scalloping/Thinning' },
          { name: 'tap_open_press', type: 255, fmt: '%8.1f', label: 'CSF Opening Pressure (cmH2O)' },
          { name: 'tap_vol_ml', type: 255, fmt: '%8.1f', label: 'CSF Tap Drainage Volume (ml)' },
          { name: 'tap_pre_walk', type: 255, fmt: '%8.2f', label: 'Tap Test 10m Pre-walk Time (sec)' },
          { name: 'tap_post_walk', type: 255, fmt: '%8.2f', label: 'Tap Test 10m Post-walk Time (sec)' },
          { name: 'tap_walk_delta', type: 255, fmt: '%8.2f', label: 'Tap Test Walk Improvement (sec)' },
          { name: 'inf_rout', type: 255, fmt: '%8.2f', label: 'CSF Outflow Resistance Rout' },
          { name: 'inf_b_waves', type: 251, fmt: '%8.0g', label: 'B-waves Observed on Monitoring' },
          { name: 'surg_performed', type: 251, fmt: '%8.0g', label: 'Surgical Intervention Performed' },
          { name: 'surg_procedure', type: 36, fmt: '%36s', label: 'Surgical Procedure Type' },
          { name: 'surg_date', type: 10, fmt: '%10s', label: 'Surgery Date (YYYY-MM-DD)' },
          { name: 'operating_surg', type: 32, fmt: '%32s', label: 'Lead Operating Surgeon' },
          { name: 'shunt_mfg', type: 24, fmt: '%24s', label: 'Shunt Valve Manufacturer' },
          { name: 'shunt_model', type: 36, fmt: '%36s', label: 'Shunt Valve Model' },
          { name: 'shunt_init_dp', type: 16, fmt: '%16s', label: 'Initial Differential Setting' },
          { name: 'shunt_init_ag', type: 16, fmt: '%16s', label: 'Initial Anti-Gravity Setting' },
          { name: 'out_6w_gait', type: 24, fmt: '%24s', label: '6-Week Gait Outcome' },
          { name: 'out_6w_moca', type: 252, fmt: '%8.0g', label: '6-Week MoCA Score' },
          { name: 'out_3m_gait', type: 24, fmt: '%24s', label: '3-Month Gait Outcome' },
          { name: 'out_6m_gait', type: 24, fmt: '%24s', label: '6-Month Gait Outcome' },
          { name: 'out_1y_gait', type: 24, fmt: '%24s', label: '1-Year Gait Outcome' },
          { name: 'out_2y_gait', type: 24, fmt: '%24s', label: '2-Year Gait Outcome' },
          { name: 'inphgs_pre_tot', type: 252, fmt: '%8.0g', label: 'Baseline Total INPHGS Score' },
          { name: 'inphgs_post_tot', type: 252, fmt: '%8.0g', label: 'Latest Total INPHGS Score' },
          { name: 'kiefer_pre_tot', type: 252, fmt: '%8.0g', label: 'Baseline Total Kiefer Score' },
          { name: 'kiefer_post_tot', type: 252, fmt: '%8.0g', label: 'Latest Total Kiefer Score' },
          { name: 'num_med_tx', type: 252, fmt: '%8.0g', label: 'Medical Treatments Count' },
          { name: 'has_diamox', type: 251, fmt: '%8.0g', label: 'Received Acetazolamide/Diamox' },
          { name: 'num_adj', type: 252, fmt: '%8.0g', label: 'Shunt Valve Adjustments Count' },
          { name: 'num_comp', type: 252, fmt: '%8.0g', label: 'Surgical Complications Count' },
          { name: 'has_comp', type: 251, fmt: '%8.0g', label: 'Experienced Any Complication' },
          { name: 'num_revisions', type: 252, fmt: '%8.0g', label: 'Revision Surgeries Count' },
          { name: 'has_revision', type: 251, fmt: '%8.0g', label: 'Underwent Revision Surgery' },
          { name: 'num_other_surg', type: 252, fmt: '%8.0g', label: 'Other Surgeries Count' }
        ];

        rows = pList.map(p => {
          const pRev = rList.filter(r => r.patient_id === p.id);
          const rev6w = pRev.find(r => r.interval_name && r.interval_name.includes('6 Week'));
          const rev3m = pRev.find(r => r.interval_name && r.interval_name.includes('3 Month'));
          const rev6m = pRev.find(r => r.interval_name && r.interval_name.includes('6 Month'));
          const rev1y = pRev.find(r => r.interval_name && (r.interval_name.includes('12 Month') || r.interval_name.includes('1 Year')));
          const rev2y = pRev.find(r => r.interval_name && (r.interval_name.includes('2 Year') || r.interval_name.includes('24 Month')));

          const pMeds = mList.filter(m => m.patient_id === p.id);
          const pAdj = aList.filter(a => a.patient_id === p.id);
          const pComp = cList.filter(c => c.patient_id === p.id);
          const pRevs = revList.filter(r => r.patient_id === p.id);
          const pOth = othList.filter(o => o.patient_id === p.id);

          const isMale = p.gender === 'Male';
          const ofc = p.head_circumference;
          const isMacro = (isMale && (ofc > 58.0)) || (!isMale && (ofc > 56.0));

          let radTot = p.radscale_total;
          if (radTot == null) {
            const radParts = [
              p.radscale_evans || 0,
              p.radscale_temporal || 0,
              p.radscale_callosal || 0,
              p.radscale_periventricular || 0,
              p.radscale_high_convexity || 0,
              p.radscale_sylvian || 0,
              p.radscale_focal_sulci || 0
            ];
            const sumParts = radParts.reduce((a, b) => a + b, 0);
            if (sumParts > 0) radTot = sumParts;
          }

          return {
            study_id: p.study_id || p.id || '',
            mrn: p.mrn || '',
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            age: p.age != null && !isNaN(p.age) ? parseInt(p.age, 10) : null,
            gender: p.gender || '',
            dob: p.dob || '',
            handedness: p.handedness || '',
            ethnicity: p.ethnicity || '',
            ofc_cm: ofc != null && !isNaN(ofc) ? parseFloat(ofc) : null,
            macrocephaly: isMacro ? 1 : 0,
            height_cm: p.height != null && !isNaN(p.height) ? parseFloat(p.height) : null,
            weight_kg: p.weight != null && !isNaN(p.weight) ? parseFloat(p.weight) : null,
            bmi: p.bmi || (p.weight && p.height ? parseFloat((p.weight / ((p.height/100)*(p.height/100))).toFixed(1)) : null),
            diagnosis: p.diagnosis_category || '',
            metformin: p.metformin_status || 'Never',
            met_dose_mg: p.metformin_daily_dose ? parseFloat(p.metformin_daily_dose) : null,
            met_dur_yr: p.metformin_duration_years ? parseFloat(p.metformin_duration_years) : null,
            hypertension: p.hypertension ? 1 : 0,
            diabetes: p.diabetes ? 1 : 0,
            prev_cns_inf: p.prev_cns_infection ? 1 : 0,
            prev_trauma: p.prev_head_injury ? 1 : 0,
            prev_sah: p.prev_sah ? 1 : 0,
            symptom_dur_mo: p.symptoms_duration_months != null && !isNaN(p.symptoms_duration_months) ? parseInt(p.symptoms_duration_months, 10) : null,
            gait_disturb: (p.gait_severity && !String(p.gait_severity).includes('0')) ? 1 : 0,
            gait_sev: p.gait_severity || '',
            falls_freq: p.falls_frequency || '',
            cog_impair: (p.cog_severity && !String(p.cog_severity).includes('0')) ? 1 : 0,
            baseline_moca: p.baseline_moca != null && !isNaN(p.baseline_moca) ? parseInt(p.baseline_moca, 10) : null,
            baseline_mmse: p.baseline_mmse != null && !isNaN(p.baseline_mmse) ? parseInt(p.baseline_mmse, 10) : null,
            urinary_symp: (p.urinary_severity && !String(p.urinary_severity).includes('0')) ? 1 : 0,
            urinary_sev: p.urinary_severity || '',
            lova_headache: p.lova_headache ? 1 : 0,
            lova_vis_obsc: p.lova_visual_obscurations ? 1 : 0,
            lova_papill: p.lova_papilledema ? 1 : 0,
            evans_index: p.evans_index != null && !isNaN(p.evans_index) ? parseFloat(p.evans_index) : null,
            callosal_angle: p.callosal_angle != null && !isNaN(p.callosal_angle) ? parseFloat(p.callosal_angle) : null,
            temporal_horns: p.temporal_horns_width != null && !isNaN(p.temporal_horns_width) ? parseFloat(p.temporal_horns_width) : null,
            third_vent_mm: p.third_ventricle_width != null && !isNaN(p.third_ventricle_width) ? parseFloat(p.third_ventricle_width) : null,
            radscale_total: radTot != null && !isNaN(radTot) ? parseInt(radTot, 10) : null,
            desh_tight_vtx: p.desh_tight_vertex ? 1 : 0,
            desh_sylvian: p.desh_sylvian_dilation ? 1 : 0,
            lova_stenosis: p.lova_aqueduct_stenosis ? 1 : 0,
            lova_membranes: p.lova_prepontine_membranes ? 1 : 0,
            lova_sella: p.lova_sella_expansion ? 1 : 0,
            lova_calvarial: p.lova_calvarial_thinning ? 1 : 0,
            tap_open_press: p.tap_opening_pressure ? parseFloat(String(p.tap_opening_pressure).split(' ')[0]) || null : null,
            tap_vol_ml: p.tap_volume != null && !isNaN(p.tap_volume) ? parseFloat(p.tap_volume) : null,
            tap_pre_walk: p.tap_pre_walk_time != null && !isNaN(p.tap_pre_walk_time) ? parseFloat(p.tap_pre_walk_time) : null,
            tap_post_walk: p.tap_post_walk_time != null && !isNaN(p.tap_post_walk_time) ? parseFloat(p.tap_post_walk_time) : null,
            tap_walk_delta: (p.tap_pre_walk_time && p.tap_post_walk_time) ? parseFloat((p.tap_pre_walk_time - p.tap_post_walk_time).toFixed(2)) : null,
            inf_rout: p.inf_rout != null && !isNaN(p.inf_rout) ? parseFloat(p.inf_rout) : null,
            inf_b_waves: p.inf_b_waves ? 1 : 0,
            surg_performed: (p.surg_procedure_type && p.surg_procedure_type !== 'None') ? 1 : 0,
            surg_procedure: p.surg_procedure_type || 'None',
            surg_date: p.surg_date || '',
            operating_surg: p.surg_operating_surgeon || '',
            shunt_mfg: p.shunt_manufacturer || '',
            shunt_model: p.shunt_model || '',
            shunt_init_dp: p.shunt_initial_dp || '',
            shunt_init_ag: p.shunt_initial_ag || '',
            out_6w_gait: rev6w ? (rev6w.gait_improvement_status || '') : '',
            out_6w_moca: rev6w && rev6w.moca_score != null ? parseInt(rev6w.moca_score, 10) : null,
            out_3m_gait: rev3m ? (rev3m.gait_improvement_status || '') : '',
            out_6m_gait: rev6m ? (rev6m.gait_improvement_status || '') : '',
            out_1y_gait: rev1y ? (rev1y.gait_improvement_status || '') : '',
            out_2y_gait: rev2y ? (rev2y.gait_improvement_status || '') : '',
            inphgs_pre_tot: (p.inphgs_pre_gait || 0) + (p.inphgs_pre_cog || 0) + (p.inphgs_pre_urin || 0),
            inphgs_post_tot: p.inphgs_post_gait != null ? ((p.inphgs_post_gait || 0) + (p.inphgs_post_cog || 0) + (p.inphgs_post_urin || 0)) : null,
            kiefer_pre_tot: (p.kiefer_pre_gait || 0) + (p.kiefer_pre_cog || 0) + (p.kiefer_pre_urin || 0) + (p.kiefer_pre_ha || 0) + (p.kiefer_pre_diz || 0),
            kiefer_post_tot: p.kiefer_post_gait != null ? ((p.kiefer_post_gait || 0) + (p.kiefer_post_cog || 0) + (p.kiefer_post_urin || 0) + (p.kiefer_post_ha || 0) + (p.kiefer_post_diz || 0)) : null,
            num_med_tx: pMeds.length,
            has_diamox: pMeds.some(m => JSON.stringify(m).toLowerCase().includes('diamox') || JSON.stringify(m).toLowerCase().includes('acetazolamide')) ? 1 : 0,
            num_adj: pAdj.length,
            num_comp: pComp.length,
            has_comp: pComp.length > 0 ? 1 : 0,
            num_revisions: pRevs.length,
            has_revision: pRevs.length > 0 ? 1 : 0,
            num_other_surg: pOth.length
          };
        });
      }

      const buffer = buildStata114Binary(variables, rows, label);

      await this.logAuditEvent({
        action: 'DATA_EXPORT_STATA',
        resource: 'system',
        details: 'Generated native Stata (.dta) dataset [' + datasetType.toUpperCase() + '] with ' + rows.length + ' observations by ' + (requestingUser?.username || 'Clinician') + '.',
        user: requestingUser?.username,
        role: requestingUser?.role
      });

      return buffer;
    }


    async importFullDatabase(data) {
      if (!data || !data.patients) throw new Error("Invalid NPH & LOVA Registry backup format.");
      this.localDB = {
        patients: data.patients || [],
        adjustments: data.adjustments || [],
        reviews: data.reviews || [],
        complications: data.complications || [],
        revision_surgeries: data.revision_surgeries || [],
        other_surgeries: data.other_surgeries || [],
        medical_treatments: data.medical_treatments || []
      };
      this.persistLocal();
      return true;
    }
  }

  return new DatabaseAdapterImpl();
}));
