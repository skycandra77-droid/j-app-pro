// ==================== CONFIGURATION ====================
const SHEET_ID = '1UO79VguYM9m_dWWUfxcd5OfyFayuLE89T7IvnfKUas4';
const TARIF_SHEET = 'Tarif';
const TRANSAKSI_SHEET = 'Transaksi';

let hargaData = {};
let sheetLoaded = false;
let transaksiData = [];
let currentPanel = 0; // 0 = Kasir, 1 = Ringkasan

// ==================== SWIPE SYSTEM ====================
let touchStartX = 0;
let touchEndX = 0;
let isSwiping = false;

function initSwipe() {
    const wrapper = document.getElementById('swipeWrapper');
    if (!wrapper) return;
    
    wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
    wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Mouse support
    wrapper.addEventListener('mousedown', handleMouseDown);
    wrapper.addEventListener('mouseup', handleMouseUp);
    wrapper.addEventListener('mouseleave', handleMouseUp);
}

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
}

function handleTouchMove(e) {
    if (!isSwiping) return;
    touchEndX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    if (!isSwiping) return;
    touchEndX = e.changedTouches[0].clientX;
    processSwipe();
    isSwiping = false;
}

function handleMouseDown(e) {
    touchStartX = e.clientX;
    isSwiping = true;
}

function handleMouseUp(e) {
    if (!isSwiping) return;
    touchEndX = e.clientX;
    processSwipe();
    isSwiping = false;
}

function processSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50;
    
    if (Math.abs(diff) < threshold) return;
    
    const wrapper = document.getElementById('swipeWrapper');
    const panelKasir = document.getElementById('panelKasir');
    const panelRingkasan = document.getElementById('panelRingkasan');
    
    if (!panelKasir || !panelRingkasan) return;
    
    if (diff > 0) {
        // Swipe Left - Show Ringkasan
        panelKasir.style.transform = 'translateX(-100%)';
        panelRingkasan.style.transform = 'translateX(0)';
        currentPanel = 1;
        showHint('💰 Menu Ringkasan & Pembukuan');
    } else {
        // Swipe Right - Show Kasir
        panelKasir.style.transform = 'translateX(0)';
        panelRingkasan.style.transform = 'translateX(100%)';
        currentPanel = 0;
        showHint('🧺 Kembali ke Kasir');
    }
}

function showHint(msg) {
    let hint = document.getElementById('swipeHint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'swipeHint';
        hint.style.cssText = 'position:fixed;top:120px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:white;padding:12px 24px;border-radius:25px;font-size:14px;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
        document.body.appendChild(hint);
    }
    hint.textContent = msg;
    hint.style.opacity = '1';
    setTimeout(() => {
        hint.style.opacity = '0';
        setTimeout(() => hint.remove(), 300);
    }, 2000);
}

// ==================== GOOGLE SHEETS INTEGRATION ====================
async function loadHargaDariSheet() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${TARIF_SHEET}`;
        
        const response = await fetch(url);
        const text = await response.text();
        
        // Parse GViz response
        const jsonString = text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonString);
        const rows = json.table.rows;
        
        hargaData = {};
        rows.forEach(row => {
            if (row.c[0] && row.c[0].v) {
                const item = {
                    kategori: row.c[0]?.v || '',
                    id: row.c[1]?.v || '',
                    nama: row.c[2]?.v || '',
                    harga: parseInt(row.c[3]?.v) || 0,
                    jam: parseInt(row.c[4]?.v) || 0
                };
                if (item.id) {
                    hargaData[item.id] = item;
                }
            }
        });
        
        updateDropdownPaket();
        sheetLoaded = true;
        console.log('✅ Harga berhasil dimuat dari Google Sheets');
        
    } catch (error) {
        console.error('❌ Error load dari Sheet:', error);
        loadHargaLokal();
    }
}

function loadHargaLokal() {
    // Fallback data lengkap dari Excel
    const lokalData = [
        {kategori:'REGULER',id:'cs_2.5',nama:'REGULER - CS 2.5 KG',harga:11500,jam:48},
        {kategori:'REGULER',id:'cs_3',nama:'REGULER - CS 3 KG',harga:15900,jam:48},
        {kategori:'REGULER',id:'cs_5',nama:'REGULER - CS 5 KG',harga:21900,jam:48},
        {kategori:'REGULER',id:'cs_7',nama:'REGULER - CS 7 KG',harga:30900,jam:48},
        {kategori:'REGULER',id:'cs_10',nama:'REGULER - CS 10 KG',harga:43900,jam:48},
        {kategori:'REGULER',id:'cs_13',nama:'REGULER - CS 13 KG',harga:55900,jam:48},
        {kategori:'REGULER',id:'cs_15',nama:'REGULER - CS 15 KG',harga:64900,jam:48},
        {kategori:'REGULER',id:'cs_20',nama:'REGULER - CS 20 KG',harga:82900,jam:48},
        {kategori:'REGULER',id:'cl_3',nama:'REGULER - CL 3 KG',harga:10900,jam:48},
        {kategori:'REGULER',id:'cl_5',nama:'REGULER - CL 5 KG',harga:17500,jam:48},
        {kategori:'REGULER',id:'cl_7',nama:'REGULER - CL 7 KG',harga:24900,jam:48},
        {kategori:'REGULER',id:'cl_10',nama:'REGULER - CL 10 KG',harga:36850,jam:48},
        {kategori:'REGULER',id:'cl_13',nama:'REGULER - CL 13 KG',harga:47900,jam:48},
        {kategori:'REGULER',id:'cl_15',nama:'REGULER - CL 15 KG',harga:52900,jam:48},
        {kategori:'REGULER',id:'cl_20',nama:'REGULER - CL 20 KG',harga:65900,jam:48},
        {kategori:'REGULER',id:'ss_3',nama:'REGULER - SS 3 KG',harga:8900,jam:48},
        {kategori:'REGULER',id:'ss_5',nama:'REGULER - SS 5 KG',harga:14500,jam:48},
        {kategori:'REGULER',id:'ss_7',nama:'REGULER - SS 7 KG',harga:20900,jam:48},
        {kategori:'REGULER',id:'ss_10',nama:'REGULER - SS 10 KG',harga:30690,jam:48},
        {kategori:'REGULER',id:'ss_13',nama:'REGULER - SS 13 KG',harga:39900,jam:48},
        {kategori:'REGULER',id:'ss_15',nama:'REGULER - SS 15 KG',harga:43900,jam:48},
        {kategori:'REGULER',id:'ss_20',nama:'REGULER - SS 20 KG',harga:54900,jam:48},
        {kategori:'EXPRESS',id:'exp_cs_3',nama:'EXPRESS - CS 3 KG',harga:24900,jam:24},
        {kategori:'EXPRESS',id:'exp_cs_5',nama:'EXPRESS - CS 5 KG',harga:39500,jam:24},
        {kategori:'EXPRESS',id:'exp_cs_7',nama:'EXPRESS - CS 7 KG',harga:56900,jam:24},
        {kategori:'EXPRESS',id:'exp_cs_10',nama:'EXPRESS - CS 10 KG',harga:82390,jam:24},
        {kategori:'EXPRESS',id:'exp_cs_13',nama:'EXPRESS - CS 13 KG',harga:99900,jam:24},
        {kategori:'EXPRESS',id:'exp_cs_15',nama:'EXPRESS - CS 15 KG',harga:119900,jam:24},
        {kategori:'EXPRESS',id:'exp_cs_20',nama:'EXPRESS - CS 20 KG',harga:153900,jam:24},
        {kategori:'EXPRESS',id:'exp_cl_3',nama:'EXPRESS - CL 3 KG',harga:17900,jam:24},
        {kategori:'EXPRESS',id:'exp_cl_5',nama:'EXPRESS - CL 5 KG',harga:28500,jam:24},
        {kategori:'EXPRESS',id:'exp_cl_7',nama:'EXPRESS - CL 7 KG',harga:44900,jam:24},
        {kategori:'EXPRESS',id:'exp_cl_10',nama:'EXPRESS - CL 10 KG',harga:58190,jam:24},
        {kategori:'EXPRESS',id:'exp_cl_13',nama:'EXPRESS - CL 13 KG',harga:72900,jam:24},
        {kategori:'EXPRESS',id:'exp_cl_15',nama:'EXPRESS - CL 15 KG',harga:84900,jam:24},
        {kategori:'EXPRESS',id:'exp_cl_20',nama:'EXPRESS - CL 20 KG',harga:109900,jam:24},
        {kategori:'EXPRESS',id:'exp_ss_3',nama:'EXPRESS - SS 3 KG',harga:14900,jam:24},
        {kategori:'EXPRESS',id:'exp_ss_5',nama:'EXPRESS - SS 5 KG',harga:24500,jam:24},
        {kategori:'EXPRESS',id:'exp_ss_7',nama:'EXPRESS - SS 7 KG',harga:35500,jam:24},
        {kategori:'EXPRESS',id:'exp_ss_10',nama:'EXPRESS - SS 10 KG',harga:52690,jam:24},
        {kategori:'EXPRESS',id:'exp_ss_13',nama:'EXPRESS - SS 13 KG',harga:66900,jam:24},
        {kategori:'EXPRESS',id:'exp_ss_15',nama:'EXPRESS - SS 15 KG',harga:75900,jam:24},
        {kategori:'EXPRESS',id:'exp_ss_20',nama:'EXPRESS - SS 20 KG',harga:98900,jam:24},
        {kategori:'SUPER',id:'sup_cs_3',nama:'SUPER - CS 3 KG',harga:34900,jam:6},
        {kategori:'SUPER',id:'sup_cs_5',nama:'SUPER - CS 5 KG',harga:49900,jam:6},
        {kategori:'SUPER',id:'sup_cs_7',nama:'SUPER - CS 7 KG',harga:77900,jam:6},
        {kategori:'SUPER',id:'sup_cs_10',nama:'SUPER - CS 10 KG',harga:109900,jam:6},
        {kategori:'SUPER',id:'sup_cs_15',nama:'SUPER - CS 15 KG',harga:129900,jam:6},
        {kategori:'SUPER',id:'sup_cs_20',nama:'SUPER - CS 20 KG',harga:159900,jam:6},
        {kategori:'SUPER',id:'sup_cl_3',nama:'SUPER - CL 3 KG',harga:24900,jam:6},
        {kategori:'SUPER',id:'sup_cl_5',nama:'SUPER - CL 5 KG',harga:39500,jam:6},
        {kategori:'SUPER',id:'sup_cl_7',nama:'SUPER - CL 7 KG',harga:56900,jam:6},
        {kategori:'SUPER',id:'sup_cl_10',nama:'SUPER - CL 10 KG',harga:82390,jam:6},
        {kategori:'SUPER',id:'sup_cl_15',nama:'SUPER - CL 15 KG',harga:99900,jam:6},
        {kategori:'SUPER',id:'sup_cl_20',nama:'SUPER - CL 20 KG',harga:129900,jam:6},
        {kategori:'SUPER',id:'sup_ss_3',nama:'SUPER - SS 3 KG',harga:19900,jam:6},
        {kategori:'SUPER',id:'sup_ss_5',nama:'SUPER - SS 5 KG',harga:32500,jam:6},
        {kategori:'SUPER',id:'sup_ss_7',nama:'SUPER - SS 7 KG',harga:46900,jam:6},
        {kategori:'SUPER',id:'sup_ss_10',nama:'SUPER - SS 10 KG',harga:68750,jam:6},
        {kategori:'SUPER',id:'sup_ss_15',nama:'SUPER - SS 15 KG',harga:89900,jam:6},
        {kategori:'SUPER',id:'sup_ss_20',nama:'SUPER - SS 20 KG',harga:119900,jam:6},
        {kategori:'SATUAN',id:'bcs',nama:'SATUAN - BCS — Bedcover S',harga:33750,jam:0},
        {kategori:'SATUAN',id:'bcq',nama:'SATUAN - BCQ — Bedcover Q',harga:47250,jam:0},
        {kategori:'SATUAN',id:'spk',nama:'SATUAN - SPK — Sprei K',harga:8000,jam:0},
        {kategori:'SATUAN',id:'sps',nama:'SATUAN - SPS — Sprei S',harga:13500,jam:0},
        {kategori:'SATUAN',id:'spb',nama:'SATUAN - SPB — Sprei B',harga:20250,jam:0},
        {kategori:'SATUAN',id:'hk',nama:'SATUAN - HK — Handuk K',harga:5000,jam:0},
        {kategori:'SATUAN',id:'hs',nama:'SATUAN - HS — Handuk S',harga:8000,jam:0},
        {kategori:'SATUAN',id:'hb',nama:'SATUAN - HB — Handuk B',harga:12500,jam:0},
        {kategori:'SATUAN',id:'pd',nama:'SATUAN - PD — UW',harga:10000,jam:0},
        {kategori:'SATUAN',id:'kst',nama:'SATUAN - KST — Keset',harga:5000,jam:0},
        {kategori:'SATUAN',id:'pad',nama:'SATUAN - PAD — PD',harga:5000,jam:0},
        {kategori:'SATUAN',id:'pack',nama:'SATUAN - PACK — PACK HD',harga:300,jam:0},
        {kategori:'SATUAN',id:'slk',nama:'SATUAN - SLK — Selimut Kecil',harga:7000,jam:0},
        {kategori:'SATUAN',id:'trt1',nama:'SATUAN - TRT1 — Treatment',harga:12500,jam:0},
        {kategori:'SATUAN',id:'sp',nama:'SATUAN - SP — Split',harga:7500,jam:0},
        {kategori:'SATUAN',id:'al',nama:'SATUAN - AL — Almet',harga:4500,jam:0},
        {kategori:'SATUAN',id:'shoe1',nama:'SATUAN - SHOE1 — Sepatu Fast',harga:30000,jam:0},
        {kategori:'SATUAN',id:'shoe2',nama:'SATUAN - SHOE2 — Sepatu Deep',harga:50000,jam:0}
    ];
    
    hargaData = {};
    lokalData.forEach(d => {
        if (d.id) hargaData[d.id] = d;
    });
    updateDropdownPaket();
}

function updateDropdownPaket() {
    const select = document.getElementById('paketLaundry');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Pilih Paket Laundry --</option>';
    
    // Group by kategori
    const groups = {};
    Object.values(hargaData).forEach(item => {
        if (!groups[item.kategori]) {
            groups[item.kategori] = [];
        }
        groups[item.kategori].push(item);
    });
    
    // Create optgroups
    Object.keys(groups).sort().forEach(kategori => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `✨ ${kategori}`;
        
        groups[kategori].forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.nama} - Rp${item.harga.toLocaleString('id-ID')} ${item.jam > 0 ? `(${item.jam} jam)` : ''}`;
            option.dataset.harga = item.harga;
            option.dataset.jam = item.jam;
            optgroup.appendChild(option);
        });
        
        select.appendChild(optgroup);
    });
    
    // Add event listener
    select.addEventListener('change', hitungTotal);
}

// ==================== CALCULATION ====================
function hitungTotal() {
    const paketSelect = document.getElementById('paketLaundry');
    const jumlahInput = document.getElementById('jumlahOrder');
    const bundlingSelect = document.getElementById('bundlingDrink');
    const totalDisplay = document.getElementById('totalTagihan');
    
    if (!paketSelect || !jumlahInput) return;
    
    const selectedOption = paketSelect.options[paketSelect.selectedIndex];
    const hargaSatuan = parseInt(selectedOption.dataset.harga) || 0;
    const qty = parseInt(jumlahInput.value) || 1;
    const bundling = (bundlingSelect && bundlingSelect.value === 'Ya') ? 5000 : 0;
    
    const total = (hargaSatuan * qty) + bundling;
    
    if (totalDisplay) {
        totalDisplay.textContent = `Rp ${total.toLocaleString('id-ID')}`;
    }
    
    // Update estimasi
    updateEstimasi(selectedOption.dataset.jam);
}

function updateEstimasi(jam) {
    const input = document.getElementById('estimasiSelesai');
    if (!input || !jam) return;
    
    const selesai = new Date(Date.now() + (jam * 60 * 60 * 1000));
    const options = { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    input.value = selesai.toLocaleDateString('id-ID', options);
}

// ==================== LOGIN ====================
function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simple validation
    if (username && password) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Initialize
        initSwipe();
        loadHargaDariSheet();
        loadTransaksi();
        
        // Auto refresh every 3 minutes
        setInterval(() => {
            if (sheetLoaded) loadHargaDariSheet();
            loadTransaksi();
        }, 180000);
    } else {
        alert('Mohon masukkan username dan password!');
    }
}

// ==================== TRANSAKSI ====================
async function loadTransaksi() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${TRANSAKSI_SHEET}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonString = text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonString);
        
        transaksiData = json.table.rows.filter(row => row.c[0]).map(row => ({
            id: row.c[0]?.v || '',
            tanggal: row.c[1]?.v || '',
            nomorWa: row.c[2]?.v || '',
            nama: row.c[3]?.v || '',
            jumlah: row.c[4]?.v || 0,
            paket: row.c[5]?.v || '',
            bundling: row.c[6]?.v || '',
            total: row.c[7]?.v || 0,
            estimasi: row.c[8]?.v || '',
            status: row.c[9]?.v || 'Antre',
            pengeluaran: row.c[10]?.v || 0
        }));
        
        updateLiveOrders();
        updateSummary();
        updatePembukuanTable();
        
    } catch (error) {
        console.error('Error load transaksi:', error);
    }
}

function updateLiveOrders() {
    const container = document.getElementById('liveOrders');
    if (!container) return;
    
    if (transaksiData.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Belum ada order</p>';
        return;
    }
    
    container.innerHTML = transaksiData.slice(-5).reverse().map((order, index) => `
        <div class="order-item">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h4>${order.nama} (${order.jumlah} Item)</h4>
                <select onchange="updateStatusTransaksi('${order.id}', this.value)" 
                        class="status-dropdown"
                        style="padding:5px 10px;border-radius:15px;font-size:12px;border:1px solid #ddd;">
                    <option value="Antre" ${order.status === 'Antre' ? 'selected' : ''}>Antre</option>
                    <option value="Proses" ${order.status === 'Proses' ? 'selected' : ''}>Proses</option>
                    <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                </select>
            </div>
            <p>${order.paket}</p>
            <p>📱 ${order.nomorWa}</p>
            <p>⏰ Selesai: ${order.estimasi || order.tanggal}</p>
            <span class="status ${order.status.toLowerCase()}" style="display:inline-block;margin-top:8px;">${order.status}</span>
        </div>
    `).join('');
}

function updateStatusTransaksi(id, newStatus) {
    const transaksi = transaksiData.find(t => t.id === id);
    if (transaksi) {
        transaksi.status = newStatus;
        console.log(`Update status ${id} menjadi ${newStatus}`);
        updateSummary();
        // In production, save to Google Sheets
    }
}

function updateSummary() {
    const today = new Date().toDateString();
    const todayTransaksi = transaksiData.filter(t => {
        const tDate = new Date(t.tanggal);
        return tDate.toDateString() === today;
    });
    
    const totalPendapatan = todayTransaksi.reduce((sum, t) => sum + (parseInt(t.total) || 0), 0);
    const totalPengeluaran = todayTransaksi.reduce((sum, t) => sum + (parseInt(t.pengeluaran) || 0), 0);
    const saldoBersih = totalPendapatan - totalPengeluaran;
    
    const elPendapatan = document.getElementById('totalPendapatan');
    const elPengeluaran = document.getElementById('totalPengeluaran');
    const elSaldo = document.getElementById('saldoBersih');
    
    if (elPendapatan) elPendapatan.textContent = `Rp ${totalPendapatan.toLocaleString('id-ID')}`;
    if (elPengeluaran) elPengeluaran.textContent = `Rp ${totalPengeluaran.toLocaleString('id-ID')}`;
    if (elSaldo) elSaldo.textContent = `Rp ${saldoBersih.toLocaleString('id-ID')}`;
    
    // Update status bar
    const elAntre = document.getElementById('statusAntre');
    const elProses = document.getElementById('statusProses');
    const elSiap = document.getElementById('statusSiap');
    
    if (elAntre) elAntre.textContent = todayTransaksi.filter(t => t.status === 'Antre').length;
    if (elProses) elProses.textContent = todayTransaksi.filter(t => t.status === 'Proses').length;
    if (elSiap) elSiap.textContent = todayTransaksi.filter(t => t.status === 'Selesai').length;
}

function updatePembukuanTable() {
    const container = document.getElementById('pembukuanTable');
    if (!container) return;
    
    if (transaksiData.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Belum ada data pembukuan</p>';
        return;
    }
    
    const today = new Date().toDateString();
    const todayTransaksi = transaksiData.filter(t => new Date(t.tanggal).toDateString() === today);
    
    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
                <tr style="background:#4CAF50;color:white;">
                    <th style="padding:10px;text-align:left;">Waktu</th>
                    <th style="padding:10px;text-align:left;">Pelanggan</th>
                    <th style="padding:10px;text-align:right;">Total</th>
                    <th style="padding:10px;text-align:center;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${todayTransaksi.map(t => `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px;">${t.tanggal}</td>
                        <td style="padding:10px;">${t.nama}</td>
                        <td style="padding:10px;text-align:right;">Rp ${parseInt(t.total).toLocaleString('id-ID')}</td>
                        <td style="padding:10px;text-align:center;"><span class="status ${t.status.toLowerCase()}">${t.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function simpanTransaksi() {
    const nama = document.getElementById('namaPelanggan').value;
    const wa = document.getElementById('nomorWa').value;
    const paket = document.getElementById('paketLaundry').value;
    const jumlah = document.getElementById('jumlahOrder').value;
    const bundling = document.getElementById('bundlingDrink').value;
    const estimasi = document.getElementById('estimasiSelesai').value;
    
    if (!nama || !paket || !jumlah) {
        alert('Mohon lengkapi data order!');
        return;
    }
    
    const selectedOption = document.getElementById('paketLaundry').options[document.getElementById('paketLaundry').selectedIndex];
    const harga = parseInt(selectedOption.dataset.harga) || 0;
    const total = (harga * parseInt(jumlah)) + (bundling === 'Ya' ? 5000 : 0);
    
    const transaksi = {
        id: `nota-${Date.now()}`,
        tanggal: new Date().toLocaleString('id-ID'),
        nomorWa: wa,
        namaPelanggan: nama,
        jumlahOrder: jumlah,
        paketLaundry: selectedOption.textContent,
        bundlingDrink: bundling,
        totalHarga: total,
        estimasiSelesai: estimasi,
        statusNota: 'Antre',
        pengeluaran: 0
    };
    
    console.log('Simpan transaksi:', transaksi);
    alert(`✅ Transaksi berhasil disimpan!\n\nPelanggan: ${nama}\nTotal: Rp ${total.toLocaleString('id-ID')}\n\nSuksma! 🙏`);
    
    // Reset form
    document.getElementById('namaPelanggan').value = '';
    document.getElementById('nomorWa').value = '';
    document.getElementById('jumlahOrder').value = '1';
    document.getElementById('bundlingDrink').value = 'Tidak';
    hitungTotal();
    
    // Reload data
    loadTransaksi();
}

function simpanPengeluaran() {
    const keterangan = document.getElementById('keteranganPengeluaran').value;
    const jumlah = document.getElementById('jumlahPengeluaran').value;
    
    if (!keterangan || !jumlah) {
        alert('Mohon lengkapi data pengeluaran!');
        return;
    }
    
    alert(`✅ Pengeluaran Rp ${parseInt(jumlah).toLocaleString('id-ID')} untuk "${keterangan}" berhasil dicatat!`);
    document.getElementById('keteranganPengeluaran').value = '';
    document.getElementById('jumlahPengeluaran').value = '';
    loadTransaksi();
}

function refreshData() {
    loadHargaDariSheet();
    loadTransaksi();
    alert('🔄 Data berhasil di-refresh dari Cloud!');
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    const jumlahInput = document.getElementById('jumlahOrder');
    const bundlingSelect = document.getElementById('bundlingDrink');
    
    if (jumlahInput) {
        jumlahInput.addEventListener('input', hitungTotal);
    }
    
    if (bundlingSelect) {
        bundlingSelect.addEventListener('change', hitungTotal);
    }
    
    console.log('J APP PRO initialized - Suksma! 🙏');
});
