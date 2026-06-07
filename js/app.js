// ============================================================
// J APP PRO — app.js (UPDATED v2)
// ✨ Multiple items per transaksi + Edit Order + Separate Active/Selesai
// ============================================================

const SHEET_ID        = '1UO79VguYM9m_dWWUfxcd5OfyFayuLE89T7IvnfKUas4';
const TARIF_SHEET     = 'Tarif';
const TRANSAKSI_SHEET = 'Transaksi';
const LOGIN_SHEET     = 'Login';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4ob5rOxRja80Nam0mzDIOwsmUBhXrqRKMeDPx_dWsS_DJsFlQ4EBigUZAtkgY2Evi/exec';

// ==================== STATE ====================
let hargaData        = {};
let transaksiData    = [];
let loginData        = [];
let kasirAktif       = null;
let autoRefreshTimer = null;
let cartItems        = [];
let filterTanggal    = null; // null = hari ini, string "D/M/YYYY" = filter custom

// State modal konfirmasi status
let _pendingStatusId   = null;
let _pendingStatusBaru = null;
let _pendingStatusLama = null;
let _pendingDropdownEl = null;

// ✨ State modal edit order
let _editingOrderId = null;
let _editingItems   = [];

// ==================== UTILITY ====================
function showToast(pesan, tipe = 'default', durasi = 2800) {
    const toast = document.getElementById('toastNotif');
    if (!toast) return;
    toast.textContent = pesan;
    toast.className   = `toast show ${tipe}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = 'toast hidden'; }, durasi);
}

function formatRp(angka) {
    return 'Rp ' + parseInt(angka || 0).toLocaleString('id-ID');
}

function parseTanggal(str) {
    if (!str) return null;
    // Format gviz Google Sheets: "Date(2026,5,6,14,30,0)" — bulan 0-indexed
    const gviz = String(str).match(/Date\((\d+),(\d+),(\d+)/);
    if (gviz) return new Date(parseInt(gviz[1]), parseInt(gviz[2]), parseInt(gviz[3]));
    // Format standard ISO / US
    let d = new Date(str);
    if (!isNaN(d)) return d;
    // Format id-ID: "6/6/2026, 14.30.00" atau "6/6/2026 14.30.00"
    const m = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    // Format "DD-MM-YYYY"
    const m2 = String(str).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (m2) return new Date(parseInt(m2[3]), parseInt(m2[2]) - 1, parseInt(m2[1]));
    return null;
}

function isToday(str) {
    const d = parseTanggal(str);
    if (!d) return false;
    // Jika ada filter tanggal aktif, cek sesuai filter
    if (filterTanggal) {
        const target = parseTanggal(filterTanggal);
        if (!target) return false;
        return d.getDate()     === target.getDate()  &&
               d.getMonth()    === target.getMonth() &&
               d.getFullYear() === target.getFullYear();
    }
    // Default: hari ini
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const isHariIni = d >= startOfToday && d <= now;
    if (isHariIni) return true;
    // Support shift malam 00:00-06:00: tampilkan juga data kemarin
    if (now.getHours() < 6) {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 6, 0, 0);
        if (d >= startOfYesterday && d < startOfToday) return true;
    }
    return false;
}

function setFilterTanggal(val) {
    filterTanggal = val || null;
    updateLiveOrders();
    updateSummary();
    updatePembukuanTable();
}

// ==================== TOGGLE PASSWORD ====================
function togglePassword() {
    const inp = document.getElementById('password');
    inp.type  = inp.type === 'password' ? 'text' : 'password';
}

// ==================== LOGIN ====================
async function loadLoginData() {
    try {
        const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${LOGIN_SHEET}`;
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
    } catch (e) {
        loginData = [
            { username: 'Vinsmoke', password: '2026Pastijaya', role: 'Admin'    },
            { username: 'Listy',    password: '123456Kerja',   role: 'Karyawan' }
        ];
    }
}

async function handleLogin() {
    const username = (document.getElementById('username').value || '').trim();
    const password = (document.getElementById('password').value || '').toString().trim();
    const errEl    = document.getElementById('loginError');

    if (!username || !password) {
        errEl.classList.remove('hidden');
        errEl.textContent = '❌ Username dan password wajib diisi!';
        return;
    }

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

    errEl.classList.add('hidden');
    kasirAktif = akun;

    document.getElementById('loginScreen').style.display  = 'none';
    document.getElementById('mainApp').style.display      = 'flex';
    document.getElementById('kasirInfo').classList.remove('hidden');
    document.getElementById('kasirNama').textContent      = `👤 ${akun.username}`;
    document.getElementById('kasirRole').textContent      = akun.role;

    loadHargaDariSheet();
    loadTransaksi();

    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(loadTransaksi, 120000);

    showToast(`✅ Selamat datang, ${akun.username}!`, 'success');
}

function handleLogout() {
    if (!confirm('Yakin ingin keluar dari sistem?')) return;
    kasirAktif = null;
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    document.getElementById('mainApp').style.display      = 'none';
    document.getElementById('loginScreen').style.display  = 'flex';
    document.getElementById('kasirInfo').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    cartItems = [];
    showToast('👋 Berhasil keluar');
}

// ==================== TAB NAVIGATION ====================
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
        const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${TARIF_SHEET}`;
        const res  = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        hargaData  = {};
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
    } catch (e) {
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
            const opt         = document.createElement('option');
            opt.value         = item.id;
            opt.textContent   = `${item.nama} — ${formatRp(item.harga)}${item.jam > 0 ? ` (${item.jam} jam)` : ''}`;
            opt.dataset.harga = item.harga;
            opt.dataset.jam   = item.jam;
            og.appendChild(opt);
        });
        select.appendChild(og);
    });
}

// ==================== CART FUNCTIONS ====================
function tambahItemKeCart() {
    const paketEl  = document.getElementById('paketLaundry');
    const paketId  = paketEl.value;
    const jumlah   = parseInt(document.getElementById('jumlahOrder').value) || 1;

    if (!paketId) {
        showToast('❌ Pilih paket dulu!', 'error');
        return;
    }

    const opt   = paketEl.options[paketEl.selectedIndex];
    const harga = parseInt(opt?.dataset?.harga) || 0;
    const nama  = opt?.textContent?.split(' — ')[0] || '';

    cartItems.push({
        id: paketId,
        nama: nama,
        harga: harga,
        jumlah: jumlah,
        subtotal: harga * jumlah
    });

    document.getElementById('paketLaundry').value = '';
    document.getElementById('jumlahOrder').value = '1';

    updateCartDisplay();
    hitungTotal();
    showToast(`✅ Item ditambahkan: ${nama}`, 'success');
}

function hapusItemDariCart(index) {
    if (index < 0 || index >= cartItems.length) return;
    const item = cartItems[index];
    cartItems.splice(index, 1);
    updateCartDisplay();
    hitungTotal();
    showToast(`🗑️ ${item.nama} dihapus`, 'default');
}

function updateCartDisplay() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    if (cartItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 13px;">📭 Belum ada item</p>';
        return;
    }

    container.innerHTML = cartItems.map((item, idx) => `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${item.nama}</div>
                <div style="color: #64748b; font-size: 12px;">
                    ${item.jumlah}x ${formatRp(item.harga)} = <strong>${formatRp(item.subtotal)}</strong>
                </div>
            </div>
            <button type="button" onclick="hapusItemDariCart(${idx})" class="btn-remove" style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">🗑️ Hapus</button>
        </div>
    `).join('');
}

// ==================== HITUNG TOTAL ====================
function hitungTotal() {
    let totalItems = 0;
    cartItems.forEach(item => { totalItems += item.subtotal; });

    const bundling = document.getElementById('bundlingDrink').value === 'Ya' ? 5000 : 0;
    const total    = totalItems + bundling;

    document.getElementById('totalTagihan').textContent = formatRp(total);

    let maxJam = 0;
    cartItems.forEach(item => {
        const paket = hargaData[item.id];
        if (paket && paket.jam > maxJam) maxJam = paket.jam;
    });

    if (maxJam > 0) {
        const selesai = new Date(Date.now() + maxJam * 3600 * 1000);
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
                tanggal     : r.c[1]?.f  || r.c[1]?.v  || '',
                nomorWa     : r.c[2]?.v  || '',
                nama        : r.c[3]?.v  || '',
                item        : r.c[4]?.v  || '',
                jumlah      : r.c[5]?.v  || 0,
                harga       : parseInt(r.c[6]?.v) || 0,
                subtotal    : parseInt(r.c[7]?.v) || 0,
                bundling    : r.c[8]?.v  || '',
                totalHarga  : parseInt(r.c[9]?.v) || 0,
                estimasi    : r.c[10]?.v || '',
                status      : r.c[11]?.v || 'Antre',
                pengeluaran : parseInt(r.c[12]?.v) || 0
            }));

        updateLiveOrders();
        updateSummary();
    } catch (e) {
        console.error('❌ Gagal load transaksi:', e);
        document.getElementById('liveOrders').innerHTML =
            '<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">⚠️ Gagal memuat data. Cek koneksi internet.</p>';
    }
}

// ==================== ✨ LIVE ORDERS (UPDATED - AKTIF vs SELESAI) ====================
function updateLiveOrders() {
    const container = document.getElementById('liveOrders');
    if (!container) return;

    // Group transaksi by order ID — skip baris pengeluaran
    const orderMap = {};
    transaksiData.forEach(t => {
        if (isToday(t.tanggal) && !t.id.startsWith('pengeluaran-')) {
            if (!orderMap[t.id]) {
                orderMap[t.id] = {
                    id: t.id,
                    tanggal: t.tanggal,
                    nomorWa: t.nomorWa,
                    nama: t.nama,
                    status: t.status,
                    estimasi: t.estimasi,
                    totalHarga: 0,
                    items: []
                };
            }
            orderMap[t.id].items.push({
                item: t.item,
                jumlah: t.jumlah,
                harga: t.harga,
                subtotal: t.subtotal
            });
            orderMap[t.id].totalHarga = t.totalHarga;
        }
    });

    const orders = Object.values(orderMap).reverse();

    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">📭 Belum ada order hari ini</p>';
        return;
    }

    // Pisahkan order aktif vs selesai
    const aktif = orders.filter(o => o.status !== 'Selesai');
    const selesai = orders.filter(o => o.status === 'Selesai');

    let html = '';

    // AKTIF
    if (aktif.length > 0) {
        html += '<h4 style="margin: 15px 0 10px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6; color: #1e40af;">🕐 ORDER AKTIF (Antre & Proses)</h4>';
        html += aktif.map(order => renderOrderCard(order)).join('');
    } else {
        html += '<p style="text-align:center;color:#94a3b8;padding:15px;font-size:13px;">✅ Semua order selesai!</p>';
    }

    // SELESAI
    if (selesai.length > 0) {
        html += '<h4 style="margin: 20px 0 10px 0; padding-bottom: 8px; border-bottom: 2px solid #10b981; color: #047857;">✅ ORDER SELESAI</h4>';
        html += selesai.map(order => renderOrderCard(order, true)).join('');
    }

    container.innerHTML = html;
}

function renderOrderCard(order, isSelesai = false) {
    const sc        = order.status.toLowerCase();
    const selesaiMark = order.status === 'Selesai' ? ' ✅' : '';
    const itemsList = order.items.map(it => 
        `<small style="display: block; color: #64748b;">• ${it.item} (${it.jumlah}x) = ${formatRp(it.subtotal)}</small>`
    ).join('');
    
    const opacityStyle = isSelesai ? 'opacity: 0.7;' : '';

    return `
    <div class="order-item status-${sc}-item" style="${opacityStyle}">
        <div class="order-item-top">
            <h4>🧺 ${order.nama}${selesaiMark}
                <span style="font-weight:600;color:#64748b;font-size:12px;">(${order.items.length} item)</span>
            </h4>
            <select id="dd-${order.id}"
                class="status-dropdown status-${sc}"
                onchange="mintaKonfirmasiStatus('${order.id}', this.value, this)">
                <option value="Antre"   ${order.status==='Antre'  ?'selected':''}>Antre</option>
                <option value="Proses"  ${order.status==='Proses' ?'selected':''}>Proses</option>
                <option value="Selesai" ${order.status==='Selesai'?'selected':''}>Selesai</option>
            </select>
        </div>
        <div style="background: #f8fafc; padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 13px;">
            ${itemsList}
        </div>
        <p>📱 ${order.nomorWa||'—'} &nbsp;|&nbsp; 💵 <strong>${formatRp(order.totalHarga)}</strong></p>
        <p>⏰ Selesai: ${order.estimasi||'—'}</p>
        <span class="status-badge ${sc}">${order.status}</span>
        <div class="order-action-row">
            <button class="btn-print-thermal" onclick="cetakStrukThermal('${order.id}')">🖨️ Struk</button>
            <button class="btn-print-nota"    onclick="cetakNotaPDF('${order.id}')">📄 Nota WA</button>
            <button class="btn-edit-order"   onclick="bukaMoalEditOrder('${order.id}')" style="background: #3b82f6; color: white;">✏️ Edit</button>
        </div>
    </div>`;
}

// ==================== ✨ EDIT ORDER MODAL ====================
function bukaMoalEditOrder(orderId) {
    const order = Object.values(Object.fromEntries(
        Object.entries(transaksiData.reduce((acc, t) => {
            if (t.id === orderId) {
                if (!acc[t.id]) {
                    acc[t.id] = { id: t.id, nama: t.nama, nomorWa: t.nomorWa, tanggal: t.tanggal, items: [] };
                }
                acc[t.id].items.push({ item: t.item, jumlah: t.jumlah, harga: t.harga, subtotal: t.subtotal });
            }
            return acc;
        }, {}))
    ))[0];

    if (!order) return;

    _editingOrderId = orderId;
    _editingItems = JSON.parse(JSON.stringify(order.items));

    // Buka modal edit
    const modalHtml = `
    <div id="modalEditOrder" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div style="background:white;border-radius:12px;padding:20px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;">
            <h3 style="margin-bottom:15px;">✏️ Edit Order: ${order.nama}</h3>
            <div id="editItemsList"></div>
            <button type="button" onclick="tambahItemModalEdit()" class="btn btn-secondary" style="width:100%;margin:10px 0;">➕ Tambah Item</button>
            <div style="display:flex;gap:10px;margin-top:15px;">
                <button type="button" onclick="tutupModalEdit()" class="btn" style="flex:1;background:#94a3b8;">Batal</button>
                <button type="button" onclick="simpanEditOrder('${orderId}')" class="btn btn-save" style="flex:1;">💾 Simpan</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    updateEditItemsList();
}

function updateEditItemsList() {
    const container = document.getElementById('editItemsList');
    if (!container) return;

    container.innerHTML = _editingItems.map((item, idx) => `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:10px;">
            <div style="font-weight:600;color:#1e293b;font-size:13px;margin-bottom:5px;">${item.item}</div>
            <div style="display:flex;gap:5px;align-items:center;margin-bottom:5px;">
                <label style="font-size:12px;">Qty:</label>
                <input type="number" value="${item.jumlah}" min="1" onchange="updateEditItemQty(${idx}, this.value)" style="width:50px;padding:4px;border:1px solid #ccc;border-radius:4px;"/>
                <span style="font-size:12px;color:#64748b;">= ${formatRp(item.subtotal)}</span>
            </div>
            <button type="button" onclick="hapusEditItem(${idx})" style="background:#fee2e2;color:#dc2626;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">🗑️ Hapus</button>
        </div>
    `).join('');
}

function updateEditItemQty(idx, qty) {
    if (idx >= 0 && idx < _editingItems.length) {
        _editingItems[idx].jumlah = parseInt(qty) || 1;
        _editingItems[idx].subtotal = _editingItems[idx].harga * _editingItems[idx].jumlah;
        updateEditItemsList();
    }
}

function hapusEditItem(idx) {
    _editingItems.splice(idx, 1);
    updateEditItemsList();
}

function tambahItemModalEdit() {
    const paketEl  = document.getElementById('paketLaundry');
    const paketId  = paketEl.value;
    const jumlah   = parseInt(document.getElementById('jumlahOrder').value) || 1;

    if (!paketId) {
        showToast('❌ Pilih paket dulu!', 'error');
        return;
    }

    const opt   = paketEl.options[paketEl.selectedIndex];
    const harga = parseInt(opt?.dataset?.harga) || 0;
    const nama  = opt?.textContent?.split(' — ')[0] || '';

    _editingItems.push({
        item: nama,
        jumlah: jumlah,
        harga: harga,
        subtotal: harga * jumlah
    });

    updateEditItemsList();
    showToast(`✅ Item ditambahkan ke order`, 'success');
}

function tutupModalEdit() {
    const modal = document.getElementById('modalEditOrder');
    if (modal) modal.remove();
    _editingOrderId = null;
    _editingItems   = [];
}

async function simpanEditOrder(orderId) {
    if (_editingItems.length === 0) {
        showToast('❌ Minimal ada 1 item!', 'error');
        return;
    }

    // Hapus order lama dari transaksiData
    transaksiData = transaksiData.filter(t => t.id !== orderId);

    // Hitung total baru
    let totalHarga = 0;
    _editingItems.forEach(item => { totalHarga += item.subtotal; });

    // Ambil data order dari item pertama (nama, wa, etc)
    const firstItem = transaksiData.find(t => t.id === orderId) || _editingItems[0];

    // Push item baru ke apps script
    for (let item of _editingItems) {
        await fetch(APPS_SCRIPT_URL, {
            method:'POST', mode:'no-cors',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
                action: 'simpanTransaksiMultiple',
                idTransaksi: orderId,
                tanggal: new Date().toLocaleString('id-ID'),
                nomorWa: firstItem.nomorWa || '',
                namaPelanggan: firstItem.nama || 'Unknown',
                item: item.item,
                jumlah: item.jumlah,
                harga: item.harga,
                subtotal: item.subtotal,
                bundlingDrink: 'Tidak',
                totalHarga: totalHarga,
                estimasiSelesai: firstItem.estimasi || '',
                statusNota: firstItem.status || 'Antre',
                pengeluaran: 0,
                kasir: kasirAktif?.username || 'unknown'
            })
        });
    }

    tutupModalEdit();
    showToast('✅ Order diperbarui!', 'success');
    setTimeout(() => loadTransaksi(), 1500);
}

// ==================== MODAL KONFIRMASI STATUS ====================
function mintaKonfirmasiStatus(id, statusBaru, dropdownEl) {
    const order = transaksiData.find(t => t.id === id && !t.id.startsWith('pengeluaran-'));
    if (!order || statusBaru === order.status) return;

    _pendingStatusId   = id;
    _pendingStatusBaru = statusBaru;
    _pendingStatusLama = order.status;
    _pendingDropdownEl = dropdownEl;

    const ikonMap  = { Antre:'🕐', Proses:'⚙️', Selesai:'✅' };
    document.getElementById('modalIcon').textContent  = ikonMap[statusBaru] || '⚠️';
    document.getElementById('modalTitle').textContent = 'Ubah Status Order?';
    document.getElementById('modalBody').innerHTML    =
        `<strong>${order.nama}</strong><br>
         <span style="color:#64748b;font-size:12px;">${order.item}</span><br><br>
         <span style="background:#f1f5f9;padding:3px 10px;border-radius:99px;font-size:12px;">${order.status}</span>
         &nbsp;→&nbsp;
         <span style="background:#dbeafe;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;color:#1e40af;">${statusBaru}</span>`;

    const btn = document.getElementById('modalConfirmBtn');
    btn.className   = `modal-btn modal-btn-confirm${statusBaru==='Selesai'?' success-btn':''}`;
    btn.textContent = `Ya, Ubah ke ${statusBaru}`;

    dropdownEl.disabled = true;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function tutupModal() {
    if (_pendingDropdownEl && _pendingStatusLama) {
        _pendingDropdownEl.value    = _pendingStatusLama;
        _pendingDropdownEl.className = `status-dropdown status-${_pendingStatusLama.toLowerCase()}`;
        _pendingDropdownEl.disabled  = false;
    }
    _pendingStatusId = _pendingStatusBaru = _pendingStatusLama = _pendingDropdownEl = null;
    document.getElementById('modalOverlay').classList.add('hidden');
}

async function konfirmasiStatus() {
    if (!_pendingStatusId) return;
    const id        = _pendingStatusId;
    const newStatus = _pendingStatusBaru;
    const dropEl    = _pendingDropdownEl;

    document.getElementById('modalOverlay').classList.add('hidden');
    _pendingStatusId = _pendingStatusBaru = _pendingStatusLama = _pendingDropdownEl = null;

    transaksiData.forEach(t => { if (t.id === id) t.status = newStatus; });
    if (dropEl) { dropEl.value = newStatus; dropEl.className = `status-dropdown status-${newStatus.toLowerCase()}`; dropEl.disabled = false; }

    updateLiveOrders();
    updateSummary();

    try {
        await fetch(APPS_SCRIPT_URL, {
            method:'POST', mode:'no-cors',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'updateStatus', id, status:newStatus, kasir: kasirAktif?.username||'unknown' })
        });
        showToast(`✅ Status diperbarui: ${newStatus}`, 'success');
    } catch(e) {
        showToast('⚠️ Gagal simpan ke cloud', 'error');
    }
}

// ==================== SIMPAN TRANSAKSI ====================
async function simpanTransaksi() {
    const nama     = document.getElementById('namaPelanggan').value.trim();
    const wa       = document.getElementById('nomorWa').value.trim();
    const bundling = document.getElementById('bundlingDrink').value;
    const estimasi = document.getElementById('estimasiSelesai').value;

    if (!nama)                          { showToast('❌ Nama pelanggan wajib diisi!', 'error'); return; }
    if (cartItems.length === 0)         { showToast('❌ Tambahkan minimal 1 item!', 'error'); return; }

    const btn    = document.getElementById('btnSimpan');
    const statEl = document.getElementById('simpanStatus');
    btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
    statEl.className = 'simpan-status loading';
    statEl.textContent = '⏳ Mengirim ke Google Sheets...';
    statEl.classList.remove('hidden');

    try {
        const idTrx = `nota-${Date.now()}`;
        const tgl   = new Date().toLocaleString('id-ID');
        let totalHarga = 0;
        cartItems.forEach(item => { totalHarga += item.subtotal; });
        totalHarga += (bundling === 'Ya' ? 5000 : 0);

        const itemsToSend = cartItems.map(item => ({
            action: 'simpanTransaksiMultiple',
            idTransaksi: idTrx,
            tanggal: tgl,
            nomorWa: wa,
            namaPelanggan: nama,
            item: item.nama,
            jumlah: item.jumlah,
            harga: item.harga,
            subtotal: item.subtotal,
            bundlingDrink: bundling,
            totalHarga: totalHarga,
            estimasiSelesai: estimasi,
            statusNota: 'Antre',
            pengeluaran: 0,
            kasir: kasirAktif?.username || 'unknown'
        }));

        for (let itemData of itemsToSend) {
            await fetch(APPS_SCRIPT_URL, {
                method:'POST', mode:'no-cors',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify(itemData)
            });
        }

        cartItems = [];
        updateCartDisplay();

        statEl.className = 'simpan-status success';
        statEl.textContent = `✅ Order ${nama} tersimpan! Total: ${formatRp(totalHarga)}`;
        showToast(`✅ Order ${nama} tersimpan!`, 'success');

        ['namaPelanggan','nomorWa','estimasiSelesai'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('bundlingDrink').value = 'Tidak';
        document.getElementById('paketLaundry').value  = '';
        document.getElementById('totalTagihan').textContent = 'Rp 0';

        setTimeout(() => statEl.classList.add('hidden'), 4000);
        setTimeout(() => loadTransaksi(), 3000);
    } catch(e) {
        statEl.className = 'simpan-status error';
        statEl.textContent = '❌ Gagal menyimpan. Cek koneksi!';
        showToast('❌ Gagal menyimpan!', 'error');
    } finally {
        btn.disabled = false; btn.textContent = '✅ SIMPAN ORDER';
    }
}

// ==================== SIMPAN PENGELUARAN ====================
async function simpanPengeluaran() {
    const ket    = document.getElementById('keteranganPengeluaran').value.trim();
    const jumlah = document.getElementById('jumlahPengeluaran').value;

    if (!ket)                           { showToast('❌ Keterangan wajib diisi!', 'error'); return; }
    if (!jumlah || parseInt(jumlah)<=0) { showToast('❌ Jumlah tidak valid!', 'error'); return; }

    const btn    = document.getElementById('btnPengeluaran');
    const statEl = document.getElementById('pengeluaranStatus');
    btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
    statEl.className = 'simpan-status loading';
    statEl.textContent = '⏳ Mengirim data...';
    statEl.classList.remove('hidden');

    try {
        await fetch(APPS_SCRIPT_URL, {
            method:'POST', mode:'no-cors',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
                action:'simpanPengeluaran',
                tanggal: new Date().toLocaleString('id-ID'),
                keterangan:ket, jumlah:parseInt(jumlah),
                kasir: kasirAktif?.username||'unknown'
            })
        });
        statEl.className = 'simpan-status success';
        statEl.textContent = `✅ Pengeluaran ${formatRp(jumlah)} untuk "${ket}" tersimpan!`;
        showToast(`✅ Pengeluaran ${formatRp(jumlah)} dicatat!`, 'success');
        document.getElementById('keteranganPengeluaran').value = '';
        document.getElementById('jumlahPengeluaran').value     = '';
        setTimeout(() => statEl.classList.add('hidden'), 4000);
        setTimeout(() => loadTransaksi(), 3000);
    } catch(e) {
        statEl.className = 'simpan-status error';
        statEl.textContent = '❌ Gagal menyimpan. Cek koneksi!';
        showToast('❌ Gagal menyimpan pengeluaran!', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'SIMPAN PENGELUARAN';
    }
}

// ==================== UPDATE SUMMARY ====================
function updateSummary() {
    const todayData = transaksiData.filter(t => isToday(t.tanggal));

    // Pisahkan baris pengeluaran vs baris order
    const pengeluaranRows = todayData.filter(t => t.id.startsWith('pengeluaran-'));
    const orderRows       = todayData.filter(t => !t.id.startsWith('pengeluaran-'));

    // Pendapatan: ambil totalHarga dari 1 baris per unique order (agar tidak double-count multi-item)
    const seenIds = new Set();
    let totalPendapatan = 0;
    orderRows.forEach(t => {
        if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            totalPendapatan += (t.totalHarga || 0);
        }
    });

    // Pengeluaran: jumlah kolom pengeluaran (kolom M) dari baris pengeluaran-xxx
    const totalPengeluaran = pengeluaranRows.reduce((s, t) => s + (t.pengeluaran || 0), 0);

    const saldoBersih = totalPendapatan - totalPengeluaran;

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('totalPendapatan',  formatRp(totalPendapatan));
    set('totalPengeluaran', formatRp(totalPengeluaran));
    set('saldoBersih',      formatRp(saldoBersih));
    set('statusOmset',      formatRp(totalPendapatan));

    const uniqueOrders = [...new Set(orderRows.map(t => t.id))];
    const antreCount   = uniqueOrders.filter(id => {
        const order = orderRows.find(t => t.id === id);
        return order && order.status === 'Antre';
    }).length;
    const prosesCount  = uniqueOrders.filter(id => {
        const order = orderRows.find(t => t.id === id);
        return order && order.status === 'Proses';
    }).length;
    const selesaiCount = uniqueOrders.filter(id => {
        const order = orderRows.find(t => t.id === id);
        return order && order.status === 'Selesai';
    }).length;

    set('statusAntre',  antreCount);
    set('statusProses', prosesCount);
    set('statusSiap',   selesaiCount);

    const el = document.getElementById('saldoBersih');
    if (el) el.style.color = saldoBersih >= 0 ? '#ffffff' : '#fca5a5';
}

// ==================== TABEL PEMBUKUAN ====================
function updatePembukuanTable() {
    const container = document.getElementById('pembukuanTable');
    if (!container) return;
    const todayData = transaksiData.filter(t => isToday(t.tanggal)).reverse();
    if (todayData.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">📭 Belum ada data hari ini</p>';
        return;
    }

    // Render tiap baris: pengeluaran tampil dengan nilai kolom pengeluaran (kolom M),
    // baris order tampil per-item dengan subtotal item masing-masing
    const rows = todayData.map(t => {
        const isPengeluaran = t.id.startsWith('pengeluaran-');
        if (isPengeluaran) {
            const keterangan = t.nama.replace('[PENGELUARAN] ', '');
            return `
                <tr style="background:#fff7ed;">
                    <td style="white-space:nowrap;font-size:11px;">${t.tanggal}</td>
                    <td><strong style="color:#ea580c;">💸 Pengeluaran</strong></td>
                    <td style="font-size:12px;color:#ea580c;">${keterangan}</td>
                    <td style="text-align:right;font-weight:700;color:#dc2626;">− ${formatRp(t.pengeluaran)}</td>
                    <td style="text-align:center;"><span class="status-badge" style="background:#fed7aa;color:#c2410c;">Pengeluaran</span></td>
                </tr>`;
        }
        return `
            <tr>
                <td style="white-space:nowrap;font-size:11px;">${t.tanggal}</td>
                <td><strong>${t.nama}</strong></td>
                <td style="font-size:12px;">${t.item || '—'}</td>
                <td style="text-align:right;font-weight:700;color:#1a56db;">${formatRp(t.subtotal)}</td>
                <td style="text-align:center;"><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="overflow-x:auto;">
        <table class="tabel-pembukuan">
            <thead><tr><th>Waktu</th><th>Pelanggan</th><th>Item</th><th style="text-align:right;">Subtotal</th><th style="text-align:center;">Status</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`;
}

// ==================== REFRESH ====================
function refreshData() {
    loadHargaDariSheet();
    loadTransaksi();
    showToast('🔄 Memuat ulang data dari cloud...', 'default');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadLoginData();
    ['username','password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
    });
    console.log('🚀 J APP PRO initialized!');
});
