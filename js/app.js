// ============================================================
// J APP PRO — app.js
// Fix: login validasi, simpan transaksi ke Sheets,
//      simpan pengeluaran ke Sheets, update status ke cloud,
//      filter tanggal fix, tab navigation, toast notif
// ============================================================

// ==================== KONFIGURASI ====================
const SHEET_ID        = '1UO79VguYM9m_dWWUfxcd5OfyFayuLE89T7IvnfKUas4';
const TARIF_SHEET     = 'Tarif';
const TRANSAKSI_SHEET = 'Transaksi';
const LOGIN_SHEET     = 'Login';

// Apps Script Web App URL — untuk POST data ke Google Sheets
// Gunakan URL dari file web_url yang sudah ada
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4ob5rOxRja80Nam0mzDIOwsmUBhXrqRKMeDPx_dWsS_DJsFlQ4EBigUZAtkgY2Evi/exec';

// ==================== STATE ====================
let hargaData      = {};
let transaksiData  = [];
let loginData      = [];   // data akun dari sheet Login
let kasirAktif     = null; // { username, role }
let sheetLoaded    = false;
let autoRefreshTimer = null;

// ==================== UTILITY ====================

/** Tampilkan toast notifikasi */
function showToast(pesan, tipe = 'default', durasi = 2800) {
    const toast = document.getElementById('toastNotif');
    if (!toast) return;
    toast.textContent = pesan;
    toast.className   = `toast show ${tipe}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.className = 'toast hidden';
    }, durasi);
}

/** Format rupiah */
function formatRp(angka) {
    return 'Rp ' + parseInt(angka || 0).toLocaleString('id-ID');
}

/** Parse tanggal dari string GViz / toLocaleString Indonesia */
function parseTanggal(str) {
    if (!str) return null;
    // Coba parse langsung
    let d = new Date(str);
    if (!isNaN(d)) return d;
    // Format: "31/5/2026, 22.47" (id-ID)
    const m = str.match(/(\d+)\/(\d+)\/(\d+)/);
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    return null;
}

/** Cek apakah string tanggal adalah hari ini */
function isToday(str) {
    const d = parseTanggal(str);
    if (!d) return false;
    const now = new Date();
    return d.getDate()     === now.getDate()  &&
           d.getMonth()    === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
}

// ==================== TOGGLE PASSWORD ====================
function togglePassword() {
    const inp = document.getElementById('password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ==================== LOGIN ====================

/** Load data akun dari sheet Login */
async function loadLoginData() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${LOGIN_SHEET}`;
        const res  = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        loginData  = json.table.rows
            .filter(r => r.c[0] && r.c[0].v && r.c[0].v !== 'Username')
            .map(r => ({
                username : (r.c[0]?.v || '').trim(),
                password : (r.c[1]?.v || '').toString().trim(),
                role     : (r.c[2]?.v || 'Karyawan').trim()
            }));
        console.log('✅ Data login berhasil dimuat:', loginData.length, 'akun');
    } catch (e) {
        console.warn('⚠️ Gagal load login dari sheet, pakai data lokal');
        // Fallback hardcode sesuai sheet
        loginData = [
            { username: 'Vinsmoke', password: '2026Pastijaya', role: 'Admin'    },
            { username: 'Listy',    password: '123456Kerja',   role: 'Karyawan' }
        ];
    }
}

/** Handle tombol login */
async function handleLogin() {
    const username = (document.getElementById('username').value || '').trim();
    const password = (document.getElementById('password').value || '').toString().trim();
    const errEl    = document.getElementById('loginError');

    if (!username || !password) {
        errEl.classList.remove('hidden');
        errEl.textContent = '❌ Username dan password wajib diisi!';
        return;
    }

    // Pastikan data login sudah dimuat
    if (loginData.length === 0) await loadLoginData();

    const akun = loginData.find(
        a => a.username.toLowerCase() === username.toLowerCase() &&
             a.password === password
    );

    if (!akun) {
        errEl.classList.remove('hidden');
        errEl.textContent = '❌ Username atau password salah!';
        return;
    }

    // Login berhasil
    errEl.classList.add('hidden');
    kasirAktif = akun;

    document.getElementById('loginScreen').style.display   = 'none';
    document.getElementById('mainApp').style.display       = 'flex';
    document.getElementById('kasirInfo').classList.remove('hidden');
    document.getElementById('kasirNama').textContent       = `👤 ${akun.username}`;
    document.getElementById('kasirRole').textContent       = akun.role;

    // Inisialisasi
    loadHargaDariSheet();
    loadTransaksi();

    // Auto refresh setiap 2 menit
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        loadTransaksi();
    }, 120000);

    showToast(`✅ Selamat datang, ${akun.username}!`, 'success');
}

/** Logout */
function handleLogout() {
    if (!confirm('Yakin ingin keluar dari sistem?')) return;
    kasirAktif = null;
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);

    document.getElementById('mainApp').style.display     = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('kasirInfo').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showToast('👋 Berhasil keluar');
}

// ==================== TAB / PANEL NAVIGATION ====================
function gantiPanel(nama) {
    const panelKasir     = document.getElementById('panelKasir');
    const panelRingkasan = document.getElementById('panelRingkasan');
    const tabKasir       = document.getElementById('tabKasir');
    const tabRingkasan   = document.getElementById('tabRingkasan');

    if (nama === 'kasir') {
        panelKasir.classList.remove('hidden');
        panelRingkasan.classList.add('hidden');
        tabKasir.classList.add('active');
        tabRingkasan.classList.remove('active');
    } else {
        panelKasir.classList.add('hidden');
        panelRingkasan.classList.remove('hidden');
        tabKasir.classList.remove('active');
        tabRingkasan.classList.add('active');
        updateSummary();
        updatePembukuanTable();
    }
}

// ==================== LOAD HARGA ====================
async function loadHargaDariSheet() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${TARIF_SHEET}`;
        const res  = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));

        hargaData = {};
        json.table.rows.forEach(row => {
            if (row.c[0] && row.c[0].v && row.c[0].v !== 'kategori') {
                const item = {
                    kategori : row.c[0]?.v || '',
                    id       : row.c[1]?.v || '',
                    nama     : row.c[2]?.v || '',
                    harga    : parseInt(row.c[3]?.v) || 0,
                    jam      : parseInt(row.c[4]?.v) || 0
                };
                if (item.id) hargaData[item.id] = item;
            }
        });

        updateDropdownPaket();
        sheetLoaded = true;
        console.log('✅ Harga dimuat:', Object.keys(hargaData).length, 'item');
    } catch (e) {
        console.error('❌ Gagal load harga dari sheet:', e);
        loadHargaLokal();
    }
}

function loadHargaLokal() {
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
        {kategori:'SATUAN',id:'pd',nama:'SATUAN - PD — Underwear',harga:10000,jam:0},
        {kategori:'SATUAN',id:'kst',nama:'SATUAN - KST — Keset',harga:5000,jam:0},
        {kategori:'SATUAN',id:'pad',nama:'SATUAN - PAD — Pad',harga:5000,jam:0},
        {kategori:'SATUAN',id:'pack',nama:'SATUAN - PACK — Plastik HD',harga:300,jam:0},
        {kategori:'SATUAN',id:'slk',nama:'SATUAN - SLK — Selimut Kecil',harga:7000,jam:0},
        {kategori:'SATUAN',id:'trt1',nama:'SATUAN - TRT1 — Treatment',harga:12500,jam:0},
        {kategori:'SATUAN',id:'sp',nama:'SATUAN - SP — Split',harga:7500,jam:0},
        {kategori:'SATUAN',id:'al',nama:'SATUAN - AL — Almet',harga:4500,jam:0},
        {kategori:'SATUAN',id:'shoe1',nama:'SATUAN - SHOE1 — Sepatu Fast',harga:30000,jam:0},
        {kategori:'SATUAN',id:'shoe2',nama:'SATUAN - SHOE2 — Sepatu Deep',harga:50000,jam:0}
    ];

    hargaData = {};
    lokalData.forEach(d => { if (d.id) hargaData[d.id] = d; });
    updateDropdownPaket();
    showToast('⚠️ Menggunakan data harga lokal (offline)', 'default');
}

function updateDropdownPaket() {
    const select = document.getElementById('paketLaundry');
    if (!select) return;

    select.innerHTML = '<option value="">-- Pilih Paket Laundry --</option>';

    const groups = {};
    Object.values(hargaData).forEach(item => {
        if (!groups[item.kategori]) groups[item.kategori] = [];
        groups[item.kategori].push(item);
    });

    Object.keys(groups).sort().forEach(kat => {
        const og = document.createElement('optgroup');
        og.label = `✨ ${kat}`;
        groups[kat].forEach(item => {
            const opt = document.createElement('option');
            opt.value              = item.id;
            opt.textContent        = `${item.nama} — ${formatRp(item.harga)}${item.jam > 0 ? ` (${item.jam} jam)` : ''}`;
            opt.dataset.harga      = item.harga;
            opt.dataset.jam        = item.jam;
            og.appendChild(opt);
        });
        select.appendChild(og);
    });
}

// ==================== HITUNG TOTAL ====================
function hitungTotal() {
    const sel      = document.getElementById('paketLaundry');
    const qty      = parseInt(document.getElementById('jumlahOrder').value) || 1;
    const bundling = document.getElementById('bundlingDrink').value === 'Ya' ? 5000 : 0;
    const opt      = sel.options[sel.selectedIndex];
    const harga    = parseInt(opt?.dataset?.harga) || 0;
    const total    = (harga * qty) + bundling;

    document.getElementById('totalTagihan').textContent = formatRp(total);

    const jam = parseInt(opt?.dataset?.jam) || 0;
    if (jam > 0) {
        const selesai = new Date(Date.now() + jam * 3600 * 1000);
        document.getElementById('estimasiSelesai').value =
            selesai.toLocaleDateString('id-ID', {
                weekday:'short', day:'numeric', month:'short',
                hour:'2-digit', minute:'2-digit'
            });
    } else {
        document.getElementById('estimasiSelesai').value = 'Sesuai kesepakatan';
    }
}

// ==================== LOAD TRANSAKSI ====================
async function loadTransaksi() {
    try {
        const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${TRANSAKSI_SHEET}&_=${Date.now()}`;
        const res  = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));

        transaksiData = json.table.rows
            .filter(r => r.c[0] && r.c[0].v)
            .map(r => ({
                id          : r.c[0]?.v  || '',
                tanggal     : r.c[1]?.v  || r.c[1]?.f || '',
                nomorWa     : r.c[2]?.v  || '',
                nama        : r.c[3]?.v  || '',
                jumlah      : r.c[4]?.v  || 0,
                paket       : r.c[5]?.v  || '',
                bundling    : r.c[6]?.v  || '',
                total       : parseInt(r.c[7]?.v) || 0,
                estimasi    : r.c[8]?.v  || '',
                status      : r.c[9]?.v  || 'Antre',
                pengeluaran : parseInt(r.c[10]?.v) || 0
            }));

        updateLiveOrders();
        updateSummary();
        console.log('✅ Transaksi dimuat:', transaksiData.length, 'baris');
    } catch (e) {
        console.error('❌ Gagal load transaksi:', e);
        document.getElementById('liveOrders').innerHTML =
            '<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">⚠️ Gagal memuat data. Cek koneksi internet.</p>';
    }
}

// ==================== LIVE ORDERS ====================
function updateLiveOrders() {
    const container = document.getElementById('liveOrders');
    if (!container) return;

    // Ambil order hari ini, urutkan terbaru di atas, max 8
    const todayOrders = transaksiData
        .filter(t => isToday(t.tanggal))
        .slice(-8)
        .reverse();

    if (todayOrders.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">📭 Belum ada order hari ini</p>';
        return;
    }

    container.innerHTML = todayOrders.map(order => `
        <div class="order-item">
            <div class="order-item-top">
                <h4>🧺 ${order.nama} <span style="font-weight:600;color:#64748b;font-size:12px;">(${order.jumlah} item)</span></h4>
                <select onchange="updateStatusTransaksi('${order.id}', this.value)"
                        class="status-dropdown">
                    <option value="Antre"   ${order.status === 'Antre'   ? 'selected' : ''}>Antre</option>
                    <option value="Proses"  ${order.status === 'Proses'  ? 'selected' : ''}>Proses</option>
                    <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                </select>
            </div>
            <p>📦 ${order.paket}</p>
            <p>📱 ${order.nomorWa || '—'} &nbsp;|&nbsp; 💵 <strong>${formatRp(order.total)}</strong></p>
            <p>⏰ Selesai: ${order.estimasi || '—'}</p>
            <span class="status-badge ${order.status.toLowerCase()}">${order.status}</span>
        </div>
    `).join('');
}

// ==================== UPDATE STATUS KE CLOUD ====================
async function updateStatusTransaksi(id, newStatus) {
    // Update lokal dulu (responsif)
    const t = transaksiData.find(x => x.id === id);
    if (t) t.status = newStatus;
    updateSummary();

    // Kirim ke Apps Script
    try {
        const payload = {
            action  : 'updateStatus',
            id      : id,
            status  : newStatus,
            kasir   : kasirAktif?.username || 'unknown'
        };
        await fetch(APPS_SCRIPT_URL, {
            method : 'POST',
            mode   : 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });
        showToast(`✅ Status diperbarui: ${newStatus}`, 'success');
    } catch (e) {
        console.error('❌ Gagal update status ke cloud:', e);
        showToast('⚠️ Update status gagal disimpan ke cloud', 'error');
    }
}

// ==================== SIMPAN TRANSAKSI KE SHEETS ====================
async function simpanTransaksi() {
    const nama     = document.getElementById('namaPelanggan').value.trim();
    const wa       = document.getElementById('nomorWa').value.trim();
    const paketEl  = document.getElementById('paketLaundry');
    const paketId  = paketEl.value;
    const jumlah   = document.getElementById('jumlahOrder').value;
    const bundling = document.getElementById('bundlingDrink').value;
    const estimasi = document.getElementById('estimasiSelesai').value;

    // Validasi
    if (!nama) { showToast('❌ Nama pelanggan wajib diisi!', 'error'); return; }
    if (!paketId) { showToast('❌ Pilih paket laundry terlebih dahulu!', 'error'); return; }
    if (!jumlah || parseInt(jumlah) < 1) { showToast('❌ Jumlah order tidak valid!', 'error'); return; }

    const opt   = paketEl.options[paketEl.selectedIndex];
    const harga = parseInt(opt.dataset.harga) || 0;
    const total = (harga * parseInt(jumlah)) + (bundling === 'Ya' ? 5000 : 0);

    const idTransaksi = `nota-${Date.now()}`;
    const tanggal     = new Date().toLocaleString('id-ID');

    const payload = {
        action          : 'simpanTransaksi',
        idTransaksi     : idTransaksi,
        tanggal         : tanggal,
        nomorWa         : wa,
        namaPelanggan   : nama,
        jumlahOrder     : jumlah,
        paketLaundry    : opt.textContent.split(' — ')[0].trim(),
        bundlingDrink   : bundling,
        totalHarga      : total,
        estimasiSelesai : estimasi,
        statusNota      : 'Antre',
        pengeluaran     : 0,
        kasir           : kasirAktif?.username || 'unknown'
    };

    // UI loading
    const btn    = document.getElementById('btnSimpan');
    const statEl = document.getElementById('simpanStatus');
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan...';
    statEl.className  = 'simpan-status loading';
    statEl.textContent = '⏳ Mengirim data ke Google Sheets...';
    statEl.classList.remove('hidden');

    try {
        await fetch(APPS_SCRIPT_URL, {
            method : 'POST',
            mode   : 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });

        // Tambah ke state lokal supaya langsung terlihat
        transaksiData.push({
            id       : idTransaksi,
            tanggal  : tanggal,
            nomorWa  : wa,
            nama     : nama,
            jumlah   : jumlah,
            paket    : payload.paketLaundry,
            bundling : bundling,
            total    : total,
            estimasi : estimasi,
            status   : 'Antre',
            pengeluaran: 0
        });

        updateLiveOrders();
        updateSummary();

        statEl.className  = 'simpan-status success';
        statEl.textContent = `✅ Order ${nama} berhasil disimpan! Total: ${formatRp(total)}`;
        showToast(`✅ Order ${nama} tersimpan!`, 'success');

        // Reset form
        document.getElementById('namaPelanggan').value  = '';
        document.getElementById('nomorWa').value        = '';
        document.getElementById('jumlahOrder').value    = '1';
        document.getElementById('bundlingDrink').value  = 'Tidak';
        document.getElementById('paketLaundry').value   = '';
        document.getElementById('totalTagihan').textContent = 'Rp 0';
        document.getElementById('estimasiSelesai').value = '';

        // Sembunyikan status setelah 4 detik
        setTimeout(() => statEl.classList.add('hidden'), 4000);

        // Reload dari cloud setelah 3 detik
        setTimeout(() => loadTransaksi(), 3000);

    } catch (e) {
        console.error('❌ Gagal simpan transaksi:', e);
        statEl.className  = 'simpan-status error';
        statEl.textContent = '❌ Gagal menyimpan. Cek koneksi internet!';
        showToast('❌ Gagal menyimpan ke cloud!', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = '✅ SIMPAN ORDER';
    }
}

// ==================== SIMPAN PENGELUARAN ====================
async function simpanPengeluaran() {
    const keterangan = document.getElementById('keteranganPengeluaran').value.trim();
    const jumlah     = document.getElementById('jumlahPengeluaran').value;

    if (!keterangan) { showToast('❌ Keterangan pengeluaran wajib diisi!', 'error'); return; }
    if (!jumlah || parseInt(jumlah) <= 0) { showToast('❌ Jumlah pengeluaran tidak valid!', 'error'); return; }

    const payload = {
        action      : 'simpanPengeluaran',
        tanggal     : new Date().toLocaleString('id-ID'),
        keterangan  : keterangan,
        jumlah      : parseInt(jumlah),
        kasir       : kasirAktif?.username || 'unknown'
    };

    const btn    = document.getElementById('btnPengeluaran');
    const statEl = document.getElementById('pengeluaranStatus');
    btn.disabled    = true;
    btn.textContent = '⏳ Menyimpan...';
    statEl.className  = 'simpan-status loading';
    statEl.textContent = '⏳ Mengirim data...';
    statEl.classList.remove('hidden');

    try {
        await fetch(APPS_SCRIPT_URL, {
            method : 'POST',
            mode   : 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        });

        statEl.className  = 'simpan-status success';
        statEl.textContent = `✅ Pengeluaran ${formatRp(jumlah)} untuk "${keterangan}" tersimpan!`;
        showToast(`✅ Pengeluaran ${formatRp(jumlah)} dicatat!`, 'success');

        document.getElementById('keteranganPengeluaran').value = '';
        document.getElementById('jumlahPengeluaran').value     = '';

        setTimeout(() => statEl.classList.add('hidden'), 4000);
        setTimeout(() => loadTransaksi(), 3000);

    } catch (e) {
        console.error('❌ Gagal simpan pengeluaran:', e);
        statEl.className  = 'simpan-status error';
        statEl.textContent = '❌ Gagal menyimpan. Cek koneksi!';
        showToast('❌ Gagal menyimpan pengeluaran!', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'SIMPAN PENGELUARAN';
    }
}

// ==================== UPDATE SUMMARY ====================
function updateSummary() {
    const todayData = transaksiData.filter(t => isToday(t.tanggal));

    const totalPendapatan  = todayData.reduce((s, t) => s + (t.total || 0), 0);
    const totalPengeluaran = todayData.reduce((s, t) => s + (t.pengeluaran || 0), 0);
    const saldoBersih      = totalPendapatan - totalPengeluaran;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('totalPendapatan', formatRp(totalPendapatan));
    set('totalPengeluaran', formatRp(totalPengeluaran));
    set('saldoBersih', formatRp(saldoBersih));
    set('statusOmset', formatRp(totalPendapatan));

    set('statusAntre',  todayData.filter(t => t.status === 'Antre').length);
    set('statusProses', todayData.filter(t => t.status === 'Proses').length);
    set('statusSiap',   todayData.filter(t => t.status === 'Selesai').length);

    // Warna saldo bersih
    const saldoEl = document.getElementById('saldoBersih');
    if (saldoEl) {
        saldoEl.style.color = saldoBersih >= 0 ? '#ffffff' : '#fca5a5';
    }
}

// ==================== TABEL PEMBUKUAN ====================
function updatePembukuanTable() {
    const container = document.getElementById('pembukuanTable');
    if (!container) return;

    const todayData = transaksiData
        .filter(t => isToday(t.tanggal))
        .reverse();

    if (todayData.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">📭 Belum ada data hari ini</p>';
        return;
    }

    container.innerHTML = `
        <div style="overflow-x:auto;">
        <table class="tabel-pembukuan">
            <thead>
                <tr>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th style="text-align:right;">Total</th>
                    <th style="text-align:center;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${todayData.map(t => `
                    <tr>
                        <td style="white-space:nowrap;font-size:11px;">${t.tanggal}</td>
                        <td><strong>${t.nama}</strong></td>
                        <td style="text-align:right;font-weight:700;color:#1a56db;">${formatRp(t.total)}</td>
                        <td style="text-align:center;">
                            <span class="status-badge ${t.status.toLowerCase()}">${t.status}</span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
    `;
}

// ==================== REFRESH ====================
function refreshData() {
    loadHargaDariSheet();
    loadTransaksi();
    showToast('🔄 Memuat ulang data dari cloud...', 'default');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load data login saat halaman pertama dibuka
    loadLoginData();

    // Enter key di form login
    ['username', 'password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleLogin();
        });
    });

    console.log('🚀 J APP PRO initialized!');
});
