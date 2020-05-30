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
                filter: true,
            },
        },
        'dev',
    )

    expect(urls).toMatchObject({ a: [{ url: '/api/hook', filter: true }] })
})

test('reshapeMeta empty', () => {
    const urls = reshapeMeta(
        {
            '/api/hook': {
                dev: ['a'],
                filter: true,
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
                filter: true,
            },
            '/api/hook2': {
                dev: ['a', 'c'],
                filter: false,
            },
        },
        'dev',
    )

    expect(urls).toMatchObject({
        a: [
            { url: '/api/hook', filter: true },
            { url: '/api/hook2', filter: false },
        ],
        b: [{ url: '/api/hook', filter: true }],
        c: [{ url: '/api/hook2', filter: false }],
    })
})
