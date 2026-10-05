import type { PayrollSettings } from '../types'

export interface PayrollBreakdown {
  salaryGross: number
  salaryNdfl: number
  salaryNet: number
  advanceGross: number
  advanceNdfl: number
  advanceNet: number
  finalGross: number
  finalNdfl: number
  finalNet: number
  bonusGross: number
  bonusNdfl: number
  bonusNet: number
  totalNdfl: number
  totalNetTochka: number
  totalGross: number
}

/** Расчёт по инструкции: оклад пополам (аванс + итоговая), НДФЛ 13%, в Точку — на руки */
export function calcPayroll(settings: PayrollSettings): PayrollBreakdown {
  const rate = settings.ndflRate
  const salaryGross = Math.max(0, settings.salaryGross)
  const bonusGross = Math.max(0, settings.bonusGross)

  const salaryNdfl = Math.round(salaryGross * rate)
  const salaryNet = salaryGross - salaryNdfl

  const advanceGross = Math.round(salaryGross / 2)
  const finalGross = salaryGross - advanceGross

  const advanceNdfl = Math.round(salaryNdfl / 2)
  const finalNdfl = salaryNdfl - advanceNdfl

  const advanceNet = advanceGross - advanceNdfl
  const finalNet = finalGross - finalNdfl

  const bonusNdfl = Math.round(bonusGross * rate)
  const bonusNet = bonusGross - bonusNdfl

  return {
    salaryGross,
    salaryNdfl,
    salaryNet,
    advanceGross,
    advanceNdfl,
    advanceNet,
    finalGross,
    finalNdfl,
    finalNet,
    bonusGross,
    bonusNdfl,
    bonusNet,
    totalNdfl: salaryNdfl + bonusNdfl,
    totalNetTochka: advanceNet + finalNet + bonusNet,
    totalGross: salaryGross + bonusGross,
  }
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export const DEFAULT_PAYROLL: PayrollSettings = {
  salaryGross: 0,
  bonusGross: 0,
  ndflRate: 0.13,
}
