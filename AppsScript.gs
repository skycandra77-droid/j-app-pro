// ============================================================
// J APP PRO — Google Apps Script (UPDATED)
// ✨ Support Multiple Items Per Transaksi
// Mendukung GET (load tarif) & POST (simpan transaksi,
// update status, simpan pengeluaran)
// Deploy sebagai: Web App — Anyone (even anonymous)
// ============================================================

function doGet(e) {
  // Bisa dipakai untuk tes atau load tarif via GET
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Tarif") || ss.getSheets()[0];
  var lr    = sheet.getLastRow();
  var data  = sheet.getRange(2, 1, lr - 1, 5).getValues();

  var hasil = [];
  data.forEach(function(row) {
    if (row[1] !== "" && row[2] !== "") {
      hasil.push({
        kategori : row[0].toString(),
        id       : row[1].toString(),
        nama     : row[2].toString(),
        harga    : Number(row[3]),
        jam      : Number(row[4])
      });
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", data: hasil }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action || "";
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var result = {};

    if (action === "simpanTransaksi") {
      result = simpanTransaksi(ss, body);
    } else if (action === "simpanTransaksiMultiple") {
      // ✨ BARU: Handle multiple items
      result = simpanTransaksiMultiple(ss, body);
    } else if (action === "updateStatus") {
      result = updateStatus(ss, body);
    } else if (action === "simpanPengeluaran") {
      result = simpanPengeluaran(ss, body);
    } else {
      result = { status: "error", message: "Action tidak dikenal: " + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Simpan order baru ke sheet Transaksi (OLD — masih support) ──
function simpanTransaksi(ss, data) {
  var sheet = ss.getSheetByName("Transaksi");
  if (!sheet) return { status: "error", message: "Sheet Transaksi tidak ditemukan" };

  sheet.appendRow([
    data.idTransaksi     || "",
    data.tanggal         || new Date().toLocaleString("id-ID"),
    data.nomorWa         || "",
    data.namaPelanggan   || "",
    data.jumlahOrder     || 0,
    data.paketLaundry    || "",
    data.bundlingDrink   || "Tidak",
    data.totalHarga      || 0,
    data.estimasiSelesai || "",
    data.statusNota      || "Antre",
    data.pengeluaran     || 0
  ]);

  return { status: "ok", message: "Transaksi berhasil disimpan", id: data.idTransaksi };
}

// ✨ ── Simpan transaksi dengan multiple items (BARU) ──
// Struktur sheet Transaksi (11 kolom):
// A: ID Transaksi
// B: Tanggal
// C: Nomor WA
// D: Nama Pelanggan
// E: Item
// F: Jumlah
// G: Harga
// H: Subtotal
// I: Bundling Drink
// J: Total Harga (untuk seluruh transaksi)
// K: Estimasi Selesai
// L: Status
// M: Pengeluaran
function simpanTransaksiMultiple(ss, data) {
  var sheet = ss.getSheetByName("Transaksi");
  if (!sheet) return { status: "error", message: "Sheet Transaksi tidak ditemukan" };

  // Setiap item ditulis sebagai row terpisah
  sheet.appendRow([
    data.idTransaksi     || "",                    // A: ID Transaksi
    data.tanggal         || new Date().toLocaleString("id-ID"), // B: Tanggal
    data.nomorWa         || "",                    // C: Nomor WA
    data.namaPelanggan   || "",                    // D: Nama Pelanggan
    data.item            || "",                    // E: Item
    data.jumlah          || 0,                     // F: Jumlah
    data.harga           || 0,                     // G: Harga per item
    data.subtotal        || 0,                     // H: Subtotal item
    data.bundlingDrink   || "Tidak",               // I: Bundling Drink (opsional, bisa "Ya"/"Tidak")
    data.totalHarga      || 0,                     // J: Total Harga (keseluruhan transaksi)
    data.estimasiSelesai || "",                    // K: Estimasi Selesai
    data.statusNota      || "Antre",               // L: Status
    data.pengeluaran     || 0                      // M: Pengeluaran
  ]);

  return { 
    status: "ok", 
    message: "Item berhasil disimpan", 
    id: data.idTransaksi,
    item: data.item
  };
}

// ── Update status nota di sheet Transaksi ──
// Update semua row dengan ID Transaksi yang sama
function updateStatus(ss, data) {
  var sheet  = ss.getSheetByName("Transaksi");
  if (!sheet) return { status: "error", message: "Sheet Transaksi tidak ditemukan" };

  var rows    = sheet.getDataRange().getValues();
  var updated = false;
  var count   = 0;

  // Kolom L = Status (index 11, counting from 0)
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.getRange(i + 1, 12).setValue(data.status); // Kolom L = Status
      updated = true;
      count++;
    }
  }

  if (updated) {
    return { 
      status: "ok", 
      message: "Status diperbarui: " + data.status + " (" + count + " item)",
      count: count
    };
  } else {
    return { status: "error", message: "ID tidak ditemukan: " + data.id };
  }
}

// ── Simpan pengeluaran — tulis ke baris baru dengan ID "pengeluaran-..." ──
function simpanPengeluaran(ss, data) {
  var sheet = ss.getSheetByName("Transaksi");
  if (!sheet) return { status: "error", message: "Sheet Transaksi tidak ditemukan" };

  var idPengeluaran = "pengeluaran-" + Date.now();

  sheet.appendRow([
    idPengeluaran,                           // A: ID Transaksi
    data.tanggal || new Date().toLocaleString("id-ID"), // B: Tanggal
    "",                                      // C: Nomor WA (kosong)
    "[PENGELUARAN] " + (data.keterangan || ""), // D: Nama Pelanggan → keterangan
    "",                                      // E: Item (kosong)
    0,                                       // F: Jumlah (kosong)
    0,                                       // G: Harga (kosong)
    0,                                       // H: Subtotal (kosong)
    "",                                      // I: Bundling Drink (kosong)
    0,                                       // J: Total Harga (kosong)
    "",                                      // K: Estimasi (kosong)
    "Pengeluaran",                           // L: Status = Pengeluaran
    data.jumlah || 0                         // M: Pengeluaran
  ]);

  return { status: "ok", message: "Pengeluaran berhasil dicatat", id: idPengeluaran };
}
