const crypto = require('crypto')
const AWS = require('aws-sdk/global')
const SNS = require('aws-sdk/clients/sns')
const EC2 = require('aws-sdk/clients/ec2')

const { CLIENT_SECRET } = process.env

const verifySignature = (req, payload) => {
    const signature = crypto
        .createHmac('sha1', CLIENT_SECRET)
        .update(payload)
        .digest('hex')
    return signature === req.headers['x-zeit-signature']
}

const fetchTopics = async (accessKeyId, secretAccessKey, region) => {
    AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region,
    })

    const sns = new SNS()
    return sns.listTopics().promise()
}

const fetchRegions = async () => {
    AWS.config.update({
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
    })

    const ec2 = new EC2()
    return ec2.describeRegions().promise()
}

const reshapeTopics = endpointTopics => {
    const topics = {}

    ;(endpointTopics.dev || []).forEach(topic => {
        topics[topic] = {
            ...topics[topic],
            dev: true,
        }
    })
    ;(endpointTopics.staging || []).forEach(topic => {
        topics[topic] = {
            ...topics[topic],
            staging: true,
        }
    })
    ;(endpointTopics.prod || []).forEach(topic => {
        topics[topic] = {
            ...topics[topic],
            prod: true,
        }
    })

    return topics
}

const reshapeMeta = (metadata, target) => {
    const urls = Object.keys(metadata)

    const result = {}

    urls.forEach(url => {
        ;(metadata[url][target] || []).forEach(topic => {
            result[topic] = [
                ...(result[topic] || []),
                { url, filter: metadata[url].filter },
            ]
        })
    })

    return result
}

module.exports = {
    verifySignature,
    fetchTopics,
    fetchRegions,
    reshapeTopics,
    reshapeMeta,
}
