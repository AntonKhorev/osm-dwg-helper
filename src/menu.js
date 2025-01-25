export default class Menu {
	constructor($menu) {
		this.$menu=$menu
	}

	addActiveEntry($icon,$elements) {
		this.addItems(
			makeSlice($icon,$elements)
		)
	}

	addPassiveEntry($icon,$elements) {
		this.addItems(
			makeSlice($icon,$elements,'passive-slice')
		)
	}

	addSubmenu($icon,$elements) {
		const $subMenu=document.createElement('ul')
		this.addItems(
			makeSlice($icon,$elements),
			$subMenu
		)
		return new Menu($subMenu)
	}

	// private

	addItems(...$items) {
		const $li=document.createElement('li')
		$li.append(...$items)
		this.$menu.append($li)
	}
}

function makeSlice($icon,$elements,sliceClass='slice') {
	const $sliceIcon=document.createElement('div')
	$sliceIcon.classList.add('slice-icon')
	if ($icon) $sliceIcon.append($icon)
	const $sliceEntry=document.createElement('div')
	$sliceEntry.classList.add('slice-entry')
	$sliceEntry.append(...$elements)
	const $slice=document.createElement('div')
	$slice.classList.add(sliceClass)
	$slice.append($sliceIcon,$sliceEntry)
	return $slice
}
