const { withUiHook, htm } = require('@zeit/integration-utils')

const { fetchTopics, fetchRegions, reshapeTopics } = require('./_util')

module.exports = withUiHook(async ({ payload, zeitClient }) => {
    const { clientState, action } = payload

    const header = htm`
        <Container>
            <H1>SNS</H1>
            <H2>Register ZEIT deployments on AWS SNS</H2>
            <HR />
            <ProjectSwitcher />
        </Container>
    `

    if (!payload.project) {
        return htm`
            <Page>${header}</Page>
        `
    }

    let store = {}

    try {
        store = await zeitClient.getMetadata()
        /* eslint-disable-next-line no-empty */
    } catch (e) {}

    const projectStore = store[payload.project.id] || {}

    let region = projectStore.region || ''
    let accessKeyId = projectStore.accessKeyId || ''
    let secretAccessKey = projectStore.secretAccessKey || ''
    let edittingAws = !(region && accessKeyId && secretAccessKey)
    const awsErrors = {}

    if (action === 'saveaws') {
        accessKeyId = clientState.accessKeyId.trim()
        secretAccessKey = clientState.secretAccessKey.trim()
        region = clientState.region

        if (!accessKeyId) {
            awsErrors.accessKeyId = 'Required'
        }
        if (!secretAccessKey) {
            awsErrors.secretAccessKey = 'Required'
        }
        if (!region) {
            awsErrors.region = 'Required'
        }

        if (
            !(
                awsErrors.secretAccessKey ||
                awsErrors.secretAccessKey ||
                awsErrors.region
            )
        ) {
            await fetchTopics(accessKeyId, secretAccessKey, region)

            store[payload.project.id] = {
                ...projectStore,
                region,
                accessKeyId,
                secretAccessKey,
            }

            await zeitClient.setMetadata(store)
            edittingAws = false
        } else {
            edittingAws = true
        }
    }

    if (action === 'editaws') {
        edittingAws = true
    }

    if (edittingAws) {
        const regions = await fetchRegions()

        return htm`
            <Page>
                ${header}

                <Container>
                    <Fieldset>
                      <FsContent>
                        <H2>AWS</H2>
                        <P><B>Region</B></P>
                        <P>To register ZEIT deployments on AWS SNS, select the AWS region for the SNS resources.</P>
                        <Container>
                            <Box display="inline" marginRight="10px">
                                <Select name="region" value=${region}>
                                    <Option value="" caption="Select a region" />
                                    ${regions.Regions.map(
                                        item => htm`
                                            <Option value=${
                                                item.RegionName
                                            } caption=${item.RegionName} />
                                        `,
                                    )}
                                </Select>
                            </Box>
                            ${
                                awsErrors.region
                                    ? htm`<Box color="var(--geist-error)" display="inline" fontWeight="500">${
                                          awsErrors.region
                                      }</Box>`
                                    : ''
                            }
                        </Container>
                        <BR />
                        <P><B>IAM Policy</B></P>
                        <P>Create an IAM Policy with the following permissions: List Subscriptions, List Topics and Subscribe.</P>
                        <Code>
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "sns:Subscribe",
            "Resource": "arn:aws:sns:*:*:*"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "sns:ListTopics",
                "sns:GetSubscriptionAttributes",
                "sns:ListSubscriptions"
            ],
            "Resource": "*"
        }
    ]
}
                        </Code>
                        <BR />
                        <P><B>IAM User</B></P>
                        <P>Create an IAM User for programmatic access and attach the newly created policy.</P>
                        <Container>
                            <Input label="Access key ID" name="accessKeyId" value=${accessKeyId} />
                            ${
                                awsErrors.accessKeyId
                                    ? htm`<Box color="var(--geist-error)" marginBottom="1rem" fontWeight="500">${
                                          awsErrors.accessKeyId
                                      }</Box>`
                                    : ''
                            }
                            <Input label="Secret access key" name="secretAccessKey" value=${secretAccessKey} />
                            ${
                                awsErrors.secretAccessKey
                                    ? htm`<Box color="var(--geist-error)" marginBottom="1rem" fontWeight="500">${
                                          awsErrors.secretAccessKey
                                      }</Box>`
                                    : ''
                            }
                        </Container>
                      </FsContent>
                      <FsFooter>
                          <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                            <P>All information is stored privately on ZEIT.</P>
                            <Button action="saveaws">Save and Continue</Button>
                          </Box>
                      </FsFooter>
                    </Fieldset>
                </Container>
            </Page>
        `
    }

    const topics = await fetchTopics(accessKeyId, secretAccessKey, region)
    let endpoints = projectStore.endpoints || {}
    const endpointErrors = {}
    let endpoint = ''

    if (action === 'saveendpoint') {
        endpoint = clientState.endpoint.trim()

        if (endpoint === '') {
            endpointErrors.endpoint = 'Required.'
        } else if (!endpoint.startsWith('/')) {
            endpointErrors.endpoint =
                'Endpoint must be relative to project root.'
        }

        const devKeys = Object.keys(clientState)
            .filter(k => k.startsWith('dev:::') && clientState[k])
            .map(k => k.split('dev:::').pop())
        const stagingKeys = Object.keys(clientState)
            .filter(k => k.startsWith('staging:::') && clientState[k])
            .map(k => k.split('staging:::').pop())
        const prodKeys = Object.keys(clientState)
            .filter(k => k.startsWith('prod:::') && clientState[k])
            .map(k => k.split('prod:::').pop())

        if (!devKeys.length && !prodKeys.length && !stagingKeys.length) {
            endpointErrors.topics = 'At least one topic is required.'
        }

        if (!(endpointErrors.endpoint || endpointErrors.topics)) {
            endpoints = {
                ...endpoints,
                [endpoint]: {
                    dev: devKeys,
                    staging: stagingKeys,
                    prod: prodKeys,
                },
            }

            store[payload.project.id] = {
                ...projectStore,
                endpoints,
            }

            await zeitClient.setMetadata(store)
        }
    }

    if (action.startsWith('delete:::')) {
        const toDelete = action.split('delete:::').pop()

        const { [toDelete]: _, ...without } = endpoints

        endpoints = without

        store[payload.project.id] = {
            ...projectStore,
            endpoints,
        }

        await zeitClient.setMetadata(store)
    }

    return htm`
        <Page>
            ${header}

            <Container>
                <Fieldset>
                  <FsContent>
                    <H2>AWS</H2>
                    <P><B>Region</B></P>
                    <P>${region}</P>
                    <P><B>Access key ID</B></P>
                    <P>${accessKeyId}</P>
                    <P><B>Secret access key</B></P>
                    <P>******</P>
                  </FsContent>
                  <FsFooter>
                    <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                        <P>Successfully saved AWS settings.</P>
                        <Button action="editaws">Edit</Button>
                    </Box>
                  </FsFooter>
                </Fieldset>
                <Fieldset>
                  <FsContent>
                    <H2>Project Endpoints</H2>
                    <Box color="var(--geist-secondary)" marginBottom="14px" fontSize=".875rem" lineHeight="1.6">
                        On deploy, these project URLs will be registered to SNS topics. After a deploy finishes, these endpoints will receive a confirmation message from AWS that must be handled by the endpoint.
                    </Box>

                    ${
                        Object.keys(endpoints).length
                            ? htm`
                    <Box display="table" width="100%">
                        <Box display="table-header-group">
                            <Box display="table-row">
                                <Box display="table-cell" background="var(--accents-1)" color="var(--accents-5)" fontWeight="400" padding="0 10px" borderBottom="1px solid var(--accents-2)" borderTop="1px solid var(--accents-2)" verticalAlign="top" borderBottom="1px solid var(--accents-2)" borderLeft="1px solid var(--accents-2)" borderRadius="4px 0px 0px 4px" borderTop="1px solid var(--accents-2)">
                                    <Box display="flex" minHeight="40px" fontSize="12px" alignItems="center">PROJECT ENDPOINT</Box>
                                </Box>
                                <Box display="table-cell" background="var(--accents-1)" color="var(--accents-5)" fontWeight="400" padding="0 10px" borderBottom="1px solid var(--accents-2)" borderTop="1px solid var(--accents-2)" verticalAlign="top">
                                    <Box display="flex" minHeight="40px" fontSize="12px" alignItems="center">TOPIC</Box>
                                </Box>
                                <Box display="table-cell" background="var(--accents-1)" color="var(--accents-5)" fontWeight="400" padding="0 10px" borderBottom="1px solid var(--accents-2)" borderTop="1px solid var(--accents-2)" verticalAlign="top">
                                    <Box display="flex" minHeight="40px" fontSize="12px" alignItems="center">DEVELOPMENT</Box>
                                </Box>
                                <Box display="table-cell" background="var(--accents-1)" color="var(--accents-5)" fontWeight="400" padding="0 10px" borderBottom="1px solid var(--accents-2)" borderTop="1px solid var(--accents-2)" verticalAlign="top">
                                    <Box display="flex" minHeight="40px" fontSize="12px" alignItems="center">STAGING</Box>
                                </Box>
                                <Box display="table-cell" background="var(--accents-1)" color="var(--accents-5)" fontWeight="400" padding="0 10px" borderBottom="1px solid var(--accents-2)" borderTop="1px solid var(--accents-2)" verticalAlign="top">
                                    <Box display="flex" minHeight="40px" fontSize="12px" alignItems="center">PRODUCTION</Box>
                                </Box>
                                <Box display="table-cell" background="var(--accents-1)" color="var(--accents-5)" fontWeight="400" padding="0 10px" borderBottom="1px solid var(--accents-2)" borderTop="1px solid var(--accents-2)" verticalAlign="top" borderBottom="1px solid var(--accents-2)" borderRadius="0 4px 4px 0" borderRight="1px solid var(--accents-2)" borderTop="1px solid var(--accents-2)">
                                </Box>
                            </Box>
                        </Box>
                        <Box display="table-row-group">
                            ${Object.keys(endpoints).map(url => {
                                const endpointTopics = reshapeTopics(
                                    endpoints[url],
                                )

                                return htm`
                            <Box display="table-row">
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    <Box fontWeight="500" color="var(--geist-foreground)">${url}</Box>
                                </Box>
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                </Box>
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                </Box>
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                </Box>
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                </Box>
                                <Box display="table-cell" padding="10px" paddingRight="0" textAlign="right" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    <Button small type="secondary" action=${`delete:::${url}`}>Delete Endpoint</Button>
                                </Box>
                            </Box>
                            ${Object.keys(endpointTopics).map(
                                topic => htm`
                                <Box display="table-row">
                                    <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    </Box>
                                    <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                        <Box fontWeight="500" color="var(--geist-foreground)">${topic
                                            .split(':')
                                            .pop()}</Box>
                                    </Box>
                                    <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                        ${
                                            endpointTopics[topic].dev
                                                ? htm`
                                            <Box display="inline-block" width="10px" height="10px" borderRadius="5px" background="var(--geist-cyan-dark)" marginRight="4.33333px"></Box>
                                        `
                                                : htm`
                                            <Box display="inline-block" width="10px" height="10px" borderRadius="5px" background="var(--geist-error)" marginRight="4.33333px"></Box>
                                        `
                                        }
                                        ${
                                            endpointTopics[topic].dev
                                                ? 'Yes'
                                                : 'No'
                                        }
                                    </Box>
                                    <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                        ${
                                            endpointTopics[topic].staging
                                                ? htm`
                                            <Box display="inline-block" width="10px" height="10px" borderRadius="5px" background="var(--geist-cyan-dark)" marginRight="4.33333px"></Box>
                                        `
                                                : htm`
                                            <Box display="inline-block" width="10px" height="10px" borderRadius="5px" background="var(--geist-error)" marginRight="4.33333px"></Box>
                                        `
                                        }
                                        ${
                                            endpointTopics[topic].staging
                                                ? 'Yes'
                                                : 'No'
                                        }
                                    </Box>
                                    <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                        ${
                                            endpointTopics[topic].prod
                                                ? htm`
                                            <Box display="inline-block" width="10px" height="10px" borderRadius="5px" background="var(--geist-cyan-dark)" marginRight="4.33333px"></Box>
                                        `
                                                : htm`
                                            <Box display="inline-block" width="10px" height="10px" borderRadius="5px" background="var(--geist-error)" marginRight="4.33333px"></Box>
                                        `
                                        }
                                        ${
                                            endpointTopics[topic].prod
                                                ? 'Yes'
                                                : 'No'
                                        }
                                    </Box>
                                    <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    </Box>
                                </Box>
                            `,
                            )}
                            <Box display="table-row">
                                <Box display="table-cell" borderBottom="1px solid var(--accents-2)"></Box>
                                <Box display="table-cell" borderBottom="1px solid var(--accents-2)"></Box>
                                <Box display="table-cell" borderBottom="1px solid var(--accents-2)"></Box>
                                <Box display="table-cell" borderBottom="1px solid var(--accents-2)"></Box>
                                <Box display="table-cell" borderBottom="1px solid var(--accents-2)"></Box>
                                <Box display="table-cell" borderBottom="1px solid var(--accents-2)"></Box>
                            </Box>
                            `
                            })}
                        </Box>
                    </Box>
                    `
                            : ''
                    }

                    <BR />
                    <BR />
                    <H2>Add Endpoint</H2>

                    <Box color="var(--geist-secondary)" marginBottom="14px" fontSize=".875rem" lineHeight="1.6">
                        Add an endpoint as a URL relative to the project root. For example: <Box fontFamily="monospace" display="inline">/api/hook</Box>
                    </Box>
                    <Container>
                        <Input label="Endpoint:" name="endpoint" value=${endpoint} />
                        ${
                            endpointErrors.endpoint
                                ? htm`<Box color="var(--geist-error)" marginBottom="1rem" fontWeight="500">${
                                      endpointErrors.endpoint
                                  }</Box>`
                                : ''
                        }
                    </Container>
                    <Container>
                        <P><Box display="inline" fontWeight="500">Topics to subscribe to:</Box></P>
                        <Box display="table" marginTop="-15px">
                        <Box display="table-row-group">
                        ${topics.Topics.map(
                            topic => htm`
                            <Box display="table-row">
                                <Box display="table-cell" padding="10px" paddingLeft="0" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    <Box fontWeight="500" color="var(--geist-foreground)">${topic.TopicArn.split(
                                        ':',
                                    ).pop()}</Box>
                                </Box>
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    <Checkbox name=${`dev:::${
                                        topic.TopicArn
                                    }`} label="Development" checked="true" />
                                </Box>
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    <Checkbox name=${`staging:::${
                                        topic.TopicArn
                                    }`} label="Staging" checked="true" />
                                </Box>
                                <Box display="table-cell" padding="10px" textAlign="left" verticalAlign="top" color="var(--accents-6)" fontSize="14px">
                                    <Checkbox name=${`prod:::${
                                        topic.TopicArn
                                    }`} label="Production" checked="true" />
                                </Box>
                            </Box>
                        `,
                        )}
                        </Box>
                        </Box>
                        ${
                            endpointErrors.topics
                                ? htm`<Box color="var(--geist-error)" marginBottom="1rem" fontWeight="500">${
                                      endpointErrors.topics
                                  }</Box>`
                                : ''
                        }
                    </Container>
                  </FsContent>
                  <FsFooter>
                    <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                        <P>Endpoint will be registered on next deploy.</P>
                        <Button action="saveendpoint">Add</Button>
                    </Box>
                  </FsFooter>
                </Fieldset>
            </Container>
        </Page>
    `
})
