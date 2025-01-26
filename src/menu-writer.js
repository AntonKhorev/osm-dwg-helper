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
			this.makeSlice(icon,$elements,'passive-slice'),
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
		const iconSrc=getIconSrc(icon)
		if (iconSrc) {
			const $icon=this.document.createElement('img')
			$icon.width=$icon.height=16
			$icon.src=iconSrc
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

function getIconSrc(icon) {
	if (typeof icon == 'string') {
		return getSymbolIconSrc(icon)
	} else if (icon && (typeof icon == 'object')) {
		if (icon.url) {
			return icon.url
		} else if (icon.item) {
			if (icon.item=='user' || icon.item=='note') {
				return getSymbolIconSrc(icon.item)
			}
		}
	}
}

function getSymbolIconSrc(symbol) {
	return `icons/void/${symbol}.svg`
}
