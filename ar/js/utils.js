// ============================================
// UTILIDADES
// ============================================

/**
 * Formatea un número con decimales
 * @param {number} n - Número a formatear
 * @param {number} decimals - Número de decimales
 * @returns {string} - Número formateado o '--' si es inválido
 */
export function fmt(n, decimals = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return '--';
  return Number(n).toFixed(decimals);
}

/**
 * Calcula la tendencia comparando valores actual y anterior
 * @param {number} current - Valor actual
 * @param {number} previous - Valor anterior
 * @returns {string} - Emoji de tendencia (↗️, ↘️, →)
 */
export function getTrend(current, previous) {
  if (previous === undefined || previous === null) return '→';
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return '→';
  return diff > 0 ? '↗️' : '↘️';
}

/**
 * Verifica si un valor está fuera de los umbrales permitidos
 * @param {number} value - Valor a verificar
 * @param {string} key - Clave del sensor
 * @param {object} thresholds - Objeto con umbrales {key: {min, max}}
 * @returns {string|null} - 'danger', 'warning' o null
 */
export function checkAlert(value, key, thresholds) {
  if (!thresholds[key]) return null;
  const { min, max } = thresholds[key];
  
  // Alerta crítica si está fuera del rango
  if (value < min || value > max) return 'danger';
  
  // Alerta warning si está cerca del límite (10% de margen)
  if (value < min * 1.1 || value > max * 0.9) return 'warning';
  
  return null;
}

/**
 * Registra un mensaje con timestamp en consola
 * @param {string} message - Mensaje a registrar
 * @param {string} type - Tipo: 'info', 'warn', 'error'
 */
export function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  
  switch(type) {
    case 'warn':
      console.warn(prefix, message);
      break;
    case 'error':
      console.error(prefix, message);
      break;
    default:
      console.log(prefix, message);
  }
}

/**
 * Genera un ID único para elementos
 * @param {string} prefix - Prefijo del ID
 * @returns {string} - ID único
 */
export function generateId(prefix = 'element') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce(fn, delay = 400) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}
