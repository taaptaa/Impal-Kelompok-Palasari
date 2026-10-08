"""Simulasi lokal satu jalur *858#. Tidak terhubung ke operator.

Tarif dan batas di bawah adalah konfigurasi latihan, bukan tarif resmi.
Penyimpanan hanya selama program berjalan; nomor merupakan data dummy.
"""
import re

PENGIRIM = "081200000001"
MINIMUM, MAKSIMUM, BIAYA, SISA_MINIMUM = 5000, 1000000, 2000, 2000


def normalisasi(nomor):
    nomor = nomor.strip()
    if nomor.startswith("62"):
        nomor = "0" + nomor[2:]
    if not re.fullmatch(r"08[0-9]{8,11}", nomor):
        raise ValueError("Format nomor tidak valid; gunakan 08... atau 628....")
    return nomor


def validasi(akun, tujuan, nominal):
    if tujuan == PENGIRIM:
        raise ValueError("Nomor tujuan tidak boleh sama dengan pengirim.")
    if tujuan not in akun:
        raise ValueError("Nomor tujuan tidak terdaftar dalam data simulasi.")
    if not akun[PENGIRIM]["aktif"] or not akun[tujuan]["aktif"]:
        raise ValueError("Akun tidak memenuhi status aktif simulasi.")
    if not MINIMUM <= nominal <= MAKSIMUM:
        raise ValueError(f"Nominal harus Rp{MINIMUM:,} sampai Rp{MAKSIMUM:,}.")
    if akun[PENGIRIM]["saldo"] - nominal - BIAYA < SISA_MINIMUM:
        raise ValueError("Saldo tidak mencukupi, termasuk biaya dan sisa minimum.")
    return nominal + BIAYA


def transfer(akun, riwayat, tujuan, nominal, konfirmasi):
    # P1.3: penolakan tidak mengubah saldo atau riwayat.
    if konfirmasi == "2":
        return "Transaksi dibatalkan."
    if konfirmasi != "1":
        raise ValueError("Konfirmasi tidak valid.")
    # P1.4: validasi ulang sebelum perubahan data.
    total = validasi(akun, tujuan, nominal)
    akun[PENGIRIM]["saldo"] -= total
    akun[tujuan]["saldo"] += nominal
    trx = {"id": f"SIM-{len(riwayat)+1:04}", "pengirim": PENGIRIM,
           "tujuan": tujuan, "nominal": nominal, "biaya": BIAYA,
           "status": "BERHASIL"}
    riwayat.append(trx)
    # P1.5: notifikasi hanya dicetak, bukan SMS sungguhan.
    print(f"[Notifikasi penerima] Pulsa Rp{nominal:,} diterima dari {PENGIRIM}.")
    return (f"Transfer berhasil. ID: {trx['id']}. "
            f"Sisa saldo pengirim: Rp{akun[PENGIRIM]['saldo']:,}.")


def main():
    akun = {PENGIRIM: {"saldo": 100000, "aktif": True},
            "081200000002": {"saldo": 10000, "aktif": True},
            "081200000003": {"saldo": 5000, "aktif": False}}
    riwayat = []
    print("SIMULASI *858# | Biaya latihan Rp2.000 per transaksi")
    print("Pengirim dummy:", PENGIRIM, "| Tujuan aktif dummy: 081200000002")
    if input("Masukkan kode akses: ").strip() != "*858#":
        print("Kode akses salah."); return
    menu = ["Transfer Pulsa", "Masa Aktif", "Minta Pulsa", "Auto TP",
            "Delete Auto TP", "List Auto TP", "Cek Kupon Undian TP"]
    while True:
        for i, nama in enumerate(menu, 1):
            print(f"{i}. {nama}")
        print("0. Keluar (navigasi simulasi)")
        pilihan = input("Pilihan: ").strip()
        if pilihan == "0": return
        if pilihan in {"2", "3", "4", "5", "6", "7"}:
            print("Demo ini hanya mengimplementasikan jalur 1. Transfer Pulsa.")
            continue
        if pilihan != "1":
            print("Pilihan menu tidak valid."); continue
        try:
            # P1.1: pengumpulan dan normalisasi nomor/nominal.
            tujuan = normalisasi(input("Nomor tujuan (08... atau 628...): "))
            teks = input("Nominal dalam rupiah, tanpa titik: ").strip()
            if not re.fullmatch(r"[0-9]{1,7}", teks):
                raise ValueError("Nominal harus bilangan bulat tanpa pemisah.")
            nominal = int(teks)
            # P1.2: validasi dan penyusunan ringkasan.
            total = validasi(akun, tujuan, nominal)
            print(f"Tujuan: {tujuan}; nominal: Rp{nominal:,}; biaya: Rp{BIAYA:,}")
            print(f"Total potongan: Rp{total:,}")
            while True:
                konfirmasi = input("1. Ya | 2. Tidak: ").strip()
                if konfirmasi in {"1", "2"}: break
                print("Pilih 1 atau 2.")
            print(transfer(akun, riwayat, tujuan, nominal, konfirmasi))
        except ValueError as error:
            print("Gagal:", error)


if __name__ == "__main__":
    try:
        main()
    except (EOFError, KeyboardInterrupt):
        print("\nSesi dihentikan.")
