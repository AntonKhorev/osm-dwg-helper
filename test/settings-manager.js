import {strict as assert} from 'assert'

import {SettingsManager,SettingsAndPermissionsReader} from '../src/settings-manager.js'

class MockStorageArea {
	async get() {
		return {}
	}
}

class MockPermissions {
	async contains() {
		return false
	}
	async getAll() {
		return {}
	}
}

describe("SettingsManager",async()=>{
	it("gets missing origin for root url without port",async()=>{
		const settingsData=[
			['osm','https://www.openstreetmap.org/',"OpenStreetMap root URL",{type:'url',state:true,origin:true}],
		]
		const settingsManager=new SettingsManager(settingsData,new MockStorageArea)
		const settingsAndPermissionsReader=new SettingsAndPermissionsReader(settingsManager,new MockPermissions)

		const [,,missingOrigins]=await settingsAndPermissionsReader.read()
		assert.deepEqual(missingOrigins,['https://www.openstreetmap.org/*'])
	})
	it("gets missing origin for root url with port",async()=>{
		const settingsData=[
			['osm','http://127.0.0.1:3000/',"OpenStreetMap root URL",{type:'url',state:true,origin:true}],
		]
		const settingsManager=new SettingsManager(settingsData,new MockStorageArea)
		const settingsAndPermissionsReader=new SettingsAndPermissionsReader(settingsManager,new MockPermissions)

		const [,,missingOrigins]=await settingsAndPermissionsReader.read()
		assert.deepEqual(missingOrigins,['http://127.0.0.1/*'])
	})
})
