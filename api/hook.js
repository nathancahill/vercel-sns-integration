const fetch = require('node-fetch')
const AWS = require('aws-sdk/global')
const SNS = require('aws-sdk/clients/sns')

const { reshapeMeta, verifySignature } = require('./_util')

const BASE = 'https://api.vercel.com'

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(404).send({})
    }

    if (!verifySignature(req, req.body)) {
        return res.status(403).send({})
    }

    const { configurationId, token } = req.query
    const {
        payload: { project, deploymentId },
    } = req.body

    const metaRes = await fetch(
        `${BASE}/v1/integrations/configuration/${configurationId}/metadata`,
        {
            headers: {
                authorization: `Bearer ${token}`,
            },
        },
    )

    if (!metaRes.ok) {
        return res.status(403).send({})
    }

    const meta = await metaRes.json()

    if (!meta[project]) {
        return res.send({})
    }

    const metadata = meta[project]

    AWS.config.update({
        accessKeyId: metadata.accessKeyId,
        secretAccessKey: metadata.secretAccessKey,
        region: metadata.region,
    })

    const sns = new SNS()

    const deploymentRes = await fetch(
        `${BASE}/v11/now/deployments/${deploymentId}`,
        {
            headers: {
                authorization: `Bearer ${token}`,
            },
        },
    )
    const deployment = await deploymentRes.json()
    const { target } = deployment

    let selector = 'dev'

    if (target === 'production') {
        selector = 'prod'
    } else if (target === 'staging') {
        selector = 'staging'
    }

    const topics = reshapeMeta(metadata.endpoints || {}, selector)

    /* eslint-disable-next-line no-restricted-syntax */
    for (const topic of Object.keys(topics)) {
        /* eslint-disable-next-line no-await-in-loop */
        const subscriptions = await sns
            .listSubscriptionsByTopic({
                TopicArn: topic,
            })
            .promise()

        const currentEndpoints = subscriptions.Subscriptions.map(
            s => s.Endpoint,
        )
        const nextEndpoints = []

        topics[topics].forEach(({ url, filter }) => {
            nextEndpoints.push({
                url: `https://${deployment.url}${url}`,
                origin: deployment.url,
                filter,
            })
            deployment.alias.forEach(alias => {
                nextEndpoints.push({
                    url: `https://${alias}${url}`,
                    origin: alias,
                    filter,
                })
            })
        })

        /* eslint-disable-next-line no-restricted-syntax */
        for (const endpoint of nextEndpoints) {
            if (currentEndpoints.includes(endpoint.url)) {
                /* eslint-disable-next-line no-continue */
                continue
            }

            const subscribeOptions = {
                Protocol: 'https',
                TopicArn: topic,
                Endpoint: endpoint.url,
            }

            if (endpoint.filter) {
                subscribeOptions.FilterPolicy = {
                    origin: [endpoint.origin],
                }
            }

            /* eslint-disable-next-line no-await-in-loop */
            await sns.subscribe(subscribeOptions).promise()
        }
    }

    return res.send({})
}
