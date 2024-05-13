import { Select, Option } from '@material-tailwind/react'

function SelectIcon ({ selectedIcon, setSelectedIcon }) {
  const handleSelectIcon = value => {
    setSelectedIcon(value)
  }
  return (
    <>
      <Select
        label='Icon'
        color='blue'
        className='text-white w-full relative'
        labelProps={{ style: { color: 'white' } }}
        onChange={handleSelectIcon}
        value={selectedIcon}
      >
        <Option value='VisaIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img src='VisaIcon.png' alt='Visa Logo' className='w-8 h-6' />
            Visa
          </div>
        </Option>
        <Option value='MastercardIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img
              src='MastercardIcon.png'
              alt='Mastercard Logo'
              className='w-8 h-6'
            />
            Mastercard
          </div>
        </Option>
        <Option value='AmericaExpressIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img
              src='AmericaExpressIcon.png'
              alt='American Express Logo'
              className='w-8 h-6'
            />
            American Express
          </div>
        </Option>
        <Option value='BBVAIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img src='BBVAIcon.png' alt='BBVA Logo' className='w-8 h-6' />
            BBVA
          </div>
        </Option>
        <Option value='HSBCIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img src='HSBCIcon.png' alt='HSBC Logo' className='w-8 h-6' />
            HSBC
          </div>
        </Option>
        <Option value='BANAMEXIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img src='BANAMEXIcon.png' alt='Banamex Logo' className='w-8 h-6' />
            Banamex
          </div>
        </Option>
        <Option value='BanorteIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img src='BanorteIcon.png' alt='Banorte Logo' className='w-8 h-6' />
            Banorte
          </div>
        </Option>
        <Option value='SantanderIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img
              src='SantanderIcon.png'
              alt='Santander Logo'
              className='w-8 h-6'
            />
            Santander
          </div>
        </Option>
        <Option value='ScotiabankIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img
              src='ScotiabankIcon.png'
              alt='Scotiabank Logo'
              className='w-8 h-6'
            />
            Scotiabank
          </div>
        </Option>
        <Option value='BanCoppelIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img
              src='BanCoppelIcon.png'
              alt='BanCoppel Logo'
              className='w-8 h-6'
            />
            BanCoppel
          </div>
        </Option>
        <Option value='BancoAztecaIcon'>
          <div className='flex justify-start items-center gap-x-4'>
            <img
              src='BancoAztecaIcon.png'
              alt='Banco Azteca Logo'
              className='w-8 h-6'
            />
            Banco Azteca
          </div>
        </Option>
      </Select>
    </>
  )
}

export default SelectIcon
