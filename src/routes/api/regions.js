import { fetchRegions } from '$lib/aws';

export async function get() {
	const regions = await fetchRegions();

	return {
		body: {
			regions: regions.Regions.map((r) => r.RegionName)
		}
	};
}
