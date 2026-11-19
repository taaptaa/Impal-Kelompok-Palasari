// Draft lokal: tidak memanggil API dan tidak pernah mengubah inventaris.
export function changePlan(previous, items, id, quantity) {
  const item = items.find(entry => entry.id_barang === id);
  if (!item || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > item.stok_total) return previous;
  const next = { ...previous };
  if (quantity === 0) delete next[id]; else next[id] = quantity;
  return next;
}

// Hanya hapus jumlah yang benar-benar dikirim; perubahan draft saat request berjalan tetap ada.
export function removeSubmittedPlan(previous, submitted) {
  const next = {...previous};
  for (const {itemId,quantity} of submitted) if (next[itemId]===quantity) delete next[itemId];
  return next;
}
