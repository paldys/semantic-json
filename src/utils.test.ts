import {Compare, JsonCompareResult, compareJsons} from './utils'

test('returns error when left is invalid json', () => {
  const errorResult = compareJsons('foo', '{}')
  expect(errorResult.status).toEqual('error')
})

test('returns error when right is invalid json', () => {
  const errorResult = compareJsons('{}', 'foo')
  expect(errorResult.status).toEqual('error')
})

test('evaluates two null values as same', () => {
  const errorResult = compareJsons('null', 'null')
  failOnError(errorResult, (r) => {
    expect(r.isSame).toEqual(true)
  })
})

test('evaluates two number values as same', () => {
  const errorResult = compareJsons('1', '1')
  failOnError(errorResult, (r) => {
    expect(r.isSame).toEqual(true)
  })
})

test('evaluates two boolean values as same', () => {
  const errorResult = compareJsons('  "foo"', '"foo"')
  failOnError(errorResult, (r) => {
    expect(r.isSame).toEqual(true)
  })
})

test('evaluates two string values as same', () => {
  const errorResult = compareJsons('true', 'true')
  failOnError(errorResult, (r) => {
    expect(r.isSame).toEqual(true)
  })
})

test('evaluates two arrays as same', () => {
  const errorResult = compareJsons('[1,2,3]', '[1, 2, 3]')
  failOnError(errorResult, (r) => {
    expect(r.type).toEqual('array')
    if (r.type === 'array') {
      expect(r.isSame).toEqual(true)
    }
  })
})

test('evaluates two objects as same when keys are not soted', () => {
  const errorResult = compareJsons('{"foo":"1","bar": "1"}', ' {"bar": "1","foo":"1"} ')
  failOnError(errorResult, (r) => {
    expect(r.type).toEqual('object')
    if (r.type === 'object') {
      expect(r.isSame).toEqual(true)
    }
  })
})

test('evaluates two boolean values as different', () => {
  const errorResult = compareJsons('true', 'false')
  failOnError(errorResult, (r) => {
    expect(r.isSame).toEqual(false)
  })
})

test('evaluates two different typed values as different', () => {
  const errorResult = compareJsons('[]', '{}')
  failOnError(errorResult, (r) => {
    expect(r.isSame).toEqual(false)
  })
})

test('finds missing value in second array', () => {
  const errorResult = compareJsons('[1,2,3]', '[1,2]')
  failOnError(errorResult, (r) => {
    expect(r.type).toEqual('array')
    if (r.type === 'array') {
      expect(r.isSame).toEqual(false)
      expect(r.values).toContainEqual({type: 'left', value: 3})
    }
  })
})

test('finds added value in second array', () => {
  const errorResult = compareJsons('[1,2]', '[1,2,3]')
  failOnError(errorResult, (r) => {
    expect(r.type).toEqual('array')
    if (r.type === 'array') {
      expect(r.isSame).toEqual(false)
      expect(r.values).toContainEqual({type: 'right', value: 3})
    }
  })
})

test('finds changed key-value pair in object', () => {
  const errorResult = compareJsons('{"a":1,"b":2,"c":3}', '{"a":1,"b":4,"c":3}')
  failOnError(errorResult, (r) => {
    expect(r.type).toEqual('object')
    if (r.type === 'object') {
      expect(r.isSame).toEqual(false)
      expect(r.values).toContainEqual({type: 'both', key: 'a', value: 1})
      expect(r.values).toContainEqual({type: 'left', key: 'b', value: 2})
      expect(r.values).toContainEqual({type: 'right', key: 'b', value: 4})
    }
  })
})

test('finds added key-value pair in object', () => {
  const errorResult = compareJsons('{"a":1,"c":3}', '{"a":1,"b":2,"c":3}')
  failOnError(errorResult, (r) => {
    expect(r.type).toEqual('object')
    if (r.type === 'object') {
      expect(r.isSame).toEqual(false)
      expect(r.values).toContainEqual({type: 'both', key: 'a', value: 1})
      expect(r.values).toContainEqual({type: 'right', key: 'b', value: 2})
      expect(r.values).toContainEqual({type: 'both', key: 'c', value: 3})
    }
  })
})

function failOnError(compare: Compare, validate: (r: JsonCompareResult) => void): void {
  if (compare.status === 'ok') {
    validate(compare.result)
  } else {
    fail('Expected ok result got error')
  }
}
