// =========================================
// SAMSAT BUDGET - FINAL FIXED LOGIC (WITH YEAR VALIDATION)
// =========================================

// ========== Utilities ============
const STORAGE_KEY = 'SAMSAT_expenses_v1';
const CAT_KEY = 'SAMSAT_categories_v1';
const BADGE_KEY = 'SAMSAT_badges_v1';
const PREF_KEY = 'SAMSAT_pref_v1';
const BADGE_HISTORY_KEY = 'SAMSAT_badge_history_v1';
const BUDGET_KEY = 'SAMSAT_total_budget_v1';
const QUICK_ADD_KEY = 'SAMSAT_quick_add_v1';
const VEHICLE_KEY = 'SAMSAT_vehicles_v1';
const REMINDER_KEY = 'SAMSAT_reminders_v1';
const CHART_PREF_KEY = 'SAMSAT_chart_pref_v1'; 

let expenses = [];
let categories = [];
let badges = [];
let badgeHistory = {};
let totalBudget = 0;
let quickAddItems = [];
let vehicles = [];
let reminders = []; 

let deleteId = null;
let PER_PAGE = 8; let currentPage = 1;

// Instance Modal Bootstrap
let rowActionModalInstance = null; // Diinisialisasi nanti dalam $(function)
let transactionModal = null; 
let categoryBudgetModal = null;
let quickAddModal = null;
let vehiclesModal = null;
let catsModal = null; 
let remindersModal = null;
let actionConfirmModalInstance = null; 
let renameModalInstance = null; 

// State Variables
window._currentConfirmCallback = null; 
window._currentRenameCallback = null;
window._isConfirming = false;
let chartVisibility = { donut: true, line: true };
let barChart = null; 
let editingReminderId = null; 

// --- FLAGS NAVIGASI & KONFLIK ---
let returnToTransactionFromVehicle = false; 
let returnToTransactionFromCat = false; 
let isPausedForConfirmation = false; 

const defaultCats = ['Pajak Tahunan','Ganti Oli','Servis Rutin','Beli Suku Cadang','Bahan Bakar','Lainnya'];
const defaultVehicles = [{ id: Date.now(), name: 'Kendaraan 1', type: 'mobil' }];
const standardReminderNames = ["Ganti Oli", "Pajak Tahunan", "Pajak 5 Tahunan", "Servis Rutin"];

let tooltipInstances = [];

function showToast(msg){
  $('#toastBody').text(msg);
  const t = new bootstrap.Toast(document.getElementById('appToast'));
  t.show();
}

function initializeTooltips() {
  tooltipInstances.forEach(t => t.dispose());
  tooltipInstances = [];
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipInstances = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

// --- Fungsi Penyimpanan ---
function saveAll(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); }
function loadAll(){ expenses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
function saveCats(){ localStorage.setItem(CAT_KEY, JSON.stringify(categories)); }
function loadCats(){ categories = JSON.parse(localStorage.getItem(CAT_KEY)) || defaultCats.slice(); }
function saveBadges(){ localStorage.setItem(BADGE_KEY, JSON.stringify(badges)); }
function loadBadges(){ badges = JSON.parse(localStorage.getItem(BADGE_KEY)) || []; }
function savePref(pref){ localStorage.setItem(PREF_KEY, JSON.stringify(pref)); }
function loadPref(){ return JSON.parse(localStorage.getItem(PREF_KEY)) || {dark:false}; }
function saveBadgeHistory(){ localStorage.setItem(BADGE_HISTORY_KEY, JSON.stringify(badgeHistory)); }
function loadBadgeHistory(){ badgeHistory = JSON.parse(localStorage.getItem(BADGE_HISTORY_KEY)) || {}; }
function saveTotalBudget(){ localStorage.setItem(BUDGET_KEY, JSON.stringify(totalBudget)); }
function loadTotalBudget(){ totalBudget = JSON.parse(localStorage.getItem(BUDGET_KEY)) || 0; }
function saveQuickAddItems(){ localStorage.setItem(QUICK_ADD_KEY, JSON.stringify(quickAddItems)); }
function loadQuickAddItems(){ quickAddItems = JSON.parse(localStorage.getItem(QUICK_ADD_KEY)) || []; }
function saveVehicles(){ localStorage.setItem(VEHICLE_KEY, JSON.stringify(vehicles)); }

function loadVehicles(){ 
  vehicles = JSON.parse(localStorage.getItem(VEHICLE_KEY)) || defaultVehicles.slice();
  if (vehicles.length > 0 && typeof vehicles[0] === 'string') {
      vehicles = vehicles.map((v, i) => ({
          id: Date.now() + i, 
          name: v, 
          type: 'mobil' 
      }));
      saveVehicles();
      showToast('Data kendaraan telah di-upgrade.');
  }
}
function saveReminders(){ localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders)); }
function loadReminders(){ 
    reminders = JSON.parse(localStorage.getItem(REMINDER_KEY)) || []; 
    // Migrasi: Pastikan properti history ada untuk data lama
    reminders.forEach(r => {
        if (!r.history) r.history = [];
    });
}


function formatRupiah(n){ if(!n && n!==0) return '0'; return Number(n).toLocaleString('id-ID', {minimumFractionDigits:0}); }
function getTodayDate() { return new Date().toISOString().slice(0, 10); }

function stringToHslColor(str, s = 70, l = 50) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let h = hash % 360;
  return 'hsl('+h+', '+s+'%, '+l+'%)';
}

// ========== Init UI ============
$(function(){
  // Inisialisasi modal instance di sini
  rowActionModalInstance = new bootstrap.Modal(document.getElementById('rowActionModal'));
  transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
  categoryBudgetModal = new bootstrap.Modal(document.getElementById('categoryBudgetModal'));
  quickAddModal = new bootstrap.Modal(document.getElementById('quickAddModal'));
  vehiclesModal = new bootstrap.Modal(document.getElementById('vehiclesModal'));
  catsModal = new bootstrap.Modal(document.getElementById('catsModal'));
  remindersModal = new bootstrap.Modal(document.getElementById('remindersModal'));
  actionConfirmModalInstance = new bootstrap.Modal(document.getElementById('actionConfirmModal'));
  renameModalInstance = new bootstrap.Modal(document.getElementById('renameModal'));

  // --- PERBAIKAN LOGIKA NAVIGASI (ANTI BENTROK) ---
  
  document.getElementById('vehiclesModal').addEventListener('hidden.bs.modal', function () {
      if (isPausedForConfirmation) {
          isPausedForConfirmation = false; 
          return;
      }
      if (returnToTransactionFromVehicle) {
          transactionModal.show();
          returnToTransactionFromVehicle = false; 
      }
  });

  document.getElementById('catsModal').addEventListener('hidden.bs.modal', function () {
      if (isPausedForConfirmation) {
          isPausedForConfirmation = false;
          return;
      }
      if (returnToTransactionFromCat) {
          transactionModal.show();
          returnToTransactionFromCat = false; 
      }
  });

  // Handler Reset View saat Modal Reminder Dibuka
  document.getElementById('remindersModal').addEventListener('show.bs.modal', function () {
    $('#reminderFormView').hide();
    $('#reminderHistoryView').hide();
    $('#reminderListView').show();
    renderRemindersModalList();
  });

  $('#addNewVehicleFromModal').on('click', function() {
      returnToTransactionFromVehicle = true; 
      transactionModal.hide(); 
      vehiclesModal.show(); 
  });

  $('#addNewCatFromModal').on('click', function() {
      returnToTransactionFromCat = true; 
      transactionModal.hide(); 
      catsModal.show(); 
  });
  // --------------------------------------------------

  // Handler Konfirmasi Modal Kustom
  $('#actionConfirmBtn').on('click', function() {
      window._isConfirming = true; 
      actionConfirmModalInstance.hide(); 
      if (window._currentConfirmCallback) {
          window._currentConfirmCallback(true);
          window._currentConfirmCallback = null;
      }
      setTimeout(() => { window._isConfirming = false; }, 500);
  });

  document.getElementById('actionConfirmModal').addEventListener('hide.bs.modal', function(e) {
      if (window._currentConfirmCallback && !window._isConfirming) { 
          window._currentConfirmCallback(false);
          window._currentConfirmCallback = null;
      }
      window._isConfirming = false;
  });

  // --- HANDLER MODAL RENAME ---
  $('#saveRenameBtn').on('click', function() {
      const newVal = $('#renameInput').val().trim();
      if (!newVal) {
          showToast('Nama tidak boleh kosong');
          return;
      }
      renameModalInstance.hide();
      if (window._currentRenameCallback) {
          window._currentRenameCallback(newVal);
          window._currentRenameCallback = null;
      }
  });

  $('#renameInput').on('keypress', function(e) {
      if(e.which === 13) { // Enter pressed
          $('#saveRenameBtn').click();
      }
  });

  document.getElementById('renameModal').addEventListener('shown.bs.modal', function () {
      $('#renameInput').focus();
  });
  // ----------------------------
  
  loadChartVisibility();
  updateLayout(); 
  
  $('#hideDonutChartBtn').on('click', () => { chartVisibility.donut = false; saveChartVisibility(); updateLayout(); });
  $('#hideLineChartBtn').on('click', () => { chartVisibility.line = false; saveChartVisibility(); updateLayout(); });
  $('#showChartsBtn').on('click', () => { chartVisibility.donut = true; chartVisibility.line = true; saveChartVisibility(); updateLayout(); });

  loadCats(); loadAll(); loadBadges(); loadBadgeHistory(); loadTotalBudget(); loadQuickAddItems(); loadVehicles(); loadReminders();
  const pref = loadPref(); if(pref.dark) $('body').addClass('dark');
  
  renderCategoryOptions(); renderCatList();
  renderVehicleOptions(); renderVehicleList();
  renderReminderNameOptions();
  renderReminders();
  
  updateExpenses();
  updateBadges(); 
  renderQuickAddButtons();

  $(window).on('scroll', function() {
    const nav = $('.navbar');
    if ($(window).scrollTop() > 30) {
      nav.addClass('navbar-scrolled');
    } else {
      nav.removeClass('navbar-scrolled');
    }
  });
  
  // --- FILTER LOGIC (UPDATED WITH DATE VALIDATION) ---
  $('#presetFilter').on('change', function() {
      $('#fromDate').val('');
      $('#toDate').val('');
      currentPage = 1;
      $('#categoryFilter').val('');
      updateExpenses();
  });

  $('#fromDate, #toDate').on('change', function() {
      // VALIDASI TAHUN
      const val = $(this).val();
      if (val) {
          const year = parseInt(val.split('-')[0]);
          if (year < 2000 || year > 3000) {
              showToast('Harap pilih tahun antara 2000 s/d 3000');
              $(this).val(''); // Reset invalid input
              return;
          }
      }

      if ($('#fromDate').val() !== '' || $('#toDate').val() !== '') {
          $('#presetFilter').val('all');
      }
      currentPage = 1;
      $('#categoryFilter').val('');
      updateExpenses();
  });

  $('#search, #vehicleFilter').on('keyup change', function() {
      currentPage = 1;
      $('#categoryFilter').val('');
      updateExpenses();
  });
  
  $('#resetFiltersBtn').on('click', function() {
      $('#search').val('');
      $('#presetFilter').val('all');
      $('#fromDate').val('');
      $('#toDate').val('');
      $('#categoryFilter').val('');
      $('#vehicleFilter').val('');
      currentPage = 1;
      updateExpenses();
      showToast('Filter di-reset total');
  });

  // --- BUTTON HANDLERS ---
  $('#addTransactionBtn').on('click', function() {
    $('#expenseForm')[0].reset();
    $('#editIndex').val(-1);
    $('#transactionModalTitle').text('Tambah Biaya');
    $('#saveBtn').html('<i class="fa-solid fa-floppy-disk me-1"></i> Simpan');
    $('#date').val(getTodayDate());
    if (vehicles.length > 0) {
      const currentFilter = $('#vehicleFilter').val();
      if(currentFilter) {
          $('#vehicle').val(currentFilter);
      } else {
          $('#vehicle').val(vehicles[0].name); 
      }
    }
  });
  
  $('#editBudgetBtn').on('click', function() {
      renderTotalBudgetModal();
      categoryBudgetModal.show();
  });
  
  $('#saveTotalBudgetBtn').on('click', function() {
      saveTotalBudgetFromModal();
      categoryBudgetModal.hide();
  });
  
  $('#manageQuickAddBtn').on('click', function() {
    renderQuickAddModalList();
    quickAddModal.show();
  });
  
  $('#quickAddForm').on('submit', function(e) {
      e.preventDefault();
      const desc = $('#qaDesc').val().trim();
      const amount = Number($('#qaAmount').val());
      const category = $('#qaCategory').val();
      const vehicle = $('#qaVehicle').val();
      if (!desc || !amount || !category || !vehicle) {
          return showToast("Lengkapi semua field input cepat");
      }
      quickAddItems.push({ desc, amount, category, vehicle });
      saveQuickAddItems();
      renderQuickAddButtons();
      renderQuickAddModalList();
      $('#quickAddForm')[0].reset();
  });

  $('#quickAddButtons').on('click', '.btn-quick-add', function() {
      const item = quickAddItems[$(this).data('index')];
      if (item) {
          quickAddItem(item.desc, item.amount, item.category, item.vehicle);
      } else {
          showToast('Error: Tombol input cepat tidak valid.');
      }
  });

  // --- REMINDER BUTTON HANDLERS ---
  $('#manageRemindersBtn').on('click', function() {
    renderRemindersModalList();
    remindersModal.show();
  });

  $('#btnAddNewReminder').on('click', function() {
    editingReminderId = null;
    $('#reminderModalTitle').text('Tambah Reminder Baru');
    $('#reminderForm')[0].reset();
    $('#reminderEditId').val('');
    $('#oldDateForHistory').val('');
    
    renderReminderNameOptions();
    renderVehicleOptions();
    
    $('#reminderListView').hide();
    $('#reminderFormView').fadeIn();
  });

  $('#btnCancelReminderForm').on('click', function() {
    $('#reminderFormView').hide();
    $('#reminderListView').fadeIn();
    $('#reminderModalTitle').text('Kelola Reminder');
  });

  $('#btnBackFromHistory').on('click', function() {
    $('#reminderHistoryView').hide();
    $('#reminderListView').fadeIn();
    $('#reminderModalTitle').text('Kelola Reminder');
  });

  // --- VEHICLE FORM HANDLER ---
  $('#vehicleForm').on('submit', function(e) {
      e.preventDefault();
      const name = $('#newVehicleName').val().trim();
      const type = $('#newVehicleType').val();
      if(!name || !type) return showToast('Nama dan Tipe harus diisi');
      if(vehicles.find(v => v.name === name)) return showToast('Kendaraan dengan nama itu sudah ada');
      
      vehicles.push({ id: Date.now(), name, type }); 
      saveVehicles(); 
      
      renderVehicleOptions(); 
      renderVehicleList(); 
      
      if(returnToTransactionFromVehicle) {
          $('#vehicle').val(name);
      }

      $('#newVehicleName').val('');
      $('#newVehicleType').val(''); 
      showToast('Kendaraan ditambahkan');
  });
  
   $('#catChart').on('dblclick', function(e) {
      const elements = catChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
      if (elements.length === 0) {
          $('#search, #fromDate, #toDate, #categoryFilter, #vehicleFilter').val('');
          $('#presetFilter').val('all');
          currentPage = 1;
          updateExpenses();
          showToast('Filter di-reset');
      }
  });
  
  $('#trendChart').on('dblclick', function() {
      $('#search, #fromDate, #toDate, #categoryFilter, #vehicleFilter').val('');
      $('#presetFilter').val('all');
      currentPage = 1;
      updateExpenses();
      showToast('Filter di-reset');
  });

  $('#footerReset').on('click', (e) => { e.preventDefault(); $('#resetData').trigger('click'); });

  initializeTooltips();
});

function showCustomConfirm(title, bodyHtml, confirmText, isDestructive, callback) {
    $('#actionConfirmTitle').text(title);
    $('#actionConfirmBody').html(bodyHtml);
    $('#actionConfirmBtn').text(confirmText);
    $('#actionConfirmBtn').removeClass('btn-accent btn-danger').addClass(isDestructive ? 'btn-danger' : 'btn-accent');
    window._currentConfirmCallback = callback;
    actionConfirmModalInstance.show();
}

// HELPER POPUP RENAME
function showRenamePopup(title, currentValue, callback) {
    $('#renameModalTitle').text(title);
    $('#renameInput').val(currentValue);
    window._currentRenameCallback = callback;
    renameModalInstance.show();
}

// ========== Category Management ============
function renderCategoryOptions(){
  const currentTransactionVal = $('#category').val();
  const currentQaVal = $('#qaCategory').val();

  const sel = $('#category, #qaCategory');
  sel.empty(); sel.append('<option value="">Pilih Kategori</option>');
  categories.forEach(c=> sel.append(`<option value="${c}">${c}</option>`));

  if(currentTransactionVal) $('#category').val(currentTransactionVal);
  if(currentQaVal) $('#qaCategory').val(currentQaVal);
}

$('#manageCatsBtn').on('click', ()=> catsModal.show());

$('#addCatBtn').on('click', ()=>{
  const name = $('#newCat').val().trim(); 
  if(!name) return showToast('Masukkan nama kategori');
  if(categories.includes(name)) return showToast('Kategori sudah ada');
  
  categories.push(name); 
  saveCats(); 
  
  renderCategoryOptions(); 
  renderCatList(); 
  
  if(returnToTransactionFromCat) {
      $('#category').val(name);
  }

  $('#newCat').val(''); 
  showToast('Kategori ditambahkan');
});

function renderCatList(){
  const list = $('#catList'); list.empty(); categories.forEach((c, i)=>{
    list.append(`<li class="list-group-item d-flex justify-content-between align-items-center">${c} 
      <div>
        <button class="btn btn-sm btn-outline-light me-1" data-idx="${i}" onclick="renameCat(${i})" data-bs-toggle="tooltip" title="Ganti nama">Rename</button>
        <button class="btn btn-sm btn-danger" data-idx="${i}" onclick="removeCat(${i})" data-bs-toggle="tooltip" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
      </div></li>`);
  });
  initializeTooltips();
}

function removeCat(i){
  const name = categories[i]; 
  
  isPausedForConfirmation = true;
  catsModal.hide();

  showCustomConfirm('Konfirmasi Hapus', `Yakin ingin menghapus kategori <strong>${name}</strong>?`, 'Hapus', true, (confirmed) => {
      if (confirmed) {
          categories.splice(i,1); 
          saveCats(); 
          renderCategoryOptions(); 
          renderCatList(); 
          showToast('Kategori dihapus');
      }
      setTimeout(() => { catsModal.show(); }, 200);
  });
}

function renameCat(i){
  const oldName = categories[i];
  
  isPausedForConfirmation = true;
  catsModal.hide();

  showRenamePopup('Ganti Nama Kategori', oldName, (newName) => {
      if (newName === oldName) {
          setTimeout(() => { catsModal.show(); }, 200);
          return;
      }
      
      categories[i] = newName;
      saveCats();
      renderCategoryOptions();
      renderCatList();
      
      showToast('Kategori berhasil diubah');
      
      setTimeout(() => { catsModal.show(); }, 200);
  });
  
  document.getElementById('renameModal').addEventListener('hidden.bs.modal', function onHide() {
      document.getElementById('renameModal').removeEventListener('hidden.bs.modal', onHide);
      if (window._currentRenameCallback) {
           window._currentRenameCallback = null;
           setTimeout(() => { catsModal.show(); }, 200);
      }
  }, { once: true });
}

// ========== Vehicle Management ============
function renderVehicleOptions(){
  const currentTransactionVal = $('#vehicle').val();
  const currentFilterVal = $('#vehicleFilter').val();
  const currentQaVal = $('#qaVehicle').val();
  const currentReminderVal = $('#reminderVehicle').val();

  const sel = $('#vehicle, #qaVehicle, #vehicleFilter, #reminderVehicle');
  sel.empty(); 

  $('#vehicleFilter').append('<option value="">Semua Kendaraan</option>');
  $('#vehicle, #qaVehicle, #reminderVehicle').append('<option value="">Pilih Kendaraan</option>');
  
  vehicles.forEach(v => sel.append(`<option value="${v.name}">${v.name}</option>`));

  if(currentTransactionVal) $('#vehicle').val(currentTransactionVal);
  if(currentFilterVal) $('#vehicleFilter').val(currentFilterVal);
  if(currentQaVal) $('#qaVehicle').val(currentQaVal);
  if(currentReminderVal) $('#reminderVehicle').val(currentReminderVal);
}

$('#manageVehiclesBtn').on('click', ()=> vehiclesModal.show());

function renderVehicleList(){
  const list = $('#vehicleList'); list.empty(); 
  vehicles.forEach((v)=>{
    const icon = v.type === 'mobil' ? '<i class="fa-solid fa-car"></i>' : '<i class="fa-solid fa-motorcycle"></i>';
    const typeBadge = v.type === 'mobil' ? 'Mobil' : 'Motor';
    list.append(`<li class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        ${v.name} <span class="badge ${v.type === 'mobil' ? 'bg-primary' : 'bg-success'}">${icon} ${typeBadge}</span>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-light me-1" onclick="renameVehicle(${v.id})" data-bs-toggle="tooltip" title="Ganti nama">Rename</button>
        <button class="btn btn-sm btn-danger" onclick="removeVehicle(${v.id})" data-bs-toggle="tooltip" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </li>`);
  });
  initializeTooltips();
}

function removeVehicle(id){
  const v = vehicles.find(v => v.id === id);
  if(!v) return;

  isPausedForConfirmation = true;
  vehiclesModal.hide();

  showCustomConfirm('Konfirmasi Hapus Kendaraan', `Yakin ingin menghapus kendaraan <strong>${v.name}</strong>?<br>Ini <strong>tidak</strong> akan menghapus riwayat biayanya.`, 'Hapus', true, (confirmed) => {
      if (confirmed) {
          vehicles = vehicles.filter(v => v.id !== id);
          saveVehicles(); 
          renderVehicleOptions(); 
          renderVehicleList(); 
          showToast('Kendaraan dihapus');
          reminders = reminders.filter(r => r.vehicleName !== v.name);
          saveReminders();
          renderReminders();
          renderRemindersModalList();
      }
      setTimeout(() => { vehiclesModal.show(); }, 200);
  });
}

function renameVehicle(id){
  const v = vehicles.find(v => v.id === id);
  if(!v) return;
  const oldName = v.name;

  isPausedForConfirmation = true;
  vehiclesModal.hide();

  showRenamePopup('Ganti Nama Kendaraan', oldName, (newName) => {
      if (newName === oldName) {
          setTimeout(() => { vehiclesModal.show(); }, 200);
          return;
      }

      v.name = newName;
      saveVehicles();
      renderVehicleOptions();
      renderVehicleList();
      
      reminders.forEach(r => { if(r.vehicleName === oldName) r.vehicleName = newName; });
      saveReminders(); renderReminders();
      expenses.forEach(exp => { if(exp.vehicle === oldName) exp.vehicle = newName; });
      saveAll(); updateExpenses();
      quickAddItems.forEach(item => { if(item.vehicle === oldName) item.vehicle = newName; });
      saveQuickAddItems(); renderQuickAddButtons();

      showToast('Nama kendaraan berhasil diubah');

      setTimeout(() => { vehiclesModal.show(); }, 200);
  });

  document.getElementById('renameModal').addEventListener('hidden.bs.modal', function onHide() {
      document.getElementById('renameModal').removeEventListener('hidden.bs.modal', onHide);
      if (window._currentRenameCallback) {
           window._currentRenameCallback = null;
           setTimeout(() => { vehiclesModal.show(); }, 200);
      }
  }, { once: true });
}

// =========================================
// REMINDER MANAGEMENT + HISTORY LOGIC
// =========================================

function renderReminderNameOptions() {
    const sel = $('#reminderName');
    sel.empty();
    sel.append('<option value="">Pilih Jenis Reminder</option>');
    standardReminderNames.forEach(name => sel.append(`<option value="${name}">${name}</option>`));
}

function getReminderIcon(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pajak 5') || lowerName.includes('ganti plat')) return '<i class="fa-solid fa-file-shield"></i>';
    if (lowerName.includes('pajak')) return '<i class="fa-solid fa-calendar-days"></i>';
    if (lowerName.includes('oli')) return '<i class="fa-solid fa-oil-can"></i>';
    if (lowerName.includes('servis') || lowerName.includes('service')) return '<i class="fa-solid fa-wrench"></i>';
    return '<i class="fa-solid fa-bell"></i>'; 
}

function calculateNextTaxDate(dateStr, intervalYears) {
    if (!dateStr) return null; 
    let newDate = new Date(dateStr + 'T12:00:00');
    newDate.setFullYear(newDate.getFullYear() + intervalYears);
    return newDate.toISOString().slice(0, 10);
}

function getDaysDifference(dateStr) {
    if (!dateStr) return 9999;
    const today = new Date(getTodayDate() + 'T00:00:00');
    const targetDate = new Date(dateStr + 'T00:00:00');
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// --- CARD DASHBOARD RENDER ---
function renderReminders() {
    const container = $('#reminderList');
    container.empty();
    if (reminders.length === 0) {
        container.append('<div class="small-muted text-center p-2">Belum ada reminder di-set.</div>');
        return;
    }
    
    // Sort by urgency
    let displayList = reminders.map(r => ({ 
        vehicle: r.vehicleName, 
        name: r.name, 
        diffDays: getDaysDifference(r.dueDate),
        dueDate: r.dueDate
    })).sort((a, b) => a.diffDays - b.diffDays);
    
    // Show top 5 urgent
    const toShow = displayList.slice(0, 5);

    toShow.forEach(r => {
        let text = `<strong>${r.name} (${r.vehicle})</strong>: `;
        let cssClass = ''; 
        let textHtml = ''; 
        
        if (r.diffDays < 0) {
            textHtml = `<span class="text-danger">Terlewat ${Math.abs(r.diffDays)} hari!</span>`;
            cssClass = 'urgent';
        } else if (r.diffDays === 0) {
            textHtml = `<strong class="text-danger">Jatuh tempo HARI INI!</strong>`;
            cssClass = 'urgent';
        } else if (r.diffDays <= 30) {
            textHtml = `<span class="text-warning">Tinggal ${r.diffDays} hari lagi.</span>`;
            cssClass = 'warning';
        } else {
            textHtml = `Tinggal ${r.diffDays} hari.`;
        }
        container.append(`<div class="reminder-item ${cssClass}">${text}${textHtml}</div>`);
    });
}

// --- RENDER LIST DI MODAL (DENGAN HISTORY & ACTION BUTTONS) ---
function renderRemindersModalList() {
    renderVehicleOptions(); 
    
    const list = $('#reminderListModal');
    list.empty();
    
    if (reminders.length === 0) {
        list.append('<li class="list-group-item text-center py-4 small-muted">Belum ada reminder.<br>Tekan tombol <strong>+ Tambah</strong> di atas.</li>');
        return; 
    }
    
    // Sort: Kendaraan A-Z, lalu Nama Reminder A-Z
    const sortedReminders = [...reminders].sort((a,b) => a.vehicleName.localeCompare(b.vehicleName) || a.name.localeCompare(b.name));
    
    sortedReminders.forEach((r) => {
      const icon = getReminderIcon(r.name);
      const diffDays = getDaysDifference(r.dueDate);
      let dateInfoHtml = `Jatuh Tempo: ${r.dueDate || 'N/A'}`;
              
      if (!r.dueDate) {
          dateInfoHtml = `<span class="small-muted">(Tanggal belum di-set)</span>`;
      } else if (diffDays < 0) {
          dateInfoHtml = `Jatuh Tempo: ${r.dueDate} <strong class="text-danger ms-1">(${Math.abs(diffDays)} hari terlewat!)</strong>`;
      } else if (diffDays === 0) {
          dateInfoHtml = `Jatuh Tempo: ${r.dueDate} <strong class="text-danger fw-bold ms-1">(HARI INI!)</strong>`;
      } else if (diffDays <= 30) {
          dateInfoHtml = `Jatuh Tempo: ${r.dueDate} <strong class="text-warning ms-1">(${diffDays} hari lagi)</strong>`;
      }
      
      // TOMBOL 1: HISTORY (Update)
      const histBtnHtml = `<button class="btn btn-sm btn-outline-secondary mb-1 mb-md-0 me-1" onclick="showHistoryView(${r.id})" data-bs-toggle="tooltip" title="Lihat riwayat perubahan"><i class="fa-solid fa-clock-rotate-left"></i></button>`;

      // TOMBOL 2: PERPANJANG (Hijau)
      let extendBtnHtml = '';
      if (isExtendable(r.name)) {
          extendBtnHtml = `<button class="btn btn-sm btn-success mb-1 mb-md-0 me-1" onclick="extendReminder(${r.id})" data-bs-toggle="tooltip" title="Perpanjang otomatis"><i class="fa-solid fa-calendar-check"></i></button>`;
      }

      // TOMBOL 3: EDIT (Putih/Outline)
      const editBtnHtml = `<button class="btn btn-sm btn-outline-light mb-1 mb-md-0 me-1" onclick="editReminderMode(${r.id})" data-bs-toggle="tooltip" title="Edit data manual"><i class="fa-solid fa-pen"></i></button>`;

      // TOMBOL 4: HAPUS (Merah)
      const deleteBtnHtml = `<button class="btn btn-sm btn-danger mb-1 mb-md-0" onclick="deleteReminder(${r.id})" data-bs-toggle="tooltip" title="Hapus"><i class="fa-solid fa-trash"></i></button>`;

      list.append(
          `<li class="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
              <div class="mb-2 mb-md-0">
                  <strong>${icon} ${r.name}</strong>
                  <div class="small-muted">${r.vehicleName}</div>
                  <div class="small" style="font-size: 0.85rem;">${dateInfoHtml}</div>
              </div>
              <div class="d-flex align-items-center flex-wrap justify-content-end">
                  ${histBtnHtml}
                  ${extendBtnHtml}
                  ${editBtnHtml}
                  ${deleteBtnHtml}
              </div>
          </li>`
      );
    });
    initializeTooltips();
}

// --- TAMPILKAN HISTORY VIEW (WITH EMPTY STATE) ---
window.showHistoryView = function(id) {
    const r = reminders.find(r => r.id === id);
    if(!r) return;

    $('#histVehicleName').text(r.vehicleName);
    $('#histReminderName').text(r.name);
    
    const list = $('#reminderHistoryList');
    list.empty();

    // --- LOGIKA JIKA KOSONG ---
    if (!r.history || r.history.length === 0) {
        list.append(`
            <li class="list-group-item text-center py-5">
                <div class="small-muted fst-italic">
                   <i class="fa-solid fa-clock-rotate-left mb-2 d-block" style="font-size: 1.5rem; opacity: 0.5;"></i>
                   Belum ada riwayat perpanjangan untuk reminder ini.
                </div>
            </li>
        `);
    } else {
        // Jika ada data, tampilkan list
        const sortedHist = [...r.history].reverse();
        sortedHist.forEach(h => {
            list.append(`
                <li class="list-group-item p-3">
                    <div class="d-flex justify-content-between mb-1">
                        <strong style="font-size: 0.9rem;" class="text-primary">${h.action}</strong>
                        <small class="small-muted">${h.date}</small>
                    </div>
                    <div class="d-flex align-items-center bg-light rounded p-2 border">
                        <span class="text-danger text-decoration-line-through small">${h.from || '-'}</span> 
                        <i class="fa-solid fa-arrow-right history-arrow"></i>
                        <span class="text-success fw-bold small">${h.to}</span>
                    </div>
                </li>
            `);
        });
    }

    $('#reminderListView').hide();
    $('#reminderHistoryView').fadeIn();
    $('#reminderModalTitle').text('Riwayat Reminder');
}

// --- LOGIKA FORM SUBMIT (ADD/EDIT) ---
$('#reminderForm').on('submit', function(e) {
    e.preventDefault();
    
    const name = $('#reminderName').val().trim();
    const vehicleName = $('#reminderVehicle').val();
    const dueDate = $('#reminderDueDate').val();
    const editId = $('#reminderEditId').val();
    const oldDate = $('#oldDateForHistory').val();

    if (!name || !vehicleName || !dueDate) return showToast('Lengkapi semua field');
    
    // Cek Duplikat (kecuali edit dirinya sendiri)
    const existing = reminders.find(r => r.vehicleName === vehicleName && r.name.toLowerCase() === name.toLowerCase() && r.id != editId);
    if (existing) return showToast('Reminder ini sudah ada.');

    if (editId) {
        const r = reminders.find(r => r.id == editId);
        if (r) {
            // Log History jika tanggal berubah manual
            if (oldDate && oldDate !== dueDate) {
                if(!r.history) r.history = [];
                r.history.push({
                    date: getTodayDate(),
                    action: "Revisi Manual",
                    from: oldDate,
                    to: dueDate
                });
            }
            r.name = name;
            r.vehicleName = vehicleName;
            r.dueDate = dueDate;
            showToast('Reminder diperbarui');
        }
    } else {
        reminders.push({ 
            id: Date.now(), 
            vehicleName, 
            name, 
            dueDate, 
            history: [{ date: getTodayDate(), action: "Dibuat Manual", from: "-", to: dueDate }] 
        });
        showToast('Reminder baru ditambahkan');
    }
    
    saveReminders();
    renderReminders();
    
    $('#reminderFormView').hide();
    $('#reminderListView').fadeIn();
    $('#reminderModalTitle').text('Kelola Reminder');
    renderRemindersModalList();
});

// --- HELPERS NAVIGASI ---
window.editReminderMode = function(id) {
    const r = reminders.find(r => r.id === id);
    if(!r) return;
    
    editingReminderId = id;
    $('#reminderEditId').val(id);
    $('#oldDateForHistory').val(r.dueDate); // Simpan tgl lama
    
    renderReminderNameOptions();
    renderVehicleOptions();
    
    $('#reminderName').val(r.name); 
    $('#reminderVehicle').val(r.vehicleName);
    $('#reminderDueDate').val(r.dueDate);
    
    $('#reminderModalTitle').text('Edit Data Reminder');
    $('#reminderListView').hide();
    $('#reminderFormView').fadeIn();
}

window.deleteReminder = function(id) {
    const r = reminders.find(r => r.id === id);
    if(!r) return;
    
    remindersModal.hide();
    showCustomConfirm('Hapus Reminder', `Hapus <strong>"${r.name}"</strong> (${r.vehicleName})?<br>Riwayat perpanjangan juga akan terhapus.`, 'Hapus', true, (confirmed) => {
        if (confirmed) {
            reminders = reminders.filter(r => r.id !== id);
            saveReminders();
            renderReminders();
            renderRemindersModalList();
            showToast('Reminder dihapus.');
        }
        setTimeout(() => { remindersModal.show(); }, 200);
    });
}

function isExtendable(name) {
    const lowerName = name.toLowerCase();
    return lowerName.includes('pajak') || lowerName.includes('ganti plat') || lowerName.includes('ganti oli') || lowerName.includes('servis') || lowerName.includes('service'); 
}

// --- LOGIKA EXTEND (MANUAL DARI TOMBOL) ---
window.extendReminder = function(id) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    if (!reminder.dueDate) return showToast('Set tanggal jatuh tempo awal terlebih dahulu via tombol Edit.');

    const vehicle = vehicles.find(v => v.name === reminder.vehicleName);
    if (!vehicle) return showToast('Data kendaraan tidak ditemukan.');

    const todayStr = getTodayDate();
    let newDueDateStr = '';
    let intervalDesc = '';
    const lowerName = reminder.name.toLowerCase();

    if (lowerName.includes('pajak') || lowerName.includes('ganti plat')) {
        const daysDiff = getDaysDifference(reminder.dueDate);
        if (daysDiff > 45) return showToast(`Terlalu dini. Perpanjangan Pajak maksimal 45 hari sebelum jatuh tempo.`);
        
        let years = (lowerName.includes('5 tahun') || lowerName.includes('plat')) ? 5 : 1;
        intervalDesc = years === 5 ? '5 Tahun' : '1 Tahun';
        newDueDateStr = calculateNextTaxDate(reminder.dueDate, years);

    } else if (lowerName.includes('ganti oli')) {
        let newDate = new Date(todayStr + 'T12:00:00');
        const months = (vehicle.type === 'mobil') ? 6 : 3;
        newDate.setMonth(newDate.getMonth() + months);
        newDueDateStr = newDate.toISOString().slice(0, 10);
        intervalDesc = `${months} Bulan (dari hari ini)`;

    } else if (lowerName.includes('servis') || lowerName.includes('service')) {
        let newDate = new Date(todayStr + 'T12:00:00');
        newDate.setMonth(newDate.getMonth() + 3);
        newDueDateStr = newDate.toISOString().slice(0, 10);
        intervalDesc = `3 Bulan (dari hari ini)`;
    } else {
        return showToast('Tidak mendukung perpanjangan otomatis.');
    }

    remindersModal.hide();
    showCustomConfirm(`Perpanjang "${reminder.name}"?`, 
        `Tanggal Baru: <strong>${newDueDateStr}</strong><br>(${intervalDesc})`, 
        'Ya, Perpanjang', false, (confirmed) => {
        if (confirmed) {
            // SAVE HISTORY
            if(!reminder.history) reminder.history = [];
            reminder.history.push({
                date: todayStr,
                action: `Perpanjang Otomatis (+${intervalDesc})`,
                from: reminder.dueDate,
                to: newDueDateStr
            });

            // UPDATE DATE
            reminder.dueDate = newDueDateStr;
            
            saveReminders();
            renderReminders();
            renderRemindersModalList();
            showToast('Berhasil diperpanjang & riwayat disimpan!');
        }
        setTimeout(() => { remindersModal.show(); }, 200);
    });
}


// ========== Form handlers (Expenses) ============
$('#clearForm').on('click', ()=>{ 
  $('#expenseForm')[0].reset(); 
  $('#editIndex').val(-1); 
  $('#saveBtn').html('<i class="fa-solid fa-floppy-disk me-1"></i> Simpan'); 
});

$('#expenseForm').on('submit', function(e){
  e.preventDefault();
  const idx = parseInt($('#editIndex').val(),10);
  const desc = $('#desc').val().trim();
  let amount = $('#amount').val().replace(/[^0-9.]/g,''); amount = Number(amount);
  const category = $('#category').val();
  const vehicle = $('#vehicle').val();
  const date = $('#date').val();
  
  if(!desc || !amount || !category || !vehicle || !date) { showToast('Lengkapi semua field'); return; }
  if(amount <= 0){ showToast('Jumlah harus > 0'); return; }
  
  const dateObj = new Date(date + 'T12:00:00');
  if (isNaN(dateObj.getTime())) return showToast('Format tanggal tidak valid.');

  // VALIDASI TAHUN DI INPUT TRANSAKSI
  const year = dateObj.getFullYear();
  if (year < 2000 || year > 3000) {
      return showToast('Tahun transaksi harus antara 2000 s/d 3000');
  }
  
  const item = {desc, amount, category, vehicle, date, id: Date.now()};
  if(idx>=0){ 
      expenses[idx] = {...expenses[idx], desc, amount, category, vehicle, date}; 
      showToast('Riwayat diperbarui');
  }
  else { 
      expenses.push(item); 
      showToast('Riwayat ditambahkan'); 
  }
  saveAll(); 
  checkAndExtendReminder(category, vehicle, date); 
  transactionModal.hide(); 
  updateExpenses(); 
  updateBadges();
});

// =========================================
// UPDATE: LOGIKA REMINDER OTOMATIS DENGAN MODAL CANTIK
// =========================================
function checkAndExtendReminder(category, vehicleName, entryDate) {
    const today = new Date(entryDate + 'T12:00:00'); 
    const todayStr = today.toISOString().slice(0, 10);
    
    // 1. LOGIKA GANTI OLI
    if (category.toLowerCase().includes('ganti oli')) {
        const vehicleData = vehicles.find(v => v.name === vehicleName);
        if (!vehicleData) return; 

        const intervalMonths = (vehicleData.type === 'mobil') ? 6 : 3;
        let newDate = new Date(today);
        newDate.setMonth(newDate.getMonth() + intervalMonths);
        const newDueDateStr = newDate.toISOString().slice(0, 10);

        // MENGGUNAKAN MODAL KUSTOM (BUKAN POPUP BROWSER)
        showCustomConfirm(
            'Auto-Reminder Ganti Oli', // Judul
            `<div class="text-start">
                <p class="mb-2">Anda mencatat <strong>Ganti Oli</strong> untuk <span class="text-primary">${vehicleName}</span>.</p>
                <p class="mb-0">Atur reminder berikutnya ke tanggal <strong>${newDueDateStr}</strong>?</p>
                <small class="text-muted fst-italic">(${intervalMonths} bulan dari tanggal transaksi)</small>
             </div>`, 
            'Ya, Atur Reminder', // Teks Tombol
            false, // Bukan tombol merah (Destructive = false)
            (confirmed) => {
                if (confirmed) {
                    const existing = reminders.find(r => r.vehicleName === vehicleName && r.name.toLowerCase().includes('ganti oli'));
                    
                    if (existing) {
                        // LOG HISTORY
                        if(!existing.history) existing.history = [];
                        existing.history.push({
                            date: todayStr,
                            action: "Update dari Transaksi",
                            from: existing.dueDate,
                            to: newDueDateStr
                        });
                        existing.dueDate = newDueDateStr;
                    } else {
                        reminders.push({ 
                            id: Date.now(), 
                            vehicleName, 
                            name: "Ganti Oli", 
                            dueDate: newDueDateStr,
                            history: [{ date: todayStr, action: "Pembuatan Otomatis", from: "-", to: newDueDateStr }]
                        });
                    }
                    saveReminders();
                    renderReminders();
                    showToast('Reminder Ganti Oli diperbarui!');
                }
            }
        );
    }
    // 2. LOGIKA PAJAK
    else if (category.toLowerCase().includes('pajak')) {
        const existingPajak1Thn = reminders.find(r => r.vehicleName === vehicleName && r.name.toLowerCase().includes('pajak tahunan'));
        const existingPajak5Thn = reminders.find(r => r.vehicleName === vehicleName && (r.name.toLowerCase().includes('ganti plat') || r.name.toLowerCase().includes('pajak 5 tahunan')) );
        
        let handled = false;

        // A. Cek Pajak 5 Tahunan
        if (existingPajak5Thn && existingPajak5Thn.dueDate && getDaysDifference(existingPajak5Thn.dueDate) <= 45) {
             const newDate5Str = calculateNextTaxDate(existingPajak5Thn.dueDate, 5);
             
             if (newDate5Str) {
                 handled = true;
                 showCustomConfirm(
                    'Perpanjang Pajak 5 Tahunan',
                    `Jatuh tempo Pajak 5 Tahunan/Ganti Plat terdeteksi dekat.<br>Perpanjang otomatis ke tanggal <strong>${newDate5Str}</strong>?`,
                    'Perpanjang',
                    false,
                    (confirmed) => {
                        if (confirmed) {
                             if(!existingPajak5Thn.history) existingPajak5Thn.history = [];
                             existingPajak5Thn.history.push({
                                date: todayStr,
                                action: "Update dari Transaksi (Pajak)",
                                from: existingPajak5Thn.dueDate,
                                to: newDate5Str
                             });
                             existingPajak5Thn.dueDate = newDate5Str;
                             saveReminders();
                             renderReminders();
                             showToast('Reminder Pajak 5 Thn diperbarui!');
                        }
                    }
                 );
             }
        } 
        
        // B. Cek Pajak 1 Tahunan (Hanya jika 5 tahunan tidak diproses agar popup tidak bentrok)
        if (!handled && existingPajak1Thn && existingPajak1Thn.dueDate && getDaysDifference(existingPajak1Thn.dueDate) <= 45) {
             const newDate1Str = calculateNextTaxDate(existingPajak1Thn.dueDate, 1);
             
             if (newDate1Str) {
                 showCustomConfirm(
                    'Perpanjang Pajak Tahunan',
                    `Jatuh tempo Pajak Tahunan terdeteksi dekat.<br>Perpanjang otomatis ke tanggal <strong>${newDate1Str}</strong>?`,
                    'Perpanjang',
                    false,
                    (confirmed) => {
                        if (confirmed) {
                             if(!existingPajak1Thn.history) existingPajak1Thn.history = [];
                             existingPajak1Thn.history.push({
                                date: todayStr,
                                action: "Update dari Transaksi (Pajak)",
                                from: existingPajak1Thn.dueDate,
                                to: newDate1Str
                             });
                             existingPajak1Thn.dueDate = newDate1Str;
                             saveReminders();
                             renderReminders();
                             showToast('Reminder Pajak Tahunan diperbarui!');
                        }
                    }
                 );
             }
        }
    }
}

// ========== Render & Pagination ============
function updateExpenses(){
  loadAll();
  const filter = getActiveFilter();
  const searched = applySearchAndFilter(expenses, $('#search').val().trim(), filter);
  renderTable(searched);
  renderCharts(searched);
  renderSummary(searched);
}

function applySearchAndFilter(list, query, filter){
  let res = list.slice();
  
  const vehicleFilter = $('#vehicleFilter').val();
  if (vehicleFilter) {
      res = res.filter(r => r.vehicle === vehicleFilter);
  }
  const categoryFilter = $('#categoryFilter').val();
  if (categoryFilter) {
      res = res.filter(r => r.category === categoryFilter);
  }
  const from = $('#fromDate').val(); const to = $('#toDate').val();
  if(from) res = res.filter(r=> r.date >= from);
  if(to) res = res.filter(r=> r.date <= to);
  
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if(filter==='today'){ res = res.filter(r=> r.date===todayStr); }
  if(filter==='week'){ const d = new Date(); d.setDate(today.getDate()-6); const start = d.toISOString().slice(0,10); res = res.filter(r=> r.date>=start && r.date<=todayStr); }
  if(filter==='month'){ const m = new Date().toISOString().slice(0,7); res = res.filter(r=> r.date.slice(0,7)===m); }
  if(filter==='month3'){ const d3 = new Date(); d3.setMonth(today.getMonth() - 3); const start3M = d3.toISOString().slice(0,10); res = res.filter(r=> r.date >= start3M && r.date <= todayStr); }
  if(filter==='year1'){ const d1Y = new Date(); d1Y.setFullYear(today.getFullYear() - 1); const start1Y = d1Y.toISOString().slice(0,10); res = res.filter(r=> r.date >= start1Y && r.date <= todayStr); }

  if(query){ const q=query.toLowerCase(); res = res.filter(r=> r.desc.toLowerCase().includes(q) || String(r.amount).includes(q) || r.category.toLowerCase().includes(q) || r.vehicle.toLowerCase().includes(q)); }
  
  res.sort((a,b)=> b.date.localeCompare(a.date) || b.id - a.id);
  return res;
}
function getActiveFilter(){ return $('#presetFilter').val() || 'all'; }

function renderTable(list){
  const tbody = $('#expenseTable'); tbody.empty();
  const emptyState = $('#tableEmptyState');
  emptyState.hide(); 
  
  const total = list.reduce((s,i)=> s + Number(i.amount||0), 0); 
  $('#totalAmount').text('Rp '+formatRupiah(total));
  $('#shownCount').text(list.length);

  if (list.length === 0) {
      $('#tableEmptyState p').text('Belum ada riwayat biaya. Tekan tombol + di bawah untuk memulai!');
      emptyState.show();
  } else {
      const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      if(currentPage>pages) currentPage = pages;
      const start = (currentPage-1)*PER_PAGE; const chunk = list.slice(start, start+PER_PAGE);
      
chunk.forEach((exp, i)=>{
        // Kita tambahkan onclick pada TR agar seluruh baris bisa diklik
      // KODE BARU (Menampilkan Tombol Edit & Hapus Langsung)
        tbody.append(`
        <tr style="cursor: pointer;" onclick="openRowAction(${exp.id})">
            <td>${escapeHtml(exp.desc)}</td>
            <td class="text-end">Rp ${formatRupiah(exp.amount)}</td>
            <td>${escapeHtml(exp.category)}</td>
            <td>${escapeHtml(exp.vehicle)}</td> 
            <td>${exp.date}</td>
            <td class="text-end action-cell">
                <button class="btn btn-sm btn-icon-only btn-outline-primary border-0 me-1" 
                        onclick="event.stopPropagation(); editExpense(${exp.id})" 
                        data-bs-toggle="tooltip" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-sm btn-icon-only btn-outline-danger border-0" 
                        onclick="event.stopPropagation(); askDelete(${exp.id})" 
                        data-bs-toggle="tooltip" title="Hapus">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`);
      });
      if (chunk.length < PER_PAGE) {
          $('#tableEmptyState p').text('Tidak ada lagi data untuk ditampilkan.');
          emptyState.show();
      }
  }
  renderPagination(list);
  initializeTooltips();
}

function renderPagination(list) {
  const ul = $('#pagination');
  ul.empty();
  if (list.length === 0) return; 
  
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const maxPagesToShow = 7;
  const pageWindow = Math.floor(maxPagesToShow / 2);
  
  function addPageItem(page, text = null, active = false, disabled = false) {
    const liClass = active ? 'active' : (disabled ? 'disabled' : '');
    const linkText = text || page;
    ul.append( `<li class="page-item ${liClass}"><a class="page-link" href="#" data-page="${page}">${linkText}</a></li>`);
  }

  if (currentPage > 1) {
    addPageItem(currentPage - 1, 'Prev');
  }

  let startPage = 1, endPage = pages;
  if (pages > maxPagesToShow) {
    startPage = Math.max(1, currentPage - pageWindow);
    endPage = Math.min(pages, currentPage + pageWindow);
    if (currentPage - pageWindow <= 1) { endPage = maxPagesToShow; }
    if (currentPage + pageWindow >= pages) { startPage = pages - maxPagesToShow + 1; }
  }

  if (startPage > 1) { addPageItem(1, '1'); if (startPage > 2) { addPageItem(0, '...', false, true); } }
  
  if (pages > 1) {
      for (let p = startPage; p <= endPage; p++) { addPageItem(p, null, p === currentPage); }
  }
  
  if (endPage < pages) { if (endPage < pages - 1) { addPageItem(0, '...', false, true); } addPageItem(pages, pages); }

  if (currentPage < pages) {
    addPageItem(currentPage + 1, 'Next');
  }
  
  ul.find('a').on('click', function(e) {
    e.preventDefault();
    const page = Number($(this).data('page'));
    if (page && page !== currentPage) {
      currentPage = page;
      renderTable(list);
    }
  });
}

window.editExpense = function(id){
  const item = expenses.find(item => item.id === id);
  const trueIndex = expenses.findIndex(item => item.id === id);
  if(!item || trueIndex === -1) return; 
  $('#desc').val(item.desc); 
  $('#amount').val(item.amount); 
  $('#category').val(item.category); 
  $('#vehicle').val(item.vehicle);
  $('#date').val(item.date); 
  $('#editIndex').val(trueIndex);
  $('#transactionModalTitle').text('Edit Riwayat Biaya');
  $('#saveBtn').html('Simpan Perubahan'); 
  transactionModal.show();
}

window.askDelete = function(id){ 
  deleteId = id;
  const md = new bootstrap.Modal(document.getElementById('confirmDeleteModal')); 
  md.show(); 
}
$('#confirmDeleteBtn').on('click', function(){ 
  if(deleteId === null) return;
  const indexToDelete = expenses.findIndex(item => item.id === deleteId);
  if (indexToDelete > -1) {
      expenses.splice(indexToDelete, 1);
      saveAll(); 
      updateExpenses(); 
      updateBadges();
      showToast('Riwayat dihapus');
  } else {
      showToast('Error: Riwayat tidak ditemukan');
  }
  deleteId = null;
  const md = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')); 
  md.hide(); 
});

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; }); }

// ========== Quick Add Feature ============
function renderQuickAddButtons() {
    const container = $('#quickAddButtons');
    container.empty();
    if (quickAddItems.length === 0) {
        container.append('<div class="small-muted empty-quick-add">Klik "Edit" untuk menambah tombol...</div>');
    } else {
        quickAddItems.forEach((item, index) => {
            if (categories.includes(item.category) && vehicles.find(v => v.name === item.vehicle)) {
                container.append(
                    `<button class="btn btn-sm btn-quick-add" data-index="${index}" data-bs-toggle="tooltip" title="Rp ${formatRupiah(item.amount)} | ${item.category} | ${item.vehicle}">+ ${item.desc}</button>`
                );
            }
        });
    }
    initializeTooltips();
}

function quickAddItem(desc, amount, category, vehicle) {
    const item = { desc, amount, category, vehicle, date: getTodayDate(), id: Date.now() };
    expenses.push(item);
    saveAll();
    checkAndExtendReminder(category, vehicle, getTodayDate());
    updateExpenses();
    updateBadges();
    showToast(`${desc} ditambahkan`);
}

function renderQuickAddModalList() {
    renderCategoryOptions();
    renderVehicleOptions();
    const list = $('#quickAddList');
    list.empty();
    quickAddItems.forEach((item, i) => {
        list.append(
            `<li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${item.desc}</strong>
                    <div class="small-muted">Rp ${formatRupiah(item.amount)} (${item.category} / ${item.vehicle})</div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteQuickAddItem(${i})" data-bs-toggle="tooltip" title="Hapus tombol ini"><i class="fa-solid fa-trash-can"></i></button>
            </li>`
        );
    });
    initializeTooltips();
}

window.deleteQuickAddItem = function(index) {
    const itemDesc = quickAddItems[index].desc;
    
    isPausedForConfirmation = true;
    quickAddModal.hide();

    showCustomConfirm('Konfirmasi Hapus Input Cepat', `Yakin ingin menghapus input cepat <strong>${itemDesc}</strong>?`, 'Hapus', true, (confirmed) => {
        if (confirmed) {
            quickAddItems.splice(index, 1);
            saveQuickAddItems();
            renderQuickAddButtons();
            renderQuickAddModalList();
        }
        setTimeout(() => { quickAddModal.show(); }, 200);
    });
}

// ========== Charts & Summary ============
function saveChartVisibility(){ localStorage.setItem(CHART_PREF_KEY, JSON.stringify(chartVisibility)); }
function loadChartVisibility(){ chartVisibility = JSON.parse(localStorage.getItem(CHART_PREF_KEY)) || { donut: true, line: true }; }

function updateLayout() {
    const donutCol = $('#donutChartCol');
    const lineCol = $('#lineChartCol');
    const chartsRow = $('#chartsRow');
    const showChartsBtn = $('#showChartsBtn');

    if (chartVisibility.donut) donutCol.show(); else donutCol.hide();
    if (chartVisibility.line) lineCol.show(); else lineCol.hide();

    if (chartVisibility.donut && chartVisibility.line) {
        donutCol.removeClass('col-md-12').addClass('col-md-6');
        lineCol.removeClass('col-md-12').addClass('col-md-6');
        $('#donutChartWrapper').show();
        $('#barChartWrapper').hide(); 
    } else if (chartVisibility.donut && !chartVisibility.line) {
        donutCol.removeClass('col-md-6').addClass('col-md-12');
        $('#donutChartWrapper').show();
        $('#barChartWrapper').show(); 
    } else if (!chartVisibility.donut && chartVisibility.line) {
        lineCol.removeClass('col-md-6').addClass('col-md-12');
        $('#barChartWrapper').hide(); 
    }

    if (!chartVisibility.donut && !chartVisibility.line) {
        chartsRow.hide();
        showChartsBtn.show();
        PER_PAGE = 17; 
    } else {
        chartsRow.show();
        if (!chartVisibility.donut || !chartVisibility.line) {
            showChartsBtn.show();
        } else {
            showChartsBtn.hide();
        }
        PER_PAGE = 8; 
    }
    updateExpenses(); 
    renderCharts(applySearchAndFilter(expenses, $('#search').val().trim(), getActiveFilter())); 
    initializeTooltips(); 
}

let catChart=null, trendChart=null;

function renderCharts(list){
  const catTotals = {};
  list.forEach(i=>{ catTotals[i.category] = (catTotals[i.category]||0) + Number(i.amount||0); });
  const catLabels = Object.keys(catTotals);
  const catData = Object.values(catTotals);
  const catColors = catLabels.map(label => stringToHslColor(label));

  const doughnutLabelPlugin = {
      id: 'doughnutLabel',
      afterDatasetsDraw(chart, args, options) {
        const { ctx, data } = chart;
        ctx.save();
        const meta = chart.getDatasetMeta(0);
        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
        
        meta.data.forEach((element, index) => {
           if (element.hidden) return;
           const value = data.datasets[0].data[index];
           const percent = (value / total * 100);
           if (percent < 4) return; // Hanya tampilkan jika > 4%
           const text = percent.toFixed(0) + '%';
           const { x, y } = element.tooltipPosition();
           ctx.font = 'bold 11px sans-serif';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           ctx.lineWidth = 3;
           ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'; // Outline hitam
           ctx.strokeText(text, x, y);
           ctx.fillStyle = '#ffffff'; // Text putih
           ctx.fillText(text, x, y);
        });
        ctx.restore();
      }
  };

  if (!catChart) {
    const ctx1 = document.getElementById('catChart').getContext('2d');
    catChart = new Chart(ctx1, { 
        type:'doughnut', 
        data:{ 
            labels:catLabels, 
            datasets:[{ data:catData, backgroundColor: catColors }]
        }, 
        options:{
         plugins: {
                legend: {
                    position: 'bottom', 
                    labels: { boxWidth: 12 },
                    onClick: (e) => e.stopPropagation() // Mencegah legenda diklik
                }
            },
            maintainAspectRatio:false,
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const clickedLabel = evt.chart.data.labels[elements[0].index]; 
                    const currentFilter = $('#categoryFilter').val();
                    if (clickedLabel !== currentFilter) {
                        $('#categoryFilter').val(clickedLabel);
                        $('#search').val('');
                        $('#presetFilter').val('all');
                        $('#fromDate').val('');
                        $('#toDate').val('');
                        $('#vehicleFilter').val('');
                        currentPage = 1;
                        updateExpenses();
                        showToast(`Filter diaktifkan: ${clickedLabel}`);
                    }
                }
            }
        },
        plugins: [doughnutLabelPlugin]
    });
  } else {
    catChart.data.labels = catLabels;
    catChart.data.datasets[0].data = catData;
    catChart.data.datasets[0].backgroundColor = catColors;
    catChart.update();
  }

  const trendChartTitle = $('#trendChart').closest('.card').find('h6');
  const dailyTotals = {};
  list.forEach(item => { dailyTotals[item.date] = (dailyTotals[item.date] || 0) + Number(item.amount || 0); });
  let sortedDates = Object.keys(dailyTotals).sort();
  let chartTitle = 'Tren Harian';
  
  if (list.length === 0) {
      sortedDates = [];
  } else if (sortedDates.length > 30) {
      sortedDates = sortedDates.slice(-30);
      chartTitle = `Tren 30 Hari Terakhir (Tampilan Saat Ini)`;
  } else if (sortedDates.length > 1) {
      chartTitle = `Tren Harian (${sortedDates[0]} s/d ${sortedDates[sortedDates.length-1]})`;
  } else if (sortedDates.length === 1) {
      chartTitle = `Tren Harian (${sortedDates[0]})`;
  }
  
  const chartLabels = sortedDates;
  const chartData = sortedDates.map(date => dailyTotals[date]);
  trendChartTitle.text(chartTitle);

  if (!trendChart) {
    const ctx2 = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctx2, { 
        type:'line', 
        data:{ 
            labels: chartLabels, 
            datasets:[{label:'Pengeluaran', data: chartData, fill:true, tension:0.3}]
        }, 
        options:{
            scales:{x:{display:false}},
            maintainAspectRatio:false,
            plugins: { legend: { display: false } }, 
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const clickedDate = evt.chart.data.labels[elements[0].index]; 
                    const currentFromDate = $('#fromDate').val();
                    if (clickedDate && clickedDate !== currentFromDate) {
                        $('#fromDate').val(clickedDate);
                        $('#toDate').val(clickedDate);
                        $('#presetFilter').val('all');
                        $('#search').val('');
                        $('#categoryFilter').val('');
                        $('#vehicleFilter').val('');
                        currentPage = 1;
                        updateExpenses();
                        showToast(`Menampilkan riwayat untuk ${clickedDate}`);
                    }
                }
            }
        }
    });
  } else {
    trendChart.data.labels = chartLabels;
    trendChart.data.datasets[0].data = chartData;
    trendChart.update();
  }
  
  if (barChart) {
      barChart.destroy();
      barChart = null;
  }
  
  if (chartVisibility.donut && !chartVisibility.line) {
      const ctxBar = document.getElementById('barChart').getContext('2d');
      barChart = new Chart(ctxBar, {
          type: 'bar',
          data: {
              labels: catLabels,
              datasets: [{
                  label: 'Biaya per Kategori',
                  data: catData,
                  backgroundColor: catColors,
              }]
          },
          options: {
              maintainAspectRatio: false,
              indexAxis: 'y', 
              plugins: {
                  legend: { display: false } 
              }
          }
      });
  }
}

function renderSummary(list){
  const totalFiltered = list.reduce((s,i)=> s + Number(i.amount||0), 0);
  $('#sumFiltered').text('Rp '+formatRupiah(totalFiltered));
  let avgDay = 0;
  if (list.length > 0) {
    const uniqueDates = new Set(list.map(i => i.date));
    const dayCount = uniqueDates.size > 0 ? uniqueDates.size : 1;
    avgDay = Math.round(totalFiltered / dayCount);
  }
  $('#avgFiltered').text('Rp '+formatRupiah(avgDay));
  const catTotals = {};
  list.forEach(i=> catTotals[i.category] = (catTotals[i.category]||0) + Number(i.amount||0));
  const top = Object.entries(catTotals).sort((a,b)=> b[1]-a[1])[0]; 
  $('#topCat').text(top? `${top[0]} (Rp ${formatRupiah(top[1])})` : '-');
}

// ========== Backup / Restore / Reset ============
$('#downloadJson').on('click', ()=>{
  const data = {expenses, categories, badges, badgeHistory, totalBudget, quickAddItems, vehicles, reminders, meta:{exportedAt: new Date().toISOString()}};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = 'ArtoMojo_backup_'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
$('#uploadJson').on('change', function(e){
  const file = this.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(ev){
    try{ const obj = JSON.parse(ev.target.result); if(!obj.expenses) throw 'Format salah'; 
        expenses = obj.expenses; 
        categories = obj.categories || defaultCats.slice(); 
        badges = obj.badges || []; 
        badgeHistory = obj.badgeHistory || {};
        totalBudget = obj.totalBudget || 0;
        quickAddItems = obj.quickAddItems || [];
        vehicles = obj.vehicles || defaultVehicles.slice();
        reminders = obj.reminders || []; 

        saveAll(); saveCats(); saveBadges(); saveBadgeHistory(); saveTotalBudget(); saveQuickAddItems(); saveVehicles(); saveReminders(); 
        loadVehicles(); 
        
        renderCategoryOptions(); renderCatList(); 
        renderVehicleOptions(); renderVehicleList();
        renderReminderNameOptions();
        renderReminders(); 
        updateExpenses(); 
        updateBadges();
        renderQuickAddButtons();
        showToast('Data berhasil di-restore'); 
    }
    catch(err){ showToast('File tidak valid: ' + err.message); }
  }; reader.readAsText(file);
  $(this).val('');
});
$('#resetData').on('click', ()=>{ 
    showCustomConfirm('Reset Semua Data', '<strong>HATI-HATI!</strong> Aksi ini akan menghapus <strong>SEMUA</strong> data pengeluaran, kategori, dan reminder Anda secara permanen. Lanjutkan?', 'Reset Sekarang', true, (confirmed) => {
        if (confirmed) {
            expenses=[]; badges=[]; categories=defaultCats.slice(); badgeHistory = {}; totalBudget = 0; quickAddItems = []; vehicles = defaultVehicles.slice(); reminders = [];
            saveAll(); saveCats(); saveBadges(); saveBadgeHistory(); saveTotalBudget(); saveQuickAddItems(); saveVehicles(); saveReminders(); 
            
            renderCategoryOptions(); renderCatList(); 
            renderVehicleOptions(); renderVehicleList();
            renderReminderNameOptions();
            renderReminders();
            updateExpenses(); 
            updateBadges();
            renderQuickAddButtons();
            showToast('Data direset'); 
        }
    });
});

// ========== Badges & Gamification ============
const MASTER_BADGES = {
  'hemat_bulanan': { name: 'Bulan Hemat' },
  'rajin_mencatat': { name: 'Rajin Merawat', threshold: 100 } 
};

function logBadgeHistory(badgeId, month) {
    if (!badgeHistory[badgeId]) { badgeHistory[badgeId] = []; }
    if (!badgeHistory[badgeId].includes(month)) {
        badgeHistory[badgeId].push(month);
        badgeHistory[badgeId].sort().reverse();
    }
}

function updateBadges(){
  const today = new Date();
  const currentMonthKey = today.toISOString().slice(0, 7);
  const criteria2 = MASTER_BADGES['rajin_mencatat'];
  
  MASTER_BADGES['hemat_bulanan'].threshold = totalBudget;

  const monthlyTotals = {};
  const monthNames = {};
  expenses.forEach(item => {
      const monthKey = item.date.slice(0, 7);
      if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = 0;
          const d = new Date(item.date + 'T12:00:00');
          monthNames[monthKey] = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      }
      if (item.category && !item.category.toLowerCase().includes('pajak')) {
        monthlyTotals[monthKey] += Number(item.amount || 0);
      }
  });
  
  const newHistory = [];
  for (const monthKey in monthlyTotals) {
      if (monthKey === currentMonthKey) continue; 
      const total = monthlyTotals[monthKey];
      newHistory.push({
          key: monthKey,
          month: monthNames[monthKey],
          total: total,
          success: (total < totalBudget && total > 0)
      });
  }
  newHistory.sort((a, b) => b.key.localeCompare(a.key));
  badgeHistory['hemat_bulanan'] = newHistory;
  
  let isTotalEarned = (expenses.length >= criteria2.threshold);
  if (isTotalEarned && !badgeHistory['rajin_mencatat']) {
      badgeHistory['rajin_mencatat'] = [{ key: 'permanent', month: 'Didapat Permanen', total: expenses.length, success: true }];
  }
  
  const sumCurrentMonth = monthlyTotals[currentMonthKey] || 0;
  let isMonthEarned = (sumCurrentMonth < totalBudget && sumCurrentMonth > 0);
  
  saveBadgeHistory(); 
  renderBudgetProgress(sumCurrentMonth, totalBudget);
  renderBadges(isMonthEarned, sumCurrentMonth, isTotalEarned, expenses.length, totalBudget);
}

function renderBudgetProgress(used, total) {
  const remaining = total - used;
  let percent = (total > 0) ? (used / total) * 100 : 0;
  if (percent > 100) percent = 100;
  
  const progressBar = $('#budgetProgress');
  progressBar.css('width', percent + '%');
  progressBar.removeClass('bg-danger bg-warning');
  if (percent > 90) { progressBar.addClass('bg-danger'); } 
  else if (percent > 70) { progressBar.addClass('bg-warning'); }

  $('#budgetUsed').text('Rp ' + formatRupiah(used));
  $('#budgetTotal').text('Rp ' + formatRupiah(total));
  
  if (remaining >= 0) {
      $('#budgetRemaining').text(`Sisa: Rp ${formatRupiah(remaining)}`);
  } else {
      $('#budgetRemaining').text(`Lebih: Rp ${formatRupiah(Math.abs(remaining))}`);
  }
}

function renderBadges(isMonthEarned, sumMonth, isTotalEarned, totalCount, budget){ 
  const area = $('#badgesArea'); 
  const insights = $('#insights');
  area.empty(); 
  insights.empty();
  
  // --- BADGE 1: BULAN HEMAT ---
  const criteria1 = MASTER_BADGES['hemat_bulanan'];
  const badge1Container = $('<div class="badge-container"></div>');
  
  if (budget > 0) {
      if (isMonthEarned) {
        // Sukses (Ikon Piala)
        badge1Container.append(`<span class="badge-item" data-bs-toggle="tooltip" title="Selamat! Anda berhasil hemat bulan ini"><i class="fa-solid fa-trophy me-1"></i> ${criteria1.name} (Bulan Ini)</span>`);
        insights.append(`<div>Kerja bagus! Biaya servis bulan ini (Rp ${formatRupiah(sumMonth)}) di bawah target.</div>`);
      } else {
        // Gagal/Belum (Ikon Gembok) - PERBAIKAN DISINI
        badge1Container.append(`<span class="badge-locked" data-bs-toggle="tooltip" title="Target: Rp ${formatRupiah(budget)}. Saat ini: Rp ${formatRupiah(sumMonth)}"><i class="fa-solid fa-lock me-1"></i> ${criteria1.name} (Bulan Ini)</span>`);
        insights.append(`<div><b>Target:</b> Jaga biaya di bawah Rp ${formatRupiah(budget)}. (Saat ini: Rp ${formatRupiah(sumMonth)})</div>`);
      }
      badge1Container.append(`<button class="btn btn-sm btn-outline-light" onclick="showBadgeHistory('hemat_bulanan')" data-bs-toggle="tooltip" title="Lihat riwayat lencana 'Bulan Hemat' Anda">Riwayat</button>`);
  } else {
      // Belum set budget
      badge1Container.append(`<span class="badge-locked" data-bs-toggle="tooltip" title="Atur anggaran bulanan Anda di tombol 'Setting' Anggaran Servis"><i class="fa-solid fa-lock me-1"></i> ${criteria1.name}</span>`);
      insights.append(`<div>Atur anggaran di menu 'Setting' Progres Anggaran untuk mengaktifkan lencana ini.</div>`);
  }
  area.append(badge1Container);

  // --- BADGE 2: RAJIN MENCATAT ---
  const criteria2 = MASTER_BADGES['rajin_mencatat'];
  const badge2Container = $('<div class="badge-container"></div>');
  
  if (isTotalEarned) {
     // Sukses (Ikon Pena)
     badge2Container.append(`<span class="badge-item" data-bs-toggle="tooltip" title="Total ${totalCount} riwayat telah dicatat!"><i class="fa-solid fa-pen-to-square me-1"></i> ${criteria2.name}</span>`);
     insights.append(`<div class="mt-2">Anda telah mencatat <strong>${totalCount}</strong> riwayat. Konsisten!</div>`);
  } else {
     // Belum (Ikon Gembok) - PERBAIKAN DISINI (Dan fix typo class=)
     badge2Container.append(`<span class="badge-locked" data-bs-toggle="tooltip" title="Progres: ${totalCount}/${criteria2.threshold} riwayat"><i class="fa-solid fa-lock me-1"></i> ${criteria2.name}</span>`);
     insights.append(`<div class="mt-2"><b>Target:</b> Catat ${criteria2.threshold} riwayat. (Progres: ${totalCount}/${criteria2.threshold})</div>`);
  }
  area.append(badge2Container);
  
  initializeTooltips();
}

function renderTotalBudgetModal() {
    $('#totalBudgetInput').val(totalBudget > 0 ? totalBudget : '');
}

function saveTotalBudgetFromModal() {
    totalBudget = Number($('#totalBudgetInput').val()) || 0;
    saveTotalBudget();
    updateBadges(); 
    showToast('Anggaran total disimpan');
}

window.showBadgeHistory = function(badgeId) {
    const history = badgeHistory[badgeId] || [];
    const badgeName = MASTER_BADGES[badgeId] ? MASTER_BADGES[badgeId].name : "Riwayat";
    $('#badgeHistoryModal .modal-title').text(`Riwayat Lencana: ${badgeName}`);
    const list = $('#badgeHistoryList');
    list.empty();
    if (history.length > 0) {
        $('#badgeHistoryIntro').text("Riwayat pencapaian bulanan Anda:").show();
        history.forEach(item => {
            if (typeof item === 'string') {
                 list.append(`<li class="list-group-item">${item}</li>`);
            } else {
                 const statusIcon = item.success ? '<i class="fa-solid fa-trophy"></i>' : '<i class="fa-solid fa-circle-xmark"></i>';
                 const statusClass = item.success ? 'text-success' : 'text-danger';
                 list.append(
                    `<li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${item.month}</strong>
                            <div class="small-muted">Total: Rp ${formatRupiah(item.total)}</div>
                        </div>
                        <span class="${statusClass} fw-bold">${statusIcon} ${item.success ? 'Berhasil' : 'Gagal'}</span>
                    </li>`
                 );
            }
        });
    } else {
        $('#badgeHistoryIntro').text("Riwayat untuk lencana ini masih kosong.").show();
        list.append(`<li class="list-group-item">Anda belum memiliki riwayat bulan lalu.</li>`);
    }
    const md = new bootstrap.Modal(document.getElementById('badgeHistoryModal'));
    md.show();
}

$('#toggleTheme').on('click', ()=>{
  $('body').toggleClass('dark'); const pref = loadPref(); pref.dark = $('body').hasClass('dark'); savePref(pref); showToast('Theme diubah');
});

function tryNotifyPermission(){ if(!('Notification' in window)) return; if(Notification.permission==='default') Notification.requestPermission(); }
tryNotifyPermission();
// =========================================
// REAL-TIME TRACKING TOUR ENGINE (RESPONSIVE FIXED)
// =========================================

const tourData = [
  {
    element: 'intro',
    title: '👋 Halo!',
    text: 'Selamat datang di ArtoMojo. Mode tutorial ini akan memandu Anda fitur demi fitur.'
  },
  {
    element: '#addTransactionBtn',
    title: '1. Catat Transaksi',
    text: 'Klik tombol (+) ini untuk mulai mencatat pengeluaran baru.'
  },
  {
    element: '#manageRemindersBtn', // Item ini ada di dalam Navbar
    title: '2. Reminder',
    text: 'Atur jadwal ganti oli dan pajak di sini agar tidak lupa.'
  },
  {
    element: '#presetFilter', 
    title: '3. Filter',
    text: 'Gunakan dropdown ini untuk menyaring data berdasarkan waktu.'
  },
  {
    element: '#badgesArea',
    title: '4. Prestasi',
    text: 'Cek lencana hemat Anda di sini.'
  },
  {
    element: '#downloadJson', // Item ini juga mungkin di dalam Navbar/Collapse
    title: '5. Backup',
    text: 'Jangan lupa download backup data secara berkala.'
  }
];

let curStep = 0;
let trackerRequestId = null; 

function startTour() {
    curStep = 0;
    $('body').addClass('tour-active');
    
    // Pastikan Navbar tertutup dulu saat mulai (opsional, biar rapi)
    $('.navbar-collapse').collapse('hide');
    
    trackPosition();
    renderStep();
}

// --- 1. THE TRACKING LOOP ---
function trackPosition() {
    const step = tourData[curStep];
    
    if (step && step.element !== 'intro') {
        const target = $(step.element);
        
        // Cek visibility. Jika navbar sedang animasi membuka, kita tunggu sampai terlihat
        if (target.length && target.is(':visible')) {
            const rect = target[0].getBoundingClientRect();
            
            $('#tour-focus-ring').css({
                display: 'block',
                top: rect.top - 5,
                left: rect.left - 5,
                width: rect.width + 10,
                height: rect.height + 10,
                borderRadius: getBorderRadius(target)
            });
            
            updateTooltipPosition(rect);
        } else {
             // Jika elemen tidak terlihat (misal belum selesai animasi buka navbar), sembunyikan ring
             $('#tour-focus-ring').hide();
        }
    } else {
        // Mode Intro
        $('#tour-focus-ring').css({
            display: 'block',
            top: '50%', left: '50%', width: 0, height: 0,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)'
        });
        centerTooltip();
    }

    trackerRequestId = requestAnimationFrame(trackPosition);
}

// --- 2. RENDER STEP (LOGIKA UTAMA) ---
function renderStep() {
    const step = tourData[curStep];

    $('.tour-target-active').removeClass('tour-target-active');
    $('.tour-target-fixed').removeClass('tour-target-fixed');

    $('#tour-step-count').text(`${curStep + 1} / ${tourData.length}`);
    $('#tour-title').text(step.title);
    $('#tour-desc').text(step.text);
    
    if(curStep===0) $('#tour-prev').hide(); else $('#tour-prev').show();
    if(curStep===tourData.length-1) $('#tour-next').text('Selesai'); else $('#tour-next').text('Lanjut');

    $('#tour-tooltip').show();

    if (step.element !== 'intro') {
        const target = $(step.element);
        
        // === FITUR AUTO-OPEN NAVBAR ===
        // Cek apakah target ada di dalam navbar yang sedang collapse (tertutup)
        const navbarCollapse = target.closest('.navbar-collapse');
        if (navbarCollapse.length > 0 && !navbarCollapse.hasClass('show')) {
            // Buka navbar secara manual
            new bootstrap.Collapse(navbarCollapse[0], { toggle: false }).show();
            
            // Beri sedikit jeda agar animasi Bootstrap jalan dulu sebelum scroll
            setTimeout(() => {
               scrollToTarget(target);
            }, 350); 
        } else {
            scrollToTarget(target);
        }
    }
}

function scrollToTarget(target) {
    if(target.length && target.is(':visible')) {
        if (target.css('position') === 'fixed') {
            target.addClass('tour-target-fixed');
        } else {
            target.addClass('tour-target-active');
        }

        target[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }
}

// --- HELPERS ---
function updateTooltipPosition(rect) {
    // Jika di Mobile (<768px), posisi diatur oleh CSS (Bottom Sheet), 
    // jadi kita abaikan logic JS ini agar tidak bentrok.
    if (window.innerWidth <= 768) {
        return; 
    }

    const tooltip = $('#tour-tooltip');
    const winH = window.innerHeight;
    const winW = window.innerWidth;
    
    let top = rect.bottom + 15;
    let left = rect.left;

    if (top + tooltip.outerHeight() > winH) {
        top = rect.top - tooltip.outerHeight() - 15;
    }
    if (left + tooltip.outerWidth() > winW) {
        left = winW - tooltip.outerWidth() - 20;
    }
    if (left < 10) left = 10;

    tooltip.css({ top: top, left: left });
}

function centerTooltip() {
    // Intro tetap di tengah walau mobile
    const tooltip = $('#tour-tooltip');
    // Reset style bottom sheet jika user resize window dari kecil ke besar saat intro
    if (window.innerWidth > 768) {
        tooltip.css({ top: '', bottom: '', left: '', right: '', transform: '' });
    }
    
    const winH = window.innerHeight;
    const winW = window.innerWidth;
    
    tooltip.css({
        top: (winH / 2) - (tooltip.outerHeight() / 2),
        left: (winW / 2) - (tooltip.outerWidth() / 2)
    });
}

function getBorderRadius(target) {
    const r = target.css('border-radius');
    if (r === '50%' || parseInt(r) > 40) return '50%';
    return '8px';
}

function moveNext() { 
    if (curStep < tourData.length - 1) { curStep++; renderStep(); } 
    else { endTour(); } 
}
function movePrev() { 
    if (curStep > 0) { curStep--; renderStep(); } 
}

function endTour() {
    if (trackerRequestId) cancelAnimationFrame(trackerRequestId);
    
    // Tutup Navbar jika masih terbuka
    $('.navbar-collapse').collapse('hide');
    
    $('.tour-target-active').removeClass('tour-target-active');
    $('.tour-target-fixed').removeClass('tour-target-fixed');
    $('body').removeClass('tour-active');
    
    $('#tour-focus-ring').hide();
    $('#tour-tooltip').hide();
    
    localStorage.setItem('SAMSAT_tour_done', 'true');
    showToast('Tutorial selesai!');
}

$(document).ready(function() {
    $('#tour-next').off('click').on('click', moveNext);
    $('#tour-prev').off('click').on('click', movePrev);
    $('#tour-skip').off('click').on('click', endTour);
    $('#startTourBtn').off('click').on('click', function(e){
        e.preventDefault();
        // Jangan tutup navbar di sini, biar logika renderStep yang mengurusnya
        startTour();
    });
});

// =========================================
// FIX: FUNGSI ROW ACTION (TANPA DUPLIKASI)
// =========================================

// Catatan: rowActionModalInstance sudah di-define di awal file script.js (baris 33)
// Jadi kita tidak perlu 'new bootstrap.Modal' lagi di sini.

window.openRowAction = function(id) {
    const item = expenses.find(x => x.id === id);
    if (!item) return;

    // 1. Isi data ke dalam Modal
    $('#rowActionTitle').text(item.vehicle || 'Detail Transaksi');
    $('#rowActionAmount').text('Rp ' + formatRupiah(item.amount));
    $('#rowActionDesc').text(item.desc + ' (' + item.category + ')');
    $('#rowActionDate').text(item.date);

    // 2. Atur fungsi tombol Edit
    $('#btnActionEdit').off('click').on('click', function() {
        rowActionModalInstance.hide();
        setTimeout(() => { editExpense(id); }, 200);
    });

    // 3. Atur fungsi tombol Hapus
    $('#btnActionDelete').off('click').on('click', function() {
        rowActionModalInstance.hide();
        setTimeout(() => { askDelete(id); }, 200);
    });

    // 4. Tampilkan Modal menggunakan instance yang benar
    rowActionModalInstance.show();
}