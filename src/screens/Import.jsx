import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { EXPENSE, INCOME } from '../lib/constants.js'
import { parseAmount, readStatement, rowProblem } from '../lib/statement.js'

const COLUMNS = 'grid grid-cols-[140px_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_minmax(0,1fr)_minmax(0,1fr)_36px] gap-2'
const STEPS = ['Upload', 'Review', 'Done']

const cellClass = invalid =>
  `h-9 min-w-0 rounded-lg border bg-rail px-2.5 text-[13px] text-ink ${invalid ? 'border-danger' : 'border-line-2'}`

export default function Import () {
  const { cards, importRows, showError, ruleFor, merchantFor } = useAppData()
  const [stage, setStage] = useState('upload')
  const [file, setFile] = useState('')
  const [pending, setPending] = useState(null)
  const [rows, setRows] = useState([])
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(0)
  const [busy, setBusy] = useState(false)

  const stepIndex = STEPS.findIndex(s => s.toLowerCase() === { upload: 'upload', preview: 'review', done: 'done' }[stage])

  function reset () {
    setStage('upload')
    setFile('')
    setPending(null)
    setRows([])
    setError('')
  }

  async function load (selected) {
    if (!selected) return
    setError('')
    setPending(null)
    setFile(selected.name)
    setBusy(true)
    try {
      const rows = await readStatement(selected)
      setPending(rows.map(row => ({
        ...row,
        category: row.category ||
          ruleFor(`${row.name} ${row.desc}`)?.category ||
          merchantFor(`${row.name} ${row.desc}`)?.category ||
          ''
      })))
    } catch (failure) {
      setError(failure.message || 'That file could not be read.')
    } finally {
      setBusy(false)
    }
  }

  const setRow = (index, key) => event => {
    const { value } = event.target
    setRows(current => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }

  const problems = rows.filter(rowProblem).length
  const cardNames = [...new Set([...cards.map(c => c.name), ...rows.map(r => r.card).filter(Boolean)])]

  async function save () {
    if (problems) {
      showError(new Error(`Fix or remove ${problems} highlighted ${problems === 1 ? 'row' : 'rows'} first.`))
      return
    }

    const payload = rows.map(row => {
      const amount = parseAmount(row.amount)
      return [
        row.date,
        row.name.trim(),
        row.desc,
        (amount < 0 ? '-' : '+') + Math.abs(amount).toFixed(2),
        row.card,
        row.category || 'Other',
        cards.find(c => c.name === row.card)?.icon || ''
      ]
    })

    setBusy(true)
    try {
      await importRows(payload)
      setSaved(payload.length)
      setRows([])
      setStage('done')
    } catch (failure) {
      showError(failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center gap-2.5'>
        {STEPS.map((label, i) => (
          <div key={label} className='flex items-center gap-2.5'>
            <span className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] ${
              i <= stepIndex ? 'bg-accent text-accent-ink' : 'bg-raised text-faint'
            }`}>
              {i < stepIndex || stage === 'done' ? '✓' : i + 1}
            </span>
            <span className={`font-medium ${i <= stepIndex ? 'text-ink' : 'text-faint'}`}>{label}</span>
            {i < 2 && <span className='h-px w-7 bg-line-3' />}
          </div>
        ))}
      </div>

      {stage === 'upload' && (
        <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 wide:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]'>
          <label
            onDragOver={e => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault()
              setDrag(false)
              load(e.dataTransfer.files[0])
            }}
            className={`flex min-h-80 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[20px] border-[1.5px] border-dashed p-8 text-center transition-colors ${
              drag ? 'border-accent bg-accent/5' : 'border-line-3 bg-panel'
            }`}
          >
            <div className='grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent'>
              <Icon name='upload_file' size={28} />
            </div>
            <div className='text-[17px] font-semibold'>Drop a statement here</div>
            <div className='text-muted'>or <span className='text-accent'>browse files</span> · .csv or .xlsx</div>
            <input
              type='file'
              accept='.csv,.xlsx'
              aria-label='Statement file'
              onChange={e => load(e.target.files[0])}
              className='sr-only'
            />
            {file && (
              <div className='flex items-center gap-2.5 rounded-xl border border-line-3 bg-raised px-3.5 py-2.5'>
                <Icon name='description' className='text-accent' />
                <span className='font-mono text-xs'>{file}</span>
              </div>
            )}
          </label>

          <div className='flex flex-col gap-3.5 rounded-[20px] border border-line bg-panel p-5'>
            <h2 className='m-0 text-[15px] font-semibold'>Expected columns</h2>
            <p className='m-0 leading-normal text-muted'>
              First row must be a header. Date, Name and Amount are required, and you can pick a category per row in the next step.
            </p>
            <div className='flex flex-wrap gap-1.5'>
              {['Date', 'Name', 'Amount', 'Card', 'Description', 'Category'].map(column => (
                <span key={column} className='rounded-[7px] border border-line-3 bg-raised px-2.25 py-1.25 font-mono text-xs text-ink-2'>
                  {column}
                </span>
              ))}
            </div>
            {error && (
              <div role='alert' className='flex items-center gap-2.5 rounded-[10px] border border-danger/25 bg-danger/10 px-3 py-2.5 text-danger-soft'>
                <Icon name='error' />
                {error}
              </div>
            )}
            <button
              type='button'
              disabled={!pending || busy}
              onClick={() => {
                setRows(pending)
                setPending(null)
                setStage('preview')
              }}
              className={`h-11 rounded-[11px] font-semibold ${
                pending ? 'bg-accent text-accent-ink hover:bg-accent-hover' : 'bg-raised text-faint'
              }`}
            >
              {busy ? 'Reading file...' : pending ? `Review ${pending.length} rows` : 'Choose a file first'}
            </button>
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <section className='flex min-w-0 flex-col gap-3.5 rounded-[20px] border border-line bg-panel p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex flex-col gap-1'>
              <h2 className='m-0 text-base font-semibold'>Review {rows.length} transactions</h2>
              <span className='font-mono text-xs text-faint'>{file}</span>
              {problems > 0 && (
                <span className='text-xs text-danger'>
                  {problems} {problems === 1 ? 'row needs' : 'rows need'} a date, a name and a non-zero amount.
                </span>
              )}
            </div>
            <div className='flex gap-2'>
              <button type='button' onClick={reset} className='h-10 rounded-[11px] border border-line-3 px-4 text-ink'>Cancel</button>
              <button
                type='button'
                disabled={busy || rows.length === 0}
                onClick={save}
                className='h-10 rounded-[11px] bg-accent px-4 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60'
              >
                {busy ? 'Saving...' : 'Save all'}
              </button>
            </div>
          </div>
          <div className='overflow-x-auto'>
            <div className='flex min-w-225 flex-col'>
              <div className={`${COLUMNS} px-1 pb-2 font-mono text-[11px] uppercase tracking-[.06em] text-faint`}>
                <span>Date</span><span>Name</span><span>Description</span><span>Amount</span><span>Category</span><span>Card</span><span />
              </div>
              {rows.map((row, i) => {
                const problem = rowProblem(row)
                const negative = String(row.amount).trim().startsWith('-')
                return (
                  <div key={i} className={`${COLUMNS} items-center border-t border-line-4 px-1 py-1.5`}>
                    <input aria-label='Date' type='date' value={row.date} onChange={setRow(i, 'date')} className={cellClass(problem === 'date')} />
                    <input aria-label='Name' value={row.name} onChange={setRow(i, 'name')} className={cellClass(problem === 'name')} />
                    <input aria-label='Description' value={row.desc} onChange={setRow(i, 'desc')} className={cellClass(false)} />
                    <input
                      aria-label='Amount'
                      value={row.amount}
                      onChange={setRow(i, 'amount')}
                      className={`${cellClass(problem === 'amount')} tabular-nums ${negative ? '' : 'text-accent!'}`}
                    />
                    <select aria-label='Category' value={row.category} onChange={setRow(i, 'category')} className={`${cellClass(false)} px-2`}>
                      <option value=''>Pick category</option>
                      <optgroup label='Incomes'>{INCOME.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
                      <optgroup label='Bills'>{EXPENSE.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
                    </select>
                    <select aria-label='Card' value={row.card} onChange={setRow(i, 'card')} className={`${cellClass(false)} px-2`}>
                      <option value=''>No card</option>
                      {cardNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <button
                      type='button'
                      title='Remove row'
                      aria-label='Remove row'
                      onClick={() => setRows(current => current.filter((_, j) => j !== i))}
                      className='grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-danger/10 hover:text-danger'
                    >
                      <Icon name='close' size={18} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {stage === 'done' && (
        <div className='flex flex-col items-center gap-3.5 rounded-[20px] border border-line bg-panel px-6 py-14 text-center'>
          <div className='grid h-15 w-15 place-items-center rounded-full bg-accent-soft text-accent'>
            <Icon name='check' size={32} weight={600} />
          </div>
          <div className='text-xl font-semibold'>{saved} transactions imported</div>
          <div className='text-muted'>They&apos;re already in your balance and charts.</div>
          <div className='mt-1.5 flex gap-2'>
            <Link to='/' className='grid h-10.5 place-items-center rounded-[11px] bg-accent px-4.5 font-semibold text-accent-ink hover:bg-accent-hover hover:text-accent-ink'>
              View dashboard
            </Link>
            <button type='button' onClick={reset} className='h-10.5 rounded-[11px] border border-line-3 px-4.5 text-ink'>
              Import another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
