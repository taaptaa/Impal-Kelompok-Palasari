// Proposed optional form contract. No institutional NIM or legal-policy claims.
export const ACKNOWLEDGEMENT_VERSION='submission-info-v1';
export const ACKNOWLEDGEMENT_TEXT='Saya memahami bahwa pengajuan menunggu pemeriksaan Admin, bukan reservasi atau persetujuan, dan ketersediaan barang belum diverifikasi.';
export const FORM_LIMITS=Object.freeze({phone:24,borrowerIdentifier:40,unit:120,activityName:120,activityLocation:160,activityDescription:1000});
export const emptyFormDetails=()=>({phone:'',borrowerIdentifier:'',unit:'',activityName:'',activityLocation:'',activityDescription:'',acknowledgement:{version:ACKNOWLEDGEMENT_VERSION,accepted:false}});
export function normalizeFormDetails(value) {
  return {...Object.fromEntries(Object.keys(FORM_LIMITS).map(key=>[key,typeof value?.[key]==='string'?value[key].trim():value?.[key]])),acknowledgement:{version:value?.acknowledgement?.version,accepted:value?.acknowledgement?.accepted}};
}
export function validateFormDetails(value) {
  const errors={};
  const allowed=[...Object.keys(FORM_LIMITS),'acknowledgement'];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==allowed.sort().join(','))return {details:'Field formulir tambahan tidak sesuai kontrak.'};
  for(const [key,max] of Object.entries(FORM_LIMITS)) {
    if(typeof value[key]!=='string'||[...value[key].trim()].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value[key]))errors[key]=`Masukkan teks tanpa karakter kontrol, maksimal ${max} karakter.`;
  }
  if(!errors.phone&&!/^\+?[0-9]{8,15}$/.test(value.phone.trim()))errors.phone='Gunakan 8–15 digit, boleh diawali +. Ini validasi format, bukan verifikasi pemilik nomor.';
  if(!errors.borrowerIdentifier&&/[\r\n\t]/.test(value.borrowerIdentifier))errors.borrowerIdentifier='ID peminjam tidak boleh berisi baris baru atau tab.';
  for(const key of ['activityName','activityLocation'])if(!errors[key]&&!value[key].trim())errors[key]='Wajib diisi untuk formulir lengkap.';
  const ack=value.acknowledgement;
  if(!ack||typeof ack!=='object'||Array.isArray(ack)||Object.keys(ack).sort().join(',')!=='accepted,version'||ack.version!==ACKNOWLEDGEMENT_VERSION||ack.accepted!==true)errors.acknowledgement='Baca dan centang konfirmasi informasi pengajuan.';
  return errors;
}
// Read model differs from input: acknowledgement time is always assigned by server.
export function validSavedFormDetails(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const {acknowledgedAt,...input}=value;
  return Object.keys(validateFormDetails(input)).length===0&&typeof acknowledgedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(acknowledgedAt)&&Number.isFinite(Date.parse(acknowledgedAt))&&new Date(acknowledgedAt).toISOString()===acknowledgedAt;
}
