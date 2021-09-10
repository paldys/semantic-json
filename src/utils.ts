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

export type ComparedType = 'both' | 'left' | 'right'

export interface KeyedValue {
  key: string
}

export interface BothValue {
  comparedType: 'both'
  key?: string
  typedValue: JsonTypedValue
}

export interface LeftValue {
  comparedType: 'left'
  key?: string
  typedValue: JsonTypedValue
}

export interface RightValue {
  comparedType: 'right'
  key?: string
  typedValue: JsonTypedValue
}

export type ComparedValue = BothValue | LeftValue | RightValue

export const createBothValue = (typedValue: JsonTypedValue): BothValue => ({
  comparedType: 'both',
  typedValue,
})

export const addKey =
  <T extends ComparedValue>(converter: (_: JsonTypedValue) => T) =>
  ([key, typedValue]: [string, JsonTypedValue]): T & KeyedValue => ({...converter(typedValue), key})

export const createLeftValue = (typedValue: JsonTypedValue): LeftValue => ({
  comparedType: 'left',
  typedValue,
})

export const createRightValue = (typedValue: JsonTypedValue): RightValue => ({
  comparedType: 'right',
  typedValue,
})

interface ComparedValues {
  isSame: boolean
  comparedValues: ComparedValue[]
}

interface ComparedKeyedValues {
  isSame: boolean
  comparedValues: (ComparedValue & KeyedValue)[]
}

interface ComparedJson extends ComparedValues {
  comparedValues: [BothValue] | [LeftValue, RightValue]
}

export interface SuccessfulCompare {
  status: 'ok'
  leftJson: ReturnType<JSON['parse']>
  rightJson: ReturnType<JSON['parse']>
  result: ComparedJson
}

export interface FailedCompare {
  status: 'error'
  left: string
  right: string
  leftMessage?: string
  rightMessage?: string
}

export type CompareResult = SuccessfulCompare | FailedCompare

const tupleArray = (...v: string[]): string[] => v

const JSON_VALUE_PRIMITIVE_TYPES = ['number', 'string', 'boolean', 'null'] as const
const JSON_VALUE_PRIMITIVE_TYPES_INFERED = tupleArray(...JSON_VALUE_PRIMITIVE_TYPES)

export interface JsonTypedNullValue {
  type: 'null'
  value: null
}

export interface JsonTypedNumberValue {
  type: 'number'
  value: number
}

export interface JsonTypedStringValue {
  type: 'string'
  value: string
}

export interface JsonTypedBooleanValue {
  type: 'boolean'
  value: boolean
}

export interface JsonTypedArrayValue {
  type: 'array'
  value: ComparedValues
}

export interface JsonTypedObjectValue {
  type: 'object'
  value: ComparedKeyedValues
}

interface JsonTypedRawArrayValue {
  type: 'raw-array'
  value: unknown[]
}

interface JsonTypedRawObjectValue {
  type: 'raw-object'
  value: Record<string, unknown>
}

export interface JsonTypedLazyValue {
  type: 'lazy'
  value: JsonTypedRawArrayValue | JsonTypedRawObjectValue
}

export type JsonTypedValue =
  | JsonTypedNullValue
  | JsonTypedNumberValue
  | JsonTypedStringValue
  | JsonTypedBooleanValue
  | JsonTypedArrayValue
  | JsonTypedObjectValue
  | JsonTypedLazyValue

export type JsonTypedRawValue =
  | JsonTypedNullValue
  | JsonTypedNumberValue
  | JsonTypedStringValue
  | JsonTypedBooleanValue
  | JsonTypedRawArrayValue
  | JsonTypedRawObjectValue

const addRawType = (value: unknown): JsonTypedRawValue => {
  if (value === null) return {type: 'null', value: null}
  if (typeof value === 'number') return {type: 'number', value}
  if (typeof value === 'string') return {type: 'string', value}
  if (typeof value === 'boolean') return {type: 'boolean', value}
  if (_.isArray(value)) return {type: 'raw-array', value}
  if (_.isPlainObject(value)) return {type: 'raw-object', value: value as Record<string, unknown>}
  throw Error('Unexpected type...')
}

const isPrimitiveType = (
  v: JsonTypedRawValue,
): v is JsonTypedNullValue | JsonTypedNumberValue | JsonTypedStringValue | JsonTypedBooleanValue =>
  JSON_VALUE_PRIMITIVE_TYPES_INFERED.includes(v.type)

const arrayToComparedValues = <T extends ComparedValue>(
  array: unknown[],
  converter: (_: JsonTypedValue) => T,
): T[] => array.map(addRawType).map(convertToTypedValue).map(converter)

const arrayToComparedKeyValues = <T extends ComparedValue>(
  array: Array<[string, unknown]>,
  converter: (_: JsonTypedValue) => T,
): (T & KeyedValue)[] =>
  array
    .map(([k, v]): [string, JsonTypedRawValue] => [k, addRawType(v)])
    .map(([k, v]): [string, JsonTypedValue] => [k, convertToTypedValue(v)])
    .map(addKey(converter))

const getCompareArraysNextRightArray = (
  rightArray: unknown[],
  comparedType: BothValue['comparedType'] | LeftValue['comparedType'],
): unknown[] => {
  switch (comparedType) {
    case 'both':
      return rightArray.slice(1)
    case 'left':
      return rightArray
  }
}

const compareArrays = (
  leftArray: unknown[],
  rightArray: unknown[],
  isSame = true,
  values: ComparedValue[] = [],
): JsonTypedArrayValue => {
  if (leftArray.length === 0) {
    return {
      type: 'array',
      value: {
        isSame: isSame && rightArray.length === 0,
        comparedValues: [...values, ...arrayToComparedValues(rightArray, createRightValue)],
      },
    }
  }

  if (rightArray.length === 0) {
    return {
      type: 'array',
      value: {
        isSame: false,
        comparedValues: [...values, ...arrayToComparedValues(leftArray, createLeftValue)],
      },
    }
  }

  const leftTypedValue = addRawType(leftArray[0])
  const rightTypedValue = addRawType(rightArray[0])

  const c = compareValues(leftTypedValue, rightTypedValue)

  const [firstComparedValue] = c.comparedValues

  const nextRightArray = getCompareArraysNextRightArray(rightArray, firstComparedValue.comparedType)

  return compareArrays(leftArray.slice(1), nextRightArray, isSame && c.isSame, [
    ...values,
    firstComparedValue,
  ])
}

const compareKeyedArrays = (
  leftKeyedArray: Array<[string, unknown]>,
  rightKeyedArray: Array<[string, unknown]>,
  isSame = true,
  values: (ComparedValue & KeyedValue)[] = [],
): JsonTypedObjectValue => {
  if (leftKeyedArray.length === 0) {
    return {
      type: 'object',
      value: {
        isSame: isSame && rightKeyedArray.length === 0,
        comparedValues: [...values, ...arrayToComparedKeyValues(rightKeyedArray, createRightValue)],
      },
    }
  }

  if (rightKeyedArray.length === 0) {
    return {
      type: 'object',
      value: {
        isSame: false,
        comparedValues: [...values, ...arrayToComparedKeyValues(leftKeyedArray, createLeftValue)],
      },
    }
  }

  const [leftKey, leftValue] = leftKeyedArray[0]
  const [rightKey, rightValue] = rightKeyedArray[0]

  const leftTypedValue = addRawType(leftValue)
  const rightTypedValue = addRawType(rightValue)

  if (leftKey !== rightKey) {
    const [nextLeftKeyedArray, nextRightKeyedArray, thisValue]: [
      Array<[string, unknown]>,
      Array<[string, unknown]>,
      ComparedValue & KeyedValue,
    ] =
      leftKey < rightKey
        ? [
            leftKeyedArray.slice(1),
            rightKeyedArray,
            addKey(createLeftValue)([leftKey, convertToTypedValue(leftTypedValue)]),
          ]
        : [
            leftKeyedArray,
            rightKeyedArray.slice(1),
            addKey(createRightValue)([rightKey, convertToTypedValue(rightTypedValue)]),
          ]
    return compareKeyedArrays(nextLeftKeyedArray, nextRightKeyedArray, false, [
      ...values,
      thisValue,
    ])
  }

  const compareResult = compareValues(leftTypedValue, rightTypedValue)
  const comparedValues: ComparedValue[] = compareResult.comparedValues

  return compareKeyedArrays(
    leftKeyedArray.slice(1),
    rightKeyedArray.slice(1),
    isSame && compareResult.isSame,
    [...values, ...comparedValues.map((cv): ComparedValue & KeyedValue => ({...cv, key: leftKey}))],
  )
}

const compareObjects = (
  leftObject: Record<string, unknown>,
  rightObject: Record<string, unknown>,
): JsonTypedObjectValue => {
  const leftKeyArray = _.sortBy(_.toPairs(leftObject), ([k, _]) => k)
  const rightKeyArray = _.sortBy(_.toPairs(rightObject), ([k, _]) => k)

  return compareKeyedArrays(leftKeyArray, rightKeyArray)
}

const convertToTypedValue = (rawTypedValue: JsonTypedRawValue): JsonTypedValue =>
  isPrimitiveType(rawTypedValue) ? rawTypedValue : {type: 'lazy', value: rawTypedValue}

const compareValues = (
  rawTypedLeftJson: JsonTypedRawValue,
  rawTypedRightJson: JsonTypedRawValue,
  _path: Array<string | number> = [],
): ComparedJson => {
  if (rawTypedLeftJson.type === rawTypedRightJson.type) {
    if (isPrimitiveType(rawTypedLeftJson)) {
      if (rawTypedLeftJson.value === rawTypedRightJson.value) {
        return {
          isSame: true,
          comparedValues: [createBothValue(rawTypedLeftJson)],
        }
      } else {
        return {
          isSame: false,
          comparedValues: [
            createLeftValue(rawTypedLeftJson),
            createRightValue(convertToTypedValue(rawTypedRightJson)),
          ],
        }
      }
    }

    if (rawTypedLeftJson.type === 'raw-array' && rawTypedRightJson.type === 'raw-array') {
      const typedArray = compareArrays(rawTypedLeftJson.value, rawTypedRightJson.value)
      return {
        isSame: typedArray.value.isSame,
        comparedValues: [createBothValue(typedArray)],
      }
    }

    if (rawTypedLeftJson.type === 'raw-object' && rawTypedRightJson.type === 'raw-object') {
      const typedObject = compareObjects(rawTypedLeftJson.value, rawTypedRightJson.value)
      return {
        isSame: typedObject.value.isSame,
        comparedValues: [createBothValue(typedObject)],
      }
    }
  }

  return {
    isSame: false,
    comparedValues: [
      createLeftValue(convertToTypedValue(rawTypedLeftJson)),
      createRightValue(convertToTypedValue(rawTypedRightJson)),
    ],
  }
}

export const compareJsons = (left: string, right: string): CompareResult => {
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
    result: compareValues(addRawType(leftJson), addRawType(rightJson)),
  }
}

export const expandLazyValue = (
  typedRawValue: JsonTypedRawArrayValue | JsonTypedRawObjectValue,
): JsonTypedArrayValue | JsonTypedObjectValue => {
  switch (typedRawValue.type) {
    case 'raw-array':
      return {
        type: 'array',
        value: {
          isSame: true,
          comparedValues: arrayToComparedValues(typedRawValue.value, createBothValue),
        },
      }
    case 'raw-object':
      return {
        type: 'object',
        value: {
          isSame: true,
          comparedValues: arrayToComparedKeyValues(_.toPairs(typedRawValue.value), createBothValue),
        },
      }
  }
}
