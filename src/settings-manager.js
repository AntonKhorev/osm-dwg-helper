export default class {
	/**
	 * Settings manager, doesn't have internal state, can be instantiated from multiple windows
	 * @param specs {Array} string for a header or an option spec
	 *              option spec: [key, default value, title, other attributes]
	 *              other attributes: {type: input type, state: affects tab state, origin: needs origin permission, note}
	 */
	constructor(specs) {
		this.specs=specs
		this.specKeys={}
		for (const spec of this.getSpecsWithoutHeaders()) {
			const [key]=spec
			this.specKeys[key]=spec
		}
	}
	*getSpecsWithoutHeaders() {
		for (const spec of this.specs) {
			if (typeof spec == 'string') continue
			yield spec
		}
	}
	async read() {
		const kvs=await browser.storage.local.get()
		for (const [k,v] of this.getSpecsWithoutHeaders()) {
			if (kvs[k]==null) kvs[k]=v
		}
		return kvs
	}
	async readSettingsAndPermissions() {
		const settings=await this.read()
		const permissions={}
		const missingOrigins=[]
		for (const [key,,,attrs] of this.getSpecsWithoutHeaders()) {
			if (!settings[key]) continue
			if (!attrs?.origin) continue
			const origin=settings[key]+'*'
			const containsOrigin=await browser.permissions.contains({
				origins:[origin],
			})
			if (containsOrigin) {
				permissions[key]=settings[key]
			} else {
				missingOrigins.push(origin)
			}
		}
		const allPermissions=await browser.permissions.getAll()
		return [settings,permissions,missingOrigins,allPermissions.origins]
	}
	async write(kvs) {
		await browser.storage.local.set(kvs)
		const needToUpdate=(attr)=>{
			for (const key of Object.keys(kvs)) {
				const [,,,attrs]=this.specKeys[key]
				if (attrs?.[attr]) return true
			}
			return false
		}
		return {
			state:  needToUpdate('state'),
			origin: needToUpdate('origin')
		}
	}
}
