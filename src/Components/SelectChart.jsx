import { useState } from 'react'
import { Select, Option } from '@material-tailwind/react'

export default function SelectChart ({ setSelectedChart }) {
  const [chart, setChart] = useState('')

  const handleChangeDatetimeFilter = newValue => {
    setSelectedChart(newValue)
    setChart(newValue)
  }

  return (
    <div>
      <Select
        label='Type of chart'
        color='blue'
        className='text-white w-full relative'
        labelProps={{ style: { color: 'white' } }}
        onChange={handleChangeDatetimeFilter}
        value={chart}
      >
        <Option value='Doughnut'>Doughnut</Option>
        <Option value='Bar'>Bar</Option>
        <Option value='Line'>Line</Option>
        <Option value='Pie'>Pie</Option>
      </Select>
    </div>
  )
}
