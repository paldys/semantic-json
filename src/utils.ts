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
  type: 'left'
  key?: string
  value: unknown
}

interface BothValue {
  type: 'both'
  key?: string
  value: null | string | number | boolean | JsonArray | JsonObject
}

interface RightValue {
  type: 'right'
  key?: string
  value: unknown
}

interface ComplexValue {
  type: 'complex'
  key?: string
  value: JsonArray | JsonObject
}

export type SimpleValue = LeftValue | RightValue | BothValue
export type JsonValue = LeftValue | RightValue | BothValue | ComplexValue

interface JsonCompareValue {
  type: 'simple' | 'array' | 'object'
  isSame: boolean
  values: Array<JsonValue>
}

interface JsonSimple extends JsonCompareValue {
  type: 'simple'
}

interface JsonArray extends JsonCompareValue {
  type: 'array'
}

interface JsonObject extends JsonCompareValue {
  type: 'object'
}

export type JsonCompareResult = JsonSimple | JsonArray | JsonObject

export interface SuccessfulCompare {
  status: 'ok'
  leftJson: ReturnType<JSON['parse']>
  rightJson: ReturnType<JSON['parse']>
  result: JsonCompareResult
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

interface JsonRawValueNull {
  type: 'null'
  value: null
}

interface JsonRawValueString {
  type: 'string'
  value: string
}

interface JsonRawValueNumber {
  type: 'number'
  value: number
}

interface JsonRawValueBoolean {
  type: 'boolean'
  value: boolean
}

interface JsonRawValueArray {
  type: 'array'
  value: unknown[]
}

interface JsonRawValueObject {
  type: 'object'
  value: Record<string, unknown>
}

type JsonRawValue =
  | JsonRawValueNull
  | JsonRawValueString
  | JsonRawValueNumber
  | JsonRawValueBoolean
  | JsonRawValueArray
  | JsonRawValueObject

const addType = (value: unknown): JsonRawValue => {
  if (value === null) return {type: 'null', value: null}
  if (typeof value === 'number') return {type: 'number', value}
  if (typeof value === 'string') return {type: 'string', value}
  if (typeof value === 'boolean') return {type: 'boolean', value}
  if (_.isArray(value)) return {type: 'array', value}
  if (_.isPlainObject(value)) return {type: 'object', value: value as Record<string, unknown>}
  throw Error('Unexpected type...')
}

const isPrimitiveType = (
  v: JsonRawValue,
): v is JsonRawValueNull | JsonRawValueString | JsonRawValueNumber | JsonRawValueBoolean =>
  JSON_VALUE_PRIMITIVE_TYPES_INFERED.includes(v.type)

const toLeftRightValues = (a: unknown[], type: 'left' | 'right'): Array<LeftValue | RightValue> =>
  a.map((value) => ({type, value}))

const compareArrays = (
  leftArray: unknown[],
  rightArray: unknown[],
  isSame = true,
  values: JsonArray['values'] = [],
): JsonArray => {
  if (leftArray.length === 0) {
    return {
      type: 'array',
      isSame: isSame && rightArray.length === 0,
      values: [...values, ...toLeftRightValues(rightArray, 'right')],
    }
  }

  if (rightArray.length === 0) {
    return {
      type: 'array',
      isSame: false,
      values: [...values, ...toLeftRightValues(leftArray, 'left')],
    }
  }

  const leftTypedValue = addType(leftArray[0])
  const rightTypedValue = addType(rightArray[0])

  const c = compareValues(leftTypedValue, rightTypedValue)

  switch (c.type) {
    case 'array':
    case 'object':
      return compareArrays(leftArray.slice(1), rightArray.slice(1), isSame && c.isSame, [
        ...values,
        {type: 'complex', value: c},
      ])
    case 'simple':
      return c.isSame
        ? compareArrays(leftArray.slice(1), rightArray.slice(1), isSame, [...values, ...c.values])
        : compareArrays(leftArray.slice(1), rightArray, false, [...values, c.values[0]])
  }
}

const toLeftRightKeyValues = (
  a: Array<[string, unknown]>,
  type: 'left' | 'right',
): Array<LeftValue | RightValue> => a.map(([key, value]) => ({type, key, value}))

const compareKeyedArrays = (
  leftKeyedArray: Array<[string, unknown]>,
  rightKeyedArray: Array<[string, unknown]>,
  isSame = true,
  values: JsonObject['values'] = [],
): JsonObject => {
  if (leftKeyedArray.length === 0) {
    return {
      type: 'object',
      isSame: isSame && rightKeyedArray.length === 0,
      values: [...values, ...toLeftRightKeyValues(rightKeyedArray, 'right')],
    }
  }

  if (rightKeyedArray.length === 0) {
    return {
      type: 'object',
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
        ? [leftKeyedArray.slice(1), rightKeyedArray, {type: 'left', key: leftKey, value: leftValue}]
        : [
            leftKeyedArray,
            rightKeyedArray.slice(1),
            {type: 'right', key: rightKey, value: rightValue},
          ]
    return compareKeyedArrays(nextLeftKeyedArray, nextRightKeyArray, false, [...values, thisValue])
  }

  const leftTypedValue = addType(leftValue)
  const rightTypedValue = addType(rightValue)

  const c = compareValues(leftTypedValue, rightTypedValue)

  switch (c.type) {
    case 'array':
    case 'object':
      return compareKeyedArrays(
        leftKeyedArray.slice(1),
        rightKeyedArray.slice(1),
        isSame && c.isSame,
        [...values, {type: 'complex', key: leftKey, value: c}],
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
): JsonObject => {
  const leftKeyArray = _.sortBy(_.toPairs(leftObject), ([k, _]) => k)
  const rightKeyArray = _.sortBy(_.toPairs(rightObject), ([k, _]) => k)

  return compareKeyedArrays(leftKeyArray, rightKeyArray)
}

const compareValues = (
  typedLeftJson: JsonRawValue,
  typedRightJson: JsonRawValue,
  _path: Array<string | number> = [],
): JsonCompareResult => {
  if (typedLeftJson.type === typedRightJson.type) {
    if (isPrimitiveType(typedLeftJson)) {
      if (typedLeftJson.value === typedRightJson.value) {
        return {
          type: 'simple',
          isSame: true,
          values: [
            {
              type: 'both',
              value: typedLeftJson.value,
            },
          ],
        }
      } else {
        return {
          type: 'simple',
          isSame: false,
          values: [
            {
              type: 'left',
              value: typedLeftJson.value,
            },
            {
              type: 'right',
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
    type: 'simple',
    isSame: false,
    values: [
      {
        type: 'left',
        value: typedLeftJson.value,
      },
      {
        type: 'right',
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
