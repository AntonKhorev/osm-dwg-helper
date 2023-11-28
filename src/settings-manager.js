export class SettingsManager {
	/**
	 * Settings manager, doesn't have internal state, can be instantiated from multiple windows
	 * @param specs {Array} string for a header or an option spec
	 *              option spec: [key, default value, title, other attributes]
	 *              other attributes: {type: input type, state: affects tab state, origin: needs origin permission, note}
	 */
	constructor(specs,browserStorageArea) {
		this.specs=specs
		this.browserStorageArea=browserStorageArea
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
		const kvs=await this.browserStorageArea.get()
		for (const [k,v] of this.getSpecsWithoutHeaders()) {
			if (kvs[k]==null) kvs[k]=v
		}
		return kvs
	}
	async write(kvs) {
		await this.browserStorageArea.set(kvs)
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

export class SettingsAndPermissionsReader {
	constructor(settingsManager,browserPermissions) {
		this.settingsManager=settingsManager
		this.browserPermissions=browserPermissions
	}
	async read() {
		const settings=await this.settingsManager.read()
		const permissions={}
		const missingOrigins=[]
		for (const [key,,,attrs] of this.settingsManager.getSpecsWithoutHeaders()) {
			if (!settings[key]) continue
			if (!attrs?.origin) continue
			const origin=settings[key]+'*'
			const containsOrigin=await this.browserPermissions.contains({
				origins:[origin],
			})
			if (containsOrigin) {
				permissions[key]=settings[key]
			} else {
				missingOrigins.push(origin)
			}
		}
		const allPermissions=await this.browserPermissions.getAll()
		return [settings,permissions,missingOrigins,allPermissions.origins]
	}
}
