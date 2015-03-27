/**
 * @ngdoc controller
 * @name ParentSelect
 */
espresso.app.controller( 'espresso.ParentSelectCtrl', [
			 '$scope', '$rootScope' , '$modalInstance', '$sce', '$sanitize', 'EspressoData', 'Tables', 'Settings',
			 'childTableInfo', 'childRow', 'roleNames', 'callback',
	function( $scope, $rootScope , $modalInstance, $sce, $sanitize, EspressoData, Tables, Settings,
				childTableInfo, childRow, roleNames, callback ){
		var currentTableSettings = Tables.getSettings(childTableInfo.name);
		var rels = _.indexBy(childTableInfo.parents, 'name');
		var potentialFilteringColumns = [];
		angular.forEach(rels[roleNames[0]].child_columns, function (column, index) {
			potentialFilteringColumns.push(column);
		});
		
		$scope.childTableInfo = childTableInfo;
		$scope.childRow = childRow;
//		$scope.parentTableInfos = parentTableInfos;
//		$scope.selectedParentTable = parentTableInfos[0];
		$scope.roleNames = roleNames;
		$scope.exitModal = function exitModal() {
			angular.element('.modal-column-container').scope().$parent.$close();
		};

//		$scope.rolesByName = {};
//		_.each(roleNames, function(r) {
//			$scope.rolesByName[r] = childTableInfo.parentsByName[r];
//		});
//		$scope.selectedRole = espresso.util.getFirstProperty(childTableInfo.parentsByName);
		$scope.selectedRole = childTableInfo.parentsByName[roleNames[0]];
		var newParentTableName = $scope.selectedRole.parent_table;
		$scope.selectedParentTable = $rootScope.allTables[newParentTableName];

		$scope.selectedParentTableColumns = [];
		for (var i = 0; i < $scope.selectedParentTable.columns.length; i++) {
			var col = $scope.selectedParentTable.columns[i];
			if ('binary' === col.generic_type) {
				// If the blob column is shown as an image in the grid, show it here as an image too
				var parentSettings = Tables.getTableSettings($scope.selectedParentTable.name);
				if ( ! parentSettings)
					continue;
				if (!parentSettings.gridColumns || !parentSettings.gridColumns[col.name])
					continue;
				if (parentSettings.gridColumns[col.name].binaryType != 'Image')
					continue;
				console.log('Parent setting for blob: ' + parentSettings.gridColumns[col.name]);
			}
			$scope.selectedParentTableColumns.push(col);
		}
		
		if (parentSettings && parentSettings.gridColumns) {
			var newCols = [];
			angular.forEach($scope.selectedParentTableColumns, function (col, index) {
				if (parentSettings.gridColumns[col.name]) {
					newCols.push(col);
				}
				else {
				}
			});
			$scope.selectedParentTableColumns = newCols;
		}

		$scope.searchCriteria = [{col: $scope.selectedParentTable.columns[0], colValue: ""}];

		$scope.addSearchParam = function(idx) {
			$scope.searchCriteria.splice(idx + 1, 0, {col: $scope.selectedParentTable.columns[0], colValue: ""});
		};

		$scope.removeSearchParam = function(idx) {
			if ($scope.searchCriteria.length == 1) {
				$scope.searchCriteria[0].colValue = "";
				return;
			}
			$scope.searchCriteria.splice(idx, 1);
		};

		// Build the filter string based on the search inputs
		$scope.buildSearchFilter = function() {
			var filter = "";
			for (var i = 0; i < $scope.searchCriteria.length; i++) {
				if (!$scope.searchCriteria[i].colValue) {
					continue;
				}
				var fragment = "";
				var searchCriteria = angular.copy($scope.searchCriteria);
				switch(searchCriteria[i].col.generic_type) {
					case 'text':
						fragment = searchCriteria[i].col.name + ' LIKE "%' + searchCriteria[i].colValue + '%"';
						break;
					case 'number':
						if (typeof searchCriteria[i].colValue == 'string') {
							console.log('test', searchCriteria[i]);
							//this will, in theory, always throw up, but this makes the error more meaningful
							searchCriteria[i].colValue = "'" + searchCriteria[i].colValue + "'";
						}
						else {
							searchCriteria[i].colValue = searchCriteria[i].colValue.toString();
						}
						var char1 = searchCriteria[i].colValue.charAt(0);
						if (char1 == '>' || char1 == '<') {
							fragment = searchCriteria[i].col.name + searchCriteria[i].colValue;
						}
						else {
							fragment = searchCriteria[i].col.name + "=" + searchCriteria[i].colValue;
						}
						break;
					case 'boolean':
						fragment = searchCriteria[i].col.name + "=" + searchCriteria[i].colValue;
						break;
				}
				if (filter.length > 0)
					filter += " AND ";
				filter += fragment;
			}

			return filter;
		};
		if (potentialFilteringColumns.length) {
			var newFilter = [];
			angular.forEach(potentialFilteringColumns, function (colName, index) {
				if (!currentTableSettings.scalarColumns[colName].filterParentColumn || !currentTableSettings.scalarColumns[colName].filterRowColumn) {
					return;
				}
				//row must be defined and be not NULL for LB to initialize a filter for it
				if (angular.isDefined(childRow[colName]) && childRow[colName] != null) {
					var value = angular.copy(childRow[currentTableSettings.scalarColumns[colName].filterRowColumn]);
					if (typeof value == 'string') {
						value.trim();
					}
					newFilter.push({
						col: $scope.selectedParentTable.columnsByName[currentTableSettings.scalarColumns[colName].filterParentColumn],
						colValue: value
					});
				}
			});
			if (newFilter.length) {
				$scope.searchCriteria = newFilter;
			}
		}

		$scope.newRoleSelected = function() {
//			$scope.selectedParentTable = $scope.parentSettings[$scope.selectedRole];
			var newParentTableName = childTableInfo.parentsByName[$scope.selectedRole].parent_table;
			$scope.selectedParentTable = $rootScope.allTables[newParentTableName];
			$scope.searchCriteria = [{col: $scope.selectedParentTable.columns[0], colValue: ""}];
			$scope.runSearch();
		};
		
		$scope.isBinaryRaw = function isBinaryRaw(column) {
			return !!(column && column.value);
		};
		$scope.isBinaryReference = function isBinaryReference(column) {
			return !!(column && column.url);
		};

		$scope.runSearch = function(fromScratch) {
			var filter = $scope.buildSearchFilter();
			var url = $scope.selectedParentTable.name;
			if ( ! fromScratch) {
				if ($scope.nextBatchUrl) {
					filter = null;
					url = $scope.nextBatchUrl;
				}
			}

			EspressoData.query(url, $scope.selectedParentTable.name, filter, function(data){
				var addToRows = !!$scope.nextBatchUrl && !fromScratch;
				if (data.length !== 0 && data[data.length - 1]['@metadata'].next_batch) {
					$scope.nextBatchUrl = data[data.length - 1]['@metadata'].next_batch;
					data.pop();
				}
				else
					$scope.nextBatchUrl = null;

				for (var i = 0; i < data.length; i++) {
					for (var j = 0; j < $scope.selectedParentTableColumns.length; j++) {
						var col = $scope.selectedParentTableColumns[j];
						if ('binary' === col.generic_type) { // Must be an image, otherwise we wouldn't get it

							if ($scope.isBinaryRaw(data[i][col.name])) {
								data[i][col.name] = $sce.trustAsHtml('<img class="row-image" src="data:image/jpeg;base64,' + data[i][col.name].value + '" />');
							}
							else if ($scope.isBinaryReference(data[i][col.name])) {
								data[i][col.name] =  $sce.trustAsHtml('<img class="row-image" src="' + data[i][col.name].url + '?auth=' + Settings.getAuthSession().apikey + ':1" />');
							}
							else
								data[i][col.name] = "";
						}
						else {
							try {
								//this should only choke of the a "<" opens and never closes ">" --> in theory it only chokes on safe content
								data[i][col.name] = $sanitize('' + data[i][col.name]);
							}
							catch (e) {
								if (S(data[i][col.name]).contains('>')) {
									//potentially there is a closing html tag, and this may be unsafe
									data[i][col.name] = "COLUMN PARSE FAILED";
								}
								else {
									//the $sanitize filter choked, but there isn't a closing html ">", we'll output the plaintext:
									data[i][col.name] = data[i][col.name];
								}
							}
						}
					}
				}

				if (addToRows)
					$scope.searchRows = $scope.searchRows.concat(data);
				else
					$scope.searchRows = data;
			}, true);
		};

		$scope.fetchMoreData = function() {
			if ( ! $scope.nextBatchUrl)
				return;
			$scope.runSearch();
		};

		$scope.rowSelected = function(row) {
			$modalInstance.close();
			if (callback) {
				callback(row, $scope.selectedRole.name, childRow.entity);
			}
		};

		$scope.runSearch();
	}
]);
