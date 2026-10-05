import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { calcPayroll, formatMoney } from './lib/payroll'
import { buildScenario, type PayKind } from './lib/scenario'
import type { PayrollSettings } from './types'

const PAYROLL_KEY = 'zp-payroll-settings-v4'
const KIND_KEY = 'zp-payroll-kind-v4'
const DONE_KEY = 'zp-payroll-done-v4'

type DoneState = {
  tochka: boolean
  elbaOpen: boolean
  elbaTotal: boolean
  elbaNdfl: boolean
  elbaNet: boolean
  elbaSubmit: boolean
  ens: boolean
}

const EMPTY_SETTINGS: PayrollSettings = {
  salaryGross: 0,
  bonusGross: 0,
  ndflRate: 0.13,
}

function emptyDone(): DoneState {
  return {
    tochka: false,
    elbaOpen: false,
    elbaTotal: false,
    elbaNdfl: false,
    elbaNet: false,
    elbaSubmit: false,
    ens: false,
  }
}

function loadSettings(): PayrollSettings {
  try {
    const raw = localStorage.getItem(PAYROLL_KEY)
    if (!raw) return { ...EMPTY_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<PayrollSettings>
    return {
      salaryGross: Number(parsed.salaryGross) || 0,
      bonusGross: Number(parsed.bonusGross) || 0,
      ndflRate: Number(parsed.ndflRate) > 0 ? Number(parsed.ndflRate) : 0.13,
    }
  } catch {
    return { ...EMPTY_SETTINGS }
  }
}

function loadKind(): PayKind {
  const raw = localStorage.getItem(KIND_KEY)
  if (raw === 'advance' || raw === 'salary' || raw === 'bonus') return raw
  return 'advance'
}

function loadDone(): DoneState {
  try {
    const raw = localStorage.getItem(DONE_KEY)
    if (raw) return { ...emptyDone(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return emptyDone()
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}

function AmountBox({
  label,
  value,
  note,
}: {
  label: string
  value: number
  note?: string
}) {
  return (
    <div className="amount-box">
      <div className="amount-box-label">{label}</div>
      <div className="amount-box-row">
        <div className="amount-box-value">{formatMoney(value)} ₽</div>
        <button type="button" className="onec-btn" onClick={() => void copyText(String(value))}>
          Копировать
        </button>
      </div>
      {note ? <div className="amount-box-note">{note}</div> : null}
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  )
}

function InputMoney({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: string
}) {
  return (
    <div className="onec-field">
      <label>{label}</label>
      <input
        type="number"
        min={0}
        step={step}
        value={value || ''}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value.replace(',', '.')
          if (raw === '') {
            onChange(0)
            return
          }
          const n = Number(raw)
          onChange(Number.isFinite(n) ? n : 0)
        }}
      />
    </div>
  )
}

const KINDS: { id: PayKind; label: string }[] = [
  { id: 'advance', label: 'Аванс' },
  { id: 'salary', label: 'ЗП' },
  { id: 'bonus', label: 'Премия' },
]

export default function App() {
  const [settings, setSettings] = useState<PayrollSettings>(loadSettings)
  const [kind, setKind] = useState<PayKind>(loadKind)
  const [done, setDone] = useState<DoneState>(loadDone)

  const payroll = useMemo(() => calcPayroll(settings), [settings])
  const scenario = useMemo(() => buildScenario(kind, payroll), [kind, payroll])

  useEffect(() => {
    localStorage.setItem(PAYROLL_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(KIND_KEY, kind)
  }, [kind])

  useEffect(() => {
    localStorage.setItem(DONE_KEY, JSON.stringify(done))
  }, [done])

  function selectKind(next: PayKind) {
    setKind(next)
    setDone(emptyDone())
  }

  function toggle(key: keyof DoneState) {
    setDone((d) => ({ ...d, [key]: !d[key] }))
  }

  const needsSalary = kind === 'advance' || kind === 'salary'
  const needsBonus = kind === 'bonus'
  const ready =
    (needsSalary && settings.salaryGross > 0) || (needsBonus && settings.bonusGross > 0)

  return (
    <div className="onec-app">
      <div className="onec-menubar">
        <button type="button" className="active">
          Выплата ЗП
        </button>
      </div>

      <div className="onec-flow">
        <section className="onec-form">
          <div className="onec-form-title">
            <span>1. Что платим сегодня?</span>
          </div>
          <div className="onec-form-body">
            <div className="kind-tabs">
              {KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={kind === item.id ? 'active' : ''}
                  onClick={() => selectKind(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="onec-calc-grid two">
              {(kind === 'advance' || kind === 'salary') && (
                <InputMoney
                  label="Оклад за месяц (начислено), ₽"
                  value={settings.salaryGross}
                  onChange={(salaryGross) => setSettings((s) => ({ ...s, salaryGross }))}
                />
              )}
              {kind === 'bonus' && (
                <>
                  <InputMoney
                    label="Премия (начислено), ₽"
                    value={settings.bonusGross}
                    onChange={(bonusGross) => setSettings((s) => ({ ...s, bonusGross }))}
                  />
                  <InputMoney
                    label="Оклад за месяц (для сверки в Эльбе), ₽"
                    value={settings.salaryGross}
                    onChange={(salaryGross) => setSettings((s) => ({ ...s, salaryGross }))}
                  />
                </>
              )}              <InputMoney
                label="Ставка НДФЛ"
                value={settings.ndflRate}
                step="0.01"
                onChange={(ndflRate) => setSettings((s) => ({ ...s, ndflRate }))}
              />
            </div>

            <p className="onec-note">{scenario.periodHint}</p>
            {ready ? (
              <p className="onec-note">
                По формуле из инструкции:{' '}
                <b>
                  {formatMoney(scenario.report.totalWithNdfl)} ={' '}
                  {formatMoney(scenario.report.netPay)} (зп) + {formatMoney(scenario.report.ndfl)}{' '}
                  (ндфл)
                </b>
              </p>
            ) : null}
          </div>
        </section>

        {!ready ? (
          <section className="onec-form">
            <div className="onec-form-title">
              <span>Дальше</span>
            </div>
            <div className="onec-form-body">
              <p className="onec-note">Введите сумму начисления — появятся шаги: Точка → отчёт НДФЛ → проверка в Эльбе → ЕНС.</p>
            </div>
          </section>
        ) : (
          <>
            <section className="onec-form">
              <div className="onec-form-title">
                <span>2. Точка — выплата ЗП</span>
                <label className="title-check">
                  <input
                    type="checkbox"
                    checked={done.tochka}
                    onChange={() => toggle('tochka')}
                  />
                  Сделано
                </label>
              </div>
              <div className="onec-form-body">
                <p className="onec-note warn">
                  В Точке платим ЗП <b>без НДФЛ</b> (НДФЛ не включаем!).
                </p>
                <div className="onec-callout">
                  <div className="onec-callout-title">Месяц в ведомости — внимательно!</div>
                  <p className="onec-note" style={{ marginBottom: 6 }}>
                    В ведомости обязательно смотрим, <b>за какой месяц</b> платим — легко ошибиться.
                  </p>
                  <div className="onec-money-row">
                    <span>Аванс</span>
                    <span>
                      <b>текущий</b> месяц
                    </span>
                  </div>
                  <div className="onec-money-row">
                    <span>ЗП + премия</span>
                    <span>
                      <b>прошлый</b> месяц
                    </span>
                  </div>
                  <p className="onec-note" style={{ marginTop: 8, marginBottom: 0 }}>
                    Сейчас выбрано: <b>{scenario.title}</b> → {scenario.periodHint.replace('В ведомости: ', '')}.
                  </p>
                </div>
                <AmountBox
                  label={`Перевести в Точке (${scenario.title})`}
                  value={scenario.tochkaAmount}
                />
              </div>
            </section>

            <section className="onec-form">
              <div className="onec-form-title">
                <span>3. Точка — формирование отчёта НДФЛ</span>
              </div>
              <div className="onec-form-body">
                <p className="onec-note">
                  Отчёт НДФЛ формируется <b>в Точке</b>, раздел «Бухгалтерия». Заполняем все три
                  инпута. Отчёт делаем после каждой выплаты: аванс / ЗП / премия.
                </p>

                <h3 className="onec-subtitle">Как сформировать отчёт в Точке</h3>
                <div className="checklist">
                  <CheckRow checked={done.elbaOpen} onChange={() => toggle('elbaOpen')}>
                    Точка → раздел <b>«Бухгалтерия»</b> → отчёт по НДФЛ
                  </CheckRow>
                  <CheckRow checked={done.elbaTotal} onChange={() => toggle('elbaTotal')}>
                    Итоговая сумма — <b>с учётом НДФЛ</b>:{' '}
                    <b>{formatMoney(scenario.report.totalWithNdfl)} ₽</b>
                  </CheckRow>
                  <CheckRow checked={done.elbaNdfl} onChange={() => toggle('elbaNdfl')}>
                    НДФЛ — <b>отдельно</b>: <b>{formatMoney(scenario.report.ndfl)} ₽</b>
                  </CheckRow>
                  <CheckRow checked={done.elbaNet} onChange={() => toggle('elbaNet')}>
                    ЗП (на руки): <b>{formatMoney(scenario.report.netPay)} ₽</b>
                    <span className="hint-inline"> (итого = зп + ндфл)</span>
                  </CheckRow>
                  <CheckRow checked={done.elbaSubmit} onChange={() => toggle('elbaSubmit')}>
                    Сформировать отчёт НДФЛ после {scenario.title.toLowerCase()}
                  </CheckRow>
                </div>

                <h3 className="onec-subtitle">Цифры для трёх инпутов в Точке</h3>
                <div className="elba-grid">
                  <AmountBox
                    label="Итоговая сумма (с учётом НДФЛ)"
                    value={scenario.report.totalWithNdfl}
                  />
                  <AmountBox label="НДФЛ (отдельно)" value={scenario.report.ndfl} />
                  <AmountBox label="ЗП / премия на руки" value={scenario.report.netPay} />
                </div>
              </div>
            </section>

            <section className="onec-form">
              <div className="onec-form-title">
                <span>4. Эльба — проверка</span>
              </div>
              <div className="onec-form-body">
                <p className="onec-note warn">
                  Эльбу используем только для <b>проверки</b>. Отчёт НДФЛ здесь <b>не</b> формируем.
                  Обращаем внимание на <b>красные стрелочки</b>.
                </p>

                <div className="onec-callout">
                  <div className="onec-callout-title">Что сверяем в Эльбе</div>
                  <ul className="onec-list">
                    <li>
                      Всего начислено — с учётом <b>первого</b> платежа за месяц и <b>второго</b>
                    </li>
                    <li>
                      Вычет НДФЛ применяется ко <b>всему месяцу</b>, а не только ко второй выплате
                    </li>
                    <li>Красные стрелочки — смотрим, что цифры сходятся с нашим расчётом</li>
                  </ul>
                </div>

                {scenario.monthCheck ? (
                  <>
                    <h3 className="onec-subtitle">Ориентир для сверки (оклад за месяц)</h3>
                    <div className="onec-money-row">
                      <span>Аванс (1-я часть)</span>
                      <span>{formatMoney(scenario.monthCheck.advanceGross)} ₽</span>
                    </div>
                    <div className="onec-money-row">
                      <span>Итоговая (2-я часть)</span>
                      <span>{formatMoney(scenario.monthCheck.finalGross)} ₽</span>
                    </div>
                    <div className="onec-money-row total">
                      <span>Оклад за месяц</span>
                      <span>{formatMoney(scenario.monthCheck.salaryGross)} ₽</span>
                    </div>
                    <div className="onec-money-row total">
                      <span>НДФЛ с оклада за месяц</span>
                      <span>{formatMoney(scenario.monthCheck.salaryNdfl)} ₽</span>
                    </div>
                    <p className="onec-note" style={{ marginTop: 8 }}>
                      Половина НДФЛ оклада на одну выплату:{' '}
                      <b>{formatMoney(Math.round(scenario.monthCheck.salaryNdfl / 2))} ₽</b>
                    </p>
                  </>
                ) : null}

                <h3 className="onec-subtitle">Ориентир для сверки (эта выплата: {scenario.title})</h3>
                <div className="onec-money-row">
                  <span>Итого с НДФЛ</span>
                  <span>{formatMoney(scenario.report.totalWithNdfl)} ₽</span>
                </div>
                <div className="onec-money-row">
                  <span>На руки</span>
                  <span>{formatMoney(scenario.report.netPay)} ₽</span>
                </div>
                <div className="onec-money-row total">
                  <span>НДФЛ</span>
                  <span>{formatMoney(scenario.report.ndfl)} ₽</span>
                </div>              </div>
            </section>

            <section className="onec-form">
              <div className="onec-form-title">
                <span>5. Выплата НДФЛ в ЕНС</span>
                <label className="title-check">
                  <input type="checkbox" checked={done.ens} onChange={() => toggle('ens')} />
                  Сделано
                </label>
              </div>
              <div className="onec-form-body">
                <p className="onec-note">
                  После отчёта НДФЛ в Точке пополняем ЕНС на сумму НДФЛ из отчёта за текущий период.
                </p>
                <AmountBox label="Перевести на ЕНС" value={scenario.ensAmount} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
