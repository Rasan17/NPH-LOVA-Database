#!/usr/bin/env python3
"""
NPH & LOVA Clinical & Research Registry - Stata (.dta) Exporter
Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)

This script reads an exported JSON registry backup or SQLite database and exports
native Stata (.dta format 114 / 118) datasets for biostatistical modeling and
longitudinal outcome analysis in Stata, R (haven), and Python (statsmodels/pandas).
"""

import sys
import os
import re
import json
import argparse
from datetime import datetime

try:
    import pandas as pd
    import numpy as np
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False


def safe_float(val):
    if val is None or val == "":
        return None
    try:
        m = re.search(r"[-+]?(?:\d*\.\d+|\d+)", str(val))
        return float(m.group(0)) if m else None
    except Exception:
        return None


def safe_int(val):
    if val is None or val == "":
        return None
    try:
        m = re.search(r"[-+]?\d+", str(val))
        return int(m.group(0)) if m else None
    except Exception:
        return None


def extract_cohort_dataframe(data):
    patients = data.get("patients", [])
    reviews = data.get("reviews", [])
    meds = data.get("medical_treatments", [])
    adjs = data.get("adjustments", [])
    comps = data.get("complications", [])
    revs = data.get("revision_surgeries", [])
    oths = data.get("other_surgeries", [])

    rows = []
    for p in patients:
        pid = p.get("id")
        p_revs = [r for r in reviews if r.get("patient_id") == pid]
        p_meds = [m for m in meds if m.get("patient_id") == pid]
        p_adjs = [a for a in adjs if a.get("patient_id") == pid]
        p_comps = [c for c in comps if c.get("patient_id") == pid]
        p_revsur = [r for r in revs if r.get("patient_id") == pid]
        p_othsur = [o for o in oths if o.get("patient_id") == pid]

        def get_outcome(substring):
            for r in p_revs:
                if substring.lower() in (r.get("interval_name") or "").lower():
                    return r.get("gait_improvement_status") or ""
            return ""

        def get_moca(substring):
            for r in p_revs:
                if substring.lower() in (r.get("interval_name") or "").lower():
                    return safe_int(r.get("moca_score"))
            return None

        is_male = p.get("gender") == "Male"
        ofc = safe_float(p.get("head_circumference"))
        is_macro = 1 if (ofc and ((is_male and ofc > 58.0) or (not is_male and ofc > 56.0))) else 0

        rad_tot = safe_int(p.get("radscale_total"))
        if rad_tot is None:
            rad_parts = [
                safe_int(p.get("radscale_evans")) or 0,
                safe_int(p.get("radscale_temporal")) or 0,
                safe_int(p.get("radscale_callosal")) or 0,
                safe_int(p.get("radscale_periventricular")) or 0,
                safe_int(p.get("radscale_high_convexity")) or 0,
                safe_int(p.get("radscale_sylvian")) or 0,
                safe_int(p.get("radscale_focal_sulci")) or 0
            ]
            rad_tot = sum(rad_parts) if any(rad_parts) else None

        row = {
            "study_id": str(p.get("study_id") or p.get("id") or ""),
            "mrn": str(p.get("mrn") or ""),
            "first_name": str(p.get("first_name") or ""),
            "last_name": str(p.get("last_name") or ""),
            "age": safe_int(p.get("age")),
            "gender": str(p.get("gender") or ""),
            "dob": str(p.get("dob") or ""),
            "handedness": str(p.get("handedness") or ""),
            "ethnicity": str(p.get("ethnicity") or ""),
            "ofc_cm": ofc,
            "macrocephaly": is_macro,
            "height_cm": safe_float(p.get("height")),
            "weight_kg": safe_float(p.get("weight")),
            "bmi": safe_float(p.get("bmi")),
            "diagnosis": str(p.get("diagnosis_category") or ""),
            "metformin": str(p.get("metformin_status") or "Never"),
            "met_dose_mg": safe_float(p.get("metformin_daily_dose")),
            "met_dur_yr": safe_float(p.get("metformin_duration_years")),
            "hypertension": 1 if p.get("hypertension") else 0,
            "diabetes": 1 if p.get("diabetes") else 0,
            "prev_cns_inf": 1 if p.get("prev_cns_infection") else 0,
            "prev_trauma": 1 if p.get("prev_head_injury") else 0,
            "prev_sah": 1 if p.get("prev_sah") else 0,
            "symptom_dur_mo": safe_int(p.get("symptoms_duration_months")),
            "gait_disturb": 1 if (p.get("gait_severity") and "0" not in str(p.get("gait_severity"))) else 0,
            "gait_sev": str(p.get("gait_severity") or ""),
            "falls_freq": str(p.get("falls_frequency") or ""),
            "cog_impair": 1 if (p.get("cog_severity") and "0" not in str(p.get("cog_severity"))) else 0,
            "baseline_moca": safe_int(p.get("baseline_moca")),
            "baseline_mmse": safe_int(p.get("baseline_mmse")),
            "urinary_symp": 1 if (p.get("urinary_severity") and "0" not in str(p.get("urinary_severity"))) else 0,
            "urinary_sev": str(p.get("urinary_severity") or ""),
            "lova_headache": 1 if p.get("lova_headache") else 0,
            "lova_vis_obsc": 1 if p.get("lova_visual_obscurations") else 0,
            "lova_papill": 1 if p.get("lova_papilledema") else 0,
            "evans_index": safe_float(p.get("evans_index")),
            "callosal_angle": safe_float(p.get("callosal_angle")),
            "temporal_horns": safe_float(p.get("temporal_horns_width")),
            "third_vent_mm": safe_float(p.get("third_ventricle_width")),
            "radscale_total": rad_tot,
            "desh_tight_vtx": 1 if p.get("desh_tight_vertex") else 0,
            "desh_sylvian": 1 if p.get("desh_sylvian_dilation") else 0,
            "lova_stenosis": 1 if p.get("lova_aqueduct_stenosis") else 0,
            "lova_membranes": 1 if p.get("lova_prepontine_membranes") else 0,
            "lova_sella": 1 if p.get("lova_sella_expansion") else 0,
            "lova_calvarial": 1 if p.get("lova_calvarial_thinning") else 0,
            "tap_open_press": safe_float(p.get("tap_opening_pressure")),
            "tap_vol_ml": safe_float(p.get("tap_volume")),
            "tap_pre_walk": safe_float(p.get("tap_pre_walk_time")),
            "tap_post_walk": safe_float(p.get("tap_post_walk_time")),
            "inf_rout": safe_float(p.get("inf_rout")),
            "inf_b_waves": 1 if p.get("inf_b_waves") else 0,
            "surg_performed": 1 if (p.get("surg_procedure_type") and p.get("surg_procedure_type") != "None") else 0,
            "surg_procedure": str(p.get("surg_procedure_type") or "None"),
            "surg_date": str(p.get("surg_date") or ""),
            "operating_surg": str(p.get("surg_operating_surgeon") or ""),
            "shunt_mfg": str(p.get("shunt_manufacturer") or ""),
            "shunt_model": str(p.get("shunt_model") or ""),
            "shunt_init_dp": str(p.get("shunt_initial_dp") or ""),
            "shunt_init_ag": str(p.get("shunt_initial_ag") or ""),
            "out_6w_gait": get_outcome("6 Week"),
            "out_6w_moca": get_moca("6 Week"),
            "out_3m_gait": get_outcome("3 Month"),
            "out_6m_gait": get_outcome("6 Month"),
            "out_1y_gait": get_outcome("12 Month") or get_outcome("1 Year"),
            "out_2y_gait": get_outcome("2 Year"),
            "num_med_tx": len(p_meds),
            "num_adj": len(p_adjs),
            "num_comp": len(p_comps),
            "has_comp": 1 if len(p_comps) > 0 else 0,
            "num_revisions": len(p_revsur),
            "has_revision": 1 if len(p_revsur) > 0 else 0,
            "num_other_surg": len(p_othsur)
        }
        rows.append(row)

    return pd.DataFrame(rows) if HAS_PANDAS else rows


def export_to_stata_cli(json_path, output_dta_path):
    if not os.path.exists(json_path):
        print(f"Error: JSON file not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not HAS_PANDAS:
        print("Error: pandas is required for CLI Stata conversion. Run: pip install pandas", file=sys.stderr)
        sys.exit(1)

    df = extract_cohort_dataframe(data)
    # Ensure proper pandas dtypes for Stata export
    numeric_cols = [
        'age', 'ofc_cm', 'macrocephaly', 'height_cm', 'weight_kg', 'bmi',
        'met_dose_mg', 'met_dur_yr', 'hypertension', 'diabetes', 'prev_cns_inf',
        'prev_trauma', 'prev_sah', 'symptom_dur_mo', 'gait_disturb', 'cog_impair',
        'baseline_moca', 'baseline_mmse', 'urinary_symp', 'lova_headache',
        'lova_vis_obsc', 'lova_papill', 'evans_index', 'callosal_angle',
        'temporal_horns', 'third_vent_mm', 'radscale_total', 'desh_tight_vtx',
        'desh_sylvian', 'lova_stenosis', 'lova_membranes', 'lova_sella',
        'lova_calvarial', 'tap_open_press', 'tap_vol_ml', 'tap_pre_walk',
        'tap_post_walk', 'inf_rout', 'inf_b_waves', 'surg_performed',
        'out_6w_moca', 'num_med_tx', 'num_adj', 'num_comp', 'has_comp',
        'num_revisions', 'has_revision', 'num_other_surg'
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    print(f"Loaded {len(df)} patient records.")

    var_labels = {
        "study_id": "Study Identification Code",
        "mrn": "Hospital Record Number (MRN)",
        "first_name": "Patient First Name",
        "last_name": "Patient Last Name",
        "age": "Age at Presentation (years)",
        "gender": "Biological Gender",
        "ofc_cm": "Head Circumference (cm)",
        "macrocephaly": "Adult Macrocephaly (>58cm M, >56cm F)",
        "diagnosis": "Diagnosis Category (iNPH, sNPH, LOVA)",
        "evans_index": "Evans Index (Bifrontal/Biparietal)",
        "surg_procedure": "Surgical Procedure Type",
        "out_6w_gait": "6-Week Gait Outcome",
        "num_revisions": "Revision Surgeries Count",
        "has_revision": "Underwent Revision Surgery"
    }

    df.to_stata(
        output_dta_path,
        write_index=False,
        version=114,
        variable_labels=var_labels
    )
    print(f"Successfully generated native Stata dataset: {output_dta_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export NPH & LOVA Registry to Stata (.dta)")
    parser.add_argument("input_json", help="Path to exported NPH/LOVA JSON registry backup")
    parser.add_argument("-o", "--output", default="NPH_LOVA_Cohort.dta", help="Output .dta file path")
    args = parser.parse_args()

    export_to_stata_cli(args.input_json, args.output)
