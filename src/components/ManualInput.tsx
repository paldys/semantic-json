import React, {useState} from 'react'
import './ManualInput.scss'

interface SingleInputPrefs {
  onChange: (newValue: string) => void
}

const SingleInput = ({onChange}: SingleInputPrefs): React.ReactElement => (
  <div className="SingleInput">
    <textarea className="textarea" onChange={(e) => onChange(e.target.value)} />
  </div>
)

interface ManualInputPrefs {
  onCompare: (left: string, right: string) => void
}

const ManualInput = ({onCompare}: ManualInputPrefs): React.ReactElement => {
  const [inputLeft, setInputLeft] = useState('')
  const [inputRight, setInputRight] = useState('')

  return (
    <div className="ManualInput">
      <div className="inputs">
        <SingleInput onChange={setInputLeft} />
        <SingleInput onChange={setInputRight} />
      </div>
      <div className="action">
        <div className="compare" onClick={() => onCompare(inputLeft, inputRight)}>
          Compare
        </div>
      </div>
    </div>
  )
}

export default ManualInput
