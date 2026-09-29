# NPH & LOVA Clinical Database & Registry System
### Dedicated SQLite Database & Cross-Platform Desktop Software (macOS & Windows)

**Conceived and designed for Clinical Biostatistics, Neurosurgery & Hydrocephalus Research**  
by **Dr G Narenthiran MB ChB BSc(MedSci)(Hons) MRCS(Ed.) FEBNS FRCS(SN)**  
*Dedicated with heartfelt gratitude to Mrs Nirmaladevy Ganesalingam BSc.*

---

## Overview

The **NPH & LOVA Clinical Registry** is a specialized neurosurgical and clinical biostatistics platform tailored explicitly for:
1. **Idiopathic and Secondary Normal Pressure Hydrocephalus (iNPH / sNPH)**
2. **Long-Standing Overt Ventriculomegaly in Adults (LOVA)**

Engineered with a **Tauri v2** desktop framework backed by **Rust** and **SQLite**, it provides zero-latency local execution, robust transactional integrity, and cross-platform native installers for both **macOS** (`.dmg` / `.app`) and **Windows** (`.msi` / `.exe`).

---

## Key Clinical Features & Modules

### 1. Adult Macrocephaly & Head Circumference (OFC)
- Automatic evaluation of occipitofrontal circumference (threshold: $>58	ext{ cm}$ in males, $>56	ext{ cm}$ in females).
- Specific LOVA childhood phenotype markers: large hat size in youth, delayed walking, and craniofacial disproportion.

### 2. Past Medical/Surgical History & Peritoneal Viability
- Systematic checks for prior surgery in the **neck**, **chest**, and **abdomen** (assessing peritoneal absorption, adhesions, and shunt pathway suitability).
- Tracking of prior traumatic brain injury, cranial surgery, CNS infections (meningitis), and spontaneous SAH.

### 3. Dedicated Metformin & Glymphatic Pharmacotherapy
- Dedicated tracking of Metformin exposure (status, daily dosage, duration, indication).
- Facilitates registry research investigating metformin's documented association with glymphatic CSF clearance and hydrocephalus modulation.

### 4. Triad Presentation & Distinguishing LOVA ICP Symptoms
- Detailed profiling of the **Adams-Hakim triad** (magnetic gait, subcortical bradyphrenia, urge incontinence).
- Hallmarks of adult LOVA: morning episodic headaches, transient visual obscurations, and chronic papilledema.

### 5. Multidisciplinary Neurology & Spine Differential Exclusions
- Formal exclusion checklists for neurodegenerative mimics: **Alzheimer's disease**, **Parkinson's disease**, **PSP**, **MSA/CBD**, **Lewy Body Dementia**, and **Vascular Dementia**.
- Systematic exclusion of confounding spine pathology: **Cervical Spondylotic Myelopathy (CSM)**, **Lumbar Canal Stenosis (LSS)**, and **Peripheral Neuropathy**.
- MDT decision recording and surgical confidence stratification.

### 6. Neuroimaging & Validated iNPH Radscale (0 - 12)
- Morphometric indices: Evans' Index, Callosal Angle, Temporal Horns, 3rd Ventricle width.
- Pathognomonic LOVA imaging: Aqueductal web/stenosis, downward bowing of 3rd ventricle floor, expanded/remodeled sella turcica, and calvarial thinning.
- Interactive, automated **iNPH Radscale** calculator with predictive interpretation.

### 7. CSF Dynamic Studies & Diagnostic Tap Test
- Pre- vs post-tap 10m walk test (time and step count) with automated percentage improvement calculation ($>20\%$ threshold).
- Pre- and post-tap MoCA / MMSE score tracking.
- Lumbar infusion study metrics ($R_{out}$, $P_0$, PVI, Lundberg $B$-waves).
- Continuous external lumbar drainage (ELD) protocol and laboratory CSF analysis.

### 8. Diversionary Surgery & Shunt Hardware
- Treatment modalities: Ventriculoperitoneal (VP), Lumboperitoneal (LP), Ventriculoatrial (VA), Ventriculopleural, Endoscopic Third Ventriculostomy (ETV), and **ETV with disruption of prepontine arachnoid membranes (Membrane of Liliequist)**.
- Shunt hardware inventory: Manufacturer (Miethke, Codman, Medtronic, Sophysa, Integra), valve model, catheter type, initial differential pressure setting, and **initial anti-gravity valve setting** (e.g. $20	ext{ cmH}_2	ext{O}$).

### 9. Serial Shunt Adjustments Log
- Chronological ledger tracking every non-invasive valve setting change over time.
- Differential and anti-gravity reprogramming history with clinical indications (overdrainage hygromas, slit ventricles vs underdrainage) and responses.

### 10. Post-Surgery Outcomes & Clinical Scales
- Longitudinal clinic reviews at 6 weeks, 3 months, 6 months, 12 months, and annually.
- Comparative pre- and post-operative **iNPHGS** (iNPH Grading Scale, 0 - 12) with automated delta calculation.
- Comparative pre- and post-operative **Kiefer NPH Scale** (0 - 20).
- Patient Global Impression of Improvement (PGI-I 1 - 7), family/caregiver satisfaction (1 - 5), and Modified Rankin Scale (mRS).

### 11. Complications & Shunt Revision Registry
- Surveillance of acute/chronic subdural collections, infections, abdominal pseudocysts, and skin erosion.
- Specific etiologies of shunt malfunction (choroid plexus occlusion, valve debris, catheter migration).
- Repeat surgical revision records.

### 12. Cohort Analytics & Full Database Export/Import
- Instant search and multi-parameter filtering across the registry.
- One-click export to CSV, structured JSON, and raw SQLite database backup.

---

## Installation & Running

### Option 1: macOS Double-Click Launcher
Simply double-click the included file:
```bash
./Launch_NPH_LOVA_App.command
```
This presents options to run in native Tauri desktop mode, open in your browser, or compile a production `.dmg` installer.

### Option 2: Running Locally via Terminal
```bash
# Install dependencies
npm install

# Run native desktop app via Tauri
npm run tauri dev

# Or run lightweight browser dev server
npm run serve
```

### Option 3: Building Cross-Platform Installers
```bash
# macOS Installer (.dmg & .app)
npx tauri build

# Windows Installer (.msi & .exe)
# (Run on Windows or via GitHub Actions workflow included in .github/workflows/release.yml)
npx tauri build --target x86_64-pc-windows-msvc
```

---

## Research & Educational Disclaimer

The calculations, scoring algorithms, and database systems implemented in this software are primarily designed for prospective studies, clinical data exploration, scientific registries, and educational teaching.

***Please do not use the software as a substitute for independent multidisciplinary clinical judgement or solely for patient decision making.***

---

## Attribution & Dedication

**Conceived and designed for Clinical Biostatistics, Neurosurgery & Hydrocephalus Research**  
by **Dr G Narenthiran MB ChB BSc(MedSci)(Hons) MRCS(Ed.) FEBNS FRCS(SN)**  
*Dedicated with heartfelt gratitude to Mrs Nirmaladevy Ganesalingam BSc.*
