import React, {useState} from 'react'
import ManualInput from './components/ManualInput'
import {safeJsonParse} from './utils'
import './App.scss'

interface Comparator {
  left?: string
  right?: string
}

const App = (): React.ReactElement => {
  const [{left, right}, setComparator] = useState<Comparator>({})

  return (
    <div className="App">
      <h1>Semantic JSON compare</h1>
      <ManualInput onCompare={(left, right) => setComparator({left, right})} />
      {left && <pre>{JSON.stringify(safeJsonParse(left), null, 2)}</pre>}
      {right && <pre>{JSON.stringify(safeJsonParse(right), null, 2)}</pre>}
    </div>
  )
}

export default App
