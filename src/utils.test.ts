import {
  compareJsons,
  CompareResult,
  ComparedJson,
  JsonTypedValue,
  createBothValue,
  createLeftValue,
  createRightValue,
  addKey,
} from './utils'

test('returns error when left is invalid json', () => {
  const errorResult = compareJsons('foo', '{}')
  expect(errorResult.status).toEqual('error')
})

test('returns error when right is invalid json', () => {
  const errorResult = compareJsons('{}', 'foo')
  expect(errorResult.status).toEqual('error')
})

test('evaluates two null values as same', () => {
  const expectedComparedJson = createBothSame({
    type: 'null',
    value: null,
  })
  const actualResult = compareJsons('null', 'null')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two number values as same', () => {
  const expectedComparedJson = createBothSame({
    type: 'number',
    value: 1,
  })
  const actualResult = compareJsons('1', '1')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two string values as same', () => {
  const expectedComparedJson = createBothSame({
    type: 'string',
    value: 'foo',
  })
  const actualResult = compareJsons('  "foo"', '"foo"')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two boolean values as same', () => {
  const expectedComparedJson = createBothSame({
    type: 'boolean',
    value: true,
  })
  const actualResult = compareJsons('true', 'true')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two empty arrays as same', () => {
  const expectedComparedJson = createBothSame({
    type: 'array',
    value: {
      isSame: true,
      comparedValues: [],
    },
  })
  const actualResult = compareJsons('[]', '[]')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two arrays as same', () => {
  const expectedComparedJson = createBothSame({
    type: 'array',
    value: {
      isSame: true,
      comparedValues: [
        createBothValue({type: 'null', value: null}),
        createBothValue({type: 'boolean', value: true}),
        createBothValue({type: 'number', value: 3}),
        createBothValue({type: 'string', value: 'foo'}),
        createBothValue({type: 'array', value: {isSame: true, comparedValues: []}}),
        createBothValue({type: 'object', value: {isSame: true, comparedValues: []}}),
      ],
    },
  })
  const actualResult = compareJsons(
    '[null, true, 3, "foo", [], {}]',
    '[null, true, 3, "foo", [], {}]',
  )
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two empty objects as same', () => {
  const expectedComparedJson = createBothSame({
    type: 'object',
    value: {
      isSame: true,
      comparedValues: [],
    },
  })
  const actualResult = compareJsons('{}', ' {} ')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two objects as same when keys are not soted', () => {
  const expectedComparedJson = createBothSame({
    type: 'object',
    value: {
      isSame: true,
      comparedValues: [
        addKey(createBothValue)(['bar', {type: 'number', value: 1}]),
        addKey(createBothValue)([
          'foo',
          {type: 'array', value: {isSame: true, comparedValues: []}},
        ]),
      ],
    },
  })
  const actualResult = compareJsons('{"foo":[],"bar": 1}', ' {"bar": 1,"foo":[]} ')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two boolean values as different', () => {
  const expectedComparedJson = createDifferent(
    {type: 'boolean', value: true},
    {type: 'boolean', value: false},
  )
  const actualResult = compareJsons('true', 'false')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates two different typed values as different', () => {
  const expectedComparedJson = createDifferent(
    {type: 'lazy', value: {type: 'raw-array', value: []}},
    {type: 'lazy', value: {type: 'raw-object', value: {}}},
  )
  const actualResult = compareJsons('[]', '{}')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates left empty array vs right non-empty array', () => {
  const typedArrayValue: JsonTypedValue = {
    type: 'array',
    value: {
      isSame: false,
      comparedValues: [
        createRightValue({type: 'number', value: 1}),
        createRightValue({type: 'number', value: 2}),
      ],
    },
  }
  const expectedComparedJson: ComparedJson = {
    isSame: false,
    comparedValues: [
      {
        comparedType: 'both',
        typedValue: typedArrayValue,
      },
    ],
  }
  const actualResult = compareJsons('[]', '[1, 2]')
  verifyResult(expectedComparedJson, actualResult)
})

test('evaluates left non-empty array vs right empty array', () => {
  const typedArrayValue: JsonTypedValue = {
    type: 'array',
    value: {
      isSame: false,
      comparedValues: [
        createLeftValue({type: 'number', value: 1}),
        createLeftValue({type: 'number', value: 2}),
      ],
    },
  }
  const expectedComparedJson: ComparedJson = {
    isSame: false,
    comparedValues: [
      {
        comparedType: 'both',
        typedValue: typedArrayValue,
      },
    ],
  }
  const actualResult = compareJsons('[1, 2]', '[]')
  verifyResult(expectedComparedJson, actualResult)
})

test('finds missing value in second array', () => {
  const typedArrayValue: JsonTypedValue = {
    type: 'array',
    value: {
      isSame: false,
      comparedValues: [
        createBothValue({type: 'number', value: 1}),
        createBothValue({type: 'number', value: 2}),
        createLeftValue({type: 'number', value: 3}),
      ],
    },
  }
  const expectedComparedJson: ComparedJson = {
    isSame: false,
    comparedValues: [
      {
        comparedType: 'both',
        typedValue: typedArrayValue,
      },
    ],
  }
  const actualResult = compareJsons('[1,2,3]', '[1,2]')
  verifyResult(expectedComparedJson, actualResult)
})

test('finds added value in second array', () => {
  const typedArrayValue: JsonTypedValue = {
    type: 'array',
    value: {
      isSame: false,
      comparedValues: [
        createBothValue({type: 'number', value: 1}),
        createBothValue({type: 'number', value: 2}),
        createRightValue({type: 'number', value: 3}),
      ],
    },
  }
  const expectedComparedJson: ComparedJson = {
    isSame: false,
    comparedValues: [
      {
        comparedType: 'both',
        typedValue: typedArrayValue,
      },
    ],
  }
  const actualResult = compareJsons('[1,2]', '[1,2,3]')
  verifyResult(expectedComparedJson, actualResult)
})

test('finds changed key-value pair in object', () => {
  const typedObjectValue: JsonTypedValue = {
    type: 'object',
    value: {
      isSame: false,
      comparedValues: [
        addKey(createBothValue)(['a', {type: 'number', value: 1}]),
        addKey(createLeftValue)(['b', {type: 'number', value: 2}]),
        addKey(createRightValue)(['b', {type: 'number', value: 4}]),
        addKey(createBothValue)(['c', {type: 'number', value: 3}]),
      ],
    },
  }
  const expectedComparedJson: ComparedJson = {
    isSame: false,
    comparedValues: [
      {
        comparedType: 'both',
        typedValue: typedObjectValue,
      },
    ],
  }
  const actualResult = compareJsons('{"a":1,"b":2,"c":3}', '{"a":1,"b":4,"c":3}')
  verifyResult(expectedComparedJson, actualResult)
})

test('finds added key-value pair in object', () => {
  const typedObjectValue: JsonTypedValue = {
    type: 'object',
    value: {
      isSame: false,
      comparedValues: [
        addKey(createBothValue)(['a', {type: 'number', value: 1}]),
        addKey(createRightValue)(['b', {type: 'number', value: 2}]),
        addKey(createBothValue)(['c', {type: 'number', value: 3}]),
      ],
    },
  }
  const expectedComparedJson: ComparedJson = {
    isSame: false,
    comparedValues: [
      {
        comparedType: 'both',
        typedValue: typedObjectValue,
      },
    ],
  }
  const actualResult = compareJsons('{"a":1,"c":3}', '{"a":1,"b":2,"c":3}')
  verifyResult(expectedComparedJson, actualResult)
})

function createBothSame(typedValue: JsonTypedValue): ComparedJson {
  return {
    isSame: true,
    comparedValues: [createBothValue(typedValue)],
  }
}

function createDifferent(
  leftTypedValue: JsonTypedValue,
  rightTypedValue: JsonTypedValue,
): ComparedJson {
  return {
    isSame: false,
    comparedValues: [createLeftValue(leftTypedValue), createRightValue(rightTypedValue)],
  }
}

function verifyResult(expected: ComparedJson, actual: CompareResult): void {
  if (actual.status === 'ok') {
    expect(actual.result).toEqual(expected)
  } else {
    fail('Expected ok result got error')
  }
}
