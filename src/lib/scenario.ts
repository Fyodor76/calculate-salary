import type { PayrollBreakdown } from './payroll'

export type PayKind = 'advance' | 'salary' | 'bonus'

/** Три поля отчёта НДФЛ — как в формуле Word: итого = зп + ндфл */
export interface NdflReportFields {
  /** «Итоговая сумма указывается с учётом НДФЛ» */
  totalWithNdfl: number
  /** ЗП / премия «на руки» (без НДФЛ) */
  netPay: number
  /** «НДФЛ рассчитывается отдельно» */
  ndfl: number
}

export interface ScenarioGuide {
  kind: PayKind
  title: string
  /** Аванс = текущий месяц; ЗП+премия = прошлый */
  periodHint: string
  /** В Точку — без НДФЛ */
  tochkaAmount: number
  report: NdflReportFields
  ensAmount: number
  /** Для итоговой ЗП: Эльба проверяет месяц целиком (аванс+вторая выплата) */
  monthCheck?: {
    salaryGross: number
    salaryNdfl: number
    advanceGross: number
    finalGross: number
  }
}

export function buildScenario(kind: PayKind, p: PayrollBreakdown): ScenarioGuide {
  const monthCheck =
    p.salaryGross > 0
      ? {
          salaryGross: p.salaryGross,
          salaryNdfl: p.salaryNdfl,
          advanceGross: p.advanceGross,
          finalGross: p.finalGross,
        }
      : undefined

  if (kind === 'advance') {
    return {
      kind,
      title: 'Аванс',
      periodHint: 'В ведомости: текущий месяц',
      tochkaAmount: p.advanceNet,
      report: {
        totalWithNdfl: p.advanceGross,
        netPay: p.advanceNet,
        ndfl: p.advanceNdfl,
      },
      ensAmount: p.advanceNdfl,
      monthCheck,
    }
  }

  if (kind === 'salary') {
    return {
      kind,
      title: 'ЗП (итоговая)',
      periodHint: 'В ведомости: прошлый месяц',
      tochkaAmount: p.finalNet,
      report: {
        totalWithNdfl: p.finalGross,
        netPay: p.finalNet,
        ndfl: p.finalNdfl,
      },
      ensAmount: p.finalNdfl,
      monthCheck,
    }
  }

  return {
    kind,
    title: 'Премия',
    periodHint: 'В ведомости: прошлый месяц',
    tochkaAmount: p.bonusNet,
    report: {
      totalWithNdfl: p.bonusGross,
      netPay: p.bonusNet,
      ndfl: p.bonusNdfl,
    },
    ensAmount: p.bonusNdfl,
    monthCheck,
  }
}
