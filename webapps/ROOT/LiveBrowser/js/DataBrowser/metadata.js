espresso.meta = {
	allTables : {},
	tableDetails: {},
	
	// Forget all the metadata we know. Call this after e.g. a new project is created.
	reset: function() {
		espresso.meta.allTables = {};
		espresso.meta.tableDetails = {};
	},

	// Get all the tables for the current project asynchronously
	getAllTables: function(fun) {
		espresso.meta.allTables = {};
		espresso.meta.tableDetails = {};
		console.log('Getting all tables (metadata.getAllTables)');
		espresso.fetchData(espresso.projectUrl + '@tables', null, function metadataGetAllTables(data){
			for (var i = 0; i < data.length; i++) {
				espresso.meta.allTables[data[i].name] = data[i];
			}
			if (fun)
				fun(espresso.meta.allTables);
		});
	},
	
	// Get all tables that we currently know about -- do not reload unless we don't have any tables yet
	getAllKnownTables: function(fun) {
		if (espresso.meta.allTables)
			fun(espresso.meta.allTables);
		else
			espresso.meta.getAllTables(fun);
	},
	
	// Get the details on the given table. Function fun will be called with the details.
	getTableDetails: function(tblName, fun) {
		var details = espresso.meta.tableDetails[tblName];
		if (details) {
			fun(details);
			return;
		}
		if ( ! espresso.meta.allTables[tblName]) {
			fun({});
		}
		else {
			espresso.fetchData(espresso.meta.allTables[tblName]['@metadata'].href, null, function(data){
				data.columnsByName = _.indexBy(data.columns, 'name');
				$scope.analyzeParents(data);
				espresso.meta.tableDetails[tblName] = data;
				fun(data);
			});
		}
	},
	
	// Get the first table. Used for e.g. default selection in selects.
	getFirstTable: function() {
		for (var tblName in espresso.meta.allTables)
			return espresso.meta.allTables[tblName];
	},
	
	getAllRelationships: function(dbase, fun) {
		espresso.fetchData("relationships", { order: 'name asc', filter: 'dbaseschema_ident=' + dbase.ident}, function(data){
			fun(data);
		});
	},
	
	// Look for FK attributes, and store that information in the tableDetails
	analyzeParents: function(tableDetails) {
		function colIsFK(col) {
			for (var i = 0; i < tableDetails.parents.length; i++) {
				for (var j = 0; j < tableDetails.parents[i].child_columns.length; j++) {
					if (tableDetails.parents[i].child_columns[j] == col.name) {
						return tableDetails.parents[i];
					}
				}
			}
			return false;
		}
		
		for (var i = 0; i < tableDetails.columns.length; i++) {
			var parent = colIsFK(tableDetails.columns[i]);
			if (parent) {
				tableDetails.columns[i].parent = parent;
				if (tableDetails.columns[i].TypeError == 'VARCHAR') {
					tableDetails.columns[i].parentAttribute = null;
				}
				else {
					espresso.meta.getTableDetails(parent.name, function(parentDetails) {
						for (var j = 0; j < parentDetails.columns.length; j++) {
							if (parentDetails.columns[j].type == 'VARCHAR') {
								tableDetails.columns[i].parentAttribute = parentDetails.columns[j].name;
								break;
							}
						}
					});
				}
			}
		}
	},
	
	columnIsNumeric: function(col) {
		switch(col.type) {
			case 'BIGINT':
			case 'DECIMAL':
			case 'INTEGER':
				return true;
			default:
				return false;
		}
	},
	
	columnIsText: function(col) {
		switch(col.type) {
			case 'CHAR':
			case 'NCHAR':
			case 'VARCHAR':
			case 'NVARCHAR':
				return true;
			default:
				return false;
		}
	}
};