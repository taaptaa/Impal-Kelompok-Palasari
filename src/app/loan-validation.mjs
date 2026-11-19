// Kontrak bersama UI/API. Waktu di wire selalu UTC ISO, input kampus eksplisit WIB.
import { validateFormDetails } from './loan-form-validation.mjs';
export const REASON_MAX = 150;
const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export function validInstant(value) {
  return typeof value === 'string' && isoPattern.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function jakartaToUtc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return '';
  const ms = Date.parse(value + ':00+07:00');
  if (!Number.isFinite(ms)) return '';
  // Menolak normalisasi tanggal seperti 30 Februari.
  if (new Date(ms + 7*3600000).toISOString().slice(0,16) !== value) return '';
  return new Date(ms).toISOString();
}
export function validateLoan(input, now = Date.now()) {
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { form:'Payload harus berupa objek.' };
  if (Object.keys(input).some(key=>!['items','startsAt','endsAt','reason','details'].includes(key))) errors.form = 'Payload memuat field yang tidak diizinkan.';
  if ('details' in input) Object.assign(errors,validateFormDetails(input.details));
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) errors.items = 'Pilih 1–100 jenis barang per request.';
  else {
    const seen = new Set();
    for (const item of input.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'itemId,quantity' || !Number.isSafeInteger(item.itemId) || item.itemId < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 2147483647 || seen.has(item.itemId)) {
        errors.items = 'ID barang harus unik dan valid; jumlah harus bilangan bulat positif yang aman.'; break;
      }
      seen.add(item.itemId);
    }
  }
  if (!validInstant(input.startsAt)) errors.startsAt = 'Waktu mulai tidak valid.';
  else if (Date.parse(input.startsAt) < now) errors.startsAt = 'Waktu mulai tidak boleh di masa lalu.';
  if (!validInstant(input.endsAt)) errors.endsAt = 'Waktu kembali tidak valid.';
  else if (validInstant(input.startsAt) && input.endsAt <= input.startsAt) errors.endsAt = 'Waktu kembali harus setelah waktu mulai.';
  if (typeof input.reason !== 'string' || !input.reason.trim() || [...input.reason.trim()].length > REASON_MAX) errors.reason = `Keperluan wajib diisi, maksimal ${REASON_MAX} karakter.`;
  return errors;
}
