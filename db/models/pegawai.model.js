const mongoose = require('mongoose');

const PegawaiSchema = new mongoose.Schema({
    nama: {
        type: String,
        description: "Nama lengkap pegawai"
     },
     nomor_identitas: {
        type: String,
        description: "Nomor identitas seperti KTP, NIK atau paspor"
     },
     alamat: {
        type: String,
        description: "Alamat lengkap pegawai"
     },
     nomor_telepon: {
        type: String,
        description: "Nomor telepon pegawai"
     },
     tanggal_lahir: {
        type: Date,
        description: "Tanggal lahir pegawai"
     },
     jenis_kelamin: {
        type: String,
        description: "Jenis kelamin pegawai"
     },
     pendidikan: {
        type: String,
        description: "Riwayat pendidikan pegawai"
     },
     jabatan: {
        type: String,
        description: "Jabatan pegawai"
     },
     departemen: {
        type: String,
        description: "Departemen atau unit kerja pegawai"
     },
     gaji: {
        type: String,
        description: "Informasi tentang gaji pegawai"
     },
     status_pekerjaan: {
        type: String,
        description: "Informasi tentang status pekerjaan pegawai"
     },
     nomor_rekening_bank: {
        type: String,
        description: "Nomor rekening bank pegawai"
     }
})

const Pegawai = mongoose.model('Pegawai', PegawaiSchema);

module.exports = { Pegawai }