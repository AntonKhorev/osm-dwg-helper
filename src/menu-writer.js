export default class MenuWriter {
	constructor(document,$menu) {
		this.document=document
		this.$menu=$menu
	}

	addActiveEntry(icon,$elements) {
		this.addItems(
			this.makeSlice(icon,$elements)
		)
	}

	addPassiveEntry(icon,$elements) {
		this.addItems(
			this.makeSlice(icon,$elements,'passive-slice')
		)
	}

	addSubmenu(icon,$elements) {
		const $subMenu=this.document.createElement('ul')
		this.addItems(
			this.makeSlice(icon,$elements),
			$subMenu
		)
		return new MenuWriter(this.document,$subMenu)
	}

	// private

	addItems(...$items) {
		const $li=this.document.createElement('li')
		$li.append(...$items)
		this.$menu.append($li)
	}

	makeSlice(icon,$elements,sliceClass='slice') {
		const $sliceIcon=this.document.createElement('div')
		$sliceIcon.classList.add('slice-icon')
		if (icon) {
			const $icon=this.document.createElement('img')
			$icon.src=`icons/void/${icon}.svg`
			$sliceIcon.append($icon)
		}
		const $sliceEntry=this.document.createElement('div')
		$sliceEntry.classList.add('slice-entry')
		$sliceEntry.append(...$elements)
		const $slice=this.document.createElement('div')
		$slice.classList.add(sliceClass)
		$slice.append($sliceIcon,$sliceEntry)
		return $slice
	}
}
