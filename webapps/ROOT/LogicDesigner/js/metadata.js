var kahuna;
kahuna.meta = {
	allSchemas : [],
	allTables : {},
	tableDetails : {},
	allViews : {},
	viewDetails : {},
	allProcedures : {},
	procedureDetails : {},
	allResources : {},
	resourceDetails : {},
	allApiVersions : [],
	ruleTypes : {},
	allRulesByTable : {},
	allRulesById : {},

	getAllSchemas : function (proj, fun) {
		kahuna.meta.allSchemas = [];
		kahuna.fetchData("DbSchemas?filter=project_ident=" + proj.ident, null, function (data) {
			kahuna.meta.allSchemas = data;
			fun && fun(data);
		});
	},

	removeSchema : function (schema) {
		var idx = kahuna.meta.allSchemas.indexOf(schema);
		kahuna.meta.allSchemas.splice(idx, 1);
	},

	// Go through all schemas and find the one (if any) marked as active.
	getActiveSchema : function () {
		for (var i = 0; i < kahuna.meta.allSchemas.length; i++) {
			var schema = kahuna.meta.allSchemas[i];
			if (schema.active)
				return schema;
		}
		return null;
	},

	// Forget all the metadata we know. Call this after e.g. a new project is created.
	reset : function () {
		kahuna.meta.allSchemas = [];

		kahuna.meta.allTables = {};
		kahuna.meta.tableDetails = {};
		kahuna.meta.listOfTables = [];

		kahuna.meta.allViews = {};
		kahuna.meta.viewDetails = {};
		kahuna.meta.listOfViews = [];

		kahuna.meta.allProcedures = {};
		kahuna.meta.procedureDetails = {};

		kahuna.meta.allResources = {};
		kahuna.meta.resourceDetails = {};

		kahuna.meta.allApiVersions = [];

		kahuna.meta.allRulesByTable = {};
		kahuna.meta.allRulesById = {};
	},

	// Get all the tables for the current project asynchronously
	getAllTables : function (proj, fun, errorFunction) {
		if ( ! proj)
			return;

		kahuna.meta.listOfTables = [];
		kahuna.fetchData(proj.Tables.href, null, function (data) {
			kahuna.meta.listOfTables = data;
		});

		kahuna.meta.allRulesByTable = {};
		kahuna.meta.allTables = {};
		kahuna.meta.tableDetails = {};
		var href = proj.Tables.href;
		href = href.replace("@tables", "@tables/*");
		href = href.replace("@tables/*/*", "@tables/*");
		kahuna.fetchData(href, null, function (data) {
			kahuna.meta.allTables = kahuna.util.convertToMap(data, "name");
			kahuna.applyFunctionInScope(kahuna.topScope(), function () {
				console.log('Tables reloaded, broadcasting now...');
				kahuna.topScope().$broadcast('tablesLoaded');
			});
			fun && fun(kahuna.meta.allTables);
		}, errorFunction);
	},

	// Get the details on the given table. Function fun will be called with the details.
	getTableDetails : function (tblName, fun) {
		var details = kahuna.meta.tableDetails[tblName];
		if (details) {
			fun && fun(details);
			return;
		}
		if ( ! kahuna.meta.allTables[tblName]) {
			fun && fun({});
		}
		else {
			kahuna.fetchData(kahuna.meta.allTables[tblName]['@metadata'].href, null, function (data) {
				kahuna.meta.tableDetails[tblName] = data;
				fun && fun(data);
			});
		}
	},

	// Get the first table. Used for e.g. default selection in selects.
	getFirstTable : function () {
		return kahuna.util.getFirstProperty(kahuna.meta.allTables);
	},

	getAllViews : function (proj, fun, errorFunction) {
		if (!proj) {
			return;
		}
		kahuna.meta.allViews = {};
		kahuna.meta.viewDetails = {};
		kahuna.meta.listOfViews = [];
		kahuna.fetchData(proj.Views.href, null, function (data) {
			kahuna.meta.listOfViews = data;
			kahuna.meta.allViews = kahuna.util.convertToMap(data, "name");
			fun && fun(kahuna.meta.allViews);
		}, errorFunction);
	},

	getViewDetails : function (viewName, fun) {
		var details = kahuna.meta.viewDetails[viewName];
		if (details) {
			fun && fun(details);
			return;
		}
		if ( ! kahuna.meta.allViews[viewName]) {
			fun && fun({});
		}
		else {
			kahuna.fetchData(kahuna.meta.allViews[viewName]['@metadata'].href, null, function (data) {
				kahuna.meta.viewDetails[viewName] = data;
				fun && fun(data);
			});
		}
	},

	// top level resources prefixed by apikey ':' to make unique names
	// each object has apikey, name, apikey_name, metadata
	getAllResources : function (proj, fun, errorFunction) {
		if (!proj) {
			return;
		}
		kahuna.meta.allResources = {};
		kahuna.meta.resourceDetails = {};
		kahuna.fetchData(proj.Resources.href, null, function (data) {
			kahuna.meta.allResources = kahuna.util.convertToMap(data, "ident");
			fun && fun(kahuna.meta.allResources);
		}, errorFunction);
	},

	// Get all the procedures for the current project asynchronously
	getAllProcedures : function (proj, fun, errorFunction) {
		if ( ! proj)
			return;
		kahuna.meta.allProcedures = {};
		kahuna.meta.procedureDetails = {};
		kahuna.fetchData(proj.Procedures.href, null, function (data) {
			kahuna.meta.allProcedures= kahuna.util.convertToMap(data, "name");
			fun && fun(kahuna.meta.allProcedures);
		}, errorFunction);
	},

	// Get the details on the given procedure. Function fun will be called with the details.
	getProcedureDetails : function (procName, fun) {
		var details = kahuna.meta.procedureDetails[procName];
		if (details) {
			fun && fun(details);
			return;
		}
		if ( ! kahuna.meta.allProcedures[procName]) {
			fun && fun({});
		}
		else {
			kahuna.fetchData(kahuna.meta.allProcedures[procName]['@metadata'].href, null, function (data) {
				kahuna.meta.procedureDetails[procName] = data;
				fun && fun(data);
			});
		}
	},

	/**
	 * returns an array of api version.  each element is {"ident":num, "name":"somevalue"}
	 * @param proj the project to get
	 * @param fun the function to call after retrieval with the array
	 * @returns
	 */
	getAllApiVersions : function (proj, fun, errorFunction) {
		var KahunaData = angular.injector(['AdminServices']).get('KahunaData');
		if (proj && proj.ident) {
			KahunaData.query('admin:apiversions', { filter: 'project_ident=' + proj.ident, order: 'upper(name) desc, name desc, ident desc' }, function (data) {
				kahuna.meta.allApiVersions = data;
				fun && fun(data);
			}, errorFunction);
		}
		else {
			errorFunction && errorFunction(null, null, null);
		}
	},

	getRuleTypes : function (fun) {
		if ( ! kahuna.meta.ruleTypes || !kahuna.meta.ruleTypes['sum']) {
			kahuna.fetchData(kahuna.baseUrl + 'admin:ruletypes', null, function (data) {
				kahuna.meta.ruleTypes= kahuna.util.convertToMap(data, "name");
				fun && fun();
			});
		}
		else {
			fun && fun();
		}
	},

	getAllRules : function (proj, params, fun) {
		// kahuna.meta.allRulesByTable = {};
		// kahuna.meta.allRulesById = {};
		// var noFilter = (!params || !params.filter || params.filter.trim().length == 0);
		if ( ! params) {
			params = {filter : "project_ident=" + proj.ident};
		}
		else if ( ! params.filter) {
			params.filter = "project_ident=" + proj.ident;
		}
		else {
			params.filter = "project_ident=" + proj.ident + " and (" + params.filter + ")";
		}
		params.order = "entity_name,ruletype_ident,name";
		params.pagesize = 200;

		var url = "AllRules";
		var addRules = false;
		if (params && params.nextUrl) {
			url = params.nextUrl;
			params = null;
			addRules = true;
		}
		kahuna.fetchData(url, params, function (data) {
			var allRulesByTable;
			var allRulesById;
			if (addRules) {
				allRulesByTable = kahuna.meta.allRulesByTable;
				allRulesById = kahuna.meta.allRulesById;
			}
			else {
				allRulesByTable = {};
				allRulesById = {};
			}
			var nextUrl = null;
			for (var i = 0; i < data.length; i++) {
				var rule = data[i];
				if (rule['@metadata'].next_batch) {
					nextUrl = rule['@metadata'].next_batch;
					continue;
				}
				var rules = allRulesByTable[rule.entity_name];
				if ( ! rules) {
					rules = [];
					allRulesByTable[rule.entity_name] = rules;
				}
				rules.push(rule);
				allRulesById[rule.ident] = rule;
			}
			kahuna.meta.allRulesByTable = allRulesByTable;
			kahuna.meta.allRulesById = allRulesById;
			fun && fun(allRulesByTable, nextUrl);
		});
	},

	addRule : function (rule) {
		var rules = kahuna.meta.allRulesByTable[rule.entity_name];
		if ( ! rules) {
			rules = [];
			kahuna.meta.allRulesByTable[rule.entity_name] = rules;
		}
		for (var i = 0; i < rules.length; i++) {
			var r = rules[i];
			if (r.ident == rule.ident) {
				rules.splice(i, 1);
				break;
			}
		}
		rules.push(rule);
	},

	removeRule : function (rule) {
		delete kahuna.meta.allRulesById[rule.ident];
		var rules = kahuna.meta.allRulesByTable[rule.entity_name];
		if ( ! rules) {
			console.log("WARNING: trying to delete unknown rule (no such table): " + rule.ident);
			return;
		}
		for (var i = 0; i < rules.length; i++) {
			var r = rules[i];
			if (r.ident == rule.ident) {
				rules.splice(i, 1);
				return;
			}
		}
		console.log("WARNING: trying to delete unknown rule: " + rule.ident);
	},

	getRuleVersions : function(ruleIdent, callback) {
		kahuna.fetchData('admin:rule_versions', {
				filter: "rule_ident=" + ruleIdent,
				order : 'ts desc',
				pagesize: 30
		}, function (data) {
			if (data.length > 0 && data[data.length - 1]['@metadata'].next_batch)
				data.pop();
			callback && callback(data);
		});
	},

	getAllRelationships : function (project, fun) {
		kahuna.fetchData('admin:relationships', { order : 'name asc', filter : 'project_ident=' + project.ident}, function (data) {
			fun && fun(data);
		});
	}
};
