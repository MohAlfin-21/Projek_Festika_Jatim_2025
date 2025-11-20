// ========== Utilities ============
const STORAGE_KEY = 'ec_expenses_v1';
const CAT_KEY = 'ec_categories_v1';
const BADGE_KEY = 'ec_badges_v1';
const PREF_KEY = 'ec_pref_v1';
const BADGE_HISTORY_KEY = 'ec_badge_history_v1';
const BUDGET_KEY = 'ec_total_budget_v1'; // <-- KEY BERUBAH
const QUICK_ADD_KEY = 'ec_quick_add_v1';
let expenses = [];
let categories = [];
let badges = [];
let badgeHistory = {};
let totalBudget = 0; // <-- VARIABEL BERUBAH
let quickAddItems = [];
let deleteId = null;
let PER_PAGE = 8; let currentPage = 1;
let transactionModal = null; 
let categoryBudgetModal = null;
let quickAddModal = null;

const defaultCats = ['Makanan','Transportasi','Hiburan','Pendidikan','Lainnya'];

function showToast(msg){
  $('#toastBody').text(msg);
  const t = new bootstrap.Toast(document.getElementById('appToast'));
  t.show();
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
// FUNGSI INI BERUBAH
function saveTotalBudget(){ localStorage.setItem(BUDGET_KEY, JSON.stringify(totalBudget)); }
function loadTotalBudget(){ totalBudget = JSON.parse(localStorage.getItem(BUDGET_KEY)) || 0; }
function saveQuickAddItems(){ localStorage.setItem(QUICK_ADD_KEY, JSON.stringify(quickAddItems)); }
function loadQuickAddItems(){ quickAddItems = JSON.parse(localStorage.getItem(QUICK_ADD_KEY)) || []; }


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
  transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
  categoryBudgetModal = new bootstrap.Modal(document.getElementById('categoryBudgetModal'));
  quickAddModal = new bootstrap.Modal(document.getElementById('quickAddModal'));

  // --- TAMBAHAN: Inisialisasi Bootstrap Tooltip ---
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // LOAD INI BERUBAH
  loadCats(); loadAll(); loadBadges(); loadBadgeHistory(); loadTotalBudget(); loadQuickAddItems();
  const pref = loadPref(); if(pref.dark) $('body').addClass('dark');
  
  renderCategoryOptions(); renderCatList();
  
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
  
  // --- Event Listeners ---
  $('#addTransactionBtn').on('click', function() {
    $('#expenseForm')[0].reset();
    $('#editIndex').val(-1);
    $('#transactionModalTitle').text('Tambah Transaksi');
    $('#saveBtn').text('💾 Simpan');
    $('#date').val(getTodayDate());
  });
  
  // LISTENER INI BERUBAH
  $('#editBudgetBtn').on('click', function() {
      renderTotalBudgetModal(); // <-- Nama fungsi baru
      categoryBudgetModal.show();
  });
  
  $('#saveTotalBudgetBtn').on('click', function() { // <-- ID tombol baru
      saveTotalBudgetFromModal(); // <-- Nama fungsi baru
      categoryBudgetModal.hide();
  });
  
  $('#addNewCatFromModal').on('click', function() {
    const name = prompt("Masukkan nama kategori baru:");
    if (name && name.trim() !== "") {
        const newName = name.trim();
        if (categories.includes(newName)) {
            showToast('Kategori sudah ada');
        } else {
            categories.push(newName);
            saveCats();
            renderCategoryOptions();
            renderCatList();
            $('#category').val(newName);
            showToast('Kategori ditambahkan');
        }
    }
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
      if (!desc || !amount || !category) {
          return showToast("Lengkapi semua field input cepat");
      }
      quickAddItems.push({ desc, amount, category });
      saveQuickAddItems();
      renderQuickAddButtons();
      renderQuickAddModalList();
      $('#quickAddForm')[0].reset();
  });
  
  $('#catChart').on('dblclick', function(e) {
      const elements = catChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
      if (elements.length === 0) {
          if ($('#search').val() !== "" || $('#fromDate').val() !== "" || $('#toDate').val() !== "" || $('#categoryFilter').val() !== "") {
              $('#search').val('');
              $('#fromDate').val('');
              $('#toDate').val('');
              $('#categoryFilter').val('');
              currentPage = 1;
              updateExpenses();
              showToast('Filter di-reset');
          }
      }
  });
  
  $('#trendChart').on('dblclick', function() {
      if ($('#search').val() !== "" || $('#fromDate').val() !== "" || $('#toDate').val() !== "" || $('#categoryFilter').val() !== "") {
          $('#search').val('');
          $('#fromDate').val('');
          $('#toDate').val('');
          $('#categoryFilter').val('');
          currentPage = 1;
          updateExpenses();
          showToast('Filter di-reset');
      }
  });
});

// ========== Category Management ============
function renderCategoryOptions(){
  const sel = $('#category, #qaCategory');
  sel.empty(); sel.append('<option value="">Pilih Kategori</option>');
  categories.forEach(c=> sel.append(`<option value="${c}">${c}</option>`));
}
$('#manageCatsBtn').on('click', ()=> $('#catsModal').modal('show'));
$('#addCatBtn').on('click', ()=>{
  const name = $('#newCat').val().trim(); if(!name) return showToast('Masukkan nama kategori');
  if(categories.includes(name)) return showToast('Kategori sudah ada');
  categories.push(name); saveCats(); renderCategoryOptions(); renderCatList(); $('#newCat').val(''); showToast('Kategori ditambahkan');
});
function renderCatList(){
  const list = $('#catList'); list.empty(); categories.forEach((c, i)=>{
    list.append(`<li class="list-group-item d-flex justify-content-between align-items-center">${c} <div><button class="btn btn-sm btn-outline-light me-1" data-idx="${i}" onclick="renameCat(${i})">Rename</button><button class="btn btn-sm btn-danger" data-idx="${i}" onclick="removeCat(${i})">Hapus</button></div></li>`);
  });
}
function removeCat(i){
  const name = categories[i]; if(!confirm('Hapus kategori '+name+'?')) return;
  categories.splice(i,1); saveCats(); renderCategoryOptions(); renderCatList(); showToast('Kategori dihapus');
}
function renameCat(i){
  const newName = prompt('Nama baru untuk kategori', categories[i]); if(!newName) return; categories[i]=newName; saveCats(); renderCategoryOptions(); renderCatList(); showToast('Kategori diganti');
}

// ========== Form handlers ============
$('#clearForm').on('click', ()=>{ $('#expenseForm')[0].reset(); $('#editIndex').val(-1); $('#saveBtn').text('💾 Simpan'); });

$('#expenseForm').on('submit', function(e){
  e.preventDefault();
  const idx = parseInt($('#editIndex').val(),10);
  const desc = $('#desc').val().trim();
  let amount = $('#amount').val().replace(/[^0-9.]/g,''); amount = Number(amount);
  const category = $('#category').val();
  const date = $('#date').val();
  if(!desc || !amount || !category || !date) { showToast('Lengkapi semua field'); return; }
  if(amount <= 0){ showToast('Jumlah harus > 0'); return; }
  
  const item = {desc, amount, category, date, id: Date.now()};
  if(idx>=0){ 
      expenses[idx] = {...expenses[idx], desc, amount, category, date}; 
      showToast('Transaksi diperbarui');
  }
  else { 
      expenses.push(item); 
      showToast('Transaksi ditambahkan'); 
  }
  saveAll(); 
  transactionModal.hide(); 
  updateExpenses(); 
  updateBadges();
});

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

  if(query){ const q=query.toLowerCase(); res = res.filter(r=> r.desc.toLowerCase().includes(q) || String(r.amount).includes(q) || r.category.toLowerCase().includes(q)); }
  
  res.sort((a,b)=> b.date.localeCompare(a.date) || b.id - a.id);
  return res;
}
function getActiveFilter(){ return $('#presetFilter').val() || 'all'; }
$('#presetFilter, #search, #fromDate, #toDate').on('change keyup', ()=>{ 
  currentPage=1; 
  $('#categoryFilter').val('');
  updateExpenses(); 
});
$('#resetFiltersBtn').on('click', function() {
  $('#search').val('');
  $('#presetFilter').val('all');
  $('#fromDate').val('');
  $('#toDate').val('');
  $('#categoryFilter').val('');
  currentPage = 1;
  updateExpenses();
});

// --- BERUBAH: Fungsi ini sekarang menangani state kosong ---
function renderTable(list){
  const tbody = $('#expenseTable'); tbody.empty();
  const total = list.reduce((s,i)=> s + Number(i.amount||0), 0); 
  $('#totalAmount').text('Rp '+formatRupiah(total));
  
  $('#shownCount').text(list.length);

  if (list.length === 0) {
      // --- TAMBAHAN: Tampilkan baris state kosong ---
      tbody.append('<tr class="table-empty-row"><td colspan="5">Belum ada transaksi. Tekan tombol + di bawah untuk memulai!</td></tr>');
  } else {
      // --- Kode yang sudah ada, sekarang di dalam 'else' ---
      const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      if(currentPage>pages) currentPage = pages;
      const start = (currentPage-1)*PER_PAGE; const chunk = list.slice(start, start+PER_PAGE);
      
      chunk.forEach((exp, i)=>{
        tbody.append(`<tr><td>${escapeHtml(exp.desc)}</td><td class="text-end">Rp ${formatRupiah(exp.amount)}</td><td>${escapeHtml(exp.category)}</td><td>${exp.date}</td><td><div class=\"d-flex gap-1 justify-content-center\"><button class=\"btn btn-sm btn-outline-light\" onclick=\"editExpense(${exp.id})\">Edit</button><button class=\"btn btn-sm btn-danger\" onclick=\"askDelete(${exp.id})\">Hapus</button></div></td></tr>`);
      });
  }
  
  renderPagination(list);
}

// --- BERUBAH: Fungsi ini sekarang menyembunyikan paginasi saat kosong ---
function renderPagination(list) {
  const ul = $('#pagination');
  ul.empty();

  // --- TAMBAHAN: Jangan render paginasi jika daftar kosong ---
  if (list.length === 0) return; 

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const maxPagesToShow = 7;
  const pageWindow = Math.floor(maxPagesToShow / 2);
  function addPageItem(page, text = null, active = false, disabled = false) {
    const liClass = active ? 'active' : (disabled ? 'disabled' : '');
    const linkText = text || page;
    ul.append( `<li class="page-item ${liClass}"><a class="page-link" href="#" data-page="${page}">${linkText}</a></li>`);
  }
  addPageItem(currentPage - 1, 'Prev', false, currentPage === 1);
  let startPage = 1, endPage = pages;
  if (pages > maxPagesToShow) {
    startPage = Math.max(1, currentPage - pageWindow);
    endPage = Math.min(pages, currentPage + pageWindow);
    if (currentPage - pageWindow <= 1) { endPage = maxPagesToShow; }
    if (currentPage + pageWindow >= pages) { startPage = pages - maxPagesToShow + 1; }
  }
  if (startPage > 1) { addPageItem(1, '1'); if (startPage > 2) { addPageItem(0, '...', false, true); } }
  for (let p = startPage; p <= endPage; p++) { addPageItem(p, null, p === currentPage); }
  if (endPage < pages) { if (endPage < pages - 1) { addPageItem(0, '...', false, true); } addPageItem(pages, pages); }
  addPageItem(currentPage + 1, 'Next', false, currentPage === pages);
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
  $('#date').val(item.date); 
  $('#editIndex').val(trueIndex);
  $('#transactionModalTitle').text('Edit Transaksi');
  $('#saveBtn').text('Simpan Perubahan'); 
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
      showToast('Transaksi dihapus');
  } else {
      showToast('Error: Transaksi tidak ditemukan');
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
            if (categories.includes(item.category)) {
                container.append(
                    `<button class="btn btn-sm btn-quick-add" data-index="${index}">+ ${item.desc}</button>`
                );
            }
        });
    }
    
    container.off('click', '.btn-quick-add').on('click', '.btn-quick-add', function() {
        const item = quickAddItems[$(this).data('index')];
        quickAddItem(item.desc, item.amount, item.category);
    });
}

function quickAddItem(desc, amount, category) {
    const item = { desc, amount, category, date: getTodayDate(), id: Date.now() };
    expenses.push(item);
    saveAll();
    updateExpenses();
    updateBadges();
    showToast(`${desc} ditambahkan`);
}

function renderQuickAddModalList() {
    renderCategoryOptions();
    const list = $('#quickAddList');
    list.empty();
    quickAddItems.forEach((item, i) => {
        list.append(
            `<li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${item.desc}</strong>
                    <div class="small-muted">Rp ${formatRupiah(item.amount)} (${item.category})</div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteQuickAddItem(${i})">Hapus</button>
            </li>`
        );
    });
}

window.deleteQuickAddItem = function(index) {
    if (confirm(`Yakin ingin menghapus input cepat "${quickAddItems[index].desc}"?`)) {
        quickAddItems.splice(index, 1);
        saveQuickAddItems();
        renderQuickAddButtons();
        renderQuickAddModalList();
    }
}


// ========== Charts & Summary ============
let catChart=null, trendChart=null;

function renderCharts(list){
  // --- Chart Kategori ---
  const catTotals = {};
  list.forEach(i=>{ catTotals[i.category] = (catTotals[i.category]||0) + Number(i.amount||0); });
  const catLabels = Object.keys(catTotals);
  const catData = Object.values(catTotals);
  const catColors = catLabels.map(label => stringToHslColor(label));

  if (!catChart) {
    const ctx1 = document.getElementById('catChart').getContext('2d');
    catChart = new Chart(ctx1, { 
        type:'doughnut', 
        data:{ 
            labels:catLabels, 
            datasets:[{ data:catData, backgroundColor: catColors }]
        }, 
        options:{
            plugins:{legend:{position:'bottom'}},
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
                        currentPage = 1;
                        updateExpenses();
                        showToast(`Filter diaktifkan: ${clickedLabel}`);
                    }
                }
            }
        }
    });
  } else {
    catChart.data.labels = catLabels;
    catChart.data.datasets[0].data = catData;
    catChart.data.datasets[0].backgroundColor = catColors;
    catChart.update();
  }

  // --- Chart Tren Harian ---
  const trendChartTitle = $('#trendChart').parent().prev('h6');
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
  } else {
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
                        currentPage = 1;
                        updateExpenses();
                        showToast(`Menampilkan transaksi untuk ${clickedDate}`);
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
  // BERUBAH DI SINI
  const data = {expenses, categories, badges, badgeHistory, totalBudget, quickAddItems, meta:{exportedAt: new Date().toISOString()}};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = 'ecashflow_backup_'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
$('#uploadJson').on('change', function(e){
  const file = this.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(ev){
    try{ const obj = JSON.parse(ev.target.result); if(!obj.expenses) throw 'Format salah'; 
        expenses = obj.expenses; 
        categories = obj.categories || defaultCats.slice(); 
        badges = obj.badges || []; 
        badgeHistory = obj.badgeHistory || {};
        totalBudget = obj.totalBudget || 0; // <-- BERUBAH DI SINI
        quickAddItems = obj.quickAddItems || [];
        saveAll(); saveCats(); saveBadges(); saveBadgeHistory(); saveTotalBudget(); saveQuickAddItems(); // <-- BERUBAH DI SINI
        renderCategoryOptions(); renderCatList(); 
        updateExpenses(); 
        updateBadges();
        renderQuickAddButtons();
        showToast('Data berhasil di-restore'); 
    }
    catch(err){ showToast('File tidak valid'); }
  }; reader.readAsText(file);
  $(this).val('');
});
$('#resetData').on('click', ()=>{ 
    if(!confirm('Reset semua data?')) return; 
    expenses=[]; badges=[]; categories=defaultCats.slice(); badgeHistory = {}; totalBudget = 0; quickAddItems = []; // <-- BERUBAH DI SINI
    saveAll(); saveCats(); saveBadges(); saveBadgeHistory(); saveTotalBudget(); saveQuickAddItems(); // <-- BERUBAH DI SINI
    renderCategoryOptions(); renderCatList(); 
    updateExpenses(); 
    updateBadges();
    renderQuickAddButtons();
    showToast('Data direset'); 
});

// ========== Badges & Gamification ============
const MASTER_BADGES = {
  'hemat_bulanan': { name: 'Bulan Hemat' },
  'rajin_mencatat': { name: 'Rajin Mencatat', threshold: 100 }
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
  
  // BARIS INI DIHAPUS, KARENA totalBudget SUDAH GLOBAL
  // const totalBudget = Object.values(categoryBudgets).reduce((sum, val) => sum + (Number(val) || 0), 0);
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
      monthlyTotals[monthKey] += Number(item.amount || 0);
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
  const criteria1 = MASTER_BADGES['hemat_bulanan'];
  const badge1Container = $('<div class="badge-container"></div>');
  
  if (budget > 0) {
      if (isMonthEarned) {
        badge1Container.append(`<span class="badge-item">🏆 ${criteria1.name} (Bulan Ini)</span>`);
        insights.append(`<div>Kerja bagus! Pengeluaran bulan ini (Rp ${formatRupiah(sumMonth)}) di bawah target.</div>`);
      } else {
        badge1Container.append(`<span class="badge-locked">🔒 ${criteria1.name} (Bulan Ini)</span>`);
        insights.append(`<div><b>Target:</b> Jaga pengeluaran di bawah Rp ${formatRupiah(budget)}. (Saat ini: Rp ${formatRupiah(sumMonth)})</div>`);
      }
      badge1Container.append(`<button class="btn btn-sm btn-outline-light" onclick="showBadgeHistory('hemat_bulanan')">Riwayat</button>`);
  } else {
      badge1Container.append(`<span class="badge-locked">🔒 ${criteria1.name}</span>`);
      insights.append(`<div>Atur anggaran di menu 'Setting' Progres Anggaran untuk mengaktifkan lencana ini.</div>`);
  }
  area.append(badge1Container);

  const criteria2 = MASTER_BADGES['rajin_mencatat'];
  const badge2Container = $('<div class="badge-container"></div>');
  if (isTotalEarned) {
     badge2Container.append(`<span class="badge-item">✍️ ${criteria2.name}</span>`);
     insights.append(`<div class="mt-2">Anda telah mencatat <strong>${totalCount}</strong> transaksi. Konsisten!</div>`);
  } else {
     badge2Container.append(`<span class="badge-locked">🔒 ${criteria2.name}</span>`);
     insights.append(`<div class="mt-2"><b>Target:</b> Catat ${criteria2.threshold} transaksi. (Progres: ${totalCount}/${criteria2.threshold})</div>`);
  }
  area.append(badge2Container);
}

// SEMUA FUNGSI MODAL ANGGARAN DIGANTI DENGAN INI
function renderTotalBudgetModal() {
    // Mengisi input di modal dengan nilai yang tersimpan
    $('#totalBudgetInput').val(totalBudget > 0 ? totalBudget : '');
}

function saveTotalBudgetFromModal() {
    // Mengambil nilai dari input, menyimpannya, dan memperbarui UI
    totalBudget = Number($('#totalBudgetInput').val()) || 0;
    saveTotalBudget();
    updateBadges(); // Memperbarui progress bar & lencana
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
                 const statusIcon = item.success ? '🏆' : '❌';
                 const statusClass = item.success ? 'text-success' : 'text-danger';
                 list.append(
                    `<li class="list-group-item">
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

// ========== Theme Toggle ============
$('#toggleTheme').on('click', ()=>{
  $('body').toggleClass('dark'); const pref = loadPref(); pref.dark = $('body').hasClass('dark'); savePref(pref); showToast('Theme diubah');
});

// ========== Notifications (one-shot) ============
function tryNotifyPermission(){ if(!('Notification' in window)) return; if(Notification.permission==='default') Notification.requestPermission(); }
tryNotifyPermission();

// ========== Helpers ============
// Duplikat 'escapeHtml' dihapus dari akhir file, hanya satu yang disimpan di atas.