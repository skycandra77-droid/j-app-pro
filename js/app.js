// ==================== CONFIGURATION ====================
const SHEET_ID = '1UO79VguYM9m_dWWUfxcd5OfyFayuLE89T7IvnfKUas4';
const TARIF_SHEET = 'Tarif';
const TRANSAKSI_SHEET = 'Transaksi';

let hargaData = {};
let sheetLoaded = false;
let transaksiData = [];
let currentPanel = 0; // 0 = Kasir, 1 = Ringkasan

// ==================== TOAST NOTIFICATION (Pengganti Alert) ====================
function showToast(msg, icon = '✅', duration = 3000) {
    let toast = document.getElementById('toastNotif');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotif';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<div class="toast-icon">${icon}</div><span>${msg}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ==================== SWIPE SYSTEM ====================
let touchStartX = 0, touchEndX = 0, isSwiping = false;

function initSwipe() {
    const wrapper = document.getElementById('swipeWrapper');
    if (!wrapper) return;

    wrapper.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        isSwiping = true;
    }, { passive: true });

    wrapper.addEventListener('touchmove', e => {
        if (isSwiping) touchEndX = e.touches[0].clientX;
    }, { passive: true });

    wrapper.addEventListener('touchend', () => {
        if (isSwiping) { processSwipe(); isSwiping = false; }
    });

    // Mouse support (untuk testing di desktop)
    wrapper.addEventListener('mousedown', e => {
        touchStartX = e.clientX;
        isSwiping = true;
    });
    wrapper.addEventListener('mousemove', e => {
        if (isSwiping) touchEndX = e.clientX;
    });
    wrapper.addEventListener('mouseup', () => {
        if (isSwiping) { processSwipe(); isSwiping = false; }
    });
    wrapper.addEventListener('mouseleave', () => {
        if (isSwiping) { processSwipe(); isSwiping = false; }
    });
}

function processSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 60) return;

    const panelKasir = document.getElementById('panelKasir');
    const panelRingkasan = document.getElementById('panelRingkasan');
    if (!panelKasir || !panelRingkasan) return;

    if (diff > 0 && currentPanel === 0) {
        // Swipe kiri → ke Ringkasan
        panelKasir.style.transform = 'translateX(-100%)';
        panelRingkasan.style.transform = 'translateX(0)';
        currentPanel = 1;
        showToast('Menu Ringkasan & Pembukuan', '💰');
    } else if (diff < 0 && currentPanel === 1) {
        // Swipe kanan → ke Kasir
        panelKasir.style.transform = 'translateX(0)';
        panelRingkasan.style.transform = 'translateX(100%)';
        currentPanel = 0;
        showToast('Kembali ke Menu Kasir', '🧺');
    }
}

// ==================== GOOGLE SHEETS INTEGRATION ====================
async function loadHargaDariSheet() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${TARIF_SHEET}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonString = text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonString);

        hargaData = {};
        json.table.rows.forEach(row => {
            if (row.c[0] && row.c[0].v) {
                const item = {
                    kategori: String(row.c[0]?.v || '').trim(),
                    id: String(row.c[1]?.v || '').trim(),
                    nama: String(row.c[2]?.v || '').trim(),
                    harga: parseInt(row.c[3]?.v) || 0,
                    jam: parseInt(row.c[4]?.v) || 0
                };
                if (item.id) hargaData[item.id] = item;
            }
        });

        updateDropdownPaket();
        sheetLoaded = true;
        showToast('Tarif berhasil dimuat dari Cloud', '☁️');
    } catch (error) {
        console.error('Error load Sheet:', error);
        showToast('Pakai data lokal (offline)', '⚠️');
        loadHargaLokal();
    }
}

function loadHargaLokal() {
    // ✨ DATA LOKAL BERSIH - SEMUA TYPO SUDAH DIPERBAIKI ✨
    const lokalData = [
        // REGULER
        { kategori:'REGULER', id:'cs_2.5', nama:'REGULER - CS 2.5 KG', harga:11500, jam:48 },
        { kategori:'REGULER', id:'cs_3', nama:'REGULER - CS 3 KG', harga:15900, jam:48 },
        { kategori:'REGULER', id:'cs_5', nama:'REGULER - CS 5 KG', harga:21900, jam:48 },
        { kategori:'REGULER', id:'cs_7', nama:'REGULER - CS 7 KG', harga:30900, jam:48 },
        { kategori:'REGULER', id:'cs_10', nama:'REGULER - CS 10 KG', harga:43900, jam:48 },
        { kategori:'REGULER', id:'cs_13', nama:'REGULER - CS 13 KG', harga:55900, jam:48 },
        { kategori:'REGULER', id:'cs_15', nama:'REGULER - CS 15 KG', harga:64900, jam:48 },
        { kategori:'REGULER', id:'cs_20', nama:'REGULER - CS 20 KG', harga:82900, jam:48 },
        { kategori:'REGULER', id:'cl_3', nama:'REGULER - CL 3 KG', harga:10900, jam:48 },
        { kategori:'REGULER', id:'cl_5', nama:'REGULER - CL 5 KG', harga:17500, jam:48 },
        { kategori:'REGULER', id:'cl_7', nama:'REGULER - CL 7 KG', harga:24900, jam:48 },
        { kategori:'REGULER', id:'cl_10', nama:'REGULER - CL 10 KG', harga:36850, jam:48 },
        { kategori:'REGULER', id:'cl_13', nama:'REGULER - CL 13 KG', harga:47900, jam:48 },
        { kategori:'REGULER', id:'cl_15', nama:'REGULER - CL 15 KG', harga:52900, jam:48 },
        { kategori:'REGULER', id:'cl_20', nama:'REGULER - CL 20 KG', harga:65900, jam:48 },
        { kategori:'REGULER', id:'ss_3', nama:'REGULER - SS 3 KG', harga:8900, jam:48 },
        { kategori:'REGULER', id:'ss_5', nama:'REGULER - SS 5 KG', harga:14500, jam:48 },
        { kategori:'REGULER', id:'ss_7', nama:'REGULER - SS 7 KG', harga:20900, jam:48 },
        { kategori:'REGULER', id:'ss_10', nama:'REGULER - SS 10 KG', harga:30690, jam:48 },
        { kategori:'REGULER', id:'ss_13', nama:'REGULER - SS 13 KG', harga:39900, jam:48 },
        { kategori:'REGULER', id:'ss_15', nama:'REGULER - SS 15 KG', harga:43900, jam:48 },
        { kategori:'REGULER', id:'ss_20', nama:'REGULER - SS 20 KG', harga:54900, jam:48 },
        
        // EXPRESS
        { kategori:'EXPRESS', id:'exp_cs_3', nama:'EXPRESS - CS 3 KG', harga:24900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cs_5', nama:'EXPRESS - CS 5 KG', harga:39500, jam:24 },
        { kategori:'EXPRESS', id:'exp_cs_7', nama:'EXPRESS - CS 7 KG', harga:56900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cs_10', nama:'EXPRESS - CS 10 KG', harga:82390, jam:24 },
        { kategori:'EXPRESS', id:'exp_cs_13', nama:'EXPRESS - CS 13 KG', harga:99900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cs_15', nama:'EXPRESS - CS 15 KG', harga:119900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cs_20', nama:'EXPRESS - CS 20 KG', harga:153900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cl_3', nama:'EXPRESS - CL 3 KG', harga:17900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cl_5', nama:'EXPRESS - CL 5 KG', harga:28500, jam:24 },
        { kategori:'EXPRESS', id:'exp_cl_7', nama:'EXPRESS - CL 7 KG', harga:44900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cl_10', nama:'EXPRESS - CL 10 KG', harga:58190, jam:24 },
        { kategori:'EXPRESS', id:'exp_cl_13', nama:'EXPRESS - CL 13 KG', harga:72900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cl_15', nama:'EXPRESS - CL 15 KG', harga:84900, jam:24 },
        { kategori:'EXPRESS', id:'exp_cl_20', nama:'EXPRESS - CL 20 KG', harga:109900, jam:24 },
        { kategori:'EXPRESS', id:'exp_ss_3', nama:'EXPRESS - SS 3 KG', harga:14900, jam:24 },
        { kategori:'EXPRESS', id:'exp_ss_5', nama:'EXPRESS - SS 5 KG', harga:24500, jam:24 },
        { kategori:'EXPRESS', id:'exp_ss_7', nama:'EXPRESS - SS 7 KG', harga:35500, jam:24 },
        { kategori:'EXPRESS', id:'exp_ss_10', nama:'EXPRESS - SS 10 KG', harga:52690, jam:24 },
        { kategori:'EXPRESS', id:'exp_ss_13', nama:'EXPRESS - SS 13 KG', harga:66900, jam:24 },
        { kategori:'EXPRESS', id:'exp_ss_15', nama:'EXPRESS - SS 15 KG', harga:75900, jam:24 },
        { kategori:'EXPRESS', id:'exp_ss_20', nama:'EXPRESS - SS 20 KG', harga:98900, jam:24 },
        
        // SUPER
        { kategori:'SUPER', id:'sup_cs_3', nama:'SUPER - CS 3 KG', harga:34900, jam:6 },
        { kategori:'SUPER', id:'sup_cs_5', nama:'SUPER - CS 5 KG', harga:49900, jam:6 },
        { kategori:'SUPER', id:'sup_cs_7', nama:'SUPER - CS 7 KG', harga:77900, jam:6 },
        { kategori:'SUPER', id:'sup_cs_10', nama:'SUPER - CS 10 KG', harga:109900, jam:6 },
        { kategori:'SUPER', id:'sup_cs_15', nama:'SUPER - CS 15 KG', harga:129900, jam:6 },
        { kategori:'SUPER', id:'sup_cs_20', nama:'SUPER - CS 20 KG', harga:159900, jam:6 },
        { kategori:'SUPER', id:'sup_cl_3', nama:'SUPER - CL 3 KG', harga:24900, jam:6 },
        { kategori:'SUPER', id:'sup_cl_5', nama:'SUPER - CL 5 KG', harga:39500, jam:6 },
        { kategori:'SUPER', id:'sup_cl_7', nama:'SUPER - CL 7 KG', harga:56900, jam:6 },
        { kategori:'SUPER', id:'sup_cl_10', nama:'SUPER - CL 10 KG', harga:82390, jam:6 },
        { kategori:'SUPER', id:'sup_cl_15', nama:'SUPER - CL 15 KG', harga:99900, jam:6 },
        { kategori:'SUPER', id:'sup_cl_20', nama:'SUPER - CL 20 KG', harga:129900, jam:6 },
        { kategori:'SUPER', id:'sup_ss_3', nama:'SUPER - SS 3 KG', harga:19900, jam:6 },
        { kategori:'SUPER', id:'sup_ss_5', nama:'SUPER - SS 5 KG', harga:32500, jam:6 },
        { kategori:'SUPER', id:'sup_ss_7', nama:'SUPER - SS 7 KG', harga:46900, jam:6 },
        { kategori:'SUPER', id:'sup_ss_10', nama:'SUPER - SS 10 KG', harga:68750, jam:6 },
        { kategori:'SUPER', id:'sup_ss_15', nama:'SUPER - SS 15 KG', harga:89900, jam:6 },
        { kategori:'SUPER', id:'sup_ss_20', nama:'SUPER - SS 20 KG', harga:119900, jam:6 },
        
        // SATUAN
        { kategori:'SATUAN', id:'bcs', nama:'SATUAN - BCS Bedcover S', harga:33750, jam:0 },
        { kategori:'SATUAN', id:'bcq', nama:'SATUAN - BCQ Bedcover Q', harga:47250, jam:0 },
        { kategori:'SATUAN', id:'spk', nama:'SATUAN - SPK Sprei K', harga:8000, jam:0 },
        { kategori:'SATUAN', id:'sps', nama:'SATUAN - SPS Sprei S', harga:13500, jam:0 },
        { kategori:'SATUAN', id:'spb', nama:'SATUAN - SPB Sprei B', harga:20250, jam:0 },
        { kategori:'SATUAN', id:'hk', nama:'SATUAN - HK Handuk K', harga:5000, jam:0 },
        { kategori:'SATUAN', id:'hs', nama:'SATUAN - HS Handuk S', harga:8000, jam:0 },
        { kategori:'SATUAN', id:'hb', nama:'SATUAN - HB Handuk B', harga:12500, jam:0 },
        { kategori:'SATUAN', id:'pd', nama:'SATUAN - PD Underwear', harga:10000, jam:0 },
        { kategori:'SATUAN', id:'kst', nama:'SATUAN - KST Keset', harga:5000, jam:0 },
        { kategori:'SATUAN', id:'pad', nama:'SATUAN - PAD Bed Cover Pad', harga:5000, jam:0 },
        { kategori:'SATUAN', id:'pack', nama:'SATUAN - PACK HD', harga:300, jam:0 },
        { kategori:'SATUAN', id:'slk', nama:'SATUAN - SLK Selimut Kecil', harga:7000, jam:0 },
        { kategori:'SATUAN', id:'trt1', nama:'SATUAN - TRT1 Treatment', harga:12500, jam:0 },
        { kategori:'SATUAN', id:'sp', nama:'SATUAN - SP Split', harga:7500, jam:0 },
        { kategori:'SATUAN', id:'al', nama:'SATUAN - AL Almet', harga:4500, jam:0 },
        { kategori:'SATUAN', id:'shoe1', nama:'SATUAN - SHOE1 Sepatu Fast', harga:30000, jam:0 },
        { kategori:'SATUAN', id:'shoe2', nama:'SATUAN - SHOE2 Sepatu Deep', harga:50000, jam:0 }
    ];

    hargaData = {};
    lokalData.forEach(d => { if (d.id) hargaData[d.id] = d; });
    updateDropdownPaket();
}

function updateDropdownPaket() {
    const select = document.getElementById('paketLaundry');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Paket Laundry --</option>';

    // Group by kategori
    const groups = {};
    Object.values(hargaData).forEach(item => {
        if (!groups[item.kategori]) groups[item.kategori] = [];
        groups[item.kategori].push(item);
    });

    // Urutkan kategori
    const urutan = ['REGULER', 'EXPRESS', 'SUPER', 'SATUAN'];
    const sortedKeys = urutan.filter(k => groups[k]).concat(
        Object.keys(groups).filter(k => !urutan.includes(k)).sort()
    );

    sortedKeys.forEach(kategori => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `✨ ${kategori}`;

        groups[kategori].forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            const jamText = item.jam > 0 ? ` (${item.jam} jam)` : '';
            option.textContent = `${item.nama} - Rp${item.harga.toLocaleString('id-ID')}${jamText}`;
            option.dataset.harga = item.harga;
            option.dataset.jam = item.jam;
            optgroup.appendChild(option);
        });

        select.appendChild(optgroup);
    });

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
    const hargaSatuan = parseInt(selectedOption?.dataset?.harga) || 0;
    const qty = parseInt(jumlahInput.value) || 1;
    const bundling = (bundlingSelect?.value === 'Ya') ? 5000 : 0;
    const total = (hargaSatuan * qty) + bundling;

    if (totalDisplay) totalDisplay.textContent = `Rp ${total.toLocaleString('id-ID')}`;
    updateEstimasi(selectedOption?.dataset?.jam);
}

function updateEstimasi(jam) {
    const input = document.getElementById('estimasiSelesai');
    if (!input) return;
    if (!jam || parseInt(jam) === 0) {
        input.value = 'Secepatnya (satuan)';
        return;
    }
    const selesai = new Date(Date.now() + (parseInt(jam) * 60 * 60 * 1000));
    input.value = selesai.toLocaleDateString('id-ID', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
    });
}

// ==================== LOGIN ====================
function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) {
        showToast('Mohon isi username & password!', '⚠️');
        return;
    }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    initSwipe();
    loadHargaDariSheet();
    loadTransaksi();

    // Auto-refresh setiap 3 menit
    setInterval(() => {
        if (sheetLoaded) loadHargaDariSheet();
        loadTransaksi();
    }, 180000);

    showToast(`Selamat datang, ${username}! Suksma 🙏`, '🔐');
}

// ==================== TRANSAKSI ====================
async function loadTransaksi() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${TRANSAKSI_SHEET}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonString = text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonString);

        transaksiData = json.table.rows
            .filter(row => row.c[0])
            .map(row => ({
                id: String(row.c[0]?.v || ''),
                tanggal: row.c[1]?.v || '',
                nomorWa: row.c[2]?.v || '',
                nama: row.c[3]?.v || '',
                jumlah: parseInt(row.c[4]?.v) || 0,
                paket: row.c[5]?.v || '',
                bundling: row.c[6]?.v || '',
                total: parseInt(row.c[7]?.v) || 0,
                estimasi: row.c[8]?.v || '',
                status: row.c[9]?.v || 'Antre',
                pengeluaran: parseInt(row.c[10]?.v) || 0
            }));

        updateLiveOrders();
        updateSummary();
        updatePembukuanTable();
    } catch (error) {
        console.error('Error load transaksi:', error);
        // Fallback data demo kalau Google Sheet error
        if (transaksiData.length === 0) {
            transaksiData = [
                { id:'demo-1', tanggal:new Date().toLocaleString('id-ID'), nomorWa:'08123456789', nama:'Demo Pelanggan', jumlah:2, paket:'EXPRESS - CS 5 KG', bundling:'Ya', total:84000, estimasi:'14:00', status:'Proses', pengeluaran:0 },
                { id:'demo-2', tanggal:new Date().toLocaleString('id-ID'), nomorWa:'08987654321', nama:'Demo 2', jumlah:1, paket:'SATUAN - SHOE1 Sepatu Fast', bundling:'Tidak', total:30000, estimasi:'Secepatnya', status:'Antre', pengeluaran:0 }
            ];
            updateLiveOrders();
            updateSummary();
            updatePembukuanTable();
        }
    }
}

function updateLiveOrders() {
    const container = document.getElementById('liveOrders');
    if (!container) return;

    if (transaksiData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🧺</div>
                <p>Belum ada order masuk hari ini</p>
            </div>`;
        return;
    }

    container.innerHTML = transaksiData.slice(-10).reverse().map(order => `
        <div class="order-item">
            <h4>
                <span>${order.nama}</span>
                <span class="qty-badge">${order.jumlah}x</span>
            </h4>
            <div style="margin-bottom:6px;">
                <select onchange="updateStatusTransaksi('${order.id}', this.value)" class="status-dropdown">
                    <option value="Antre" ${order.status === 'Antre' ? 'selected' : ''}>⏳ Antre</option>
                    <option value="Proses" ${order.status === 'Proses' ? 'selected' : ''}>⚙️ Proses</option>
                    <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>✅ Selesai</option>
                </select>
            </div>
            <p><strong>${order.paket}</strong></p>
            <p>📱 ${order.nomorWa} ${order.bundling === 'Ya' ? '• 🧋 +Es Teh' : ''}</p>
            <p>⏰ ${order.estimasi || order.tanggal}</p>
            <span class="price-tag">Rp ${(parseInt(order.total) || 0).toLocaleString('id-ID')}</span>
        </div>
    `).join('');
}

function updateStatusTransaksi(id, newStatus) {
    const transaksi = transaksiData.find(t => t.id === id);
    if (transaksi) {
        transaksi.status = newStatus;
        updateSummary();
        showToast(`Status diubah ke: ${newStatus}`, '✅');
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

    const today = new Date().toDateString();
    const todayTransaksi = transaksiData
        .filter(t => new Date(t.tanggal).toDateString() === today)
        .reverse();

    if (todayTransaksi.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>Belum ada transaksi hari ini</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${todayTransaksi.map(t => `
                    <tr>
                        <td>${t.tanggal}</td>
                        <td>${t.nama}</td>
                        <td>Rp ${(parseInt(t.total) || 0).toLocaleString('id-ID')}</td>
                        <td><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ==================== SIMPAN TRANSAKSI ====================
function simpanTransaksi() {
    const nama = document.getElementById('namaPelanggan').value.trim();
    const wa = document.getElementById('nomorWa').value.trim();
    const paket = document.getElementById('paketLaundry').value;
    const jumlah = document.getElementById('jumlahOrder').value;
    const bundling = document.getElementById('bundlingDrink').value;
    const estimasi = document.getElementById('estimasiSelesai').value;

    if (!nama || !paket || !jumlah) {
        showToast('Lengkapi data: nama, paket, jumlah!', '⚠️');
        return;
    }

    const selectedOption = document.getElementById('paketLaundry').options[document.getElementById('paketLaundry').selectedIndex];
    const harga = parseInt(selectedOption.dataset.harga) || 0;
    const total = (harga * parseInt(jumlah)) + (bundling === 'Ya' ? 5000 : 0);

    const transaksi = {
        id: `nota-${Date.now()}`,
        tanggal: new Date().toLocaleString('id-ID'),
        nomorWa: wa,
        nama,
        jumlah: parseInt(jumlah),
        paket: selectedOption.textContent,
        bundling,
        total,
        estimasi,
        status: 'Antre',
        pengeluaran: 0
    };

    transaksiData.push(transaksi);
    updateLiveOrders();
    updateSummary();
    updatePembukuanTable();

    showToast(`Order ${nama} tersimpan! Rp ${total.toLocaleString('id-ID')}`, '🧺');

    // Reset form
    document.getElementById('namaPelanggan').value = '';
    document.getElementById('nomorWa').value = '';
    document.getElementById('jumlahOrder').value = '1';
    document.getElementById('bundlingDrink').value = 'Tidak';
    document.getElementById('paketLaundry').value = '';
    document.getElementById('estimasiSelesai').value = '';
    document.getElementById('totalTagihan').textContent = 'Rp 0';
}

// ==================== SIMPAN PENGELUARAN ====================
function simpanPengeluaran() {
    const keterangan = document.getElementById('keteranganPengeluaran').value.trim();
    const jumlah = document.getElementById('jumlahPengeluaran').value;

    if (!keterangan || !jumlah) {
        showToast('Lengkapi keterangan & jumlah!', '⚠️');
        return;
    }

    const pengeluaran = {
        id: `exp-${Date.now()}`,
        tanggal: new Date().toLocaleString('id-ID'),
        nama: `💸 ${keterangan}`,
        pengeluaran: parseInt(jumlah),
        total: 0,
        status: 'Pengeluaran'
    };

    transaksiData.push(pengeluaran);
    updateSummary();
    updatePembukuanTable();

    showToast(`Pengeluaran Rp ${parseInt(jumlah).toLocaleString('id-ID')} tercatat!`, '💸');
    document.getElementById('keteranganPengeluaran').value = '';
    document.getElementById('jumlahPengeluaran').value = '';
}

// ==================== REFRESH DATA ====================
function refreshData() {
    showToast('Memuat data terbaru dari Cloud...', '🔄', 1500);
    loadHargaDariSheet();
    loadTransaksi();
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    const jumlahInput = document.getElementById('jumlahOrder');
    const bundlingSelect = document.getElementById('bundlingDrink');
    if (jumlahInput) jumlahInput.addEventListener('input', hitungTotal);
    if (bundlingSelect) bundlingSelect.addEventListener('change', hitungTotal);

    console.log('🚀 J APP PRO v2.0 - Suksma! 🙏');
});
