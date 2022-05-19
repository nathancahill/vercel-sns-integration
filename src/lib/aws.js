import SNS from 'aws-sdk/clients/sns';
import EC2 from 'aws-sdk/clients/ec2';

const { AWS_ACCESS_KEY_ID_APP, AWS_SECRET_ACCESS_KEY_APP } = process.env;

export const fetchRegions = async () => {
	const ec2 = new EC2({
		credentials: {
			accessKeyId: AWS_ACCESS_KEY_ID_APP,
			secretAccessKey: AWS_SECRET_ACCESS_KEY_APP
		},
		region: 'us-east-1'
	});

	return ec2.describeRegions().promise();
};

export const fetchTopics = async (accessKeyId, secretAccessKey, region) => {
	const sns = new SNS({
		credentials: {
			accessKeyId,
			secretAccessKey
		},
		region
	});

	return sns.listTopics().promise();
};
