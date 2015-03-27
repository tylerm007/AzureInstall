/**
 * @ngdoc service
 * @name Tables
 * @description # A service querying table meta
 */
espresso.app.service('Tables',[
	'$http', 'Storage', 'Settings', 'EspressoUtil', '$rootScope', '$q', '$injector', 'Events',
	function ($http, Storage, Settings, EspressoUtil, $rootScope, $q, $injector, Events) {

	var Module = null; // To avoid JS warning in Eclipse
	Module = {
		schema : {
			loaded: false
		},
		/**
		 * @ngdoc property
		 * @propertyOf Tables
		 * @description
		 * All the custom settings, per table. The key is the name of the table, the value is an object
		 * that contains:
		 * - name: the name of the table (for convenience)
		 * - alias: the alias for the table
		 * - columnFormats: each column of the table has a property in this object, containing:
		 *   - name: the column name (for convenience)
		 *   - alias: the alias for the column
		 *   - downloadable: boolean
		 *   - type: the data type (for convenience)
		 *   - is_editable: false if this column is derived and should not be edited directly
		 *   - is_nullable: boolean representation of an @tables column nullable attribute
		 *   - mask: the editing mask for the column
		 *   - maskType: ???
		 *   - filterParentColumn: default parent column to filter by
		 *   - filterRowColumn: default value of specified column used to populate parent lookup filter
		 *   - dataSource: the path to retrieve the value of the column - name by default, except for parent columns
		 * - gridColumns : map of column settings for when the table is displayed in a grid (search or children)
		 * - scalarColumns : map of column settings for when the table is displayed in scalars
		 * - parentSettings : map of settings for the parent tables, key is role name
		 * - childrenSettings : map of settings for the child tables, key is role name
		 * - defaultTable : boolean, if true, this table is selected by default
		 * - windows : array of windows expected to be open, default ['main', 'child', 'form'],
		 * - expressedTitle: string to be evaluated and put up as the title in the form view
		 */
		tableSettings : {},
		//name of the main grid table
		mainTable : '',
		//name of the form table
		formTable : '',
		//name of the active child table (not the role name, but the real table name)
		childTable : '',

		getCurrent : function () {
			return Module.getTableSettings(Module.mainTable);
		},
		getCurrentScalar : function () {
			return Module.getTableSettings(Module.formTable);
		},
		/**
		 * Retrieve the whole schema from the server, and set it as $rootScope.allTables.
		 * This is meant to be called *once* only.
		 */
		getAllTables: function(callback) {
			if (!Module.schema.loaded) {
				var config = Module.buildRequestConfig();
				if (!espresso.projectUrl) {
					var $location = $injector.get('$location');
					var search = $location.search();
					if (angular.isDefined(search.server)) {
						espresso.projectUrl = search.server;
					}
				}
				Module.schema = $http.get(espresso.projectUrl + '@tables/*', config).success(function (tables) {
					$rootScope.allTables = _.indexBy(tables, 'name');

					_.each(tables, function(table) {
						// Copy the columns so we can reset them to their original order
						table.originalColumns = _.toArray(table.columns);

						// For convenience, index by name
						table.columnsByName = _.indexBy(table.columns, 'name');
						table.parentsByName = _.indexBy(table.parents, 'name');
						table.childrenByName = _.indexBy(table.children, 'name');

						// Mark FK columns as such
						_.each(table.parents, function(parent) {
							_.each(parent.child_columns, function(childCol) {
								table.columnsByName[childCol].isFk = true;
							});
						});
					});

					if (callback)
						callback();
					$rootScope.$emit('schemaProcessed');
					Module.schema.loaded = true;
				}).error(function (a, b, c) {
					console.log('Error getting tables: ');
					Module.schema.loaded = false;
				});
				Module.schema.loaded = true;
			}
			$rootScope.$emit('schemaReturned');
			return Module.schema;
		},


		getPrimaryKey	: function( tableName ){
			if( angular.isDefined( $rootScope.allTables[ tableName ] ) ){
				var Table = $rootScope.allTables[ tableName ];
				var primary = false;
				angular.forEach( Table.keys , function( element , index ){
					if( element.type === 'primary' ){
						primary = element;
					}
				});
				return primary;
			}
			return false;
		},
		
		getDefaultTable: function () {
			var defaultTableName = _.keys(Module.tableSettings)[0];
			_.each(Module.tableSettings, function (table, index) {
				if (table && table.defaultTable) {
					defaultTableName = table.defaultTable;
				}
			});
			return defaultTableName;
		},

		///////////////////////////////////////////////////////////////////////////////////////
		// Given a column, which must be part of a parent key, get the name of the first role
		// to parent that the column participates in.
		getFirstParentRoleForCol: function(childTableName, colName) {
			var tbl = $rootScope.allTables[childTableName];
			for (var i = 0; i < tbl.parents.length; i++) {
				var parent = tbl.parents[i];
				for (var j = 0; j < parent.child_columns.length; j++) {
					var pCol = parent.child_columns[j];
					if (pCol == colName)
						return parent.name;
				}
			}

			throw "No parent role found for column " + tableName + "." + colName;
		},

		///////////////////////////////////////////////////////////////////////////////////////
		// Get the settings for the given table
		getTableSettings : function(tableName) {
			var settings = Module.tableSettings[tableName];
			if (settings)
				return settings;
			settings = Settings.getTableOptions(tableName);
			if (settings) {
				Module.tableSettings[tableName] = settings;
				Module.cleanTableSettings(settings); // Take any schema changes into account
				return settings;
			}
			Module.tableSettings[tableName] = Module.createDefaultTableSettings(tableName);
			return Module.tableSettings[tableName];
		},
		getSettings : function (tableName) { return Module.getTableSettings(tableName); },
		getDetails : function (tableName) { return $rootScope.allTables[tableName]; },
		setDefaultTable: function (defaultTable) {
			_.each(Module.tableSettings, function (element, index) {
				if (!element) { delete Module.tableSettings[index]; return;}
				element.defaultTable = defaultTable;
			});
		},
		//////////////////////////////////////////////////////////////////////////////////////
		// This should be called whenever table settings are modified
		saveTableSettings : function(tableName) {
			var settings = Module.getTableSettings(tableName);
			Events.broadcast('SettingsUpdate', settings);
			return Settings.saveTableOptions(Module.getTableSettings(tableName));
		},

		//////////////////////////////////////////////////////////////////////////////////////
		// Go through the settings for a table and correct for any schema changes.
		// This is pretty mind-numbing and could be broken up into a bunch of functions,
		// but on the other hand it is really very linear.
		cleanTableSettings: function(settings) {
			var clone = espresso.util.cloneObject(settings); // Make a copy so we can tell if any changes
			var tbl = $rootScope.allTables[settings.name];

			// Eliminate non-existent columns from columnFormats
			_.each(settings.columnFormats, function(c) {
				if ( ! tbl.columnsByName[c.name]) {
					delete settings.columnFormats[c.name];
				}
			});

			// Add new columns, or reset if data type changed
			_.each(tbl.columnsByName, function(c) {
				if ( ! settings.columnFormats[c.name] ||
						settings.columnFormats[c.name].type != c.type) {
					settings.columnFormats[c.name] = Module.initializeColumnSettings(c);
				}
			});

			// Cull any columns that have disappeared
			_.each(settings.gridColumns, function(c) {
				if ( ! tbl.columnsByName[c.name]) {
					delete settings.gridColumns[c.name];
				}
			});
			_.each(settings.scalarColumns, function(c) {
				if ( ! tbl.columnsByName[c.name]) {
					delete settings.scalarColumns[c.name];
				}
			});

			///////////////
			// Look over the known parents
			_.each(settings.parentSettings, function(p, pName) {
				if ( ! tbl.parentsByName[pName]) {
					delete tbl.parentsByName[pName]; // Parent no longer exists
				}
				else {
					var pTblName = tbl.parentsByName[pName].parent_table;
					var pTable = $rootScope.allTables[pTblName];
					if ( ! pTable) { // Table no longer exists -- reset
						Module.initializeParentSettings(settings, tbl, pName);
					}
					else {
						// Make sure all column formats correspond to existing columns
						_.each(p.columnFormats, function(pc) {
							if ( ! pTable.columnsByName[pc.name]) {
								delete p.columnFormats[pc.name];
							}
						});
						// Any new columns, or columns with new data type?
						_.each(pTable.columnsByName, function(c) {
							if ( ! p.columnFormats[c.name] ||
									p.columnFormats[c.name].type != c.type) {
								p.columnFormats[c.name] = Module.initializeColumnSettings(c);
							}
						});
					}
				}
			});
			// Any new parents?
			_.each(tbl.parentsByName, function(p, pName) {
				if ( ! settings.parentSettings[pName]) {
					Module.initializeParentSettings(settings, tbl, pName);
				}
			});

			/////////////////
			// Look over the known children
			_.each(settings.childrenSettings, function(child, cName) {
				if ( ! tbl.childrenByName[cName]) {
					delete settings.childrenSettings[cName]; // Child no longer exists
				}
				else {
					var ctName = tbl.childrenByName[cName].child_table;
					var cTable = $rootScope.allTables[ctName];
					if ( ! cTable) { // Table no longer exists - reset
						Module.initializeChildSettings(settings, tbl, cName);
					}
					else {
						var cSettings = settings.childrenSettings[cName];
						_.each(cSettings.columnFormats, function(f) { // Any columns gone?
							if ( ! cTable.columnsByName[f.name]) {
								delete cSettings.columnFormats[f.name];
							}
						});
						// Cull any columns that have disappeared
						_.each(cSettings.gridColumns, function(c, cFullName) {
							if ((angular.isUndefined(c)) || (!c.parentRole && ! cTable.columnsByName[c.name])) {
								delete cSettings.gridColumns[cFullName];
							}
							else if (c.parentRole) {
								var cpTblName = cTable.parentsByName[c.parentRole].parent_table;
								var cpTbl = $rootScope.allTables[cpTblName];
								if ( ! cpTbl) {
									delete cSettings.gridColumns[cFullName];
								}
								else if ( ! cpTbl.columnsByName[c.name]) {
									delete cSettings.gridColumns[cFullName];
								}
								else if (cSettings.gridColumns[cFullName].type != cpTbl.columnsByName[c.name].type) {
									cSettings.gridColumns[cFullName].type = cpTbl.columnsByName[c.name].type;
								}
							}
						});
						// Any new columns?
						_.each(cTable.columnsByName, function(cCol, cColName) {
							if ( ! cSettings.columnFormats[cColName]) {
								cSettings.columnFormats[cColName] = Module.initializeColumnSettings(cCol);
							}
						});

						// Now check the parents
						_.each(cSettings.parentSettings, function(p, pName) {
							if ( ! cTable.parentsByName[pName]) {
								delete cSettings.parentSettings[pName];
							}
							else {
								var pSettings = cSettings.parentSettings[pName];
								var pTable = $rootScope.allTables[cTable.parentsByName[pName].parent_table];
								// Any parent columns disappeared?
								_.each(pSettings.columnFormats, function(pCol, pColName) {
									if ( ! pTable.columnsByName[pColName]) {
										delete pSettings.columnFormats[pColName];
									}
								});
								// Any new parent columns, or changed type?
								_.each(pTable.columnsByName, function(pCol, pColName) {
									if ( ! pSettings.columnFormats[pColName] ||
											pSettings.columnFormats[pColName].type != pCol.type) {
										pSettings.columnFormats[pColName] = Module.initializeColumnSettings(pCol);
									}
								});
							}
						});
					}
				}
			});
			// Any new children?
			_.each(tbl.childrenByName, function(child, childName) {
				if ( ! settings.childrenSettings[childName]) {
					Module.initializeChildSettings(settings, tbl, childName);
				}
			});

			// Finally, did we make any changes? Save if yes.
			if ( ! _.isEqual(clone, settings)) {
				Settings.saveTableOptions(settings);
			}
		},

		//////////////////////////////////////////////////////////////////////////////////////
		// Initialize the local settings for a table to an empty skeleton.
		createDefaultTableSettings : function(tableName) {
			if ( ! tableName)
				return;
			var settings = {
				name : tableName,
				alias : tableName,
				columnFormats : {},
				gridColumns : {},
				scalarColumns : {},
				parentSettings: {},
				defaultTable: false,
				windows: ['main', 'child', 'form'],
				childrenSettings : {},
				groups: [],
				labelPlacement: 'Left' //Left, Top, Placeholder
			};

			var tableInfo = $rootScope.allTables[tableName];

			// Set up the default settings for the parent tables
			_.each(tableInfo.parents, function(p) {
				Module.initializeParentSettings(settings, tableInfo, p.name);
			});

			// Set up the default column settings for grid and scalar
			for (var i = 0; i < tableInfo.columns.length; i++) {
				var col = tableInfo.columns[i];
				var colSettings = Module.initializeColumnSettings(col);
				settings.columnFormats[col.name] = colSettings;
				settings.scalarColumns[col.name] = colSettings;
				if (_.size(settings.gridColumns) < 3) {
					if (col.isFk && !espresso.meta.columnIsText(col)) {
						var roleName = Module.getFirstParentRoleForCol(tableName, col.name);
						var parentTable = $rootScope.allTables[tableName].parentsByName[roleName];
						var bestParentCol = Module.getBestParentColumn(parentTable.parent_table);
						if (bestParentCol) {
							var parentColSettings = settings.parentSettings[roleName].columnFormats[bestParentCol.name];
							settings.gridColumns[col.name] = parentColSettings;
						}
						else
							settings.gridColumns[col.name] = colSettings;
					}
					else
						settings.gridColumns[col.name] = colSettings;
				}
			}

			// Set up the default settings for the child tables
			_.each(tableInfo.children, function(child) {
				Module.initializeChildSettings(settings, tableInfo, child.name);
			});

			return settings;
		},

		////////////////////////////////////////////////////////////////////////////////////////
		// Create the default settings for a parent table
		initializeParentSettings: function(settings, childTableInfo, roleToParent) {
			var p = childTableInfo.parentsByName[roleToParent];
			var parentInfo = $rootScope.allTables[p.parent_table];
			var parentSettings = {
				name : p.name,
				alias : p.name,
				columnFormats : {}
			};
			settings.parentSettings[p.name] = parentSettings;
			_.each(parentInfo.columns, function(c) {
				parentSettings.columnFormats[c.name] = Module.initializeColumnSettings(c);
				// Mark this column as a parent column
				parentSettings.columnFormats[c.name].parentRole = p.name;
				// Note: it would obviously be preferable to use parentRows['foo'] rather
				// than parentRows.foo so that any unusual characters in the column name
				// does not fail. Sadly, ng-grid seems to have problems with that.
				parentSettings.columnFormats[c.name].dataSource = '__internal.parentRows.' + p.name + '.' + c.name;
			});

		},

		////////////////////////////////////////////////////////////////////////////////////////
		// Create the default settings for a child table
		initializeChildSettings: function(settings, tableInfo, roleToChild) {
			var child = tableInfo.childrenByName[roleToChild];
			var childInfo = $rootScope.allTables[child.child_table];
			var childSettings = {
				name: child.name,
				tableName: child.child_table,
				alias: EspressoUtil.reformatChildName(child.name),
				displayed: true, // Whether the tab is shown at all
				selected: false, // Whether the tab is currently selected
				columnFormats: {},
				downloadable: false, //boolean, used for generic type = text
				gridColumns: {},
				parentSettings: {},
				groups: [],
				labelPlacement: 'left'
			};
			
			_.each(childInfo.parents, function(childParent) {
				var childParentInfo = $rootScope.allTables[childParent.parent_table];
				var childParentSettings = {
					alias : childParentInfo.name,
					columnFormats : {}
				};
				childSettings.parentSettings[childParent.name] = childParentSettings;
				for (var i = 0; i < childParentInfo.columns.length; i++) {
					var pCol = childParentInfo.columns[i];
					var pColSettings = Module.initializeColumnSettings(pCol);
					childParentSettings.columnFormats[pCol.name] = pColSettings;
					// Mark this column as a parent column
					childParentSettings.columnFormats[pCol.name].parentRole = childParent.name;
					// Note: it would obviously be preferable to use parentRows['foo'] rather
					// than parentRows.foo so that any unusual characters in the column name
					// does not fail. Sadly, ng-grid seems to have problems with that.
					childParentSettings.columnFormats[pCol.name].dataSource = '__internal.parentRows.' +
							childParent.name + '.' + pCol.name;
				}
			});

			settings.childrenSettings[child.name] = childSettings;
			for (var i = 0; i < childInfo.columns.length; i++) {
				var c = childInfo.columns[i];
				var colSettings = Module.initializeColumnSettings(c);
				childSettings.columnFormats[c.name] = colSettings;
				if (_.size(childSettings.gridColumns) < 3) {
					// If the column is not text, is a FK, and is not a FK to the parent, then show it
					// as the best parent attribute if possible.
					if (c.isFk && !espresso.meta.columnIsText(c)) {
						var roleName = Module.getFirstParentRoleForCol(childInfo.name, c.name);
						if (child.child_columns.indexOf(c.name) > -1) {
							continue;
						}
						var parentTable = $rootScope.allTables[childInfo.name].parentsByName[roleName];
						var bestParentCol = Module.getBestParentColumn(parentTable.parent_table);
						if (bestParentCol) {
							var parentColSettings = childSettings.parentSettings[roleName].columnFormats[bestParentCol.name];
							childSettings.gridColumns[roleName + '/' + parentColSettings.name] = parentColSettings;
						}
						else {
							childSettings.gridColumns[c.name] = colSettings;
						}
					}
					else {
						//if is FK to the parent, do nothing
						if (child.child_columns.indexOf(c.name) > -1) {
    						continue;
						}
						else {
	    					if (c.isFk && angular.isDefined(settings.columnFormats[c.name])) {
	    						//console.log(settings.childrenSettings[child.name], settings);
	    						//console.log(c.name, c, settings);
	    						//child table in childSettings.tableName
	    						//isFk in c.isFk
	    						//form table in settings.columnFormats
								continue;
							}
	    					else {
	    						childSettings.gridColumns[c.name] = colSettings;
	    					}
						}
					}
				}
			}
		},

		////////////////////////////////////////////////////////////////////////////////////////
		// Given a column, create a column setting object with default values.
		initializeColumnSettings : function (colInfo) {
			var maskType = null;
			var mask = null;
			if (colInfo.type == 'DECIMAL') { // Default decimal numbers to currency formatting
				maskType = 'numeric';
				mask = '$0,0.00';
			}
			return {
				name : colInfo.name,
				alias : EspressoUtil.reformatColumnName(colInfo.name),
				type : colInfo.type,
				generic_type : colInfo.generic_type,
				is_editable : colInfo.is_editable,
				is_nullable : colInfo.nullable,
				mask : mask,
				maskType : maskType,
				binaryType : null,
				extensionType : null,
				eval: [
					/*
					{
						expression: null,
						selector: '',
						onTrue: '',
						onFalse: ''
					}
					*/
				],
				dataSource : colInfo.name  // By default - parent columns are set elsewhere
			};
		},

		////////////////////////////////////////////////////////////////////////////////////////
		// For the given table, try to guess which column would be the best representation.
		// If none, return null, otherwise return the column.
		getBestParentColumn: function(tableName) {
			var tableInfo = $rootScope.allTables[tableName];
			var textCols = _.filter(tableInfo.columns, espresso.meta.columnIsText);

			for (var i = 0; i < textCols.length; i++) {
				var colName = textCols[i].name;
				if (colName.match(/.*name.*/i)) {
					return textCols[i];
				}
			}
			if (textCols.length > 0)
				return textCols[0];

			return null;
		},
		//expects 2 arrays of column names
		//used when checking columns in the grid against the table settings grid columns
		hasMatchingColumns : function (columns, compare) {
			columns = _.values(columns);
			compare = _.values(compare);
			return _.isEqual(columns.sort(), compare.sort());
		},
		hasModifiedColumns : function (columns, compare) {
			columns = _.keys(columns);
			compare = _.keys(compare);
			return !_.isEqual(columns, compare);
		},
		//expects a settings gridColumn object
		getSourcesToColumns : function (gridColumns) {
			var columns = {};
			angular.forEach(gridColumns, function (col, index) {
				columns[col.dataSource] = col;
			});
			return columns;
		},
		execution: {
			type: null,
			by: null,
			using: null
		},
		findMethods: {
			//this only uses the href to find a table name
			metadata: function tableFindByMetadata(params, executionOptions) {
				if (params.href) {
					var endpoint = params.href.replace($rootScope.currentServer, '').split('/');
					var name = endpoint[0];
					return $rootScope.allTables[name];
				}
				return false;
			}
		},

		//functionally this is the space to prep a find execute() reference
		//as of right now, all it does is make the code look readable
		find: function tableFind(type) {
			Module.execution.type = type;
			return Module;
		},
		//sets the findMethod
		by: function tableBy(method) {
			Module.execution.by = method;
			return Module;
		},
		using: function tableUsing(params) {
			Module.execution.using = params;
			return Module;
		},
		execute: function tableExecute(callback) {
			var result = Module.findMethods[Module.execution.by](Module.execution.using, Module.execution);
			//return callback(result);
			return result;
		},

		////////////////////////////////////////////////////////////////////////////////////////
		/**
		 * @ngdoc function
		 * @name Tables.methods.isEditable
		 * @param {string} table
		 * @param {string} column
		 */
		isEditable : function(tableName, columnName) {
			var tableSettings = Module.getTableSettings( tableName );
			if ( ! tableSettings.columnFormats[columnName]) {
				//console.log('No such column: ' + tableName + "." + columnName);
				return false; // Can happen for parent columns
			}
			
			var editable = tableSettings.columnFormats[columnName].is_editable;
			if ($rootScope.allTables[tableName]
				&& ($rootScope.allTables[tableName].columnsByName[columnName].isFk || $rootScope.allTables[tableName].columnsByName[columnName].generic_type === 'binary')
				) {
				editable = false;
			}
			return editable;
		},
		
		buildRequestHeaders : function () {
			var key = Settings.getKey();
			if (!key) {
				var $location = $injector.get('$location');
				var search = $location.search();
				if (angular.isDefined(search.apiKey)) {
					key = search.apiKey;
				}
			}{
		};
			return {
				Authorization : 'Espresso ' + key + ':1',
				'X-EspressoLogic-ResponseFormat': 'json'
			};
		},

		////////////////////////////////////////////////////////////////////////////////////////
		buildRequestConfig : function() {
			return {
				headers : Module.buildRequestHeaders()
			};
		}
	};
	return Module;
}]);
