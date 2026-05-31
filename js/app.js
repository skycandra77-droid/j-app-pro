const swiper = new Swiper('.swiper', { initialSlide: 0, speed: 250 });
const navKasir = document.getElementById('nav-kasir');
const navPembukuan = document.getElementById('nav-pembukuan');

swiper.on('slideChange', function () {
    if (swiper.activeIndex === 0) aktifkanNav(navKasir, navPembukuan);
    else aktifkanNav(navPembukuan, navKasir);
});

navKasir.addEventListener('click', () => swiper.slideTo(0));
navPembukuan.addEventListener('click', () => {
    if (swiper.activeIndex === 1) swiper.slideTo(2);
    else swiper.slideTo(1);
});

function aktifkanNav(aktif, nonaktif) {
    aktif.classList.add('text-[#0052CC]', 'font-bold');
    aktif.classList.remove('text-gray-400', 'font-medium');
    nonaktif.classList.remove('text-[#0052CC]', 'font-bold');
    nonaktif.classList.add('text-gray-400', 'font-medium');
}

function toggleDropdown(dropId) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if(menu.id !== dropId) menu.classList.add('hidden');
    });
    document.getElementById(dropId).classList.toggle('hidden');
}

window.addEventListener('click', function(e) {
    if (!e.target.matches('button') && !e.target.parentElement.matches('button')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    }
});

function bukaModal() { document.getElementById('modalOrder').classList.remove('hidden'); }
function tutupModal() { 
    document.getElementById('modalOrder').classList.add('hidden');
    document.getElementById('input-nama').value = '';
    document.getElementById('input-berat').value = '';
    document.getElementById('input-teh').checked = false;
    document.getElementById('live-total-harga').innerText = 'Rp 0';
}

function simpanTransaksiBaru() {
    const nama = document.getElementById('input-nama').value || 'Pelanggan';
    const berat = document.getElementById('input-berat').value || 0;
    const bundlingText = document.getElementById('input-teh').checked ? ' + Teh Jumbo' : '';
    const totalText = document.getElementById('live-total-harga').innerText;

    if(berat <= 0) { alert('Tolong masukkan berat kiloan laundry dengan benar ya Beli sayang!'); return; }

    const container = document.getElementById('daftar-transaksi');
    const newId = 'nota-' + Date.now();
    const dropId = 'drop-' + Date.now();

    const htmlBaru = `
        <div class="p-3 flex justify-between items-center transition-all duration-300 overflow-visible" id="${newId}">
            <div><p class="font-bold text-xs">${nama}</p><p class="text-[10px] text-gray-400 mt-0.5">${berat} Kg • Kiloan${bundlingText}</p></div>
            <div class="relative inline-block text-left">
                <button onclick="toggleDropdown('${dropId}')" class="bg-green-600 text-white text-[11px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5">Aksi <i class="fa-solid fa-chevron-down text-[9px]"></i></button>
                <div id="${dropId}" class="dropdown-menu hidden absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-50 divide-y divide-gray-50 overflow-hidden">
                    <button onclick="selesaikanOrder('${newId}')" class="w-full text-left px-3 py-2 text-[11px] font-bold text-gray-700 flex items-center gap-2"><i class="fa-solid fa-circle-check"></i> Ambil</button>
                    <button onclick="alert('Mencetak Label...')" class="w-full text-left px-3 py-2 text-[11px] font-medium text-gray-700 flex items-center gap-2"><i class="fa-solid fa-print"></i> Cetak Label</button>
                    <button onclick="alert('Mengunduh PDF...')" class="w-full text-left px-3 py-2 text-[11px] font-medium text-gray-700 flex items-center gap-2"><i class="fa-solid fa-file-pdf"></i> Nota PDF</button>
                    <button onclick="voidOrder('${newId}')" class="w-full text-left px-3 py-2 text-[11px] font-bold text-red-600 flex items-center gap-2"><i class="fa-solid fa-trash-can"></i> Void</button>
                </div>
            </div>
        </div>`;
    container.insertAdjacentHTML('afterbegin', htmlBaru);
    alert('Transaksi Berhasil Disimpan & Nota WA Terkirim!');
    tutupModal();
}

function selesaikanOrder(idNota) {
    if(confirm('Apakah cucian ini sudah diambil pelanggan, Beli?')) {
        const element = document.getElementById(idNota);
        element.style.opacity = '0';
        setTimeout(() => { element.remove(); }, 300);
    }
}

function voidOrder(idNota) {
    if(confirm('🚨 PERINGATAN VOID!\nApakah Beli yakin ingin menghapus transaksi ini?')) {
        const element = document.getElementById(idNota);
        element.style.transform = 'scale(0.9)';
        element.style.opacity = '0';
        setTimeout(() => { element.remove(); alert('Transaksi berhasil di-void!'); }, 300);
    }
}
