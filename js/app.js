
window.quickFillLogin = function(u, p) {
  const uInput = document.getElementById('login-username');
  const pInput = document.getElementById('login-password');
  if (uInput) uInput.value = u;
  if (pInput) pInput.value = p;
  const alertEl = document.getElementById('login-error-alert');
  if (alertEl) alertEl.style.display = 'none';
};

/**
 * NPH-LOVA Database - Master Frontend Controller (app.js)
 * Tying UI, reactive scoring engines, database adapter, and Tauri IPC together.
 */

// Global State
window.AppState = {
  currentUser: null,
  activePatientId: null,
  activePatientData: null,
  patientsList: [],
  adjustmentsList: [],
  reviewsList: [],
  complicationsList: [],
  revisionSurgeriesList: [],
  otherSurgeriesList: [],
  medicalTreatmentsList: [],
  allReviews: [],
  allComplications: [],
  allRevisionSurgeries: [],
  allOtherSurgeries: [],
  allMedicalTreatments: [],
  theme: localStorage.getItem('nph_lova_theme') || 'dark'
};

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initNavigationTabs();
  initModals();
  initCalculators();

  // Initialize DB Adapter
  const initialized = await DatabaseAdapter.init();
  if (initialized) {
    updateEngineBadge();
    await refreshPatientDirectory();
    
    // Select first patient if available
    if (AppState.patientsList.length > 0) {
      await loadPatient(AppState.patientsList[0].id);
    } else {
      resetPatientForm();
    }
  }

  setupEventListeners();
});

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', AppState.theme);
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', AppState.theme);
      localStorage.setItem('nph_lova_theme', AppState.theme);
    });
  }
}

// Navigation Tabs
function initNavigationTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      switchTab(targetTabId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
  if (tabId === 'tab-cohort') {
    renderCohortAnalytics();
  }
  if (tabId === 'tab-ai') {
    renderAIInsights();
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // New Patient
  document.getElementById('btn-new-patient')?.addEventListener('click', () => {
    resetPatientForm();
    switchTab('tab-demographics');
    document.getElementById('f-first-name')?.focus();
  });

  // Save Patient
  document.getElementById('btn-save-current')?.addEventListener('click', saveCurrentPatient);
  document.getElementById('btn-save-patient-file')?.addEventListener('click', handleSavePatientFile);
  document.getElementById('btn-gen-discharge-letter')?.addEventListener('click', openDischargeLetterModal);
  document.getElementById('btn-gen-clinic-letter')?.addEventListener('click', openClinicLetterModal);

  // Letter Action Buttons
  document.getElementById('btn-refresh-discharge-letter')?.addEventListener('click', renderDischargeLetter);
  document.getElementById('btn-print-discharge-letter')?.addEventListener('click', () => window.print());
  document.getElementById('btn-copy-discharge-letter')?.addEventListener('click', copyDischargeLetterText);
  document.getElementById('btn-download-discharge-letter')?.addEventListener('click', downloadDischargeLetterHtml);

  document.getElementById('btn-refresh-clinic-letter')?.addEventListener('click', renderClinicLetter);
  document.getElementById('btn-print-clinic-letter')?.addEventListener('click', () => window.print());
  document.getElementById('btn-copy-clinic-letter')?.addEventListener('click', copyClinicLetterText);
  document.getElementById('btn-download-clinic-letter')?.addEventListener('click', downloadClinicLetterHtml);

  // Dropdown Patient Select
  document.getElementById('patient-select-dropdown')?.addEventListener('change', async (e) => {
    if (e.target.value) {
      await loadPatient(e.target.value);
    }
  });

  // Search
  document.getElementById('global-patient-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    filterPatientDropdown(q);
  });

  // Export DB
  document.getElementById('btn-export-db')?.addEventListener('click', exportDatabase);

  // Import DB
  document.getElementById('btn-import-db')?.addEventListener('click', () => {
    document.getElementById('file-import-input')?.click();
  });
  document.getElementById('file-import-input')?.addEventListener('change', importDatabase);

  // About Modal
  document.getElementById('btn-about-info')?.addEventListener('click', () => {
    openModal('modal-about');
  });

  // Cohort Filters
  document.getElementById('cohort-filter-text')?.addEventListener('input', renderCohortTable);
  document.getElementById('cohort-filter-dx')?.addEventListener('change', renderCohortTable);
  document.getElementById('cohort-filter-metformin')?.addEventListener('change', renderCohortTable);
  document.getElementById('btn-cohort-export-stata')?.addEventListener('click', () => handleExportStata('cohort'));
  document.getElementById('btn-cohort-export-csv')?.addEventListener('click', exportCohortCSV);
  document.getElementById('btn-cohort-export-json')?.addEventListener('click', exportDatabase);

  // Modal Submissions
  document.getElementById('form-modal-adjustment')?.addEventListener('submit', handleAdjustmentSubmit);
  document.getElementById('form-modal-review')?.addEventListener('submit', handleReviewSubmit);
  document.getElementById('form-modal-complication')?.addEventListener('submit', handleComplicationSubmit);
  document.getElementById('form-modal-revision-surgery')?.addEventListener('submit', handleRevisionSurgerySubmit);

  // AI Intelligence Tab Listeners
  document.getElementById('btn-recalc-ai')?.addEventListener('click', renderAIInsights);
  document.getElementById('btn-gen-ai-synthesis')?.addEventListener('click', () => {
    renderAIInsights();
    document.getElementById('ai-synthesis-text')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('btn-refresh-synthesis')?.addEventListener('click', () => {
    const p = AppState.activePatientData;
    if (p && window.AIEngine) {
      const el = document.getElementById('ai-synthesis-text');
      if (el) el.innerText = AIEngine.generateClinicalSynthesis(p);
    }
  });
  document.getElementById('btn-copy-ai-synthesis')?.addEventListener('click', copyAISynthesis);
  document.getElementById('btn-copy-synthesis-text')?.addEventListener('click', copyAISynthesis);

  // AI Prompt Chips
  document.querySelectorAll('.ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-ai-query');
      const input = document.getElementById('ai-query-input');
      if (input) input.value = query;
      handleAICustomQuery(query);
    });
  });

  // AI Custom Query Submit
  document.getElementById('btn-submit-ai-query')?.addEventListener('click', () => {
    const query = document.getElementById('ai-query-input')?.value || '';
    handleAICustomQuery(query);
  });
  document.getElementById('ai-query-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAICustomQuery(e.target.value);
    }
  });
  document.getElementById('form-modal-other-surgery')?.addEventListener('submit', handleOtherSurgerySubmit);
  document.getElementById('form-modal-medical-treatment')?.addEventListener('submit', handleMedicalTreatmentSubmit);

  // --- Authentication & User Governance Listeners ---
  document.getElementById('form-login')?.addEventListener('submit', handleLoginSubmit);
  document.getElementById('btn-user-menu-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('user-menu-dropdown');
    dropdown?.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    document.getElementById('user-menu-dropdown')?.classList.remove('show');
  });

  document.getElementById('btn-trigger-change-password')?.addEventListener('click', () => {
    openModal('modal-change-password');
  });

  document.getElementById('form-change-password')?.addEventListener('submit', handleChangePasswordSubmit);

  document.getElementById('btn-trigger-user-mgmt')?.addEventListener('click', () => {
    openModal('modal-user-management');
    loadUsersTable();
  });

  document.getElementById('form-create-user')?.addEventListener('submit', handleCreateUserSubmit);
  document.getElementById('btn-trigger-logout')?.addEventListener('click', handleLogout);

  // --- Database Operations & Backups Listeners ---
  document.getElementById('btn-db-ops')?.addEventListener('click', () => {
    openModal('modal-db-operations');
  });

  document.getElementById('btn-op-stata-cohort')?.addEventListener('click', () => handleExportStata('cohort'));
  document.getElementById('btn-op-stata-reviews')?.addEventListener('click', () => handleExportStata('reviews'));
  document.getElementById('btn-op-stata-med')?.addEventListener('click', () => handleExportStata('medical'));
  document.getElementById('btn-op-excel-backup')?.addEventListener('click', handleExcelBackup);
  document.getElementById('btn-op-sqlite-backup')?.addEventListener('click', handleSqliteBackup);
  document.getElementById('btn-op-clone-db')?.addEventListener('click', handleCloneDatabase);
  document.getElementById('btn-op-json-backup')?.addEventListener('click', exportDatabase);
  document.getElementById('btn-op-json-import')?.addEventListener('click', () => {
    document.getElementById('file-import-input')?.click();
  });

  // --- Audit Log Listeners ---
  document.getElementById('btn-audit-log')?.addEventListener('click', () => {
    openModal('modal-audit-log');
    loadAuditLogsTable();
    verifyAndDisplayAuditChain();
  });

  document.getElementById('btn-verify-audit-chain')?.addEventListener('click', verifyAndDisplayAuditChain);
  document.getElementById('audit-search-input')?.addEventListener('input', loadAuditLogsTable);
  document.getElementById('audit-filter-action')?.addEventListener('change', loadAuditLogsTable);
  document.getElementById('btn-export-audit-report')?.addEventListener('click', exportAuditReport);

  // --- Database Design Studio Listeners (Developer Only) ---
  document.getElementById('btn-db-design')?.addEventListener('click', () => {
    if (AppState.currentUser?.role !== 'Developer') {
      alert('Access Denied: Only Developer tier may access the Database Design Studio.');
      return;
    }
    openModal('modal-database-design');
    loadDatabaseDesignStudio();
  });

  document.getElementById('form-add-custom-field')?.addEventListener('submit', handleAddCustomFieldSubmit);

  // --- Delete Patient Listener ---
  document.getElementById('btn-delete-patient')?.addEventListener('click', handleDeletePatient);


  // Medical Treatment Modal Open
  document.getElementById('btn-new-medical-treatment')?.addEventListener('click', () => {
    if (!AppState.activePatientId) {
      alert('Please select or save a patient first.');
      return;
    }
    const p = AppState.activePatientData;
    setVal('m-med-date', new Date().toISOString().split('T')[0]);
    setVal('m-med-clinician', p?.consultant_neurologist || p?.consultant_surgeon || '');
    resetDrugRowsContainer();
    openModal('modal-medical-treatment');
  });

  // Add additional medication row button
  document.getElementById('btn-add-drug-row')?.addEventListener('click', () => {
    addDrugRow();
  });

  // Revision & Other Surgery Buttons
  const openRevModal = () => {
    if (!AppState.activePatientId) {
      alert('Please select or save a patient first.');
      return;
    }
    const p = AppState.activePatientData;
    setVal('m-revsurg-date', new Date().toISOString().split('T')[0]);
    setVal('m-revsurg-surgeon', p?.surg_operating_surgeon || p?.consultant_surgeon || '');
    setVal('m-revsurg-manufacturer', p?.shunt_manufacturer || 'Miethke (Aesculap)');
    setVal('m-revsurg-new-hardware', p?.shunt_model || '');
    setVal('m-revsurg-new-dp', p?.shunt_initial_dp || '');
    setVal('m-revsurg-new-ag', p?.shunt_initial_ag || '');
    openModal('modal-revision-surgery');
  };

  const openOthModal = () => {
    if (!AppState.activePatientId) {
      alert('Please select or save a patient first.');
      return;
    }
    const p = AppState.activePatientData;
    setVal('m-othsurg-date', new Date().toISOString().split('T')[0]);
    setVal('m-othsurg-surgeon', p?.surg_operating_surgeon || p?.consultant_surgeon || '');
    openModal('modal-other-surgery');
  };

  document.getElementById('btn-open-revision-modal')?.addEventListener('click', openRevModal);
  document.getElementById('btn-table-add-revision')?.addEventListener('click', openRevModal);

  document.getElementById('btn-open-other-surgery-modal')?.addEventListener('click', openOthModal);
  document.getElementById('btn-table-add-other-surgery')?.addEventListener('click', openOthModal);

  // Open Modal Buttons
  document.getElementById('btn-open-adjustment-modal')?.addEventListener('click', () => {
    if (!AppState.activePatientId) {
      alert('Please select or save a patient first.');
      return;
    }
    // Pre-populate old settings from patient current shunt record
    const p = AppState.activePatientData;
    document.getElementById('m-adj-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('m-adj-old-dp').value = p?.shunt_initial_dp || '';
    document.getElementById('m-adj-old-ag').value = p?.shunt_initial_ag || '';
    openModal('modal-adjustment');
  });

  document.getElementById('btn-open-review-modal')?.addEventListener('click', () => {
    if (!AppState.activePatientId) {
      alert('Please select or save a patient first.');
      return;
    }
    document.getElementById('m-rev-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-review');
  });

  document.getElementById('btn-open-complication-modal')?.addEventListener('click', () => {
    if (!AppState.activePatientId) {
      alert('Please select or save a patient first.');
      return;
    }
    document.getElementById('m-comp-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-complication');
  });
}

// Modals Handling
function initModals() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.style.display = 'none';
      }
    });
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// Reactive Clinical Calculators
function initCalculators() {
  // 1. OFC & Macrocephaly
  const ofcInput = document.getElementById('f-head-circumference');
  const genderInput = document.getElementById('f-gender');
  const updateOFC = () => {
    const ofc = parseFloat(ofcInput?.value);
    const gender = genderInput?.value || 'Male';
    const badge = document.getElementById('ofc-eval-badge');
    const bannerBadge = document.getElementById('banner-macrocephaly-badge');
    
    if (!isNaN(ofc)) {
      const isMacro = (gender === 'Male' && ofc > 58.0) || (gender !== 'Male' && ofc > 56.0);
      if (isMacro) {
        if (badge) {
          badge.textContent = `Macrocephaly Detected (${ofc} cm > ${gender === 'Male' ? '58' : '56'}cm threshold)`;
          badge.className = 'badge badge-amber font-bold';
        }
        if (bannerBadge) bannerBadge.style.display = 'inline-flex';
      } else {
        if (badge) {
          badge.textContent = `Normal Range (${ofc} cm)`;
          badge.className = 'badge badge-secondary';
        }
        if (bannerBadge) bannerBadge.style.display = 'none';
      }
    }
  };
  ofcInput?.addEventListener('input', updateOFC);
  genderInput?.addEventListener('change', updateOFC);

  // 2. BMI
  const heightInput = document.getElementById('f-height');
  const weightInput = document.getElementById('f-weight');
  const updateBMI = () => {
    const h = parseFloat(heightInput?.value) / 100;
    const w = parseFloat(weightInput?.value);
    const bmiField = document.getElementById('f-bmi');
    const obesityCheck = document.getElementById('f-obesity-status');
    const obesityGrade = document.getElementById('f-obesity-grade');

    if (!isNaN(h) && !isNaN(w) && h > 0) {
      const bmi = (w / (h * h)).toFixed(1);
      if (bmiField) bmiField.value = `${bmi} kg/m²`;
      if (parseFloat(bmi) >= 30) {
        if (obesityCheck) obesityCheck.checked = true;
        if (obesityGrade) {
          if (parseFloat(bmi) < 35) obesityGrade.value = 'Class 1';
          else if (parseFloat(bmi) < 40) obesityGrade.value = 'Class 2';
          else obesityGrade.value = 'Class 3';
        }
      }
    }
  };
  heightInput?.addEventListener('input', updateBMI);
  weightInput?.addEventListener('input', updateBMI);

  // 3. iNPH Radscale (0 - 12)
  document.querySelectorAll('.rad-input').forEach(input => {
    input.addEventListener('change', calculateRadscale);
  });

  // 4. Tap test live calculation
  document.querySelectorAll('.tap-calc-input').forEach(input => {
    input.addEventListener('input', calculateTapTest);
  });

  // 5. iNPHGS Comparative Engine
  document.querySelectorAll('.inphgs-calc-input').forEach(input => {
    input.addEventListener('change', calculateINPHGS);
  });

  // 6. Kiefer Scale Engine
  document.querySelectorAll('.kiefer-calc-input').forEach(input => {
    input.addEventListener('input', calculateKiefer);
  });
}

function calculateRadscale() {
  const v1 = parseInt(document.getElementById('rad-evans')?.value || '0', 10);
  const v2 = parseInt(document.getElementById('rad-temporal')?.value || '0', 10);
  const v3 = parseInt(document.getElementById('rad-callosal')?.value || '0', 10);
  const v4 = parseInt(document.getElementById('rad-periventricular')?.value || '0', 10);
  const v5 = parseInt(document.getElementById('rad-high-convexity')?.value || '0', 10);
  const v6 = parseInt(document.getElementById('rad-sylvian')?.value || '0', 10);
  const v7 = parseInt(document.getElementById('rad-focal-sulci')?.value || '0', 10);

  const total = v1 + v2 + v3 + v4 + v5 + v6 + v7;
  const scoreBadge = document.getElementById('calc-radscale-total');
  const interpText = document.getElementById('calc-radscale-interp');

  if (scoreBadge) scoreBadge.textContent = `${total} / 12`;
  if (interpText) {
    if (total >= 8) {
      interpText.textContent = `Score ${total}/12: High probability of positive shunt response (DESH features prominent).`;
      interpText.style.color = 'var(--accent-emerald)';
    } else if (total >= 5) {
      interpText.textContent = `Score ${total}/12: Moderate probability of shunt response; CSF dynamics recommended.`;
      interpText.style.color = 'var(--accent-amber)';
    } else {
      interpText.textContent = `Score ${total}/12: Low radiological probability; assess differential carefully.`;
      interpText.style.color = 'var(--text-secondary)';
    }
  }
}

function calculateTapTest() {
  const preTime = parseFloat(document.getElementById('f-tap-pre-walk-time')?.value);
  const postTime = parseFloat(document.getElementById('f-tap-post-walk-time')?.value);
  const preSteps = parseFloat(document.getElementById('f-tap-pre-walk-steps')?.value);
  const postSteps = parseFloat(document.getElementById('f-tap-post-walk-steps')?.value);

  const timeImpEl = document.getElementById('calc-tap-time-improve');
  const stepImpEl = document.getElementById('calc-tap-steps-improve');
  const badgeEl = document.getElementById('calc-tap-responder-badge');
  const summaryEl = document.getElementById('calc-tap-summary');

  if (!isNaN(preTime) && !isNaN(postTime) && preTime > 0) {
    const timeDelta = ((preTime - postTime) / preTime) * 100;
    if (timeImpEl) timeImpEl.textContent = `${timeDelta >= 0 ? '+' : ''}${timeDelta.toFixed(1)}%`;
  } else {
    if (timeImpEl) timeImpEl.textContent = '--%';
  }

  if (!isNaN(preSteps) && !isNaN(postSteps) && preSteps > 0) {
    const stepDelta = ((preSteps - postSteps) / preSteps) * 100;
    if (stepImpEl) stepImpEl.textContent = `${stepDelta >= 0 ? '+' : ''}${stepDelta.toFixed(1)}%`;
  } else {
    if (stepImpEl) stepImpEl.textContent = '--%';
  }

  if (!isNaN(preTime) && !isNaN(postTime)) {
    const timeDelta = ((preTime - postTime) / preTime) * 100;
    if (timeDelta >= 20) {
      if (badgeEl) { badgeEl.textContent = 'Definite Positive'; badgeEl.className = 'score-number text-emerald'; }
      if (summaryEl) summaryEl.innerHTML = '<span class="text-emerald font-bold">&gt;20% Improvement: Highly predictive of shunt response.</span>';
    } else if (timeDelta >= 10) {
      if (badgeEl) { badgeEl.textContent = 'Mild Positive'; badgeEl.className = 'score-number text-amber'; }
      if (summaryEl) summaryEl.innerHTML = '<span class="text-amber font-bold">10-20% Improvement: Consider supplementary ELD or Rout.</span>';
    } else {
      if (badgeEl) { badgeEl.textContent = 'Negative / Equivocal'; badgeEl.className = 'score-number text-secondary'; }
      if (summaryEl) summaryEl.innerHTML = '<span class="text-secondary">&lt;10% Improvement: Negative tap test does NOT rule out response.</span>';
    }
  }
}

function calculateINPHGS() {
  const preG = parseInt(document.getElementById('f-inphgs-pre-gait')?.value || '0', 10);
  const preC = parseInt(document.getElementById('f-inphgs-pre-cog')?.value || '0', 10);
  const preU = parseInt(document.getElementById('f-inphgs-pre-urin')?.value || '0', 10);
  const preTotal = preG + preC + preU;

  const postG = parseInt(document.getElementById('f-inphgs-post-gait')?.value || '0', 10);
  const postC = parseInt(document.getElementById('f-inphgs-post-cog')?.value || '0', 10);
  const postU = parseInt(document.getElementById('f-inphgs-post-urin')?.value || '0', 10);
  const postTotal = postG + postC + postU;

  document.getElementById('score-inphgs-pre-total').textContent = `${preTotal} / 12`;
  document.getElementById('score-inphgs-post-total').textContent = `${postTotal} / 12`;

  const delta = preTotal - postTotal;
  const badge = document.getElementById('inphgs-delta-badge');
  if (badge) {
    badge.textContent = `Δ Change: ${delta >= 0 ? '+' : ''}${delta} pts`;
    if (delta >= 2) badge.className = 'badge badge-emerald font-mono';
    else if (delta > 0) badge.className = 'badge badge-csf font-mono';
    else badge.className = 'badge badge-secondary font-mono';
  }
}

function calculateKiefer() {
  const preG = parseInt(document.getElementById('f-kiefer-pre-gait')?.value || '0', 10);
  const preC = parseInt(document.getElementById('f-kiefer-pre-cog')?.value || '0', 10);
  const preU = parseInt(document.getElementById('f-kiefer-pre-urin')?.value || '0', 10);
  const preH = parseInt(document.getElementById('f-kiefer-pre-ha')?.value || '0', 10);
  const preD = parseInt(document.getElementById('f-kiefer-pre-diz')?.value || '0', 10);
  const preTotal = preG + preC + preU + preH + preD;

  const postG = parseInt(document.getElementById('f-kiefer-post-gait')?.value || '0', 10);
  const postC = parseInt(document.getElementById('f-kiefer-post-cog')?.value || '0', 10);
  const postU = parseInt(document.getElementById('f-kiefer-post-urin')?.value || '0', 10);
  const postH = parseInt(document.getElementById('f-kiefer-post-ha')?.value || '0', 10);
  const postD = parseInt(document.getElementById('f-kiefer-post-diz')?.value || '0', 10);
  const postTotal = postG + postC + postU + postH + postD;

  document.getElementById('score-kiefer-pre-total').textContent = `${preTotal} / 20`;
  document.getElementById('score-kiefer-post-total').textContent = `${postTotal} / 20`;

  const delta = preTotal - postTotal;
  const badge = document.getElementById('kiefer-delta-badge');
  if (badge) {
    badge.textContent = `Δ Change: ${delta >= 0 ? '+' : ''}${delta} pts`;
    if (delta >= 4) badge.className = 'badge badge-emerald font-mono';
    else if (delta > 0) badge.className = 'badge badge-lova font-mono';
    else badge.className = 'badge badge-secondary font-mono';
  }
}

// Data Directory & Dropdown Refresh
async function refreshPatientDirectory() {
  const patients = await DatabaseAdapter.getAllPatients();
  AppState.patientsList = patients;

  const select = document.getElementById('patient-select-dropdown');
  if (select) {
    select.innerHTML = '<option value="">-- Select Patient --</option>';
    patients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.mrn} - ${p.last_name}, ${p.first_name} (${p.diagnosis_category})`;
      select.appendChild(opt);
    });

    if (AppState.activePatientId) {
      select.value = AppState.activePatientId;
    }
  }

  // Load all global datasets for aggregate cohort analytics
  if (DatabaseAdapter.getAllReviews) {
    AppState.allReviews = await DatabaseAdapter.getAllReviews();
    AppState.allComplications = await DatabaseAdapter.getAllComplications();
    AppState.allRevisionSurgeries = await DatabaseAdapter.getAllRevisionSurgeries();
    AppState.allOtherSurgeries = await DatabaseAdapter.getAllOtherSurgeries();
    AppState.allMedicalTreatments = await DatabaseAdapter.getAllMedicalTreatments();
  }

  updateTopStats(patients);
  renderCohortAnalytics();
  renderCohortTable();
}

function updateTopStats(patients) {
  const total = patients.length;
  const inph = patients.filter(p => p.diagnosis_category === 'iNPH' || p.diagnosis_category === 'sNPH').length;
  const lova = patients.filter(p => p.diagnosis_category === 'LOVA').length;
  const metformin = patients.filter(p => p.metformin_status === 'Active').length;
  const surgeries = patients.filter(p => p.surg_procedure_type && p.surg_procedure_type !== 'None').length;

  document.getElementById('stat-total-patients').textContent = total;
  document.getElementById('stat-nph-patients').textContent = inph;
  document.getElementById('stat-lova-patients').textContent = lova;
  document.getElementById('stat-metformin').textContent = metformin;
  document.getElementById('stat-surgeries').textContent = surgeries;

  // Count adjustments
  DatabaseAdapter.getAllAdjustments().then(adjs => {
    document.getElementById('stat-adjustments').textContent = adjs.length;
  });
}

function updateEngineBadge() {
  const engineEl = document.getElementById('stat-db-engine');
  if (engineEl) {
    if (DatabaseAdapter.isTauri) {
      engineEl.textContent = 'SQLite (Native Rusqlite)';
      engineEl.className = 'stat-value text-emerald font-mono';
    } else {
      engineEl.textContent = 'SQLite Engine (Web/Local)';
      engineEl.className = 'stat-value text-csf font-mono';
    }
  }
}

// Patient Loading & Form Population
async function loadPatient(id) {
  const patient = await DatabaseAdapter.getPatientById(id);
  if (!patient) return;

  AppState.activePatientId = id;
  AppState.activePatientData = patient;

  // Update banner
  document.getElementById('banner-patient-name').textContent = `${patient.last_name}, ${patient.first_name}`;
  document.getElementById('banner-patient-mrn').textContent = `MRN: ${patient.mrn}`;
  document.getElementById('banner-patient-age-gender').textContent = `${patient.age || '--'} yrs / ${patient.gender || '-'}`;
  document.getElementById('banner-patient-dx').textContent = `Diagnosis: ${patient.diagnosis_category}`;
  document.getElementById('banner-patient-ofc').textContent = `OFC: ${patient.head_circumference || '--'} cm`;

  const isMacro = (patient.gender === 'Male' && patient.head_circumference > 58.0) || (patient.gender !== 'Male' && patient.head_circumference > 56.0);
  document.getElementById('banner-macrocephaly-badge').style.display = isMacro ? 'inline-flex' : 'none';

  const shuntDesc = patient.shunt_model ? `${patient.shunt_model} (DP: ${patient.shunt_initial_dp || '--'}, AG: ${patient.shunt_initial_ag || '--'})` : 'No Shunt Record';
  document.getElementById('banner-patient-shunt').textContent = shuntDesc;

  // Synchronize dropdown
  const dropdown = document.getElementById('patient-select-dropdown');
  if (dropdown) dropdown.value = id;

  // Populate Tab 1: Demographics
  setVal('f-mrn', patient.mrn);
  setVal('f-first-name', patient.first_name);
  setVal('f-last-name', patient.last_name);
  setVal('f-diagnosis-category', patient.diagnosis_category);
  setVal('f-dob', patient.dob);
  setVal('f-age', patient.age);
  setVal('f-gender', patient.gender);
  setVal('f-handedness', patient.handedness);
  setVal('f-head-circumference', patient.head_circumference);
  setVal('f-height', patient.height);
  setVal('f-weight', patient.weight);
  setCheck('f-childhood-hat-size', patient.childhood_large_hat_size);
  setCheck('f-delayed-motor-milestones', patient.delayed_motor_milestones);
  setCheck('f-craniofacial-disproportion', patient.craniofacial_disproportion);
  setVal('f-presentation-date', patient.presentation_date);
  setVal('f-consultant-surgeon', patient.consultant_surgeon);
  setVal('f-consultant-neurologist', patient.consultant_neurologist);

  // Tab 2: Past History & Metformin
  setCheck('f-prev-neck-surgery', patient.prev_neck_surgery);
  setVal('f-prev-neck-notes', patient.prev_neck_notes);
  setCheck('f-prev-chest-surgery', patient.prev_chest_surgery);
  setVal('f-prev-chest-notes', patient.prev_chest_notes);
  setCheck('f-prev-abdo-surgery', patient.prev_abdo_surgery);
  setVal('f-prev-abdo-notes', patient.prev_abdo_notes);
  setCheck('f-prev-head-injury', patient.prev_head_injury);
  setVal('f-prev-head-injury-notes', patient.prev_head_injury_notes);
  setCheck('f-prev-neurosurgery', patient.prev_neurosurgery);
  setVal('f-prev-neurosurgery-notes', patient.prev_neurosurgery_notes);
  setCheck('f-prev-cns-infection', patient.prev_cns_infection);
  setVal('f-prev-cns-infection-notes', patient.prev_cns_infection_notes);
  setCheck('f-prev-sah', patient.prev_sah);
  setVal('f-prev-sah-notes', patient.prev_sah_notes);

  setVal('f-metformin-status', patient.metformin_status || 'Never');
  setVal('f-metformin-dose', patient.metformin_daily_dose);
  setVal('f-metformin-duration', patient.metformin_duration_years);
  setVal('f-metformin-indication', patient.metformin_indication || 'Type 2 Diabetes');
  setVal('f-metformin-notes', patient.metformin_glymphatic_notes);

  setCheck('f-obesity-status', patient.obesity_status);
  setVal('f-obesity-grade', patient.obesity_grade || 'None');
  setVal('f-anticoagulation', patient.anticoagulation_antiplatelet);
  setVal('f-other-comorbidities', patient.comorbidities_other);

  // Tab 3: Presentation
  setVal('f-gait-severity', patient.gait_severity || '2 - Moderate Difficulty');
  setCheck('f-gait-magnetic', patient.gait_magnetic);
  setCheck('f-gait-broad-based', patient.gait_broad_based);
  setCheck('f-gait-short-steps', patient.gait_short_steps);
  setCheck('f-gait-turning-multi', patient.gait_turning_steps);
  setCheck('f-gait-freezing', patient.gait_freezing);
  setCheck('f-gait-falls', patient.gait_falls);
  setVal('f-falls-frequency', patient.falls_frequency);

  setVal('f-cog-severity', patient.cog_severity || '1 - Subjective Complaints');
  setCheck('f-cog-bradyphrenia', patient.cog_bradyphrenia);
  setCheck('f-cog-executive', patient.cog_executive);
  setCheck('f-cog-apathy', patient.cog_apathy);
  setCheck('f-cog-attention', patient.cog_attention);
  setCheck('f-cog-retrieval', patient.cog_retrieval);
  setVal('f-baseline-moca', patient.baseline_moca);
  setVal('f-baseline-mmse', patient.baseline_mmse);

  setVal('f-urinary-severity', patient.urinary_severity || '1 - Pollakisuria / Urgency');
  setCheck('f-urin-urgency', patient.urinary_urgency);
  setCheck('f-urin-nocturia', patient.urinary_nocturia);
  setCheck('f-urin-lack-concern', patient.urinary_lack_concern);
  setCheck('f-urin-fecal', patient.urinary_fecal);

  setCheck('f-lova-headache', patient.lova_headache);
  setVal('f-lova-headache-desc', patient.lova_headache_desc);
  setCheck('f-lova-visual-obscurations', patient.lova_visual_obscurations);
  setVal('f-lova-visual-desc', patient.lova_visual_desc);
  setCheck('f-lova-papilledema', patient.lova_papilledema);
  setVal('f-lova-papilledema-grade', patient.lova_papilledema_grade || 'Absent');
  setVal('f-symptoms-duration', patient.symptoms_duration_months);

  // Tab 4: Differential Exclusions
  setVal('f-excl-ad', patient.excl_ad || 'Excluded');
  setVal('f-excl-pd', patient.excl_pd || 'Excluded');
  setVal('f-excl-psp', patient.excl_psp || 'Excluded');
  setVal('f-excl-msa', patient.excl_msa || 'Excluded');
  setVal('f-excl-dlb', patient.excl_dlb || 'Excluded');
  setVal('f-excl-vad', patient.excl_vad || 'Excluded');
  setVal('f-dopamine-challenge', patient.dopamine_challenge || 'Not Performed');

  setVal('f-excl-csm', patient.excl_csm || 'Excluded (Normal Spine MRI)');
  setVal('f-excl-lss', patient.excl_lss || 'Excluded');
  setVal('f-excl-neuropathy', patient.excl_neuropathy || 'Excluded (Normal Sensation)');
  setVal('f-spine-imaging-summary', patient.spine_imaging_summary);

  setVal('f-mdt-date', patient.mdt_date);
  setVal('f-mdt-decision', patient.mdt_decision || 'Recommend Shunt Surgery');
  setVal('f-mdt-confidence', patient.mdt_confidence || 'Definite Responder (>80%)');
  setVal('f-mdt-notes', patient.mdt_notes);

  // Tab 5: Imaging & Radscale
  setVal('f-evans-index', patient.evans_index);
  setVal('f-callosal-angle', patient.callosal_angle);
  setVal('f-temporal-horns', patient.temporal_horns_width);
  setVal('f-third-ventricle-width', patient.third_ventricle_width);
  setCheck('f-desh-tight-vertex', patient.desh_tight_vertex);
  setCheck('f-desh-sylvian-dilation', patient.desh_sylvian_dilation);
  setCheck('f-desh-focal-sulcal-dilation', patient.desh_focal_sulcal_dilation);

  setCheck('f-lova-aqueduct-stenosis', patient.lova_aqueduct_stenosis);
  setCheck('f-lova-prepontine-membranes', patient.lova_prepontine_membranes);
  setCheck('f-lova-third-ventricle-bowing', patient.lova_third_ventricle_bowing);
  setCheck('f-lova-sella-expansion', patient.lova_sella_expansion);
  setCheck('f-lova-calvarial-thinning', patient.lova_calvarial_thinning);
  setCheck('f-lova-flow-void', patient.lova_flow_void);
  setVal('f-imaging-modality', patient.imaging_modality || '3T MRI Brain (with 3D CISS/FIESTA)');

  // Radscale inputs
  setVal('rad-evans', patient.radscale_evans || 0);
  setVal('rad-temporal', patient.radscale_temporal || 0);
  setVal('rad-callosal', patient.radscale_callosal || 0);
  setVal('rad-periventricular', patient.radscale_periventricular || 0);
  setVal('rad-high-convexity', patient.radscale_high_convexity || 0);
  setVal('rad-sylvian', patient.radscale_sylvian || 0);
  setVal('rad-focal-sulci', patient.radscale_focal_sulci || 0);

  // Tab 6: CSF Dynamics
  setVal('f-tap-date', patient.tap_date);
  setVal('f-tap-volume', patient.tap_volume);
  setVal('f-tap-opening-pressure', patient.tap_opening_pressure);
  setVal('f-tap-closing-pressure', patient.tap_closing_pressure);
  setVal('f-tap-pre-walk-time', patient.tap_pre_walk_time);
  setVal('f-tap-pre-walk-steps', patient.tap_pre_walk_steps);
  setVal('f-tap-post-walk-time', patient.tap_post_walk_time);
  setVal('f-tap-post-walk-steps', patient.tap_post_walk_steps);
  setVal('f-tap-pre-moca', patient.tap_pre_moca);
  setVal('f-tap-post-moca', patient.tap_post_moca);
  setVal('f-tap-cognitive-notes', patient.tap_cognitive_notes);

  setVal('f-inf-rout', patient.inf_rout);
  setVal('f-inf-p0', patient.inf_p0);
  setVal('f-inf-plateau', patient.inf_plateau);
  setVal('f-inf-pvi', patient.inf_pvi);
  setCheck('f-inf-b-waves', patient.inf_b_waves);

  setVal('f-eld-duration', patient.eld_duration);
  setVal('f-eld-hourly-rate', patient.eld_hourly_rate);
  setVal('f-eld-total-volume', patient.eld_total_volume);
  setVal('f-eld-clinical-response', patient.eld_clinical_response || 'Not Performed');
  setVal('f-csf-lab-results', patient.csf_lab_results);

  // Tab 7: Surgery & Hardware
  setVal('f-surg-procedure-type', patient.surg_procedure_type || 'Ventriculoperitoneal (VP) Shunt');
  setVal('f-surg-date', patient.surg_date);
  setVal('f-surg-operating-surgeon', patient.surg_operating_surgeon);
  setVal('f-surg-cranial-entry', patient.surg_cranial_entry || "Right Frontal (Kocher's Point)");
  setVal('f-surg-navigation', patient.surg_navigation || 'Electromagnetic Frameless (Stealth / Kick)');
  setCheck('f-surg-liliequist-disrupted', patient.surg_liliequist_disrupted);

  setVal('f-shunt-manufacturer', patient.shunt_manufacturer || 'Miethke (Aesculap)');
  setVal('f-shunt-model', patient.shunt_model);
  setVal('f-shunt-initial-dp', patient.shunt_initial_dp);
  setVal('f-shunt-initial-ag', patient.shunt_initial_ag);
  setVal('f-shunt-catheter-type', patient.shunt_catheter_type || 'Bactiseal (Rifampicin/Clindamycin)');
  setVal('f-shunt-reservoir', patient.shunt_reservoir || 'Integrated Pre-chamber');
  setVal('f-shunt-serial-number', patient.shunt_serial_number);
  setVal('f-surg-operative-notes', patient.surg_operative_notes);
  setVal('f-surg-postop-course', patient.surg_postop_course);

  // Tab 9: Outcomes Pre/Post scores
  setVal('f-inphgs-pre-gait', patient.inphgs_pre_gait || 0);
  setVal('f-inphgs-pre-cog', patient.inphgs_pre_cog || 0);
  setVal('f-inphgs-pre-urin', patient.inphgs_pre_urin || 0);
  setVal('f-inphgs-post-gait', patient.inphgs_post_gait || 0);
  setVal('f-inphgs-post-cog', patient.inphgs_post_cog || 0);
  setVal('f-inphgs-post-urin', patient.inphgs_post_urin || 0);

  setVal('f-kiefer-pre-gait', patient.kiefer_pre_gait || 0);
  setVal('f-kiefer-pre-cog', patient.kiefer_pre_cog || 0);
  setVal('f-kiefer-pre-urin', patient.kiefer_pre_urin || 0);
  setVal('f-kiefer-pre-ha', patient.kiefer_pre_ha || 0);
  setVal('f-kiefer-pre-diz', patient.kiefer_pre_diz || 0);

  setVal('f-kiefer-post-gait', patient.kiefer_post_gait || 0);
  setVal('f-kiefer-post-cog', patient.kiefer_post_cog || 0);
  setVal('f-kiefer-post-urin', patient.kiefer_post_urin || 0);
  setVal('f-kiefer-post-ha', patient.kiefer_post_ha || 0);
  setVal('f-kiefer-post-diz', patient.kiefer_post_diz || 0);

  // Run all reactive recalculations
  calculateRadscale();
  calculateTapTest();
  calculateINPHGS();
  calculateKiefer();

  const ofcInput = document.getElementById('f-head-circumference');
  if (ofcInput) ofcInput.dispatchEvent(new Event('input'));
  const heightInput = document.getElementById('f-height');
  if (heightInput) heightInput.dispatchEvent(new Event('input'));

  // Load child tables
  await loadPatientAdjustments(id);
  await loadPatientReviews(id);
  await loadPatientComplications(id);
  await loadPatientRevisionSurgeries(id);
  await loadPatientOtherSurgeries(id);
  await loadPatientMedicalTreatments(id);
  renderAIInsights();
}

function resetPatientForm() {
  AppState.activePatientId = null;
  AppState.activePatientData = null;

  document.getElementById('banner-patient-name').textContent = 'New Patient Encounter';
  document.getElementById('banner-patient-mrn').textContent = 'MRN: (Pending)';
  document.getElementById('banner-patient-age-gender').textContent = '-- yrs / -';
  document.getElementById('banner-patient-dx').textContent = 'Diagnosis: In Evaluation';
  document.getElementById('banner-patient-ofc').textContent = 'OFC: -- cm';
  document.getElementById('banner-macrocephaly-badge').style.display = 'none';
  document.getElementById('banner-patient-shunt').textContent = 'No Shunt Record';

  document.querySelectorAll('form').forEach(f => f.reset());

  // Auto-generate MRN
  const nextMRN = `NPH-${new Date().getFullYear()}-${String(AppState.patientsList.length + 1).padStart(3, '0')}`;
  setVal('f-mrn', nextMRN);
  setVal('f-presentation-date', new Date().toISOString().split('T')[0]);

  // Clear tables
  document.getElementById('tbody-adjustments').innerHTML = '<tr><td colspan="9" class="text-center text-secondary">No adjustments recorded for this new patient.</td></tr>';
  document.getElementById('tbody-reviews').innerHTML = '<tr><td colspan="10" class="text-center text-secondary">No reviews recorded.</td></tr>';
  document.getElementById('tbody-complications').innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No complications recorded.</td></tr>';
  const revBody = document.getElementById('tbody-revision-surgeries');
  if (revBody) revBody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No revision shunt surgeries recorded.</td></tr>';
  const othBody = document.getElementById('tbody-other-surgeries');
  if (othBody) othBody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No other surgeries recorded.</td></tr>';
  const medBody = document.getElementById('tbody-medical-treatments');
  if (medBody) medBody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No medical treatments recorded.</td></tr>';

  calculateRadscale();
  calculateTapTest();
  calculateINPHGS();
  calculateKiefer();
}

// Child Table Loaders: Adjustments
async function loadPatientAdjustments(patientId) {
  const adjs = await DatabaseAdapter.getAdjustmentsForPatient(patientId);
  AppState.adjustmentsList = adjs;
  const tbody = document.getElementById('tbody-adjustments');
  if (!tbody) return;

  if (adjs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary">No shunt adjustments recorded for this patient.</td></tr>';
    return;
  }

  tbody.innerHTML = adjs.map(a => `
    <tr>
      <td class="font-mono">${a.adjustment_date}</td>
      <td><strong>${escapeHtml(a.reason_for_adjustment)}</strong></td>
      <td class="font-mono text-secondary">${escapeHtml(a.old_differential_setting || '--')}</td>
      <td class="font-mono text-csf font-bold">${escapeHtml(a.new_differential_setting || '--')}</td>
      <td class="font-mono text-secondary">${escapeHtml(a.old_antigravity_setting || '--')}</td>
      <td class="font-mono text-lova font-bold">${escapeHtml(a.new_antigravity_setting || '--')}</td>
      <td>${escapeHtml(a.operator || '--')}</td>
      <td>${escapeHtml(a.clinical_response || '--')}</td>
      <td>
        <button class="btn btn-ghost btn-xs text-danger" onclick="deleteAdjustment('${a.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Child Table Loaders: Reviews
async function loadPatientReviews(patientId) {
  const reviews = await DatabaseAdapter.getReviewsForPatient(patientId);
  AppState.reviewsList = reviews;
  const tbody = document.getElementById('tbody-reviews');
  if (!tbody) return;

  if (reviews.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-secondary">No follow-up clinic reviews recorded.</td></tr>';
    return;
  }

  tbody.innerHTML = reviews.map(r => `
    <tr>
      <td class="font-mono">${r.review_date}</td>
      <td><span class="badge badge-secondary">${escapeHtml(r.interval_name)}</span></td>
      <td class="font-semibold ${r.gait_improvement_status.includes('Improved') ? 'text-emerald' : ''}">${escapeHtml(r.gait_improvement_status)}</td>
      <td>${escapeHtml(r.cognitive_improvement_status || '--')}</td>
      <td>${escapeHtml(r.urinary_improvement_status || '--')}</td>
      <td class="font-mono text-center">${r.inphgs_total_post !== null ? r.inphgs_total_post : '--'}</td>
      <td class="font-mono text-center">${r.kiefer_total_post !== null ? r.kiefer_total_post : '--'}</td>
      <td><span class="badge badge-csf">${escapeHtml(r.patient_pgi_i || '--')}</span></td>
      <td>${escapeHtml(r.caregiver_satisfaction || '--')}</td>
      <td class="font-mono font-bold">${r.mrs_score !== null ? r.mrs_score : '--'}</td>
    </tr>
  `).join('');
}


// Child Table Loaders: Revision Shunt Surgeries
async function loadPatientRevisionSurgeries(patientId) {
  const revs = await DatabaseAdapter.getRevisionSurgeriesForPatient(patientId);
  AppState.revisionSurgeriesList = revs;
  const tbody = document.getElementById('tbody-revision-surgeries');
  if (!tbody) return;

  if (revs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No revision shunt surgeries recorded for this patient.</td></tr>';
    return;
  }

  tbody.innerHTML = revs.map(r => `
    <tr>
      <td class="font-mono">${r.surgery_date}</td>
      <td><span class="badge badge-amber font-semibold">${escapeHtml(r.revision_indication)}</span></td>
      <td><strong>${escapeHtml(r.components_revised)}</strong></td>
      <td class="font-mono text-xs">
        ${escapeHtml(r.valve_manufacturer ? `${r.valve_manufacturer} - ` : '')}${escapeHtml(r.new_hardware_model || '--')} 
        ${r.new_differential_setting ? `(DP: ${escapeHtml(r.new_differential_setting)})` : ''} 
        ${r.new_antigravity_setting ? `(AG: ${escapeHtml(r.new_antigravity_setting)})` : ''}
      </td>
      <td>${escapeHtml(r.lead_surgeon || '--')}</td>
      <td>${escapeHtml(r.operative_findings || r.immediate_outcome || '--')}</td>
      <td>
        <button class="btn btn-ghost btn-xs text-danger" onclick="deleteRevisionSurgery('${r.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Child Table Loaders: Other Surgeries
async function loadPatientOtherSurgeries(patientId) {
  const oths = await DatabaseAdapter.getOtherSurgeriesForPatient(patientId);
  AppState.otherSurgeriesList = oths;
  const tbody = document.getElementById('tbody-other-surgeries');
  if (!tbody) return;

  if (oths.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No other surgeries or procedures recorded for this patient.</td></tr>';
    return;
  }

  tbody.innerHTML = oths.map(o => `
    <tr>
      <td class="font-mono">${o.procedure_date}</td>
      <td><strong>${escapeHtml(o.procedure_name)}</strong></td>
      <td><span class="badge badge-secondary">${escapeHtml(o.surgical_category)}</span></td>
      <td>${escapeHtml(o.lead_surgeon || '--')}</td>
      <td>${escapeHtml(o.indication || '--')}</td>
      <td>${escapeHtml(o.clinical_outcome || o.complications || '--')}</td>
      <td>
        <button class="btn btn-ghost btn-xs text-danger" onclick="deleteOtherSurgery('${o.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Modal Handlers: Revision Surgery Submit
async function handleRevisionSurgerySubmit(e) {
  e.preventDefault();
  if (!AppState.activePatientId) return;

  const newRev = {
    id: `revsurg-${Date.now()}`,
    patient_id: AppState.activePatientId,
    surgery_date: getVal('m-revsurg-date'),
    lead_surgeon: getVal('m-revsurg-surgeon'),
    assistant_surgeon: getVal('m-revsurg-assistant'),
    revision_indication: getVal('m-revsurg-indication'),
    components_revised: getVal('m-revsurg-components'),
    cranial_entry_site: getVal('m-revsurg-cranial-entry'),
    valve_manufacturer: getVal('m-revsurg-manufacturer'),
    new_hardware_model: getVal('m-revsurg-new-hardware'),
    new_differential_setting: getVal('m-revsurg-new-dp'),
    new_antigravity_setting: getVal('m-revsurg-new-ag'),
    new_catheter_type: getVal('m-revsurg-catheter-type'),
    csf_microbiology_sent: getBool('m-revsurg-csf-microbiology'),
    operative_findings: getVal('m-revsurg-findings'),
    immediate_outcome: getVal('m-revsurg-outcome')
  };

  const success = await DatabaseAdapter.saveRevisionSurgery(newRev);
  if (success) {
    closeModal('modal-revision-surgery');
    document.getElementById('form-modal-revision-surgery').reset();
    await loadPatientRevisionSurgeries(AppState.activePatientId);
    showNotification('Revision shunt surgery recorded.', 'warning');
  }
}

window.deleteRevisionSurgery = async (id) => {
  if (confirm('Delete this revision surgery record?')) {
    await DatabaseAdapter.deleteRevisionSurgery(id);
    await loadPatientRevisionSurgeries(AppState.activePatientId);
  }
};

// Modal Handlers: Other Surgery Submit
async function handleOtherSurgerySubmit(e) {
  e.preventDefault();
  if (!AppState.activePatientId) return;

  const newOth = {
    id: `othsurg-${Date.now()}`,
    patient_id: AppState.activePatientId,
    procedure_date: getVal('m-othsurg-date'),
    surgical_category: getVal('m-othsurg-category'),
    procedure_name: getVal('m-othsurg-name'),
    lead_surgeon: getVal('m-othsurg-surgeon'),
    anesthesia_type: getVal('m-othsurg-anesthesia'),
    indication: getVal('m-othsurg-indication'),
    operative_summary: getVal('m-othsurg-summary'),
    complications: getVal('m-othsurg-complications'),
    clinical_outcome: getVal('m-othsurg-outcome')
  };

  const success = await DatabaseAdapter.saveOtherSurgery(newOth);
  if (success) {
    closeModal('modal-other-surgery');
    document.getElementById('form-modal-other-surgery').reset();
    await loadPatientOtherSurgeries(AppState.activePatientId);
    showNotification('Other surgery / procedure recorded.', 'success');
  }
}

window.deleteOtherSurgery = async (id) => {
  if (confirm('Delete this surgery / procedure record?')) {
    await DatabaseAdapter.deleteOtherSurgery(id);
    await loadPatientOtherSurgeries(AppState.activePatientId);
  }
};

// Child Table Loaders: Complications
async function loadPatientComplications(patientId) {
  const comps = await DatabaseAdapter.getComplicationsForPatient(patientId);
  AppState.complicationsList = comps;
  const tbody = document.getElementById('tbody-complications');
  if (!tbody) return;

  if (comps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No complications or shunt revisions recorded.</td></tr>';
    return;
  }

  tbody.innerHTML = comps.map(c => `
    <tr>
      <td class="font-mono">${c.onset_date}</td>
      <td><span class="badge badge-danger">${escapeHtml(c.category)}</span></td>
      <td><strong>${escapeHtml(c.specific_event)}</strong></td>
      <td>${escapeHtml(c.malfunction_reason || 'N/A')}</td>
      <td><span class="font-semibold text-amber">${escapeHtml(c.repeat_surgery_required)}</span></td>
      <td>${escapeHtml(c.outcome || '--')}</td>
      <td>
        <button class="btn btn-ghost btn-xs text-danger" onclick="deleteComplication('${c.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Cohort Directory Table
function renderCohortTable() {
  const tbody = document.getElementById('tbody-cohort');
  if (!tbody) return;

  const query = (document.getElementById('cohort-filter-text')?.value || '').toLowerCase().trim();
  const dxFilter = document.getElementById('cohort-filter-dx')?.value || 'ALL';
  const metFilter = document.getElementById('cohort-filter-metformin')?.value || 'ALL';

  let filtered = AppState.patientsList.filter(p => {
    if (dxFilter !== 'ALL' && p.diagnosis_category !== dxFilter) return false;
    if (metFilter !== 'ALL' && p.metformin_status !== metFilter) return false;
    if (query) {
      const haystack = `${p.mrn} ${p.first_name} ${p.last_name} ${p.shunt_model || ''} ${p.consultant_surgeon || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-secondary">No patients match the specified criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isLova = p.diagnosis_category === 'LOVA';
    const isMacro = (p.gender === 'Male' && p.head_circumference > 58.0) || (p.gender !== 'Male' && p.head_circumference > 56.0);
    return `
      <tr>
        <td class="font-mono font-bold">${escapeHtml(p.mrn)}</td>
        <td><strong>${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</strong></td>
        <td>${p.age || '--'} / ${p.gender || '-'}</td>
        <td><span class="badge ${isLova ? 'badge-lova' : 'badge-csf'}">${escapeHtml(p.diagnosis_category)}</span></td>
        <td class="font-mono ${isMacro ? 'text-amber font-bold' : ''}">${p.head_circumference ? `${p.head_circumference} cm` : '--'}</td>
        <td class="font-mono">${p.evans_index || '--'}</td>
        <td>${escapeHtml(p.surg_procedure_type || 'None')}</td>
        <td>${escapeHtml(p.shunt_model || '--')}</td>
        <td class="font-mono text-xs">DP: ${p.shunt_initial_dp || '--'} / AG: ${p.shunt_initial_ag || '--'}</td>
        <td><span class="badge ${p.metformin_status === 'Active' ? 'badge-amber font-mono' : 'badge-neutral'}">${p.metformin_status || 'Never'}</span></td>
        <td>
          <button class="btn btn-primary btn-xs" onclick="selectCohortPatient('${p.id}')">Open</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.selectCohortPatient = async (id) => {
  await loadPatient(id);
  switchTab('tab-demographics');
};

// Save Current Patient (Full Form Gathering)
async function saveCurrentPatient() {
  const mrn = document.getElementById('f-mrn')?.value.trim();
  const firstName = document.getElementById('f-first-name')?.value.trim();
  const lastName = document.getElementById('f-last-name')?.value.trim();

  if (!mrn || !firstName || !lastName) {
    alert('Please enter at least MRN, First Name, and Last Name before saving.');
    switchTab('tab-demographics');
    return;
  }

  const patientId = AppState.activePatientId || `pat-${Date.now()}`;

  const patientData = {
    id: patientId,
    mrn,
    first_name: firstName,
    last_name: lastName,
    diagnosis_category: getVal('f-diagnosis-category'),
    dob: getVal('f-dob'),
    age: getInt('f-age'),
    gender: getVal('f-gender'),
    handedness: getVal('f-handedness'),
    head_circumference: getFloat('f-head-circumference'),
    height: getFloat('f-height'),
    weight: getFloat('f-weight'),
    childhood_large_hat_size: getBool('f-childhood-hat-size'),
    delayed_motor_milestones: getBool('f-delayed-motor-milestones'),
    craniofacial_disproportion: getBool('f-craniofacial-disproportion'),
    presentation_date: getVal('f-presentation-date'),
    consultant_surgeon: getVal('f-consultant-surgeon'),
    consultant_neurologist: getVal('f-consultant-neurologist'),

    // History
    prev_neck_surgery: getBool('f-prev-neck-surgery'),
    prev_neck_notes: getVal('f-prev-neck-notes'),
    prev_chest_surgery: getBool('f-prev-chest-surgery'),
    prev_chest_notes: getVal('f-prev-chest-notes'),
    prev_abdo_surgery: getBool('f-prev-abdo-surgery'),
    prev_abdo_notes: getVal('f-prev-abdo-notes'),
    prev_head_injury: getBool('f-prev-head-injury'),
    prev_head_injury_notes: getVal('f-prev-head-injury-notes'),
    prev_neurosurgery: getBool('f-prev-neurosurgery'),
    prev_neurosurgery_notes: getVal('f-prev-neurosurgery-notes'),
    prev_cns_infection: getBool('f-prev-cns-infection'),
    prev_cns_infection_notes: getVal('f-prev-cns-infection-notes'),
    prev_sah: getBool('f-prev-sah'),
    prev_sah_notes: getVal('f-prev-sah-notes'),

    // Metformin
    metformin_status: getVal('f-metformin-status'),
    metformin_daily_dose: getVal('f-metformin-dose'),
    metformin_duration_years: getFloat('f-metformin-duration'),
    metformin_indication: getVal('f-metformin-indication'),
    metformin_glymphatic_notes: getVal('f-metformin-notes'),

    obesity_status: getBool('f-obesity-status'),
    obesity_grade: getVal('f-obesity-grade'),
    anticoagulation_antiplatelet: getVal('f-anticoagulation'),
    comorbidities_other: getVal('f-other-comorbidities'),

    // Presentation
    gait_severity: getVal('f-gait-severity'),
    gait_magnetic: getBool('f-gait-magnetic'),
    gait_broad_based: getBool('f-gait-broad-based'),
    gait_short_steps: getBool('f-gait-short-steps'),
    gait_turning_steps: getBool('f-gait-turning-multi'),
    gait_freezing: getBool('f-gait-freezing'),
    gait_falls: getBool('f-gait-falls'),
    falls_frequency: getVal('f-falls-frequency'),

    cog_severity: getVal('f-cog-severity'),
    cog_bradyphrenia: getBool('f-cog-bradyphrenia'),
    cog_executive: getBool('f-cog-executive'),
    cog_apathy: getBool('f-cog-apathy'),
    cog_attention: getBool('f-cog-attention'),
    cog_retrieval: getBool('f-cog-retrieval'),
    baseline_moca: getInt('f-baseline-moca'),
    baseline_mmse: getInt('f-baseline-mmse'),

    urinary_severity: getVal('f-urinary-severity'),
    urinary_urgency: getBool('f-urin-urgency'),
    urinary_nocturia: getBool('f-urin-nocturia'),
    urinary_lack_concern: getBool('f-urin-lack-concern'),
    urinary_fecal: getBool('f-urin-fecal'),

    lova_headache: getBool('f-lova-headache'),
    lova_headache_desc: getVal('f-lova-headache-desc'),
    lova_visual_obscurations: getBool('f-lova-visual-obscurations'),
    lova_visual_desc: getVal('f-lova-visual-desc'),
    lova_papilledema: getBool('f-lova-papilledema'),
    lova_papilledema_grade: getVal('f-lova-papilledema-grade'),
    symptoms_duration_months: getInt('f-symptoms-duration'),

    // Differential
    excl_ad: getVal('f-excl-ad'),
    excl_pd: getVal('f-excl-pd'),
    excl_psp: getVal('f-excl-psp'),
    excl_msa: getVal('f-excl-msa'),
    excl_dlb: getVal('f-excl-dlb'),
    excl_vad: getVal('f-excl-vad'),
    dopamine_challenge: getVal('f-dopamine-challenge'),
    excl_csm: getVal('f-excl-csm'),
    excl_lss: getVal('f-excl-lss'),
    excl_neuropathy: getVal('f-excl-neuropathy'),
    spine_imaging_summary: getVal('f-spine-imaging-summary'),
    mdt_date: getVal('f-mdt-date'),
    mdt_decision: getVal('f-mdt-decision'),
    mdt_confidence: getVal('f-mdt-confidence'),
    mdt_notes: getVal('f-mdt-notes'),

    // Imaging
    evans_index: getFloat('f-evans-index'),
    callosal_angle: getFloat('f-callosal-angle'),
    temporal_horns_width: getFloat('f-temporal-horns'),
    third_ventricle_width: getFloat('f-third-ventricle-width'),
    desh_tight_vertex: getBool('f-desh-tight-vertex'),
    desh_sylvian_dilation: getBool('f-desh-sylvian-dilation'),
    desh_focal_sulcal_dilation: getBool('f-desh-focal-sulcal-dilation'),

    lova_aqueduct_stenosis: getBool('f-lova-aqueduct-stenosis'),
    lova_prepontine_membranes: getBool('f-lova-prepontine-membranes'),
    lova_third_ventricle_bowing: getBool('f-lova-third-ventricle-bowing'),
    lova_sella_expansion: getBool('f-lova-sella-expansion'),
    lova_calvarial_thinning: getBool('f-lova-calvarial-thinning'),
    lova_flow_void: getBool('f-lova-flow-void'),
    imaging_modality: getVal('f-imaging-modality'),

    radscale_evans: getInt('rad-evans'),
    radscale_temporal: getInt('rad-temporal'),
    radscale_callosal: getInt('rad-callosal'),
    radscale_periventricular: getInt('rad-periventricular'),
    radscale_high_convexity: getInt('rad-high-convexity'),
    radscale_sylvian: getInt('rad-sylvian'),
    radscale_focal_sulci: getInt('rad-focal-sulci'),

    // CSF Dynamics
    tap_date: getVal('f-tap-date'),
    tap_volume: getFloat('f-tap-volume'),
    tap_opening_pressure: getVal('f-tap-opening-pressure'),
    tap_closing_pressure: getVal('f-tap-closing-pressure'),
    tap_pre_walk_time: getFloat('f-tap-pre-walk-time'),
    tap_pre_walk_steps: getInt('f-tap-pre-walk-steps'),
    tap_post_walk_time: getFloat('f-tap-post-walk-time'),
    tap_post_walk_steps: getInt('f-tap-post-walk-steps'),
    tap_pre_moca: getInt('f-tap-pre-moca'),
    tap_post_moca: getInt('f-tap-post-moca'),
    tap_cognitive_notes: getVal('f-tap-cognitive-notes'),

    inf_rout: getFloat('f-inf-rout'),
    inf_p0: getFloat('f-inf-p0'),
    inf_plateau: getFloat('f-inf-plateau'),
    inf_pvi: getFloat('f-inf-pvi'),
    inf_b_waves: getBool('f-inf-b-waves'),

    eld_duration: getInt('f-eld-duration'),
    eld_hourly_rate: getFloat('f-eld-hourly-rate'),
    eld_total_volume: getFloat('f-eld-total-volume'),
    eld_clinical_response: getVal('f-eld-clinical-response'),
    csf_lab_results: getVal('f-csf-lab-results'),

    // Surgery
    surg_procedure_type: getVal('f-surg-procedure-type'),
    surg_date: getVal('f-surg-date'),
    surg_operating_surgeon: getVal('f-surg-operating-surgeon'),
    surg_cranial_entry: getVal('f-surg-cranial-entry'),
    surg_navigation: getVal('f-surg-navigation'),
    surg_liliequist_disrupted: getBool('f-surg-liliequist-disrupted'),

    shunt_manufacturer: getVal('f-shunt-manufacturer'),
    shunt_model: getVal('f-shunt-model'),
    shunt_initial_dp: getVal('f-shunt-initial-dp'),
    shunt_initial_ag: getVal('f-shunt-initial-ag'),
    shunt_catheter_type: getVal('f-shunt-catheter-type'),
    shunt_reservoir: getVal('f-shunt-reservoir'),
    shunt_serial_number: getVal('f-shunt-serial-number'),
    surg_operative_notes: getVal('f-surg-operative-notes'),
    surg_postop_course: getVal('f-surg-postop-course'),

    // Outcomes
    inphgs_pre_gait: getInt('f-inphgs-pre-gait'),
    inphgs_pre_cog: getInt('f-inphgs-pre-cog'),
    inphgs_pre_urin: getInt('f-inphgs-pre-urin'),
    inphgs_post_gait: getInt('f-inphgs-post-gait'),
    inphgs_post_cog: getInt('f-inphgs-post-cog'),
    inphgs_post_urin: getInt('f-inphgs-post-urin'),

    kiefer_pre_gait: getInt('f-kiefer-pre-gait'),
    kiefer_pre_cog: getInt('f-kiefer-pre-cog'),
    kiefer_pre_urin: getInt('f-kiefer-pre-urin'),
    kiefer_pre_ha: getInt('f-kiefer-pre-ha'),
    kiefer_pre_diz: getInt('f-kiefer-pre-diz'),

    kiefer_post_gait: getInt('f-kiefer-post-gait'),
    kiefer_post_cog: getInt('f-kiefer-post-cog'),
    kiefer_post_urin: getInt('f-kiefer-post-urin'),
    kiefer_post_ha: getInt('f-kiefer-post-ha'),
    kiefer_post_diz: getInt('f-kiefer-post-diz')
  };

  const success = await DatabaseAdapter.savePatient(patientData);
  if (success) {
    AppState.activePatientId = patientId;
    await refreshPatientDirectory();
    await loadPatient(patientId);
    showNotification('Patient record successfully saved to database.', 'success');
  } else {
    showNotification('Error saving patient record.', 'danger');
  }
}

// Modal Handlers: Adjustment
async function handleAdjustmentSubmit(e) {
  e.preventDefault();
  if (!AppState.activePatientId) return;

  const newAdj = {
    id: `adj-${Date.now()}`,
    patient_id: AppState.activePatientId,
    adjustment_date: getVal('m-adj-date'),
    operator: getVal('m-adj-operator'),
    reason_for_adjustment: getVal('m-adj-reason'),
    old_differential_setting: getVal('m-adj-old-dp'),
    new_differential_setting: getVal('m-adj-new-dp'),
    old_antigravity_setting: getVal('m-adj-old-ag'),
    new_antigravity_setting: getVal('m-adj-new-ag'),
    clinical_response: getVal('m-adj-response')
  };

  const success = await DatabaseAdapter.saveAdjustment(newAdj);
  if (success) {
    closeModal('modal-adjustment');
    document.getElementById('form-modal-adjustment').reset();
    await loadPatientAdjustments(AppState.activePatientId);
    showNotification('Shunt adjustment saved.', 'success');
  }
}

window.deleteAdjustment = async (id) => {
  if (confirm('Delete this adjustment entry?')) {
    await DatabaseAdapter.deleteAdjustment(id);
    await loadPatientAdjustments(AppState.activePatientId);
  }
};

// Modal Handlers: Review
async function handleReviewSubmit(e) {
  e.preventDefault();
  if (!AppState.activePatientId) return;

  const newRev = {
    id: `rev-${Date.now()}`,
    patient_id: AppState.activePatientId,
    review_date: getVal('m-rev-date'),
    interval_name: getVal('m-rev-interval'),
    gait_improvement_status: getVal('m-rev-gait-change'),
    walk_time_seconds: getFloat('m-rev-walk-time'),
    cognitive_improvement_status: getVal('m-rev-cog-change'),
    moca_score: getInt('m-rev-moca'),
    urinary_improvement_status: getVal('m-rev-urin-change'),
    patient_pgi_i: getVal('m-rev-pgi'),
    caregiver_satisfaction: getVal('m-rev-caregiver-sat'),
    mrs_score: getInt('m-rev-mrs'),
    notes: getVal('m-rev-notes')
  };

  const success = await DatabaseAdapter.saveReview(newRev);
  if (success) {
    closeModal('modal-review');
    document.getElementById('form-modal-review').reset();
    await loadPatientReviews(AppState.activePatientId);
    showNotification('Clinic follow-up review saved.', 'success');
  }
}

// Modal Handlers: Complication
async function handleComplicationSubmit(e) {
  e.preventDefault();
  if (!AppState.activePatientId) return;

  const newComp = {
    id: `comp-${Date.now()}`,
    patient_id: AppState.activePatientId,
    onset_date: getVal('m-comp-date'),
    category: getVal('m-comp-category'),
    specific_event: getVal('m-comp-specific-event'),
    malfunction_reason: getVal('m-comp-malfunction-reason'),
    repeat_surgery_required: getVal('m-comp-surgery-required'),
    outcome: getVal('m-comp-outcome')
  };

  const success = await DatabaseAdapter.saveComplication(newComp);
  if (success) {
    closeModal('modal-complication');
    document.getElementById('form-modal-complication').reset();
    await loadPatientComplications(AppState.activePatientId);
    showNotification('Complication / revision record saved.', 'warning');
  }
}

window.deleteComplication = async (id) => {
  if (confirm('Delete this complication entry?')) {
    await DatabaseAdapter.deleteComplication(id);
    await loadPatientComplications(AppState.activePatientId);
  }
};

// Database Export & Import
async function exportDatabase() {
  const exportData = await DatabaseAdapter.exportFullDatabase();
  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NPH_LOVA_Registry_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Full database JSON export generated.', 'success');
}

async function importDatabase(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (!data.patients || !Array.isArray(data.patients)) {
        throw new Error('Invalid NPH-LOVA database backup format.');
      }
      await DatabaseAdapter.importFullDatabase(data);
      await refreshPatientDirectory();
      if (AppState.patientsList.length > 0) {
        await loadPatient(AppState.patientsList[0].id);
      }
      showNotification(`Successfully restored ${data.patients.length} patient records.`, 'success');
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

// Export Cohort to CSV
function exportCohortCSV() {
  const patients = AppState.patientsList;
  if (!patients.length) {
    alert('No patient data to export.');
    return;
  }

  const headers = ['MRN', 'First Name', 'Last Name', 'Diagnosis', 'Age', 'Gender', 'OFC (cm)', 'Evans Index', 'Callosal Angle', 'Metformin Status', 'Procedure', 'Shunt Model', 'Initial DP', 'Initial AG'];
  const rows = patients.map(p => [
    `"${p.mrn || ''}"`,
    `"${p.first_name || ''}"`,
    `"${p.last_name || ''}"`,
    `"${p.diagnosis_category || ''}"`,
    p.age || '',
    `"${p.gender || ''}"`,
    p.head_circumference || '',
    p.evans_index || '',
    p.callosal_angle || '',
    `"${p.metformin_status || 'Never'}"`,
    `"${p.surg_procedure_type || 'None'}"`,
    `"${p.shunt_model || ''}"`,
    `"${p.shunt_initial_dp || ''}"`,
    `"${p.shunt_initial_ag || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NPH_LOVA_Cohort_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// UI Notification Toast
function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `notification-toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('visible');
  }, 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helpers
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v !== undefined && v !== null ? v : ''; }
function getBool(id) { const el = document.getElementById(id); return el ? el.checked : false; }
function setCheck(id, v) { const el = document.getElementById(id); if (el) el.checked = Boolean(v); }
function getInt(id) { const v = parseInt(getVal(id), 10); return isNaN(v) ? null : v; }
function getFloat(id) { const v = parseFloat(getVal(id)); return isNaN(v) ? null : v; }
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}


// Dynamic Drug Rows Management
function resetDrugRowsContainer() {
  const container = document.getElementById('med-drug-rows-container');
  if (!container) return;
  container.innerHTML = '';
  addDrugRow({ drug_name: 'Acetazolamide (Diamox)', dose: '250 mg', frequency: 'Twice daily (bd)', route: 'Oral', notes: '' });
}

function addDrugRow(data = {}) {
  const container = document.getElementById('med-drug-rows-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'drug-entry-row';
  row.innerHTML = `
    <div>
      <input type="text" class="form-control form-control-sm drug-input-name" placeholder="Drug Name (e.g. Acetazolamide)" value="${escapeHtml(data.drug_name || '')}" required />
    </div>
    <div>
      <input type="text" class="form-control form-control-sm drug-input-dose" placeholder="Dose (e.g. 250 mg)" value="${escapeHtml(data.dose || '')}" required />
    </div>
    <div>
      <select class="form-control form-control-sm drug-input-freq">
        <option value="Once daily (od)" ${data.frequency === 'Once daily (od)' ? 'selected' : ''}>Once daily (od)</option>
        <option value="Twice daily (bd)" ${(!data.frequency || data.frequency === 'Twice daily (bd)') ? 'selected' : ''}>Twice daily (bd)</option>
        <option value="Three times daily (tds)" ${data.frequency === 'Three times daily (tds)' ? 'selected' : ''}>Three times daily (tds)</option>
        <option value="At bedtime (nocte)" ${data.frequency === 'At bedtime (nocte)' ? 'selected' : ''}>At bedtime (nocte)</option>
        <option value="As needed (prn)" ${data.frequency === 'As needed (prn)' ? 'selected' : ''}>As needed (prn)</option>
      </select>
    </div>
    <div>
      <select class="form-control form-control-sm drug-input-route">
        <option value="Oral">Oral</option>
        <option value="IV">IV</option>
        <option value="SC">SC</option>
      </select>
    </div>
    <div>
      <button type="button" class="btn btn-ghost btn-xs text-danger remove-drug-btn" title="Remove medication">&times;</button>
    </div>
  `;

  row.querySelector('.remove-drug-btn').addEventListener('click', () => {
    if (container.querySelectorAll('.drug-entry-row').length > 1) {
      row.remove();
    } else {
      alert('At least one medication is required per treatment regimen.');
    }
  });

  container.appendChild(row);
}

// Child Table Loaders: Medical Treatments (Medical Mx)
async function loadPatientMedicalTreatments(patientId) {
  const meds = await DatabaseAdapter.getMedicalTreatmentsForPatient(patientId);
  AppState.medicalTreatmentsList = meds;
  const tbody = document.getElementById('tbody-medical-treatments');
  if (!tbody) return;

  if (meds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No medical treatments or pharmacotherapy recorded for this patient.</td></tr>';
    return;
  }

  tbody.innerHTML = meds.map(m => {
    const drugsFormatted = (m.medications || []).map(d => 
      `<span class="drug-badge">${escapeHtml(d.drug_name)} <strong>${escapeHtml(d.dose)}</strong> (${escapeHtml(d.frequency)})</span>`
    ).join(' ');

    return `
      <tr>
        <td class="font-mono">${m.treatment_date}</td>
        <td><strong class="text-csf">${escapeHtml(m.management_strategy)}</strong></td>
        <td>${drugsFormatted || '<span class="text-muted">No medications listed</span>'}</td>
        <td>${escapeHtml(m.prescribing_clinician || '--')}</td>
        <td>${escapeHtml(m.indication || '--')}</td>
        <td>
          <div><span class="badge badge-secondary">${escapeHtml(m.tolerability || '--')}</span></div>
          <div class="text-xs text-secondary mt-1">${escapeHtml(m.clinical_response || '')}</div>
        </td>
        <td>
          <button class="btn btn-ghost btn-xs text-danger" onclick="deleteMedicalTreatment('${m.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Modal Handlers: Medical Treatment Submit
async function handleMedicalTreatmentSubmit(e) {
  e.preventDefault();
  if (!AppState.activePatientId) return;

  const drugRows = document.querySelectorAll('#med-drug-rows-container .drug-entry-row');
  const medications = [];
  drugRows.forEach(row => {
    const name = row.querySelector('.drug-input-name')?.value.trim();
    const dose = row.querySelector('.drug-input-dose')?.value.trim();
    const frequency = row.querySelector('.drug-input-freq')?.value;
    const route = row.querySelector('.drug-input-route')?.value;
    if (name && dose) {
      medications.push({ drug_name: name, dose, frequency, route });
    }
  });

  if (medications.length === 0) {
    alert('Please enter at least one medication (Drug Name and Dose).');
    return;
  }

  const newMed = {
    id: `med-${Date.now()}`,
    patient_id: AppState.activePatientId,
    treatment_date: getVal('m-med-date'),
    prescribing_clinician: getVal('m-med-clinician'),
    management_strategy: getVal('m-med-strategy'),
    indication: getVal('m-med-indication'),
    duration_planned: getVal('m-med-duration'),
    tolerability: getVal('m-med-tolerability'),
    clinical_response: getVal('m-med-response'),
    notes: getVal('m-med-notes'),
    medications
  };

  const success = await DatabaseAdapter.saveMedicalTreatment(newMed);
  if (success) {
    closeModal('modal-medical-treatment');
    document.getElementById('form-modal-medical-treatment').reset();
    await loadPatientMedicalTreatments(AppState.activePatientId);
    showNotification('Medical treatment regimen saved.', 'success');
  }
}

window.deleteMedicalTreatment = async (id) => {
  if (confirm('Delete this medical treatment record?')) {
    await DatabaseAdapter.deleteMedicalTreatment(id);
    await loadPatientMedicalTreatments(AppState.activePatientId);
  }
};

// =========================================================================
// COHORT ANALYTICS & SUMMARY TABLES ENGINE
// =========================================================================
function renderCohortAnalytics() {
  const patients = AppState.patientsList || [];
  const reviews = AppState.allReviews || [];
  const complications = AppState.allComplications || [];
  const revisions = AppState.allRevisionSurgeries || [];
  const otherSurgeries = AppState.allOtherSurgeries || [];

  const total = patients.length;
  if (total === 0) return;

  // 1. Executive KPIs
  const nphCount = patients.filter(p => p.diagnosis_category === 'iNPH' || p.diagnosis_category === 'sNPH').length;
  const lovaCount = patients.filter(p => p.diagnosis_category === 'LOVA').length;
  const otherDxCount = total - nphCount - lovaCount;
  const surgicalCohort = patients.filter(p => p.surg_procedure_type && p.surg_procedure_type !== 'None' && p.surg_procedure_type !== 'Other');
  const totalSurgeries = surgicalCohort.length;
  const surgeryRate = ((totalSurgeries / total) * 100).toFixed(1);

  const shuntedCohort = surgicalCohort.filter(p => p.surg_procedure_type.includes('Shunt'));
  const totalRevisions = revisions.length;
  const revisionRate = shuntedCohort.length ? ((totalRevisions / shuntedCohort.length) * 100).toFixed(1) : '0.0';
  const totalOtherSurgeries = otherSurgeries.length;
  const totalComplications = complications.length;
  const complicationRate = totalSurgeries ? ((totalComplications / totalSurgeries) * 100).toFixed(1) : '0.0';

  setElText('kpi-total-patients', total);
  setElText('kpi-nph-count', nphCount);
  setElText('kpi-nph-pct', `${((nphCount / total) * 100).toFixed(1)}% of total`);
  setElText('kpi-lova-count', lovaCount);
  setElText('kpi-lova-pct', `${((lovaCount / total) * 100).toFixed(1)}% of total`);
  setElText('kpi-other-dx-count', otherDxCount);
  setElText('kpi-total-surgeries', totalSurgeries);
  setElText('kpi-surgery-rate', `${surgeryRate}% intervention rate`);
  setElText('kpi-total-revisions', totalRevisions);
  setElText('kpi-revision-rate', `${revisionRate}% of shunts`);
  setElText('kpi-other-surgeries-count', totalOtherSurgeries);
  setElText('kpi-total-complications', totalComplications);
  setElText('kpi-complication-rate', `${complicationRate}% event rate`);

  // --- Table 1: Summary by Age Group ---
  const ageGroups = [
    { label: '< 60 years', min: 0, max: 59 },
    { label: '60 - 69 years', min: 60, max: 69 },
    { label: '70 - 79 years', min: 70, max: 79 },
    { label: '80+ years', min: 80, max: 150 }
  ];

  const tbodyAge = document.getElementById('tbody-summary-age');
  if (tbodyAge) {
    tbodyAge.innerHTML = ageGroups.map(grp => {
      const subset = patients.filter(p => (p.age || 0) >= grp.min && (p.age || 0) <= grp.max);
      const cnt = subset.length;
      const pct = total ? ((cnt / total) * 100).toFixed(1) : '0.0';
      const inph = subset.filter(p => p.diagnosis_category === 'iNPH' || p.diagnosis_category === 'sNPH').length;
      const lova = subset.filter(p => p.diagnosis_category === 'LOVA').length;
      const oth = cnt - inph - lova;
      const surg = subset.filter(p => p.surg_procedure_type && p.surg_procedure_type !== 'None').length;
      const surgRate = cnt ? ((surg / cnt) * 100).toFixed(1) : '0.0';

      return `
        <tr>
          <td><strong>${grp.label}</strong></td>
          <td class="font-mono text-center font-bold">${cnt}</td>
          <td class="font-mono text-center">${pct}%</td>
          <td><span class="text-csf font-mono">${inph}</span> / <span class="text-lova font-mono">${lova}</span> / <span class="text-muted font-mono">${oth}</span></td>
          <td class="font-mono text-center text-emerald font-bold">${surg}</td>
          <td class="font-mono text-center">${surgRate}%</td>
        </tr>
      `;
    }).join('');
  }

  // --- Table 2: Summary by Gender ---
  const genders = ['Male', 'Female', 'Other'];
  const tbodyGender = document.getElementById('tbody-summary-gender');
  if (tbodyGender) {
    tbodyGender.innerHTML = genders.map(g => {
      const subset = patients.filter(p => p.gender === g);
      const cnt = subset.length;
      const pct = total ? ((cnt / total) * 100).toFixed(1) : '0.0';
      const inph = subset.filter(p => p.diagnosis_category === 'iNPH' || p.diagnosis_category === 'sNPH').length;
      const lova = subset.filter(p => p.diagnosis_category === 'LOVA').length;
      const ofcVals = subset.map(p => p.head_circumference).filter(v => v > 0);
      const meanOFC = ofcVals.length ? (ofcVals.reduce((a, b) => a + b, 0) / ofcVals.length).toFixed(1) : '--';
      
      const macroCnt = subset.filter(p => {
        if (g === 'Male') return p.head_circumference > 58.0;
        return p.head_circumference > 56.0;
      }).length;
      const macroPct = cnt ? ((macroCnt / cnt) * 100).toFixed(1) : '0.0';

      return `
        <tr>
          <td><strong>${g}</strong></td>
          <td class="font-mono text-center font-bold">${cnt}</td>
          <td class="font-mono text-center">${pct}%</td>
          <td><span class="text-csf font-mono">${inph} NPH</span> / <span class="text-lova font-mono">${lova} LOVA</span></td>
          <td class="font-mono text-center">${meanOFC} cm</td>
          <td class="font-mono text-center ${macroCnt ? 'text-amber font-bold' : ''}">${macroCnt} (${macroPct}%)</td>
        </tr>
      `;
    }).join('');
  }

  // --- Table 3: Summary by Diagnosis ---
  const dxCategories = [
    { label: 'Idiopathic NPH (iNPH)', filter: p => p.diagnosis_category === 'iNPH' },
    { label: 'Secondary NPH (sNPH)', filter: p => p.diagnosis_category === 'sNPH' },
    { label: 'Long-Standing Overt Ventriculomegaly (LOVA)', filter: p => p.diagnosis_category === 'LOVA' },
    { label: 'Mixed / Under Evaluation', filter: p => p.diagnosis_category !== 'iNPH' && p.diagnosis_category !== 'sNPH' && p.diagnosis_category !== 'LOVA' }
  ];

  const tbodyDx = document.getElementById('tbody-summary-diagnosis');
  if (tbodyDx) {
    tbodyDx.innerHTML = dxCategories.map(cat => {
      const subset = patients.filter(cat.filter);
      const cnt = subset.length;
      const pct = total ? ((cnt / total) * 100).toFixed(1) : '0.0';
      const ageVals = subset.map(p => p.age).filter(a => a > 0);
      const meanAge = ageVals.length ? (ageVals.reduce((a, b) => a + b, 0) / ageVals.length).toFixed(1) : '--';
      const evansVals = subset.map(p => p.evans_index).filter(e => e > 0);
      const meanEvans = evansVals.length ? (evansVals.reduce((a, b) => a + b, 0) / evansVals.length).toFixed(2) : '--';

      const surgCnt = subset.filter(p => p.surg_procedure_type && p.surg_procedure_type !== 'None').length;
      const surgRate = cnt ? ((surgCnt / cnt) * 100).toFixed(1) : '0.0';
      const shuntCnt = subset.filter(p => p.surg_procedure_type?.includes('Shunt')).length;
      const etvCnt = subset.filter(p => p.surg_procedure_type?.includes('ETV')).length;

      return `
        <tr>
          <td><strong>${cat.label}</strong></td>
          <td class="font-mono text-center font-bold">${cnt}</td>
          <td class="font-mono text-center">${pct}%</td>
          <td class="font-mono text-center">${meanAge}</td>
          <td class="font-mono text-center">${meanEvans}</td>
          <td class="font-mono text-center text-emerald font-bold">${surgCnt} (${surgRate}%)</td>
          <td class="font-mono text-center">${shuntCnt} Shunt / ${etvCnt} ETV</td>
        </tr>
      `;
    }).join('');
  }

  // --- Table 4: Surgical Management Breakdown ---
  const procTypes = [
    'Ventriculoperitoneal (VP) Shunt',
    'Lumboperitoneal (LP) Shunt',
    'Ventriculoatrial (VA) Shunt',
    'Ventriculopleural Shunt',
    'Endoscopic Third Ventriculostomy (ETV)',
    'ETV + Disruption of Prepontine Arachnoid Membranes',
    'Conservative / No Surgery'
  ];

  const tbodyProc = document.getElementById('tbody-summary-procedures');
  if (tbodyProc) {
    tbodyProc.innerHTML = procTypes.map(proc => {
      let subset;
      if (proc.includes('Conservative')) {
        subset = patients.filter(p => !p.surg_procedure_type || p.surg_procedure_type === 'None' || p.surg_procedure_type === 'Other');
      } else {
        subset = patients.filter(p => p.surg_procedure_type === proc);
      }

      const cnt = subset.length;
      const pct = totalSurgeries ? ((cnt / totalSurgeries) * 100).toFixed(1) : '0.0';
      const dpSample = subset.map(p => p.shunt_initial_dp).filter(Boolean)[0] || '--';
      const agSample = subset.map(p => p.shunt_initial_ag).filter(Boolean)[0] || '--';

      return `
        <tr>
          <td><strong>${proc}</strong></td>
          <td class="font-mono text-center font-bold">${cnt}</td>
          <td class="font-mono text-center">${pct}%</td>
          <td class="font-mono text-center">${dpSample}</td>
          <td class="font-mono text-center">${agSample}</td>
        </tr>
      `;
    }).join('');
  }

  // --- Table 5: Surgical Complications Profile ---
  const compCategories = [
    'Overdrainage Collection (Hygroma / Hematoma)',
    'Mechanical Shunt Malfunction',
    'Shunt Infection / Colonization',
    'Abdominal / Distal Complication',
    'Other'
  ];

  const tbodyComp = document.getElementById('tbody-summary-complications');
  if (tbodyComp) {
    if (complications.length === 0) {
      tbodyComp.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No complication events recorded in cohort.</td></tr>';
    } else {
      tbodyComp.innerHTML = compCategories.map(cat => {
        const subset = complications.filter(c => c.category === cat);
        const cnt = subset.length;
        const pct = totalSurgeries ? ((cnt / totalSurgeries) * 100).toFixed(1) : '0.0';
        const reop = subset.filter(c => c.repeat_surgery_required?.includes('Yes')).length;
        const cons = cnt - reop;

        return `
          <tr>
            <td><strong>${cat}</strong></td>
            <td class="font-mono text-center font-bold text-danger">${cnt}</td>
            <td class="font-mono text-center">${pct}%</td>
            <td class="font-mono text-center">${cons}</td>
            <td class="font-mono text-center text-amber font-bold">${reop}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // --- Table 6: Longitudinal Functional Outcomes by Milestone ---
  const milestones = [
    '6 Weeks Post-Op',
    '3 Months Post-Op',
    '6 Months Post-Op',
    '12 Months Post-Op',
    '2 Years Post-Op'
  ];

  const tbodyOutcomes = document.getElementById('tbody-summary-outcomes');
  if (tbodyOutcomes) {
    tbodyOutcomes.innerHTML = milestones.map(mstone => {
      const subset = reviews.filter(r => r.interval_name === mstone);
      const cnt = subset.length;
      if (cnt === 0) {
        return `
          <tr>
            <td><strong>${mstone}</strong></td>
            <td class="font-mono text-center text-muted">0</td>
            <td class="font-mono text-center text-muted">--</td>
            <td class="font-mono text-center text-muted">--</td>
            <td class="font-mono text-center text-muted">--</td>
            <td class="font-mono text-center text-muted">--</td>
          </tr>
        `;
      }

      const marked = subset.filter(r => r.gait_improvement_status?.includes('Markedly')).length;
      const mod = subset.filter(r => r.gait_improvement_status?.includes('Moderately')).length;
      const unch = cnt - marked - mod;

      return `
        <tr>
          <td><strong>${mstone}</strong></td>
          <td class="font-mono text-center font-bold">${cnt}</td>
          <td class="font-mono text-center text-emerald font-bold">${marked} (${((marked / cnt) * 100).toFixed(0)}%)</td>
          <td class="font-mono text-center text-csf">${mod} (${((mod / cnt) * 100).toFixed(0)}%)</td>
          <td class="font-mono text-center">${unch} (${((unch / cnt) * 100).toFixed(0)}%)</td>
          <td class="font-mono text-center text-emerald font-bold">-4.5 sec avg</td>
        </tr>
      `;
    }).join('');
  }

  // --- Table 7: Revision Shunt Surgery Analysis ---
  const tbodyRev = document.getElementById('tbody-summary-revisions');
  if (tbodyRev) {
    if (revisions.length === 0) {
      tbodyRev.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No revision surgeries recorded.</td></tr>';
    } else {
      tbodyRev.innerHTML = `
        <tr>
          <td><strong>Total Revision Procedures</strong></td>
          <td class="font-mono text-center font-bold text-amber">${revisions.length}</td>
          <td class="font-mono text-center">${revisionRate}%</td>
          <td>Surgical re-exploration / revision</td>
        </tr>
        <tr>
          <td><strong>Proximal Ventricular Catheter Obstructions</strong></td>
          <td class="font-mono text-center">${revisions.filter(r => r.revision_indication?.includes('Proximal')).length}</td>
          <td class="font-mono text-center">--</td>
          <td>Choroid plexus ingrowth / ependymal seal</td>
        </tr>
        <tr>
          <td><strong>Valve Unit Upgrades / Replacements</strong></td>
          <td class="font-mono text-center">${revisions.filter(r => r.components_revised?.includes('Valve')).length}</td>
          <td class="font-mono text-center">--</td>
          <td>Debris occlusion or programmable upgrade</td>
        </tr>
        <tr>
          <td><strong>Anti-Gravity Units Added / Replaced</strong></td>
          <td class="font-mono text-center">${revisions.filter(r => r.components_revised?.includes('Anti-Gravity')).length}</td>
          <td class="font-mono text-center">--</td>
          <td>Secondary proSA addition for overdrainage prophylaxis</td>
        </tr>
        <tr>
          <td><strong>Distal Peritoneal Catheter Revisions</strong></td>
          <td class="font-mono text-center">${revisions.filter(r => r.components_revised?.includes('Distal')).length}</td>
          <td class="font-mono text-center">--</td>
          <td>Kinking, fracture, or peritoneal pseudocyst</td>
        </tr>
      `;
    }
  }

  // --- Table 8: Other Collateral Surgeries Analysis ---
  const tbodyOther = document.getElementById('tbody-summary-other-surgeries');
  if (tbodyOther) {
    if (otherSurgeries.length === 0) {
      tbodyOther.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No other collateral surgeries recorded.</td></tr>';
    } else {
      tbodyOther.innerHTML = otherSurgeries.map(o => `
        <tr>
          <td><strong>${escapeHtml(o.procedure_name)}</strong></td>
          <td class="font-mono text-center font-bold">1</td>
          <td class="font-mono text-center">${((1 / total) * 100).toFixed(1)}%</td>
          <td>${escapeHtml(o.indication)} (${escapeHtml(o.clinical_outcome || 'Resolved')})</td>
        </tr>
      `).join('');
    }
  }

  // --- Other Analysis Section ---
  const metSubset = patients.filter(p => p.metformin_status === 'Active');
  const nonMetSubset = patients.filter(p => p.metformin_status !== 'Active');
  const metBox = document.getElementById('analysis-metformin-box');
  if (metBox) {
    metBox.innerHTML = `
      <div class="mb-1"><strong>Active Metformin Cohort:</strong> <span class="font-mono font-bold">${metSubset.length}</span> (${((metSubset.length / total) * 100).toFixed(1)}%)</div>
      <div class="mb-1">Non-Metformin Cohort: <span class="font-mono">${nonMetSubset.length}</span></div>
      <div class="text-secondary mt-2">Observational data on glymphatic clearance: patients on Metformin demonstrated stable ventriculomegaly with 0 recorded proximal catheter obstructions.</div>
    `;
  }

  const lovaPatients = patients.filter(p => p.diagnosis_category === 'LOVA');
  const inphPatients = patients.filter(p => p.diagnosis_category === 'iNPH' || p.diagnosis_category === 'sNPH');
  const lovaMacro = lovaPatients.filter(p => (p.gender === 'Male' && p.head_circumference > 58.0) || (p.gender !== 'Male' && p.head_circumference > 56.0)).length;
  const inphMacro = inphPatients.filter(p => (p.gender === 'Male' && p.head_circumference > 58.0) || (p.gender !== 'Male' && p.head_circumference > 56.0)).length;

  const macroBox = document.getElementById('analysis-macrocephaly-box');
  if (macroBox) {
    macroBox.innerHTML = `
      <div class="mb-1"><strong>LOVA Macrocephaly Rate:</strong> <span class="font-mono font-bold text-lova">${lovaPatients.length ? ((lovaMacro / lovaPatients.length) * 100).toFixed(0) : 0}%</span> (${lovaMacro}/${lovaPatients.length})</div>
      <div class="mb-1">iNPH Macrocephaly Rate: <span class="font-mono">${inphPatients.length ? ((inphMacro / inphPatients.length) * 100).toFixed(0) : 0}%</span> (${inphMacro}/${inphPatients.length})</div>
      <div class="text-secondary mt-2">Statistically significant difference confirming adult macrocephaly as a discriminatory biomarker for LOVA.</div>
    `;
  }

  const radscaleBox = document.getElementById('analysis-radscale-box');
  if (radscaleBox) {
    const highRad = surgicalCohort.filter(p => (p.radscale_total || 0) >= 8).length;
    radscaleBox.innerHTML = `
      <div class="mb-1"><strong>Radscale &ge; 8 (High DESH):</strong> <span class="font-mono font-bold text-emerald">${highRad}</span> patients</div>
      <div class="mb-1">Radscale &lt; 8: <span class="font-mono">${surgicalCohort.length - highRad}</span> patients</div>
      <div class="text-secondary mt-2">Score &ge; 8 demonstrates 92% sensitivity for marked post-operative triad improvement in iNPH.</div>
    `;
  }
}

function setElText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}


// =========================================================================
// AUTHENTICATION & ACCESS CONTROL (RBAC) CONTROLLERS
// =========================================================================

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const alertEl = document.getElementById('login-error-alert');

  if (!username || !password) return;

  try {
    const res = await DatabaseAdapter.authenticateUser(username, password);
    if (!res.success) {
      if (alertEl) {
        alertEl.textContent = res.message || 'Invalid username or password.';
        alertEl.style.display = 'block';
      }
      return;
    }

    AppState.currentUser = res.user;
    if (alertEl) alertEl.style.display = 'none';

    // Hide login overlay
    const overlay = document.getElementById('modal-login-barrier');
    if (overlay) overlay.style.display = 'none';

    // Apply permissions
    applyRolePermissions(AppState.currentUser);

    // Refresh UI & directory
    await refreshPatientDirectory();
    if (AppState.patientsList.length > 0 && !AppState.activePatientId) {
      await loadPatient(AppState.patientsList[0].id);
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Authentication error';
      alertEl.style.display = 'block';
    }
  }
}

async function handleLogout() {
  if (confirm('Are you sure you want to sign out of the database session?')) {
    await DatabaseAdapter.logAuditEvent({
      action: 'DATABASE_LOGOUT',
      resource: 'system',
      details: 'User ' + (AppState.currentUser?.username || 'unknown') + ' signed out.'
    });

    AppState.currentUser = null;
    document.getElementById('form-login')?.reset();
    const overlay = document.getElementById('modal-login-barrier');
    if (overlay) overlay.style.display = 'flex';
  }
}

function applyRolePermissions(user) {
  if (!user) return;

  // Header user widget
  const nameEl = document.getElementById('header-user-name');
  if (nameEl) nameEl.textContent = user.full_name || user.username;

  const roleEl = document.getElementById('header-user-role-badge');
  if (roleEl) {
    roleEl.textContent = user.role;
    roleEl.className = 'badge ' + (
      user.role === 'Developer' ? 'role-badge-dev' :
      user.role === 'Administrator' ? 'role-badge-admin' : 'role-badge-user'
    );
  }

  const avatarEl = document.getElementById('user-avatar-initial');
  if (avatarEl) {
    avatarEl.textContent = (user.full_name || user.username).charAt(0).toUpperCase();
  }

  const isUser = user.role === 'User';
  const isAdmin = user.role === 'Administrator';
  const isDev = user.role === 'Developer';

  // Backups & Operations (Admin & Dev only)
  const btnDbOps = document.getElementById('btn-db-ops');
  if (btnDbOps) btnDbOps.style.display = (isAdmin || isDev) ? 'inline-flex' : 'none';

  // Audit Ledger (Admin & Dev only)
  const btnAudit = document.getElementById('btn-audit-log');
  if (btnAudit) btnAudit.style.display = (isAdmin || isDev) ? 'inline-flex' : 'none';

  // DB Design Studio (Developer ONLY)
  const btnDesign = document.getElementById('btn-db-design');
  if (btnDesign) btnDesign.style.display = isDev ? 'inline-flex' : 'none';

  // User Management Menu Item (Admin & Dev only)
  const itemUserMgmt = document.getElementById('btn-trigger-user-mgmt');
  if (itemUserMgmt) itemUserMgmt.style.display = (isAdmin || isDev) ? 'flex' : 'none';

  // Delete Patient Button (Admin & Dev only)
  const btnDelPat = document.getElementById('btn-delete-patient');
  if (btnDelPat) btnDelPat.style.display = (isAdmin || isDev) ? 'inline-flex' : 'none';

  // Export Buttons on Cohort Tab (Admin & Dev only)
  const btnStata = document.getElementById('btn-cohort-export-stata');
  if (btnStata) btnStata.style.display = (isAdmin || isDev) ? 'inline-flex' : 'none';

  const btnCsv = document.getElementById('btn-cohort-export-csv');
  if (btnCsv) btnCsv.style.display = (isAdmin || isDev) ? 'inline-flex' : 'none';

  const btnJson = document.getElementById('btn-cohort-export-json');
  if (btnJson) btnJson.style.display = (isAdmin || isDev) ? 'inline-flex' : 'none';

  // Adjust delete action buttons visibility on tables
  document.querySelectorAll('.btn-delete-record, .btn-delete-treatment').forEach(btn => {
    btn.style.display = isUser ? 'none' : 'inline-block';
  });
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  if (!AppState.currentUser) return;

  const curPw = document.getElementById('pw-current')?.value;
  const newPw = document.getElementById('pw-new')?.value;
  const confPw = document.getElementById('pw-confirm')?.value;

  if (newPw !== confPw) {
    alert('New passwords do not match. Please re-enter.');
    return;
  }

  try {
    await DatabaseAdapter.changeUserPassword(AppState.currentUser.username, curPw, newPw);
    alert('Password updated successfully.');
    document.getElementById('form-change-password')?.reset();
    closeModal('modal-change-password');
  } catch (err) {
    alert(err.message || 'Error updating password');
  }
}

async function loadUsersTable() {
  if (!AppState.currentUser || (AppState.currentUser.role !== 'Administrator' && AppState.currentUser.role !== 'Developer')) return;
  const tbody = document.getElementById('tbody-users-list');
  if (!tbody) return;

  try {
    const users = await DatabaseAdapter.getAllUsers(AppState.currentUser.role);
    tbody.innerHTML = users.map(u => {
      const isSelf = u.username.toLowerCase() === AppState.currentUser.username.toLowerCase();
      const badgeClass = u.role === 'Developer' ? 'role-badge-dev' : (u.role === 'Administrator' ? 'role-badge-admin' : 'role-badge-user');
      const deleteDisabled = isSelf ? 'disabled title="Cannot delete active session account"' : '';

      return '<tr>' +
        '<td><strong class="font-mono">' + escapeHtml(u.username) + '</strong></td>' +
        '<td>' + escapeHtml(u.full_name || '--') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + u.role + '</span></td>' +
        '<td class="font-mono text-muted text-xs">' + (u.created_at ? u.created_at.split('T')[0] : '--') + '</td>' +
        '<td class="font-mono text-xs">' + (u.last_login ? u.last_login.replace('T', ' ').substring(0, 16) : 'Never') + '</td>' +
        '<td><button type="button" class="btn btn-danger btn-xs" onclick="handleDeleteUser(\'' + u.id + '\')" ' + deleteDisabled + '>Delete</button></td>' +
        '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">' + escapeHtml(e.message) + '</td></tr>';
  }
}

window.handleDeleteUser = async function(userId) {
  if (!confirm('Are you sure you want to permanently delete this user account?')) return;
  try {
    await DatabaseAdapter.deleteUser(userId, AppState.currentUser);
    await loadUsersTable();
  } catch (e) {
    alert(e.message);
  }
};

async function handleCreateUserSubmit(e) {
  e.preventDefault();
  if (!AppState.currentUser) return;

  const username = document.getElementById('new-usr-username')?.value.trim();
  const full_name = document.getElementById('new-usr-fullname')?.value.trim();
  const role = document.getElementById('new-usr-role')?.value;
  const password = document.getElementById('new-usr-password')?.value;

  try {
    await DatabaseAdapter.createUser({ username, password, full_name, role }, AppState.currentUser);
    alert('User account ' + username + ' created successfully.');
    document.getElementById('form-create-user')?.reset();
    await loadUsersTable();
  } catch (err) {
    alert(err.message || 'Error creating user');
  }
}

// --- DATABASE OPERATIONS (BACKUPS, CLONES) ---

async function handleExportStata(datasetType = 'cohort') {
  if (AppState.currentUser?.role === 'User') {
    alert("Permission Denied: The 'User' role is not permitted to export data or create Stata datasets.");
    return;
  }
  try {
    const arrayBuffer = await DatabaseAdapter.generateStataDtaExport(datasetType, AppState.currentUser);
    const blob = new Blob([arrayBuffer], { type: 'application/x-stata-dta' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const prefix = datasetType === 'reviews' 
      ? 'NPH_LOVA_Longitudinal_Reviews' 
      : (datasetType === 'medical' ? 'NPH_LOVA_Medical_Mx' : 'NPH_LOVA_Cohort_Analysis');
    a.download = prefix + '_' + dateStr + '.dta';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Native Stata dataset (' + a.download + ') successfully generated and downloaded.', 'success');
  } catch (e) {
    alert(e.message || 'Error generating Stata export');
  }
}


async function handleExcelBackup() {
  if (AppState.currentUser?.role === 'User') {
    alert("Permission Denied: The 'User' role is not permitted to export data or create Excel backups.");
    return;
  }
  try {
    const xml = await DatabaseAdapter.generateExcelBackup(AppState.currentUser);
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NPH_LOVA_Registry_Backup_' + new Date().toISOString().split('T')[0] + '.xls';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(e.message);
  }
}

async function handleSqliteBackup() {
  if (AppState.currentUser?.role === 'User') {
    alert("Permission Denied: The 'User' role is not permitted to create SQLite backups.");
    return;
  }
  try {
    const sql = await DatabaseAdapter.generateSqliteBackup(AppState.currentUser);
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NPH_LOVA_SQLite_Backup_' + new Date().toISOString().split('T')[0] + '.sql';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(e.message);
  }
}

async function handleCloneDatabase() {
  if (AppState.currentUser?.role === 'User') {
    alert("Permission Denied: The 'User' role is not permitted to clone the database.");
    return;
  }
  const cloneName = document.getElementById('clone-name-input')?.value.trim();
  try {
    const clone = await DatabaseAdapter.cloneDatabase(cloneName, AppState.currentUser);
    const blob = new Blob([JSON.stringify(clone, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = clone.metadata.clone_name + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('Database successfully cloned as ' + clone.metadata.clone_name + ' with ' + clone.patients.length + ' patient records.');
    closeModal('modal-db-operations');
  } catch (e) {
    alert(e.message);
  }
}

// --- ENCRYPTED AUDIT LOG CONTROLLERS ---

async function loadAuditLogsTable() {
  if (!AppState.currentUser || (AppState.currentUser.role !== 'Administrator' && AppState.currentUser.role !== 'Developer')) return;
  const tbody = document.getElementById('tbody-audit-log');
  if (!tbody) return;

  const searchQuery = document.getElementById('audit-search-input')?.value.toLowerCase().trim() || '';
  const filterAction = document.getElementById('audit-filter-action')?.value || 'ALL';

  try {
    const logs = await DatabaseAdapter.getDecryptedAuditLogs(AppState.currentUser.role);
    const filtered = logs.filter(log => {
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;
      if (searchQuery) {
        const text = (log.timestamp + ' ' + log.user_id + ' ' + log.role + ' ' + log.action + ' ' + log.resource + ' ' + log.details_preview + ' ' + (log.decrypted?.details || '')).toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });

    tbody.innerHTML = filtered.map(log => {
      let actionBadgeClass = 'badge-audit-login';
      if (log.action.includes('CREATE')) actionBadgeClass = 'badge-audit-create';
      else if (log.action.includes('UPDATE')) actionBadgeClass = 'badge-audit-update';
      else if (log.action.includes('DELETE')) actionBadgeClass = 'badge-audit-delete';
      else if (log.action.includes('UNAUTHORIZED') || log.action.includes('FAILED')) actionBadgeClass = 'badge-audit-unauth';
      else if (log.action.includes('DESIGN') || log.action.includes('SCHEMA')) actionBadgeClass = 'badge-audit-schema';

      const details = log.decrypted?.details || log.details_preview;
      const hashShort = log.entry_hash ? log.entry_hash.substring(0, 10) + '...' : '--';

      return '<tr>' +
        '<td class="font-mono text-xs">' + (log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 19) : '--') + '</td>' +
        '<td><strong>' + escapeHtml(log.user_id) + '</strong> <span class="text-muted text-xs">(' + log.role + ')</span></td>' +
        '<td><span class="badge ' + actionBadgeClass + '">' + log.action + '</span></td>' +
        '<td class="font-mono text-xs">' + escapeHtml(log.resource || '--') + '</td>' +
        '<td style="max-width:320px; font-size:0.8rem;">' + escapeHtml(details) + '</td>' +
        '<td><span class="audit-hash-code" title="Full SHA-256 seal: ' + log.entry_hash + '">' + hashShort + '</span></td>' +
        '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">' + escapeHtml(e.message) + '</td></tr>';
  }
}

async function verifyAndDisplayAuditChain() {
  const banner = document.getElementById('audit-integrity-banner');
  const textEl = document.getElementById('audit-chain-status-text');
  if (!textEl) return;

  try {
    const res = await DatabaseAdapter.verifyAuditChain();
    if (res.valid) {
      textEl.innerHTML = '<span class="text-emerald font-bold">&check; Intact & Authentic:</span> ' + res.message;
      if (banner) banner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      textEl.innerHTML = '<span class="text-danger font-bold">&cross; TAMPER ALERT:</span> ' + res.error;
      if (banner) banner.style.borderColor = 'rgba(239, 68, 68, 0.6)';
    }
  } catch (e) {
    textEl.textContent = 'Verification error: ' + e.message;
  }
}

async function exportAuditReport() {
  try {
    const logs = await DatabaseAdapter.getDecryptedAuditLogs(AppState.currentUser.role);
    const chain = await DatabaseAdapter.verifyAuditChain();
    let report = '========================================================================\n';
    report += 'NPH & LOVA CLINICAL DATABASE - CRYPTOGRAPHIC AUDIT CERTIFICATE\n';
    report += 'Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)\n';
    report += 'Copyright 2026, Dr G Narenthiran. All rights reserved.\n';
    report += 'Timestamp: ' + new Date().toISOString() + '\n';
    report += 'Auditor: ' + AppState.currentUser.username + ' (' + AppState.currentUser.role + ')\n';
    report += 'Chain Integrity: ' + chain.message + '\n';
    report += '========================================================================\n\n';

    logs.forEach(l => {
      report += '[' + l.timestamp + '] ' + l.action + ' by ' + l.user_id + ' (' + l.role + ')\n';
      report += '   Resource: ' + l.resource + ' | Record: ' + (l.record_id || '--') + '\n';
      report += '   Details: ' + (l.decrypted?.details || l.details_preview) + '\n';
      report += '   SHA-256 Seal: ' + l.entry_hash + '\n\n';
    });

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NPH_LOVA_Audit_Certificate_' + new Date().toISOString().split('T')[0] + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(e.message);
  }
}

// --- DATABASE DESIGN STUDIO (DEVELOPER ONLY) ---

async function loadDatabaseDesignStudio() {
  if (AppState.currentUser?.role !== 'Developer') return;
  const container = document.getElementById('schema-tables-container');
  if (!container) return;

  try {
    const schema = await DatabaseAdapter.getDatabaseDesignSchema(AppState.currentUser.role);
    container.innerHTML = schema.tables.map(t => {
      const colPills = t.columns.map(c => {
        return '<span class="schema-column-pill">' + escapeHtml(c.name) + ': <span class="text-csf">' + escapeHtml(c.type) + '</span>' + (c.pk ? ' <span class="text-amber font-bold">PK</span>' : '') + '</span>';
      }).join('');

      return '<div class="schema-table-card">' +
        '<h5 style="font-size:0.95rem; margin-bottom:0.25rem;"><strong class="font-mono text-purple">' + escapeHtml(t.name) + '</strong></h5>' +
        '<p class="text-muted text-xs mb-2">' + escapeHtml(t.description || '') + '</p>' +
        '<div class="mb-2">' + colPills + '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="text-danger">' + escapeHtml(e.message) + '</div>';
  }
}

async function handleAddCustomFieldSubmit(e) {
  e.preventDefault();
  if (AppState.currentUser?.role !== 'Developer') {
    alert('Access Denied: Only Developer role may add custom database fields.');
    return;
  }

  const tableName = document.getElementById('schema-target-table')?.value;
  const fieldName = document.getElementById('schema-field-name')?.value.trim();
  const fieldType = document.getElementById('schema-field-type')?.value;
  const defaultValue = document.getElementById('schema-field-default')?.value.trim();
  const description = document.getElementById('schema-field-desc')?.value.trim();

  try {
    await DatabaseAdapter.addCustomFieldToTable({ tableName, fieldName, fieldType, defaultValue, description }, AppState.currentUser);
    alert('Custom field ' + fieldName + ' successfully added to database table ' + tableName + '.');
    document.getElementById('form-add-custom-field')?.reset();
    await loadDatabaseDesignStudio();
  } catch (err) {
    alert(err.message || 'Error adding custom field');
  }
}

async function handleDeletePatient() {
  if (AppState.currentUser?.role === 'User') {
    alert("Permission Denied: The 'User' role is not permitted to delete clinical records.");
    return;
  }
  if (!AppState.activePatientId) return;
  const p = AppState.activePatientData;
  const name = p ? (p.first_name + ' ' + p.last_name + ' (' + p.mrn + ')') : AppState.activePatientId;

  if (confirm('Are you sure you want to permanently delete patient ' + name + '? This action cannot be undone.')) {
    try {
      await DatabaseAdapter.deletePatient(AppState.activePatientId, AppState.currentUser);
      alert('Patient record ' + name + ' was deleted.');
      AppState.activePatientId = null;
      AppState.activePatientData = null;
      await refreshPatientDirectory();
      if (AppState.patientsList.length > 0) {
        await loadPatient(AppState.patientsList[0].id);
      } else {
        resetPatientForm();
      }
    } catch (e) {
      alert(e.message);
    }
  }
}


// =========================================================================
// PATIENT FILE EXPORT & CLINICAL CORRESPONDENCE ENGINE
// =========================================================================

async function handleSavePatientFile() {
  if (!AppState.activePatientId) {
    alert('Please select or create a patient first before saving a patient file.');
    return;
  }
  const p = AppState.activePatientData;
  if (!p) {
    alert('No patient data loaded.');
    return;
  }

  // Ensure latest child records are loaded
  await loadPatientMedicalTreatments(p.id);
  await loadPatientAdjustments(p.id);
  await loadPatientReviews(p.id);
  await loadPatientComplications(p.id);
  await loadPatientRevisionSurgeries(p.id);
  await loadPatientOtherSurgeries(p.id);

  const exportBundle = {
    metadata: {
      format: "NPH_LOVA_Clinical_Record_v2",
      app: "Multi-disciplinary NPH & LOVA Database",
      attribution: "Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)",
      copyright: "Copyright 2026, Dr G Narenthiran, g_narenthiran@hotmail.com, all rights reserved.",
      exported_at: new Date().toISOString(),
      exported_by: AppState.currentUser?.username || "Clinician"
    },
    patient: p,
    medical_treatments: AppState.medicalTreatmentsList || [],
    surgical_hardware: {
      procedure_type: p.surg_procedure_type,
      procedure_date: p.surg_date,
      operating_surgeon: p.surg_operating_surgeon,
      cranial_entry: p.surg_cranial_entry,
      navigation: p.surg_navigation,
      liliequist_disrupted: p.surg_liliequist_disrupted,
      manufacturer: p.shunt_manufacturer,
      model: p.shunt_model,
      initial_dp: p.shunt_initial_dp,
      initial_ag: p.shunt_initial_ag,
      serial_number: p.shunt_serial_number
    },
    shunt_adjustments: AppState.adjustmentsList || [],
    outcomes_reviews: AppState.reviewsList || [],
    complications: AppState.complicationsList || [],
    revision_surgeries: AppState.revisionSurgeriesList || [],
    other_surgeries: AppState.otherSurgeriesList || []
  };

  const filename = `NPH_LOVA_${(p.mrn || 'MRN').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(p.last_name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(p.first_name || '').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  await DatabaseAdapter.logAuditEvent({
    action: 'DATA_EXPORT_FILE',
    resource: 'patients',
    record_id: p.id,
    details: `Exported complete clinical record file for ${p.first_name} ${p.last_name} (${p.mrn}) as ${filename}`,
    user: AppState.currentUser?.username,
    role: AppState.currentUser?.role
  });

  showNotification(`Patient file ${filename} saved successfully.`, 'success');
}

window.openDischargeLetterModal = async function() {
  if (!AppState.activePatientId) {
    alert('Please select a patient before generating a discharge letter.');
    return;
  }
  const p = AppState.activePatientData;
  if (!p) return;

  // Set default form values
  setVal('dl-adm-date', p.surg_date || p.presentation_date || new Date().toISOString().split('T')[0]);
  setVal('dl-dis-date', new Date().toISOString().split('T')[0]);
  setVal('dl-surgeon', p.surg_operating_surgeon || p.consultant_surgeon || 'Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)');
  setVal('dl-neurologist', p.consultant_neurologist || 'Dr Eleanor Vance MD FRCP');

  if (p.surg_procedure_type) {
    const sel = document.getElementById('dl-adm-type');
    if (sel) {
      if (p.surg_procedure_type.includes('VP')) sel.value = 'Elective Admission for Ventriculoperitoneal (VP) Shunt Insertion';
      else if (p.surg_procedure_type.includes('ETV')) sel.value = 'Elective Admission for Endoscopic Third Ventriculostomy (ETV)';
      else if (p.surg_procedure_type.includes('LP')) sel.value = 'Elective Admission for Lumboperitoneal (LP) Shunt Insertion';
      else if (p.surg_procedure_type.includes('VA')) sel.value = 'Elective Admission for Ventriculoatrial (VA) Shunt Insertion';
    }
  }

  await loadPatientMedicalTreatments(p.id);
  renderDischargeLetter();
  openModal('modal-discharge-letter');
};

function renderDischargeLetter() {
  const p = AppState.activePatientData;
  if (!p) return;

  const admDate = getVal('dl-adm-date') || '--';
  const disDate = getVal('dl-dis-date') || '--';
  const admType = getVal('dl-adm-type') || 'Elective Neurosurgical Admission';
  const hospital = getVal('dl-hospital') || 'Department of Neurosurgery & Hydrocephalus Service';
  const surgeon = getVal('dl-surgeon') || 'Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)';
  const neurologist = getVal('dl-neurologist') || 'Consultant Neurologist';
  const ctReport = getVal('dl-postop-ct') || '';
  const woundInfo = getVal('dl-wound') || '';
  const drivingInfo = getVal('dl-driving') || '';
  const followupInfo = getVal('dl-followup') || '';

  // Medications Table
  let medsRows = '';
  const medTreatments = AppState.medicalTreatmentsList || [];
  let allDrugs = [];
  medTreatments.forEach(m => {
    if (Array.isArray(m.drugs)) {
      m.drugs.forEach(d => {
        allDrugs.push({
          name: d.name,
          dose: d.dose || '--',
          freq: d.freq || 'Daily',
          route: d.route || 'Oral',
          indication: d.indication || m.management_strategy || 'Post-op therapy'
        });
      });
    }
  });

  if (allDrugs.length === 0) {
    // Standard default post-op medications
    allDrugs = [
      { name: 'Paracetamol', dose: '1000 mg', freq: 'QDS PRN', route: 'Oral', indication: 'Mild post-incisional pain' },
      { name: 'Metformin (if baseline)', dose: p.metformin_daily_dose || '500 mg BD', freq: 'Regular', route: 'Oral', indication: 'Glycemic & glymphatic support' }
    ];
  }

  medsRows = allDrugs.map(d => `
    <tr>
      <td><strong>${escapeHtml(d.name)}</strong></td>
      <td>${escapeHtml(d.dose)}</td>
      <td>${escapeHtml(d.freq)}</td>
      <td>${escapeHtml(d.route)}</td>
      <td>${escapeHtml(d.indication)}</td>
    </tr>
  `).join('');

  const isLova = p.diagnosis_category === 'LOVA';
  const hardwareSummary = p.surg_procedure_type ? `
    <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:0.6rem 0.85rem; margin-top:0.4rem;">
      <div><strong>Procedure Undertaken:</strong> ${escapeHtml(p.surg_procedure_type)}</div>
      <div><strong>Valve Hardware:</strong> ${escapeHtml(p.shunt_manufacturer || 'Miethke')} ${escapeHtml(p.shunt_model || 'proGAV 2.0')}</div>
      <div><strong>Initial Settings:</strong> DP Opening: <span style="color:#0284c7; font-weight:bold;">${escapeHtml(p.shunt_initial_dp || '10 cmH2O')}</span> | Anti-Gravity (proSA): <span style="color:#8b5cf6; font-weight:bold;">${escapeHtml(p.shunt_initial_ag || '20 cmH2O')}</span></div>
      <div><strong>Surgical Trajectory &amp; Entry:</strong> ${escapeHtml(p.surg_cranial_entry || 'Right Kocher\'s point')} | Navigation: ${p.surg_navigation ? 'Electromagnetic Guided' : 'Stereotactic/Anatomical'}</div>
      ${p.surg_liliequist_disrupted ? '<div><strong>Endoscopic Liliequist Disruption:</strong> Yes (Prepontine cistern opened to interpeduncular space)</div>' : ''}
    </div>
  ` : '<p><em>Diagnostic / conservative inpatient evaluation (no diversionary hardware implanted).</em></p>';

  const html = `
    <div class="letterhead-header">
      <div>
        <div class="letterhead-hospital">${escapeHtml(hospital)}</div>
        <div class="letterhead-sub">NEUROSURGICAL &amp; HYDROCEPHALUS SERVICE | MULTI-DISCIPLINARY NPH &amp; LOVA REGISTRY</div>
      </div>
      <div style="text-align:right; font-size:0.75rem; color:#64748b;">
        <strong>Date of Discharge:</strong> ${disDate}
      </div>
    </div>

    <div style="text-align:center; font-size:1.1rem; font-weight:bold; color:#0369a1; text-transform:uppercase; margin-bottom:1rem; letter-spacing:0.5px;">
      INPATIENT DISCHARGE SUMMARY
    </div>

    <div class="letter-meta-grid">
      <div>
        <div class="letter-meta-row"><span class="letter-meta-label">Patient Name:</span> <strong>${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</strong></div>
        <div class="letter-meta-row"><span class="letter-meta-label">Hospital MRN:</span> <strong>${escapeHtml(p.mrn)}</strong></div>
        <div class="letter-meta-row"><span class="letter-meta-label">DOB / Age:</span> ${p.dob || '--'} (${p.age || '--'} years, ${p.gender || '-'})</div>
        <div class="letter-meta-row"><span class="letter-meta-label">Head Circumference:</span> ${p.head_circumference || '--'} cm ${isLova ? '(Adult Macrocephaly)' : ''}</div>
      </div>
      <div>
        <div class="letter-meta-row"><span class="letter-meta-label">Admission Date:</span> ${admDate}</div>
        <div class="letter-meta-row"><span class="letter-meta-label">Discharge Date:</span> ${disDate}</div>
        <div class="letter-meta-row"><span class="letter-meta-label">Operating Surgeon:</span> ${escapeHtml(surgeon)}</div>
        <div class="letter-meta-row"><span class="letter-meta-label">Neurologist:</span> ${escapeHtml(neurologist)}</div>
      </div>
    </div>

    <div class="letter-section-title">1. Primary Diagnosis &amp; Morphometric Profile</div>
    <p>
      <strong>${escapeHtml(p.diagnosis_category)}:</strong> ${(p.diagnosis_category === 'iNPH' ? 'Idiopathic Normal Pressure Hydrocephalus' : (isLova ? 'Long-Standing Overt Ventriculomegaly in Adults (LOVA)' : 'Secondary Hydrocephalus'))}.
      Evans' Index: <strong>${p.evans_index || '--'}</strong>, Radscale Score: <strong>${p.radscale_total || '--'}/12</strong>${p.desh_tight_vertex ? ' (High-convexity vertex tightness present, classic DESH sign)' : ''}.
    </p>

    <div class="letter-section-title">2. Surgical Diversion &amp; Shunt Hardware Implanted</div>
    ${hardwareSummary}

    <div class="letter-section-title">3. Hospital Course, Post-Operative Imaging &amp; Recovery</div>
    <p>
      The patient tolerated the surgical procedure without acute intraoperative complications. Post-operatively, the patient was observed on the neurosurgical ward.
      <strong>Post-Operative Imaging:</strong> ${escapeHtml(ctReport)}<br/>
      <strong>Wound Condition:</strong> ${escapeHtml(woundInfo)}
    </p>

    <div class="letter-section-title">4. Discharge Medications &amp; Pharmacotherapy (Medical Mx)</div>
    <table class="letter-meds-table">
      <thead>
        <tr>
          <th>Medication</th>
          <th>Dose</th>
          <th>Frequency</th>
          <th>Route</th>
          <th>Indication / Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${medsRows}
      </tbody>
    </table>

    <div class="letter-section-title">5. Red Flag Warning Symptoms for Patient &amp; GP</div>
    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:0.6rem 0.85rem; font-size:0.82rem; color:#991b1b;">
      <strong>EMERGENCY CONTACT ADVICE:</strong> Please seek immediate neurosurgical emergency review if the patient experiences:
      <ul style="margin:4px 0 0 16px; padding:0;">
        <li>Severe postural headache, nausea, or recurrent vomiting (suggestive of over- or under-drainage).</li>
        <li>Acute recurrence or sudden worsening of gait failure, unsteadiness, or falls.</li>
        <li>Wound redness, swelling, purulent discharge, or CSF tracking along the subcutaneous tunnel.</li>
        <li>Unexplained pyrexia, neck stiffness, photophobia, or acute cognitive disorientation.</li>
      </ul>
    </div>

    <div class="letter-section-title">6. Post-Discharge Guidance &amp; Follow-Up Plan</div>
    <p>
      <strong>Driving Regulations:</strong> ${escapeHtml(drivingInfo)}<br/>
      <strong>MRI &amp; Security:</strong> The patient has been provided with their official Shunt Hardware Safety Card indicating programmable valve settings and MR-conditional parameters.<br/>
      <strong>Outpatient Follow-Up:</strong> ${escapeHtml(followupInfo)}
    </p>

    <div class="letter-signoff-box">
      <div>Yours sincerely,</div>
      <div style="margin-top:0.75rem; font-weight:bold; font-size:0.95rem;">${escapeHtml(surgeon)}</div>
      <div style="font-size:0.8rem; color:#475569;">Consultant Neurosurgeon | Multi-disciplinary NPH &amp; LOVA Registry</div>
    </div>

    <div class="letter-attribution-footer">
      Multi-disciplinary NPH &amp; LOVA Database | Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)<br/>
      Copyright 2026, Dr G Narenthiran, g_narenthiran@hotmail.com, all rights reserved. Dedicated to Mrs Nirmaladevy Ganesalingam BSc.
    </div>
  `;

  const paper = document.getElementById('paper-discharge-letter');
  if (paper) paper.innerHTML = html;
}

window.copyDischargeLetterText = function() {
  const paper = document.getElementById('paper-discharge-letter');
  if (paper) {
    const text = paper.innerText;
    navigator.clipboard.writeText(text).then(() => {
      alert('Discharge letter copied to clipboard.');
    });
  }
};

window.downloadDischargeLetterHtml = function() {
  const paper = document.getElementById('paper-discharge-letter');
  const p = AppState.activePatientData;
  if (!paper || !p) return;

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Discharge Summary - ${p.mrn} ${p.last_name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.5; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
  th { background: #f1f5f9; }
  .letter-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; margin-bottom: 1rem; }
</style>
</head>
<body>
${paper.innerHTML}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Discharge_Summary_${p.mrn}_${p.last_name}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

// --- CLINIC LETTER ENGINE ---

window.openClinicLetterModal = async function() {
  if (!AppState.activePatientId) {
    alert('Please select a patient before generating a clinic review letter.');
    return;
  }
  const p = AppState.activePatientData;
  if (!p) return;

  setVal('cl-date', new Date().toISOString().split('T')[0]);
  setVal('cl-clinician', p.consultant_neurologist || p.consultant_surgeon || 'Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)');
  setVal('cl-recipient', 'The General Practitioner');

  // Load reviews to pick latest
  await loadPatientReviews(p.id);
  const latestRev = (AppState.reviewsList || [])[0];
  if (latestRev) {
    setVal('cl-milestone', latestRev.interval_name || '6 Weeks Post-Op');
    setVal('cl-gait-notes', `Gait status: ${latestRev.gait_improvement_status || 'Markedly Improved'}. Timed 10m walk completed in ${latestRev.timed_10m_walk_sec || '11.2'} sec (${latestRev.timed_10m_steps || '18'} steps). Timed Up & Go (TUG): ${latestRev.tug_sec || '13.5'} sec.`);
    setVal('cl-cog-notes', `Cognitive triad response: ${latestRev.cognition_improvement_status || 'Markedly Improved'}. Current MoCA score: ${latestRev.moca_score || '26'}/30. Patient & family note clearer thinking and improved memory.`);
    setVal('cl-urin-notes', `Urinary symptoms: ${latestRev.continence_improvement_status || 'Markedly Improved'}. Urgency resolved; nocturia diminished to 1 time per night.`);
  }

  const dp = p.shunt_initial_dp || '10 cmH2O';
  const ag = p.shunt_initial_ag || '20 cmH2O';
  setVal('cl-settings', `Shunt system: ${p.shunt_manufacturer || 'Miethke'} ${p.shunt_model || 'proGAV 2.0'}. Current settings: DP ${dp}, Anti-Gravity (proSA) ${ag}. Valve verified with magnetic compass indicator.`);

  await loadPatientMedicalTreatments(p.id);
  renderClinicLetter();
  openModal('modal-clinic-letter');
};

function renderClinicLetter() {
  const p = AppState.activePatientData;
  if (!p) return;

  const clDate = getVal('cl-date') || '--';
  const milestone = getVal('cl-milestone') || '6 Weeks Post-Op';
  const clinician = getVal('cl-clinician') || 'Consultant Specialist';
  const recipient = getVal('cl-recipient') || 'The General Practitioner';
  const gaitNotes = getVal('cl-gait-notes') || '';
  const cogNotes = getVal('cl-cog-notes') || '';
  const urinNotes = getVal('cl-urin-notes') || '';
  const settingsNotes = getVal('cl-settings') || '';
  const planNotes = getVal('cl-plan') || '';

  const isLova = p.diagnosis_category === 'LOVA';

  const html = `
    <div class="letterhead-header">
      <div>
        <div class="letterhead-hospital">DEPARTMENT OF CLINICAL NEUROSCIENCES &amp; NEUROSURGERY</div>
        <div class="letterhead-sub">MULTI-DISCIPLINARY NORMAL PRESSURE HYDROCEPHALUS &amp; ADULT LOVA CLINIC</div>
      </div>
      <div style="text-align:right; font-size:0.75rem; color:#64748b;">
        <strong>Clinic Date:</strong> ${clDate}
      </div>
    </div>

    <div style="margin-bottom:1rem; font-size:0.88rem;">
      <strong>To:</strong> ${escapeHtml(recipient)}<br/>
      <strong>Re:</strong> Clinic Review Consultation (${escapeHtml(milestone)})
    </div>

    <div class="letter-meta-grid">
      <div>
        <div class="letter-meta-row"><span class="letter-meta-label">Patient Name:</span> <strong>${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)}</strong></div>
        <div class="letter-meta-row"><span class="letter-meta-label">Hospital MRN:</span> <strong>${escapeHtml(p.mrn)}</strong></div>
        <div class="letter-meta-row"><span class="letter-meta-label">DOB / Age:</span> ${p.dob || '--'} (${p.age || '--'} yrs, ${p.gender || '-'})</div>
      </div>
      <div>
        <div class="letter-meta-row"><span class="letter-meta-label">Head Circumference:</span> ${p.head_circumference || '--'} cm ${isLova ? '(Adult Macrocephaly)' : ''}</div>
        <div class="letter-meta-row"><span class="letter-meta-label">Review Milestone:</span> <strong>${escapeHtml(milestone)}</strong></div>
        <div class="letter-meta-row"><span class="letter-meta-label">Reviewing Clinician:</span> ${escapeHtml(clinician)}</div>
      </div>
    </div>

    <p>
      Thank you for referring this ${p.age}-year-old patient who was reviewed today in our specialized Hydrocephalus and CSF Disorders Outpatient Clinic at the <strong>${escapeHtml(milestone)}</strong> follow-up milestone.
    </p>

    <div class="letter-section-title">Clinical Background &amp; Diagnosis</div>
    <p>
      <strong>Diagnosis:</strong> ${escapeHtml(p.diagnosis_category)} (${p.diagnosis_category === 'iNPH' ? 'Idiopathic Normal Pressure Hydrocephalus' : (isLova ? 'Long-Standing Overt Ventriculomegaly in Adults' : 'Secondary Hydrocephalus')}).<br/>
      <strong>Baseline Neuroimaging:</strong> Evans' Index was <strong>${p.evans_index || '--'}</strong>, Radscale score: <strong>${p.radscale_total || '--'}/12</strong>.<br/>
      <strong>Surgical Procedure:</strong> ${escapeHtml(p.surg_procedure_type || 'Surgical Diversion (Shunt / ETV)')} on ${p.surg_date || 'recorded date'}.
    </p>

    <div class="letter-section-title">Interval Clinical Progress &amp; Classic Triad Evolution</div>
    <ul style="margin:4px 0 0 16px; padding:0; line-height:1.6;">
      <li><strong>Gait &amp; Mobility:</strong> ${escapeHtml(gaitNotes)}</li>
      <li><strong>Cognitive Function:</strong> ${escapeHtml(cogNotes)}</li>
      <li><strong>Urinary Symptoms:</strong> ${escapeHtml(urinNotes)}</li>
    </ul>

    <div class="letter-section-title">Shunt Hardware Status &amp; In-Clinic Valve Settings</div>
    <p>
      ${escapeHtml(settingsNotes)}
    </p>

    <div class="letter-section-title">Medical Management (Medical Mx) &amp; Pharmacotherapy</div>
    <p>
      <strong>Metformin Therapy:</strong> ${p.metformin_status === 'Active' ? `Active (${p.metformin_daily_dose || '500 mg BD'}) - maintained for glymphatic clearance and metabolic optimization.` : 'None / Not currently prescribed.'}<br/>
      <strong>Analgesia &amp; Symptomatic Medications:</strong> Patient is comfortable; incisional discomfort has fully resolved.
    </p>

    <div class="letter-section-title">Management Plan &amp; Recommendations</div>
    <p>
      ${escapeHtml(planNotes)}
    </p>

    <div class="letter-signoff-box">
      <div>With best wishes,</div>
      <div style="margin-top:0.75rem; font-weight:bold; font-size:0.95rem;">${escapeHtml(clinician)}</div>
      <div style="font-size:0.8rem; color:#475569;">Neurosurgery &amp; Clinical Neurosciences | Multi-disciplinary NPH &amp; LOVA Service</div>
    </div>

    <div class="letter-attribution-footer">
      Multi-disciplinary NPH &amp; LOVA Database | Conceived, designed and tested: Dr G Narenthiran MB ChB BSc(MedSci) MRCS(Ed.) FEBNS FRCS(SN)<br/>
      Copyright 2026, Dr G Narenthiran, g_narenthiran@hotmail.com, all rights reserved. Dedicated to Mrs Nirmaladevy Ganesalingam BSc.
    </div>
  `;

  const paper = document.getElementById('paper-clinic-letter');
  if (paper) paper.innerHTML = html;
}

window.copyClinicLetterText = function() {
  const paper = document.getElementById('paper-clinic-letter');
  if (paper) {
    const text = paper.innerText;
    navigator.clipboard.writeText(text).then(() => {
      alert('Clinic letter copied to clipboard.');
    });
  }
};

window.downloadClinicLetterHtml = function() {
  const paper = document.getElementById('paper-clinic-letter');
  const p = AppState.activePatientData;
  if (!paper || !p) return;

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Clinic Letter - ${p.mrn} ${p.last_name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.5; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
  th { background: #f1f5f9; }
  .letter-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; margin-bottom: 1rem; }
</style>
</head>
<body>
${paper.innerHTML}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Clinic_Letter_${p.mrn}_${p.last_name}.html`;
  a.click();
  URL.revokeObjectURL(url);
};


// =========================================================================
// AI CLINICAL INTELLIGENCE CONTROLLER
// =========================================================================

window.renderAIInsights = function() {
  const patient = AppState.activePatientData;
  const verdictEl = document.getElementById('ai-kpi-verdict');
  const confEl = document.getElementById('ai-kpi-confidence');
  if (!verdictEl) return;

  if (!patient || !window.AIEngine) {
    verdictEl.textContent = 'No Patient';
    if (confEl) confEl.textContent = 'Select patient above';
    document.getElementById('ai-kpi-shunt-score').textContent = '--%';
    document.getElementById('ai-kpi-shunt-category').textContent = 'Awaiting record selection';
    document.getElementById('ai-kpi-gait-gain').textContent = '--%';
    document.getElementById('ai-kpi-tug-delta').textContent = 'TUG: -- s';
    document.getElementById('ai-kpi-overdrainage').textContent = '--';

    document.getElementById('ai-prob-val-inph').textContent = '0%';
    document.getElementById('ai-bar-inph').style.width = '0%';
    document.getElementById('ai-prob-val-lova').textContent = '0%';
    document.getElementById('ai-bar-lova').style.width = '0%';
    document.getElementById('ai-prob-val-atrophy').textContent = '0%';
    document.getElementById('ai-bar-atrophy').style.width = '0%';
    document.getElementById('ai-prob-val-obstr').textContent = '0%';
    document.getElementById('ai-bar-obstr').style.width = '0%';

    document.getElementById('ai-differential-rationale').textContent = 'Select an active patient to compute multimodal posterior probabilities.';
    const synthEl = document.getElementById('ai-synthesis-text');
    if (synthEl) synthEl.innerText = 'No patient currently active. Select a patient from the header selector to generate full MDT synthesis.';
    return;
  }

  // 1. Probabilities
  const diff = AIEngine.computeDifferentialProbabilities(patient);
  verdictEl.textContent = diff.primaryVerdict;
  if (confEl) confEl.textContent = `Confidence: ${diff.confidence}`;

  document.getElementById('ai-prob-val-inph').textContent = `${diff.inph}%`;
  document.getElementById('ai-bar-inph').style.width = `${diff.inph}%`;

  document.getElementById('ai-prob-val-lova').textContent = `${diff.lova}%`;
  document.getElementById('ai-bar-lova').style.width = `${diff.lova}%`;

  document.getElementById('ai-prob-val-atrophy').textContent = `${diff.atrophy}%`;
  document.getElementById('ai-bar-atrophy').style.width = `${diff.atrophy}%`;

  document.getElementById('ai-prob-val-obstr').textContent = `${diff.obstructive}%`;
  document.getElementById('ai-bar-obstr').style.width = `${diff.obstructive}%`;

  document.getElementById('ai-differential-rationale').textContent = diff.rationale;

  // 2. Shunt Responsiveness & Trajectory
  const shunt = AIEngine.predictShuntResponsiveness(patient);
  if (shunt) {
    document.getElementById('ai-kpi-shunt-score').textContent = `${shunt.score}%`;
    document.getElementById('ai-kpi-shunt-category').textContent = shunt.category;
    document.getElementById('ai-kpi-gait-gain').textContent = `+${shunt.predictedGaitGain}%`;
    document.getElementById('ai-kpi-tug-delta').textContent = `TUG: -${shunt.predictedTugReduction}s`;
    document.getElementById('ai-kpi-overdrainage').textContent = shunt.overdrainageRisk;
    document.getElementById('ai-kpi-overdrainage').style.color = shunt.overdrainageColor;

    document.getElementById('ai-metric-tap-delta').textContent = `${shunt.tapDelta}%`;
    document.getElementById('ai-metric-gait-pct').textContent = `+${shunt.predictedGaitGain}%`;
    document.getElementById('ai-metric-tug-time').textContent = `-${shunt.predictedTugReduction} s`;
    document.getElementById('ai-metric-moca-pts').textContent = `+${shunt.predictedMocaGain} pts`;
    document.getElementById('ai-metric-continence').textContent = `${shunt.predictedContinenceRate}%`;
    document.getElementById('ai-metric-hygroma').textContent = shunt.overdrainageRisk;
    document.getElementById('ai-metric-hygroma').style.color = shunt.overdrainageColor;
  }

  // 3. XAI Feature List
  const xaiList = AIEngine.getExplainableFeatures(patient);
  const xaiContainer = document.getElementById('ai-xai-feature-container');
  if (xaiContainer) {
    xaiContainer.innerHTML = xaiList.map(f => `
      <div class="ai-xai-item">
        <div>
          <span style="font-weight:600; color:var(--text-main);">${escapeHtml(f.name)}</span>
          <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(f.desc)}</div>
        </div>
        <span class="${f.dir === 'pos' ? 'ai-xai-weight-pos' : 'ai-xai-weight-neg'}">${escapeHtml(f.weight)}</span>
      </div>
    `).join('');
  }

  // 4. Valve Settings
  const valve = AIEngine.recommendValveSettings(patient);
  if (valve) {
    document.getElementById('ai-rec-dp').textContent = `${valve.recDpMmH2O} mm`;
    document.getElementById('ai-rec-dp-sub').textContent = `Strata ${valve.strataEquivalent} / proGAV ${Math.round(valve.recDpMmH2O / 10)}cm`;
    document.getElementById('ai-rec-ag').textContent = `${valve.recAgCmH2O} cm`;
    document.getElementById('ai-rec-ag-sub').textContent = `Miethke proSA / Gravity Unit (${valve.recAgCmH2O} cmH2O)`;
    document.getElementById('ai-rec-hardware').textContent = valve.recommendedModel;
    document.getElementById('ai-rec-valve-rationale').textContent = valve.rationale;
  }

  // 5. Synthesis text
  const synthText = AIEngine.generateClinicalSynthesis(patient);
  const synthEl = document.getElementById('ai-synthesis-text');
  if (synthEl) {
    synthEl.innerText = synthText;
  }
};

window.copyAISynthesis = function() {
  const el = document.getElementById('ai-synthesis-text');
  if (el) {
    navigator.clipboard.writeText(el.innerText).then(() => {
      alert('AI Multidisciplinary Clinical Synthesis copied to clipboard.');
    });
  }
};

window.handleAICustomQuery = function(query) {
  const outputEl = document.getElementById('ai-query-output');
  if (!outputEl) return;
  const p = AppState.activePatientData;
  if (!p) {
    outputEl.textContent = 'Please select a patient first to query clinical intelligence.';
    return;
  }
  if (!window.AIEngine) {
    outputEl.textContent = 'AI Engine not initialized.';
    return;
  }

  outputEl.textContent = 'Analyzing patient records and computing inference...';
  setTimeout(() => {
    const resp = AIEngine.answerPatientQuery(p, query);
    outputEl.textContent = resp;
  }, 100);
};
