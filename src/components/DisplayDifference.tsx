import React, {useState} from 'react'
import _ from 'lodash'
import clsx from 'clsx'
import {compareJsons, FailedCompare, JsonCompareResult, SimpleValue} from '../utils'
import './DisplayDifference.scss'

const ENCLOSING_TAGS: Record<'simple' | 'array' | 'object', [string, string]> = {
  simple: ['', ''],
  array: ['[', ']'],
  object: ['{', '}'],
}

const INDENTATION_SIZE = 2 as const
const INDENTATION_IN_SPACES = _.range(INDENTATION_SIZE)
  .map(() => ' ')
  .join('')

const addIndentation = (s = ''): string => `${INDENTATION_IN_SPACES}${s}`

interface DisplayDifferencePrefs {
  comparator: ReturnType<typeof compareJsons>
}

const DisplayError = ({
  failedCompare: {leftMessage, rightMessage},
}: {
  failedCompare: FailedCompare
}): React.ReactElement => (
  <div className="DisplayDifference DisplayError">
    {leftMessage && <pre>Could not parse left input: {leftMessage}</pre>}
    {rightMessage && <pre>Could not parse right input: {rightMessage}</pre>}
  </div>
)

interface PrefixValue {
  indentation?: string
  prefix?: string
  suffix?: string
}

const stringifyWithIndentation = (v: unknown, indentation = ''): string =>
  JSON.stringify(v, null, INDENTATION_SIZE).replaceAll('\n', `\n${indentation}`)

const DisplayValue = ({
  indentation = '',
  prefix,
  suffix,
  value: {type, value},
}: {value: SimpleValue} & PrefixValue): React.ReactElement => (
  <div className={clsx('DisplayValue', type)}>
    <pre>
      {indentation}
      {prefix ? `${JSON.stringify(prefix)}: ` : ''}
      {stringifyWithIndentation(value, indentation)}
      {suffix}
    </pre>
  </div>
)

interface DisplayResultPrefs extends PrefixValue {
  result: JsonCompareResult
  collapse?: boolean
}

const DisplayResult = ({
  result: {type, isSame, values},
  collapse = false,
  indentation = '',
  prefix,
  suffix,
}: DisplayResultPrefs): React.ReactElement => {
  const [collapsed, setCollapsed] = useState(collapse)
  const fullPrefix = `${indentation}${prefix != null ? `${JSON.stringify(prefix)}: ` : ''}`
  const nextIndentation = type === 'simple' ? indentation : addIndentation(indentation)
  const [startTag, endTag] = ENCLOSING_TAGS[type]

  if (values.length === 0)
    return (
      <div className="DisplayResult">
        <pre>
          {fullPrefix}
          {startTag}
          {endTag}
          {suffix}
        </pre>
      </div>
    )
  if (collapsed)
    return (
      <div
        className={clsx('DisplayResult', 'collapsed', {differ: !isSame})}
        onClick={() => setCollapsed(false)}
      >
        <pre>
          {fullPrefix}
          {startTag}...{endTag}
          {suffix}
        </pre>
      </div>
    )

  return (
    <div className="DisplayResult">
      <pre>
        {fullPrefix}
        {startTag}
      </pre>
      {values.map((e, i) => {
        const nextPrefix = e.key
        const nextSuffix = i < values.length - 1 ? ',' : ''
        return e.type === 'complex' ? (
          <DisplayResult
            key={i}
            indentation={nextIndentation}
            prefix={nextPrefix}
            result={e.value}
            suffix={nextSuffix}
            collapse
          />
        ) : (
          <DisplayValue
            key={i}
            indentation={nextIndentation}
            prefix={nextPrefix}
            value={e}
            suffix={nextSuffix}
          />
        )
      })}
      <pre>
        {indentation}
        {endTag}
        {suffix}
      </pre>
    </div>
  )
}

const DisplayDifference = ({comparator}: DisplayDifferencePrefs): React.ReactElement => {
  if (comparator.status === 'error') return <DisplayError failedCompare={comparator} />
  const {result} = comparator
  return <DisplayResult result={result} />
}

export default DisplayDifference
