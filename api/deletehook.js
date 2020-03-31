const { verifySignature } = require('./_util')

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(404).send('')
    }

    if (!verifySignature(req, req.body)) {
        return res.status(403).send('')
    }

    const { configurationId } = req.body

    console.log(configurationId)

    return res.send({})
}
