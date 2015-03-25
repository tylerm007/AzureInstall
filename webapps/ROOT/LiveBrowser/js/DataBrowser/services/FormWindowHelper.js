/**
 * 
 */
espresso.app.service('FormWindowHelper', [
	'$rootScope',
	function ($rootScope) {
		var formWindowHelper = {
			/**
			 * 
			 */
			previousRows: [],
			/**
			 * 
			 */
			getLastRow: function getLastRow(removeFromHistoryBool) {
				var lastRow = formWindowHelper.previousRows[0];
				if (removeFromHistoryBool && formWindowHelper.previousRows.length > 1) {
					formWindowHelper.previousRows.shift();
				}
				return lastRow;
			},
			/**
			 * 
			 */
			addToPreviousRows: function addToPreviousRows(data) {
				data.recorded = true;
				
				formWindowHelper.previousRows.unshift(data);
				//console.log(formWindowHelper.previousRows);
			},
			/**
			 * 
			 */
			isPreviousRow: function isPreviousRow(row) {
				return row.recorded;
			},
			/**
			 * 
			 */
			history: function previousRowsHistory() {
				return formWindowHelper.previousRows;
			}
		};
		return formWindowHelper;
	}
]);