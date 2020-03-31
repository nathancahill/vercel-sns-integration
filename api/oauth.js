const URLSearchParams = require('url-search-params')
const fetch = require('node-fetch')

const DOMAIN = process.env.APP_DOMAIN
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

module.exports = async (req, res) => {
    const { code, configurationId, next } = req.query

    const searchParams = new URLSearchParams()

    searchParams.set('client_id', CLIENT_ID)
    searchParams.set('client_secret', CLIENT_SECRET)
    searchParams.set('code', code)
    searchParams.set('redirect_uri', `${DOMAIN}/`)

    const tokenRes = await fetch('https://api.zeit.co/v2/oauth/access_token', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        body: searchParams,
    })
    const json = await tokenRes.json()

    const metaRes = await fetch(
        `https://api.zeit.co/v1/integrations/configuration/${configurationId}/metadata`,
        {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${json.access_token}`,
            },
            body: JSON.stringify({
                oauth: json.access_token,
            }),
        },
    )

    const webhookRes = await fetch(
        `https://api.zeit.co/v1/integrations/webhooks`,
        {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${json.access_token}`,
            },
            body: JSON.stringify({
                name: 'SNS',
                url: `${DOMAIN}/api/hook?configurationId=${configurationId}&token=${
                    json.access_token
                }`,
                events: ['deployment-ready'],
            }),
        },
    )

    res.send({ next })
}
