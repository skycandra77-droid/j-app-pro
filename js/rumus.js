function hitungOtomatisHarga() {
    const berat = parseFloat(document.getElementById('input-berat').value) || 0;
    const hargaPaket = parseInt(document.getElementById('input-paket').value);
    const denganTeh = document.getElementById('input-teh').checked;
    let total = berat * hargaPaket;
    if (denganTeh && berat > 0) total += 5000;
    document.getElementById('live-total-harga').innerText = 'Rp ' + total.toLocaleString('id-ID');
}
