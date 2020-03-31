const { reshapeTopics, reshapeMeta } = require('./_util')

test('reshapeTopics', () => {
    const topics = reshapeTopics({
        dev: ['a'],
        staging: ['b'],
        prod: ['c'],
    })

    expect(topics).toMatchObject({
        a: { dev: true },
        b: { staging: true },
        c: { prod: true },
    })
})

test('reshapeTopics without all keys', () => {
    const topics = reshapeTopics({
        dev: ['a'],
    })

    expect(topics).toMatchObject({
        a: { dev: true },
    })
})

test('reshapeTopics empty', () => {
    const topics = reshapeTopics({})

    expect(topics).toEqual({})
})

test('reshapeMeta', () => {
    const urls = reshapeMeta(
        {
            '/api/hook': {
                dev: ['a'],
            },
        },
        'dev',
    )

    expect(urls).toMatchObject({ a: ['/api/hook'] })
})

test('reshapeMeta empty', () => {
    const urls = reshapeMeta(
        {
            '/api/hook': {
                dev: ['a'],
            },
        },
        'prod',
    )

    expect(urls).toEqual({})
})

test('reshapeMeta multiple', () => {
    const urls = reshapeMeta(
        {
            '/api/hook': {
                dev: ['a', 'b'],
            },
            '/api/hook2': {
                dev: ['a', 'c'],
            },
        },
        'dev',
    )

    expect(urls).toMatchObject({
        a: ['/api/hook', '/api/hook2'],
        b: ['/api/hook'],
        c: ['/api/hook2'],
    })
})
