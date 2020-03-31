const fetch = require('node-fetch')
const AWS = require('aws-sdk/global')
const SNS = require('aws-sdk/clients/sns')

const { reshapeMeta } = require('./_util')

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(404).send('')
    }

    const { configurationId, token } = req.query
    const {
        payload: { project, deploymentId },
    } = req.body

    const metaRes = await fetch(
        `https://api.zeit.co/v1/integrations/configuration/${configurationId}/metadata`,
        {
            headers: {
                authorization: `Bearer ${token}`,
            },
        },
    )
    const meta = await metaRes.json()

    if (!meta[project]) {
        res.send({})
        return
    }

    const metadata = meta[project]

    AWS.config.update({
        accessKeyId: metadata.accessKeyId,
        secretAccessKey: metadata.secretAccessKey,
        region: metadata.region,
    })

    const sns = new SNS()

    const deploymentRes = await fetch(
        `https://api.zeit.co/v11/now/deployments/${deploymentId}`,
        {
            headers: {
                authorization: `Bearer ${token}`,
            },
        },
    )
    const deployment = await deploymentRes.json()
    const target = deployment.target

    let selector = 'dev'

    if (target === 'production') {
        selector = 'prod'
    } else if (target === 'staging') {
        selector = 'staging'
    }

    let topics = reshapeMeta(metadata.endpoints || {}, selector)

    for (const topic of Object.keys(topics)) {
        const subscriptions = await sns
            .listSubscriptionsByTopic({
                TopicArn: topic,
            })
            .promise()

        const currentEndpoints = subscriptions.Subscriptions.map(
            s => s.Endpoint,
        )
        let nextEndpoints = []

        const urls = topics[topic].forEach(url => {
            nextEndpoints.push(`https://${deployment.url}${url}`)
            deployment.alias.forEach(alias => {
                nextEndpoints.push(`https://${alias}${url}`)
            })
        })

        for (const endpoint of nextEndpoints) {
            if (currentEndpoints.includes(endpoint)) {
                continue
            }

            await sns
                .subscribe({
                    Protocol: 'https',
                    TopicArn: topic,
                    Endpoint: endpoint,
                })
                .promise()
        }
    }

    res.send({})
}
