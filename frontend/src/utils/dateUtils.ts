/**
 * Utilitários para tratamento seguro de datas e fusos horários (America/Sao_Paulo / Local)
 * Evita o bug de avanço de dia em fusos negativos (UTC-3) ao usar toISOString().split('T')[0]
 */

/**
 * Converte um objeto Date para 'YYYY-MM-DD' no fuso horário local
 */
export const formatLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Extrai 'YYYY-MM-DD' no fuso horário local a partir de string ISO, timestamp ou Date
 */
export const getLocalDateString = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput).split('T')[0];
  }
  return formatLocalDate(d);
};

/**
 * Presets de data no fuso local:
 * - todayStr: data de hoje no fuso local (ex: '2026-09-22')
 * - firstDayOfMonth: primeiro dia do mês atual (ex: '2026-09-01')
 * - lastDayOfMonth: último dia do mês atual (ex: '2026-09-30')
 * - sevenDaysAgo: 7 dias atrás no fuso local
 * - thirtyDaysAgo: 30 dias atrás no fuso local
 */
export const getDatePresets = () => {
  const now = new Date();
  const todayStr = formatLocalDate(now);
  const firstDayOfMonth = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDayOfMonth = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const sevenDaysAgo = formatLocalDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const thirtyDaysAgo = formatLocalDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  return {
    todayStr,
    firstDayOfMonth,
    lastDayOfMonth,
    sevenDaysAgo,
    thirtyDaysAgo
  };
};
