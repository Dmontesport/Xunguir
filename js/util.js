'use strict';
window.X = window.X || {};

// Utilidades xerais: datas (sempre 'AAAA-MM-DD'), formato e escape de HTML
X.u = (() => {
  const pad = n => String(n).padStart(2, '0');

  const hoxe = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  // Número de día absoluto (UTC) para restar datas sen problemas de horario de verán
  const dia = s => {
    const [y, m, d] = s.split('-').map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 864e5);
  };
  const deDia = n => {
    const d = new Date(n * 864e5);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };
  const sumar = (s, n) => deDia(dia(s) + n);
  const entre = (a, b) => dia(b) - dia(a);

  const data = s => {
    if (!s) return '—';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const num = v => {
    if (v == null || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
  };

  const locale = () => X.locale();
  const numero = (n, dec = 1) => (+n).toLocaleString(locale(), { maximumFractionDigits: dec });
  const kg = n => n == null || !isFinite(n) ? '—' : numero(n, Math.abs(n) >= 100 ? 0 : 1) + ' kg';
  const dinheiro = n => n == null ? '—' : (+n).toLocaleString(locale(), { style: 'currency', currency: 'EUR' });

  const dias = n => X.tp('dias', n);
  // "hoxe", "mañá", "en 5 días"
  const enDias = n => n <= 0 ? X.t('hoxe') : n === 1 ? X.t('mana') : X.t('enDias', { n });

  const idade = (nac, ata) => {
    if (!nac) return '';
    const d = entre(nac, ata || hoxe());
    if (d < 0) return '';
    if (d < 60) return X.tp('dias', d);
    const meses = Math.floor(d / 30.44);
    if (meses < 24) return X.tp('meses', meses);
    const anos = Math.floor(meses / 12), m = meses % 12;
    return m ? `${X.tp('anos', anos)} ${X.tp('meses', m)}` : X.tp('anos', anos);
  };

  const uid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '')
    : Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 14);

  const porNome = (a, b) => (a.nome || '').localeCompare(b.nome || '', locale(), { numeric: true });

  return { hoxe, dia, deDia, sumar, entre, data, esc, num, numero, kg, dinheiro, dias, enDias, idade, uid, porNome };
})();
