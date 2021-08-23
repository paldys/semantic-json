import React, {useState} from 'react'
import _ from 'lodash'
import clsx from 'clsx'
import {
  FailedCompare,
  compareJsons,
  ComparedValue,
  JsonTypedValue,
  JsonTypedArrayValue,
  JsonTypedObjectValue,
  JsonTypedStringValue,
  JsonTypedNullValue,
  JsonTypedBooleanValue,
  JsonTypedNumberValue,
  JsonTypedLazyValue,
  expandLazyValue,
} from '../utils'
import './DisplayDifference.scss'

const ENCLOSING_TAGS: Record<'array' | 'object', [string, string]> = {
  array: ['[', ']'],
  object: ['{', '}'],
}

const INDENTATION_SIZE = 2 as const
const INDENTATION_IN_SPACES = _.range(INDENTATION_SIZE)
  .map(() => ' ')
  .join('')

const increaseIndentation = (s = ''): string => `${INDENTATION_IN_SPACES}${s}`

const isComplexType = (v: JsonTypedValue): v is JsonTypedArrayValue | JsonTypedObjectValue =>
  v.type === 'array' || v.type === 'object'
interface DisplayValuePrefs<T> extends SharedPrefs {
  typedValue: T
}

interface DisplayDifferencePrefs {
  comparator: ReturnType<typeof compareJsons>
}

interface SharedPrefs {
  indentation?: string
  prefix?: string
  suffix?: string
  collapse?: boolean
}

interface DisplayComparedValuePrefs extends SharedPrefs {
  comparedValue: ComparedValue
}

interface DisplayComparedValuesPrefs extends SharedPrefs {
  comparedValues: ComparedValue[]
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

const DisplaySimpleValue = ({
  typedValue: {value},
  indentation,
  prefix,
  suffix,
}: DisplayValuePrefs<
  JsonTypedNullValue | JsonTypedBooleanValue | JsonTypedNumberValue | JsonTypedStringValue
>): React.ReactElement => (
  <pre>
    {indentation}
    {prefix ? `${JSON.stringify(prefix)}: ` : ''}
    {JSON.stringify(value)}
    {suffix}
  </pre>
)

const DisplayComplexValue = ({
  typedValue: {
    type,
    value: {isSame, comparedValues},
  },
  collapse = true,
  indentation,
  prefix,
  suffix,
}: DisplayValuePrefs<JsonTypedArrayValue | JsonTypedObjectValue>): React.ReactElement => {
  const [isCollapsed, setCollapsed] = useState(collapse)
  const [startTag, endTag] = ENCLOSING_TAGS[type]
  const prefixToUse = prefix ? `${JSON.stringify(prefix)}: ` : ''

  if (comparedValues.length === 0) {
    return (
      <pre>
        {indentation}
        {prefixToUse}
        {startTag}
        {endTag}
      </pre>
    )
  }

  if (isCollapsed) {
    return (
      <div className={clsx('collapsable', {mixed: !isSame})} onClick={() => setCollapsed(false)}>
        <pre>
          {indentation}
          {prefixToUse}
          {startTag}
          ..
          {endTag}
        </pre>
      </div>
    )
  }

  return (
    <>
      <div className="collapsable" onClick={() => setCollapsed(true)}>
        <pre>
          {indentation}
          {prefixToUse}
          {startTag}
        </pre>
      </div>
      <DisplayComparedValues
        comparedValues={comparedValues}
        indentation={increaseIndentation(indentation)}
      />
      <pre>
        {indentation}
        {endTag}
        {suffix}
      </pre>
    </>
  )
}

const DisplayLazyValue = ({
  typedValue: {value},
  ...rest
}: DisplayValuePrefs<JsonTypedLazyValue>): React.ReactElement => {
  return <DisplayComplexValue typedValue={expandLazyValue(value)} {...rest} />
}

const DisplayComparedValue = ({
  comparedValue: {comparedType, typedValue},
  ...rest
}: DisplayComparedValuePrefs): React.ReactElement => {
  const getDisplayTypedValue = (typedValue: JsonTypedValue): React.ReactElement => {
    if (isComplexType(typedValue)) {
      return <DisplayComplexValue typedValue={typedValue} {...rest} />
    } else if (typedValue.type === 'lazy') {
      return <DisplayLazyValue typedValue={typedValue} {...rest} />
    } else {
      return <DisplaySimpleValue typedValue={typedValue} {...rest} />
    }
  }

  return (
    <div className={clsx('ComparedValue', comparedType)}>{getDisplayTypedValue(typedValue)}</div>
  )
}

const DisplayComparedValues = ({
  comparedValues,
  indentation,
  collapse = true,
}: DisplayComparedValuesPrefs): React.ReactElement => {
  return (
    <div className="ComparedValues">
      {comparedValues.map((cv, i) => {
        const key = i // todo, we need to use something better
        const nextPrefix = cv.key
        const nextSuffix = i < comparedValues.length - 1 ? ',' : ''
        return (
          <DisplayComparedValue
            key={key}
            comparedValue={cv}
            prefix={nextPrefix}
            suffix={nextSuffix}
            indentation={indentation}
            collapse={collapse}
          />
        )
      })}
    </div>
  )
}

const DisplayDifference = ({comparator}: DisplayDifferencePrefs): React.ReactElement => {
  if (comparator.status === 'error') return <DisplayError failedCompare={comparator} />
  const {
    result: {comparedValues},
  } = comparator
  return <DisplayComparedValues comparedValues={comparedValues} collapse={false} />
}

export default DisplayDifference
