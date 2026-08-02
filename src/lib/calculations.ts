export function calcularImc(pesoKg: number, estaturaCm: number): number {
  const estaturaM = estaturaCm / 100;
  return Math.round((pesoKg / (estaturaM * estaturaM)) * 10) / 10;
}

export function calcularKgABajar(pesoKg: number, objetivoKg: number): number {
  return Math.round((pesoKg - objetivoKg) * 10) / 10;
}

export type CategoriaImc = 'bajo' | 'medio' | 'alto';

export function categoriaImc(imc: number): CategoriaImc {
  if (imc < 25) return 'bajo';
  if (imc < 30) return 'medio';
  return 'alto';
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const RITMO_SEMANAL_KG = 0.7;
const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

export function calcularFechaObjetivo(kgABajar: number, desde: Date): string {
  const semanas = Math.max(1, Math.ceil(kgABajar / RITMO_SEMANAL_KG));
  const fecha = new Date(desde.getTime() + semanas * MS_POR_SEMANA);
  const mes = MESES_ES[fecha.getUTCMonth()];
  const anio = fecha.getUTCFullYear();
  return `${mes} de ${anio}`;
}
