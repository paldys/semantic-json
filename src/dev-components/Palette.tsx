import React from 'react'
import './Palette.scss'

const RANGED_COLORS = [
  'primary-color',
  'neutral-color',
  'accent-green',
  'accent-red',
  'accent-orange',
]
const RANGES = ['3x-light', '2x-light', 'light', '', 'dark', '2x-dark', '3x-dark']

const TEST_DARK_COLORS = ['primary-color', 'accent-green', 'accent-red', 'accent-orange']

export const Palette = (): React.ReactElement => (
  <div className="Palette">
    {RANGED_COLORS.map((color) =>
      RANGES.map((range) => {
        const className = `${color}${range ? '-' : ''}${range}`
        return <div key={className} className={className}></div>
      }),
    )}
    {TEST_DARK_COLORS.map((color) => {
      const className = `${color}-dark`
      return (
        <div key={className} className={className}>
          FOO
        </div>
      )
    })}
    {TEST_DARK_COLORS.map((color) => {
      const className = `${color}-2x-dark`
      return (
        <div key={className} className={className}>
          FOO
        </div>
      )
    })}
    {TEST_DARK_COLORS.map((color) => {
      const className = `${color}-3x-dark`
      return (
        <div key={className} className={className}>
          FOO
        </div>
      )
    })}
  </div>
)
