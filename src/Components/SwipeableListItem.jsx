import { useRef, useState } from 'react'

export const SwipeableListItem = ({
  children,
  swipeLeftOptions,
  swipeRightOptions,
  id
}) => {
  const [isVisible, setIsVisible] = useState(false)
  return (
    <div className='py-1'>
      <Item
        swipeLeftOptions={swipeLeftOptions}
        swipeRightOptions={swipeRightOptions}
        hasSwipeLeftOptions={!!swipeLeftOptions}
        hasSwipeRightOptions={!!swipeRightOptions}
        key={`SwipeableListItem-${id}`}
        setIsVisible={setIsVisible}
      >
        <div className={`mr-2 ${isVisible ? '' : 'hidden'}`}>
          {swipeLeftOptions}
        </div>
        <div className='flex-grow flex-shrink-0 w-full'>{children}</div>
        <div className='ml-2'>{swipeRightOptions}</div>
      </Item>
    </div>
  )
}

const Item = ({
  children,
  setIsVisible,
  hasSwipeLeftOptions,
  hasSwipeRightOptions
}) => {
  const ref = useRef()
  let downX

  const handleMove = newX => {
    const deltaX = newX - downX
    if (deltaX < -30 && hasSwipeRightOptions) {
      // Deslizar hacia la izquierda
      ref.current.style.transform = 'translateX(-140px)'
    } else if (deltaX > 30 && hasSwipeLeftOptions) {
      // Deslizar hacia la derecha
      ref.current.style.transform = 'translateX(10px)'
      setIsVisible(true)
    } else {
      // Restablecer posición
      ref.current.style.transform = 'translateX(0px)'
    }
  }

  const onPointerMove = e => {
    handleMove(e.clientX)
  }

  const onTouchMove = e => {
    handleMove(e.touches[0].clientX)
  }

  const onPointerDown = e => {
    downX = e.clientX
    if (hasSwipeLeftOptions || hasSwipeRightOptions) {
      ref.current.addEventListener('pointermove', onPointerMove)
      ref.current.addEventListener('touchmove', onTouchMove)
    }
  }

  const onTouchStart = e => {
    downX = e.touches[0].clientX
  }

  const onPointerUp = () => {
    ref.current.removeEventListener('pointermove', onPointerMove)
    ref.current.removeEventListener('touchmove', onTouchMove)
    setTimeout(() => {
      setIsVisible(false)
      if (ref.current) ref.current.style.transform = 'translateX(0px)'
    }, 5000)
  }

  return (
    <div
      className='flex my-1 transition-transform duration-1000'
      onPointerDown={onPointerDown}
      onTouchStart={onTouchStart}
      onPointerUp={onPointerUp}
      onTouchEnd={onPointerUp}
      ref={ref}
    >
      {children}
    </div>
  )
}

export default SwipeableListItem
