const { KVDB_BUCKET } = process.env;

async function get(key) {
	const r = await fetch(`https://kvdb.io/${KVDB_BUCKET}/${key}`);

	if (!r.ok) {
		return null;
	}

	return r.json();
}

async function set(key, value) {
	await fetch(`https://kvdb.io/${KVDB_BUCKET}/${key}`, {
		method: 'POST',
		body: JSON.stringify(value)
	});
}

export default { get, set };
