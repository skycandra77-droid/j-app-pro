// ============================================================
// J APP PRO — print.js
// Fungsi cetak: Struk Thermal 76x100mm & Nota PDF A6
// Disesuaikan dengan arsitektur PRO (transaksiData[])
// Dependency: jsPDF (sudah di-load di index.html)
// ============================================================

// ── LOGO BASE64 ──
const LOGO_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCABAAEABAREA/8QAGgABAAMBAQEAAAAAAAAAAAAAAAIDBQQBBv/EAC8QAAIBAwMBBgUFAAAAAAAAAAABAgMEETEFEiExQVFhcYGRobHB0fAGEyIz/9oACAEBAAA/APuAAAAAAAAAAAAAAAAAAAAASSkqJtJK7fQDjlUpQi5TnGK6t2K19WNG8UsytvKW1n1PbhXqTp+GUXFruWV3nLKWtnPWrGMnCEcpPm+RqX4tI1+JEq0Iy8rnGSve3NMnT1GhNpRqxbemhsAAAAAAAAMeJhVk1ThzS3fY4tRpXtCNOPu3vFpYjHr8lqL4yqZT2n/ALKqhJvVY5ZylKUnKbyvJ0XYlZrx/bKvkgp8acVHf7f4XtVJUzLLtHn5O+nFqKTeSzp/EJPTlNSab29TOdS29R3fjPR/JkpRlFTi7xkk0+59MlBpTdJ6ST6czXTqHQ0dN4j5VNUv5y/RsAAAAAAAA1+LVJUsqSWe2L6mFfXQjhOVpvbu/R9zXVk8qK6y2/Z7evJ+yFpLzSUfpM17ZrNX/Zzrxi7y2cU5ZbV7X6/c6b7q+SLXp0tmdW95etbX8XE7Mzna0r7Xvra5eFxkrNR7fRoswAAAAAAAAAAAAAAAAAA/9k=";

// ── HELPER: cari order dari transaksiData by id ──
function getOrderById(id) {
    return transaksiData.find(t => t.id === id) || null;
}

// ── HELPER: load logo image ──
function loadLogo(callback) {
    const img = new Image();
    img.onload  = () => callback(img);
    img.onerror = () => callback(null);
    img.src     = 'logo.png';
}

// ============================================================
// STRUK THERMAL 76x100mm
// ============================================================
function cetakStrukThermal(id) {
    if (typeof window.jspdf === 'undefined') {
        showToast('⚠️ Library PDF belum siap, coba lagi', 'error');
        return;
    }

    const order = getOrderById(id);
    if (!order) { showToast('❌ Data order tidak ditemukan', 'error'); return; }

    if (!confirm(`Cetak struk thermal untuk:\n${order.nama}\nTotal: ${formatRp(order.total)}`)) return;

    loadLogo(img => {
        const jsPDFLib = window.jspdf.jsPDF;
        const doc      = new jsPDFLib({ orientation:'portrait', unit:'mm', format:[76, 100] });

        if (img) {
            try { doc.addImage(img, 'PNG', 3, 3, 18, 18); } catch(e) { _logoFallback(doc); }
        } else {
            _logoFallback(doc);
        }

        _buildThermal(doc, order);
    });
}

function _logoFallback(doc) {
    doc.setFillColor(26, 86, 219);
    doc.circle(12, 12, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('J', 9, 16);
}

function _buildThermal(doc, order) {
    const margin   = 3;
    const pageW    = 76;
    const contentW = pageW - (margin * 2);
    let y          = 3;

    // Header kanan
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('J LAUNDRY', 23, 9);
    doc.setFontSize(8.5);
    doc.text('EXPRESS', 23, 14);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('UMS Pabelan, Sukoharjo', 23, 19);
    doc.setTextColor(0, 0, 0);
    y = 22;

    // Garis atas
    doc.setLineWidth(0.5);
    doc.setDrawColor(26, 86, 219);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    // Pelanggan
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PELANGGAN', margin, y);
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    const namaLabel = 'Kak ' + order.nama;
    const namaLines = doc.splitTextToSize(namaLabel, contentW);
    doc.text(namaLines, margin, y);
    y += namaLines.length * 7;

    // Garis tipis
    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    // Nota
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('NOTA', margin, y);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(order.id || '-', 20, y);
    y += 5;

    // Tanggal masuk
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('MASUK', margin, y);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(order.tanggal || '-', 20, y);
    y += 5;

    // Estimasi selesai
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('SELESAI', margin, y);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(order.estimasi || '-', 20, y);
    y += 6;

    // Garis tipis
    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    // Total
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL TAGIHAN', margin, y);
    y += 5;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(26, 86, 219);
    doc.text('Rp ' + parseInt(order.total || 0).toLocaleString('id-ID'), margin, y);
    y += 8;

    // Garis bawah
    doc.setLineWidth(0.5);
    doc.setDrawColor(26, 86, 219);
    doc.line(margin, y, pageW - margin, y);

    const notaId = (order.id || 'struk').replace('nota-', '');
    doc.save(`Struk-${notaId}.pdf`);
    showToast('🖨️ Struk thermal siap dicetak!', 'success');
}

// ============================================================
// NOTA PDF A6 (148x185mm) — untuk dikirim via WA
// ============================================================
function cetakNotaPDF(id) {
    if (typeof window.jspdf === 'undefined') {
        showToast('⚠️ Library PDF belum siap, coba lagi', 'error');
        return;
    }

    const order = getOrderById(id);
    if (!order) { showToast('❌ Data order tidak ditemukan', 'error'); return; }

    if (!confirm(`Generate nota PDF untuk:\n${order.nama}\nTotal: ${formatRp(order.total)}\n\nFile PDF akan terdownload — kirim ke WA pelanggan.`)) return;

    loadLogo(img => {
        const jsPDFLib = window.jspdf.jsPDF;
        const doc      = new jsPDFLib({ orientation:'portrait', unit:'mm', format:[148, 185] });

        if (img) {
            try { doc.addImage(img, 'PNG', 12, 8, 22, 22); } catch(e) { _logoFallbackA6(doc); }
        } else {
            _logoFallbackA6(doc);
        }

        _buildNotaA6(doc, order);
    });
}

function _logoFallbackA6(doc) {
    doc.setFillColor(26, 86, 219);
    doc.circle(23, 19, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('J', 20, 23);
}

function _buildNotaA6(doc, order) {
    const tX = 38;

    // Kop
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('J LAUNDRY EXPRESS UMS PABELAN', tX, 14);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Jl Tanuragan 2 Gonilan Kartasura | 085691957805', tX, 19);

    // Status & Nomor
    const isLunas = (order.status === 'Selesai');
    if (isLunas) { doc.setTextColor(22, 163, 74); doc.text('NOTA LUNAS', 136, 14, { align:'right' }); }
    else         { doc.setTextColor(220, 38, 38); doc.text('NOTA TAGIHAN', 136, 14, { align:'right' }); }

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    const notaShort = (order.id || '-').replace('nota-', 'N-');
    doc.text(`No. Nota : ${notaShort}`, 136, 19, { align:'right' });
    doc.text(`Tanggal  : ${(order.tanggal || '-').split(',')[0]}`, 136, 23, { align:'right' });

    // Garis emas
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(12, 28, 136, 28);

    // Box pelanggan
    doc.setFillColor(241, 245, 249);
    doc.rect(12, 32, 124, 13, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, 32, 124, 13);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`PELANGGAN : ${(order.nama || '-').toUpperCase()}`, 16, 38);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Paket : ${order.paket || '-'}`, 16, 43);

    // Header tabel
    let tY = 49;
    doc.setFillColor(30, 58, 138);
    doc.rect(12, tY, 124, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Rincian Order', 15, tY + 5);
    doc.text('Total', 133, tY + 5, { align:'right' });

    // Isi item
    let isiY = tY + 7;
    const itemNama = `${order.paket || '-'} x${order.jumlah || 1}`;
    const itemHarga = parseInt(order.total || 0) - (order.bundling === 'Ya' ? 5000 : 0);

    doc.setDrawColor(226, 232, 240);
    doc.rect(12, isiY, 124, 8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(itemNama.length > 55 ? itemNama.substring(0, 52) + '...' : itemNama, 15, isiY + 5.5);
    doc.text('Rp ' + itemHarga.toLocaleString('id-ID'), 133, isiY + 5.5, { align:'right' });
    isiY += 8;

    // Bundling jika ada
    if (order.bundling === 'Ya') {
        doc.rect(12, isiY, 124, 8);
        doc.text('Es Teh Jumbo (Bundling)', 15, isiY + 5.5);
        doc.text('Rp 5.000', 133, isiY + 5.5, { align:'right' });
        isiY += 8;
    }

    // Total
    let totY = isiY + 5;
    doc.setFillColor(30, 58, 138);
    doc.rect(65, totY, 71, 9, 'F');
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.4);
    doc.rect(65, totY, 71, 9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('TOTAL BAYAR :', 69, totY + 6);
    doc.setTextColor(253, 224, 71);
    doc.text('Rp ' + parseInt(order.total || 0).toLocaleString('id-ID'), 131, totY + 6, { align:'right' });

    // Stempel status
    if (isLunas) {
        doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.6); doc.rect(15, totY, 38, 9);
        doc.setTextColor(22, 163, 74); doc.setFont('Helvetica', 'bold'); doc.setFontSize(9);
        doc.text('PAID / LUNAS', 21, totY + 6);
    } else {
        doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.6); doc.rect(15, totY, 38, 9);
        doc.setTextColor(220, 38, 38); doc.setFont('Helvetica', 'bold'); doc.setFontSize(8.5);
        doc.text('BELUM LUNAS', 20, totY + 6);
    }

    // S&K
    let sY = totY + 18;
    doc.setTextColor(15, 23, 42); doc.setFont('Helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text('Syarat & Ketentuan:', 12, sY);
    doc.setFont('Helvetica', 'italic'); doc.setTextColor(100, 116, 139); doc.setFontSize(7);
    doc.text('1. Tunjukkan Nota Digital ini saat pengambilan pakaian.', 12, sY + 4);
    doc.text('2. Komplain kerusakan dilayani maks. 1x24 jam sejak serah terima.', 12, sY + 7.5);
    const sk3Lines = doc.splitTextToSize('3. Kerusakan akibat sifat bahan, cacat pabrik, atau yang tidak dilaporkan bukan tanggung jawab J Laundry Express.', 124);
    doc.text(sk3Lines, 12, sY + 11);

    // TTD
    let ttdY = sY + 22;
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    doc.text('Sistem Kasir Terverifikasi,', 96, ttdY);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(26, 86, 219);
    doc.text('[ J LAUNDRY CLOUD ]', 97, ttdY + 7);

    const notaId = (order.id || 'nota').replace('nota-', 'N-');
    doc.save(`NotaWA-${notaId}-${order.nama}.pdf`);
    showToast('📄 Nota PDF siap dikirim via WA!', 'success');
}
