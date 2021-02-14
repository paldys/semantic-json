import React, {useState} from 'react'
import ManualInput from './components/ManualInput'
import DisplayDifference from './components/DisplayDifference'
import {compareJsons} from './utils'
import './App.scss'

const App = (): React.ReactElement => {
  const [comparator, setComparator] = useState<ReturnType<typeof compareJsons> | undefined>()

  return (
    <div className="App">
      <h1>Semantic JSON compare</h1>
      <ManualInput onCompare={(left, right) => setComparator(compareJsons(left, right))} />
      {comparator && <DisplayDifference comparator={comparator} />}
    </div>
  )
}

export default App
