import _ from 'lodash'

interface SuccessfulSafeJsonParse {
  status: 'ok'
  json: ReturnType<JSON['parse']>
}

interface FailedSafeJsonParse {
  status: 'error'
  message: string
}

const safeJsonParse = (s: string): SuccessfulSafeJsonParse | FailedSafeJsonParse => {
  try {
    const json = JSON.parse(s)
    return {status: 'ok', json}
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {status: 'error', message: error.message}
    }
    throw error
  }
}

interface LeftValue {
  diffType: 'left'
  key?: string
  value: unknown
}

interface BothValue {
  diffType: 'both'
  key?: string
  value: null | string | number | boolean | JsonComparedArray | JsonComparedObject
}

interface RightValue {
  diffType: 'right'
  key?: string
  value: unknown
}

interface ComplexValue {
  diffType: 'complex'
  key?: string
  value: JsonComparedArray | JsonComparedObject
}

export type SimpleDiffedValue = LeftValue | RightValue | BothValue
export type JsonDiffedValue = LeftValue | RightValue | BothValue | ComplexValue

interface JsonComparedValue {
  comparedType: 'simple' | 'array' | 'object'
  isSame: boolean
  values: Array<JsonDiffedValue>
}

interface JsonComparedSimple extends JsonComparedValue {
  comparedType: 'simple'
}

interface JsonComparedArray extends JsonComparedValue {
  comparedType: 'array'
}

interface JsonComparedObject extends JsonComparedValue {
  comparedType: 'object'
}

export type JsonCompared = JsonComparedSimple | JsonComparedArray | JsonComparedObject

export interface SuccessfulCompare {
  status: 'ok'
  leftJson: ReturnType<JSON['parse']>
  rightJson: ReturnType<JSON['parse']>
  result: JsonCompared
}

export interface FailedCompare {
  status: 'error'
  left: string
  right: string
  leftMessage?: string
  rightMessage?: string
}

export type Compare = SuccessfulCompare | FailedCompare

const tupleArray = (...v: string[]): string[] => v

const JSON_VALUE_PRIMITIVE_TYPES = ['number', 'string', 'boolean', 'null'] as const
const JSON_VALUE_PRIMITIVE_TYPES_INFERED = tupleArray(...JSON_VALUE_PRIMITIVE_TYPES)
// const JSON_VALUE_TYPES = ['array', 'object', ...JSON_VALUE_PRIMITIVE_TYPES] as const

interface JsonTypedValueNull {
  type: 'null'
  value: null
}

interface JsonTypedValueString {
  type: 'string'
  value: string
}

interface JsonTypedValueNumber {
  type: 'number'
  value: number
}

interface JsonTypedValueBoolean {
  type: 'boolean'
  value: boolean
}

interface JsonTypedValueArray {
  type: 'array'
  value: unknown[]
}

interface JsonTypedValueObject {
  type: 'object'
  value: Record<string, unknown>
}

type JsonTypedValue =
  | JsonTypedValueNull
  | JsonTypedValueString
  | JsonTypedValueNumber
  | JsonTypedValueBoolean
  | JsonTypedValueArray
  | JsonTypedValueObject

const addType = (value: unknown): JsonTypedValue => {
  if (value === null) return {type: 'null', value: null}
  if (typeof value === 'number') return {type: 'number', value}
  if (typeof value === 'string') return {type: 'string', value}
  if (typeof value === 'boolean') return {type: 'boolean', value}
  if (_.isArray(value)) return {type: 'array', value}
  if (_.isPlainObject(value)) return {type: 'object', value: value as Record<string, unknown>}
  throw Error('Unexpected type...')
}

const isPrimitiveType = (
  v: JsonTypedValue,
): v is JsonTypedValueNull | JsonTypedValueString | JsonTypedValueNumber | JsonTypedValueBoolean =>
  JSON_VALUE_PRIMITIVE_TYPES_INFERED.includes(v.type)

const toLeftRightValues = (
  a: unknown[],
  diffType: 'left' | 'right',
): Array<LeftValue | RightValue> => a.map((value) => ({diffType, value}))

const compareArrays = (
  leftArray: unknown[],
  rightArray: unknown[],
  isSame = true,
  values: JsonComparedArray['values'] = [],
): JsonComparedArray => {
  if (leftArray.length === 0) {
    return {
      comparedType: 'array',
      isSame: isSame && rightArray.length === 0,
      values: [...values, ...toLeftRightValues(rightArray, 'right')],
    }
  }

  if (rightArray.length === 0) {
    return {
      comparedType: 'array',
      isSame: false,
      values: [...values, ...toLeftRightValues(leftArray, 'left')],
    }
  }

  const leftTypedValue = addType(leftArray[0])
  const rightTypedValue = addType(rightArray[0])

  const c = compareValues(leftTypedValue, rightTypedValue)

  switch (c.comparedType) {
    case 'array':
    case 'object':
      return compareArrays(leftArray.slice(1), rightArray.slice(1), isSame && c.isSame, [
        ...values,
        {diffType: 'complex', value: c},
      ])
    case 'simple':
      return c.isSame
        ? compareArrays(leftArray.slice(1), rightArray.slice(1), isSame, [...values, ...c.values])
        : compareArrays(leftArray.slice(1), rightArray, false, [...values, c.values[0]])
  }
}

const toLeftRightKeyValues = (
  a: Array<[string, unknown]>,
  diffType: 'left' | 'right',
): Array<LeftValue | RightValue> => a.map(([key, value]) => ({diffType, key, value}))

const compareKeyedArrays = (
  leftKeyedArray: Array<[string, unknown]>,
  rightKeyedArray: Array<[string, unknown]>,
  isSame = true,
  values: JsonComparedObject['values'] = [],
): JsonComparedObject => {
  if (leftKeyedArray.length === 0) {
    return {
      comparedType: 'object',
      isSame: isSame && rightKeyedArray.length === 0,
      values: [...values, ...toLeftRightKeyValues(rightKeyedArray, 'right')],
    }
  }

  if (rightKeyedArray.length === 0) {
    return {
      comparedType: 'object',
      isSame: false,
      values: [...values, ...toLeftRightKeyValues(leftKeyedArray, 'left')],
    }
  }

  const [leftKey, leftValue] = leftKeyedArray[0]
  const [rightKey, rightValue] = rightKeyedArray[0]

  if (leftKey !== rightKey) {
    const [nextLeftKeyedArray, nextRightKeyArray, thisValue]: [
      Array<[string, unknown]>,
      Array<[string, unknown]>,
      LeftValue | RightValue,
    ] =
      leftKey < rightKey
        ? [
            leftKeyedArray.slice(1),
            rightKeyedArray,
            {diffType: 'left', key: leftKey, value: leftValue},
          ]
        : [
            leftKeyedArray,
            rightKeyedArray.slice(1),
            {diffType: 'right', key: rightKey, value: rightValue},
          ]
    return compareKeyedArrays(nextLeftKeyedArray, nextRightKeyArray, false, [...values, thisValue])
  }

  const leftTypedValue = addType(leftValue)
  const rightTypedValue = addType(rightValue)

  const c = compareValues(leftTypedValue, rightTypedValue)

  switch (c.comparedType) {
    case 'array':
    case 'object':
      return compareKeyedArrays(
        leftKeyedArray.slice(1),
        rightKeyedArray.slice(1),
        isSame && c.isSame,
        [...values, {diffType: 'complex', key: leftKey, value: c}],
      )
    case 'simple':
      return compareKeyedArrays(
        leftKeyedArray.slice(1),
        rightKeyedArray.slice(1),
        isSame && c.isSame,
        [...values, ...c.values.map((v) => ({key: leftKey, ...v}))],
      )
  }
}

const compareObjects = (
  leftObject: Record<string, unknown>,
  rightObject: Record<string, unknown>,
): JsonComparedObject => {
  const leftKeyArray = _.sortBy(_.toPairs(leftObject), ([k, _]) => k)
  const rightKeyArray = _.sortBy(_.toPairs(rightObject), ([k, _]) => k)

  return compareKeyedArrays(leftKeyArray, rightKeyArray)
}

const compareValues = (
  typedLeftJson: JsonTypedValue,
  typedRightJson: JsonTypedValue,
  _path: Array<string | number> = [],
): JsonCompared => {
  if (typedLeftJson.type === typedRightJson.type) {
    if (isPrimitiveType(typedLeftJson)) {
      if (typedLeftJson.value === typedRightJson.value) {
        return {
          comparedType: 'simple',
          isSame: true,
          values: [
            {
              diffType: 'both',
              value: typedLeftJson.value,
            },
          ],
        }
      } else {
        return {
          comparedType: 'simple',
          isSame: false,
          values: [
            {
              diffType: 'left',
              value: typedLeftJson.value,
            },
            {
              diffType: 'right',
              value: typedRightJson.value,
            },
          ],
        }
      }
    }

    if (typedLeftJson.type === 'array' && typedRightJson.type === 'array') {
      return compareArrays(typedLeftJson.value, typedRightJson.value)
    }

    if (typedLeftJson.type === 'object' && typedRightJson.type === 'object') {
      return compareObjects(typedLeftJson.value, typedRightJson.value)
    }
  }

  return {
    comparedType: 'simple',
    isSame: false,
    values: [
      {
        diffType: 'left',
        value: typedLeftJson.value,
      },
      {
        diffType: 'right',
        value: typedRightJson.value,
      },
    ],
  }
}

export const compareJsons = (left: string, right: string): Compare => {
  const leftParsed = safeJsonParse(left)
  const rightParsed = safeJsonParse(right)

  if (leftParsed.status === 'error' || rightParsed.status === 'error') {
    return {
      status: 'error',
      left,
      right,
      leftMessage: leftParsed.status === 'error' ? leftParsed.message : undefined,
      rightMessage: rightParsed.status === 'error' ? rightParsed.message : undefined,
    }
  }

  const leftJson = leftParsed.json
  const rightJson = rightParsed.json

  return {
    status: 'ok',
    leftJson,
    rightJson,
    result: compareValues(addType(leftJson), addType(rightJson)),
  }
}
