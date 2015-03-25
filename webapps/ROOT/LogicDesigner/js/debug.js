var kahuna;
kahuna.app.factory('KahunaDebug', function($rootScope, $location) {

	return {
		startDebugger: function(scope, func) {
			console.log("Starting client-side debugger service...");
			if (kahuna.debug.socket) {
				console.log("startDebugger with socket already open");
				kahuna.debug.socket.close();
			}

			// For the debugger to work properly through load balancers and in clusters,
			// we have to talk to just one server. We start by getting a server's info, so we
			// can connect directly to it. Note that the debugger cannot use secure channels
			// because that's done by the load balancer.
			// TODO: we also need to set the request's URL to the same server!
			kahuna.fetchData(kahuna.baseUrl + "@serverinfo", null, function(data) {
				kahuna.wsUrl = 'ws://' + data.hostname + kahuna.urlEnd;
				if ( ! /\/$/.test(kahuna.wsUrl)) // Make sure it ends with /
					kahuna.wsUrl += "/";

				console.log('Opening debugging WebSocket');
				kahuna.debug.socket = new WebSocket(kahuna.wsUrl + '@debug?auth=' + scope.data.selectedApiKey.apikey +
						'&account=' + kahuna.globals.currentAccount.url_name + '&project=' + $rootScope.currentProject.url_name, 'abl.debug');
				kahuna.debug.socket.onmessage = function (event) {
					console.log("Debugger received message: " + event.data);
					kahuna.debug.currentBreakpoint = JSON.parse(event.data);

					$rootScope.$apply(function(){
						$rootScope.$broadcast('refreshBreakpoint');
					});
					scope.$apply(function(){
						if (event.data.action != 'exit') {
							scope.data.selectedTable = kahuna.meta.allTables[event.data.ruleTable];
							for (var i = 0; i < scope.data.activeTab.length; i++)
								scope.data.activeTab[i] = false;
							scope.data.activeTab[4] = true;
						}
					});
				};
				if (func)
					kahuna.debug.socket.onopen = func;
			});
		},

		stopDebugger: function() {
			kahuna.debug.currentBreakpoint = null;
			$rootScope.$broadcast('refreshBreakpoint');
			if ( ! kahuna.debug.socket)
				return;
			console.log("Stopping client-side debugger service...");
			kahuna.debug.socket.close();
			kahuna.debug.socket = null;
		}
	};
});


kahuna.debug = {

	DebugCtrl : function($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData, KahunaDebug) {

		$scope.data = {};
		$scope.data.breakpoints = [];
		$scope.data.rulesByTable = {};

		$scope.fullJavascriptAllowed = kahuna.globals.fullJavascriptAllowed;
		$scope.data.selectedLogicType = 'rules';

		// Set up the Ace editor
		kahuna.debug.codeEditor = ace.edit("codeEditor");
		kahuna.debug.codeEditor.setTheme("ace/theme/xcode");
		kahuna.debug.codeEditor.getSession().setMode("ace/mode/javascript");

		$scope.logicTypeSelected = function() {
			if ($scope.data.selectedLogicType == 'events' && $scope.data.allEvents && $scope.data.allEvents.length > 0) {
				$scope.data.selectedEvent = $scope.data.allEvents[0];
				$scope.eventSelected();
			}
		};

		function createBreakpoint(lineNum) {
			if ( ! $scope.data.selectedApiKey)
				return;
			if ($scope.data.selectedLogicType == 'rules') {
				if ( ! $scope.data.selectedRule)
					return;
			}
			else if ($scope.data.selectedLogicType == 'events') {
				if ( ! $scope.data.selectedEvent)
					return;
			}
			var newBreakpoint = {
					apikey_ident: $scope.data.selectedApiKey.ident,
					line_num: lineNum + 1,
					enabled: true
				};
			if ($scope.data.selectedLogicType == 'rules')
				newBreakpoint.rule_ident = $scope.data.selectedRule.ident;
			else if ($scope.data.selectedLogicType == 'events')
				newBreakpoint.eventhandler_ident = $scope.data.selectedEvent.ident;

			KahunaData.create("admin:breakpoints", newBreakpoint, function(data){
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:breakpoints' && modObj['@metadata'].verb === 'INSERT') {
						$scope.data.breakpoints.push(modObj);
					}
				}
			});
		}

		function deleteBreakpoint(lineNum) {
			var bpToDelete = null;
			var idxToDelete = -1;
			for (var i = 0; i < $scope.data.breakpoints.length; i++) {
				if ($scope.data.breakpoints[i].line_num == lineNum + 1) {
					bpToDelete = $scope.data.breakpoints[i];
					idxToDelete = i;
					break;
				}
			}
			if ( ! bpToDelete) {
				console.log("WARNING: No breakpoint to delete???");
				return;
			}
			KahunaData.remove(bpToDelete, function(data){
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:breakpoints' && modObj.ident === bpToDelete.ident) {
						$scope.data.breakpoints.splice(idxToDelete, 1);
					}
				}
			});
		}

		// Handle clicks to set/unset breakpoints
		kahuna.debug.codeEditor.on("guttermousedown", function(e){
			// Can't manipulate breakpoints if your account can't do JS debugging
			if (!kahuna.globals.currentAccountOptions[4] || kahuna.globals.currentAccountOptions[4].option_value != 'true') {
				alert('Sorry, this account is not authorized for debugging -- you cannot set or unset breakpoints.');
				return;
			}
			var target = e.domEvent.target;
			if (target.className.indexOf("ace_gutter-cell") == -1)
				return;
			if (!kahuna.debug.codeEditor.isFocused())
				return;
			if (e.clientX > 25 + target.getBoundingClientRect().left)
				return;

			// If there is already a breakpoint, take it off
			var row = e.getDocumentPosition().row;
			var bps = e.editor.session.getBreakpoints();
			if (bps[row]) {
				console.log('Deleting breakpoint');
				deleteBreakpoint(row);
				e.editor.session.clearBreakpoint(row);
			}
			else {
				console.log('Creating breakpoint');
				createBreakpoint(row);
				e.editor.session.setBreakpoint(row);
			}
			e.stop();
		});

		$scope.apiKeySelected = function() {

		};

		$scope.eventSelected = function() {
			if ( ! $scope.data.selectedEvent)
				return;
			kahuna.debug.codeEditor.setValue($scope.data.selectedEvent.code);

			KahunaData.query('admin:breakpoints', "eventhandler_ident=" + $scope.data.selectedEvent.ident, function(data){
				$scope.data.breakpoints = data;
				var bps = [];
				for (var i = 0; i < data.length; i++) {
					bps.push(data[i].line_num - 1);
				}
				kahuna.debug.codeEditor.getSession().setBreakpoints(bps);
			});
		};

		KahunaData.query('AllApiKeys', {pagesize: 100, filter: 'project_ident=' + $scope.currentProject.ident}, function(data){
			$scope.data.apiKeys = data;
			if (data.length == 0)
				return;
			$scope.data.selectedApiKey = data[0];
			$scope.apiKeySelected();
		});

		KahunaData.query('admin:eventhandlers', {pagesize: 100, filter: 'project_ident=' + $scope.currentProject.ident}, function(data){
			$scope.data.allEvents = data;
			if (data.length == 0)
				return;
			$scope.data.selectedEvent = data[0];
			$scope.eventSelected();
		});


		$scope.fetchRules = function(func) {
			// Fetch the rules for the selected table
			KahunaData.query('AllRules', "project_ident=" + $rootScope.currentProject.ident +
					" AND entity_name='" + $scope.data.selectedTable.name + "' AND prop4='javascript' and active=true", function(data){
				for (var i = 0; i < data.length; i++) {
					if ( !data[i].name)
						data[i].name = data[i].auto_name;
					if (data[i].name.length > 40)
						data[i].name = data[i].name.substring(0, 40) + "...";
				}
				var rulesByIdent = {};
				for (var i = 0; i < data.length; i++) {
					rulesByIdent[data[i].ident] = data[i];
				}

				if ($scope.$$phase) {
					$scope.data.rulesByTable[$scope.data.selectedTable.name] = rulesByIdent;
					$scope.data.rules = rulesByIdent;
				}
				else {
					$scope.$apply(function(){
						$scope.data.rulesByTable[$scope.data.selectedTable.name] = rulesByIdent;
						$scope.data.rules = rulesByIdent;
					});
				}

				if (data.length > 0) {
					$scope.data.selectedRule = kahuna.util.getFirstProperty(rulesByIdent);
					if (kahuna.debug.currentBreakpoint && kahuna.debug.currentBreakpoint.ruleTable == $scope.data.selectedTable.name)
						$scope.data.selectedRule = rulesByIdent[kahuna.debug.currentBreakpoint.ruleIdent];
					$scope.ruleSelected();
				}
				else {
					kahuna.debug.codeEditor.setValue('');
				}

				if (func)
					func();
			});
		}

		$scope.tableSelected = function() {
			if ( ! $scope.data.selectedTable) {
				$scope.data.rules = [];
				return;
			}
			var rules = $scope.data.rulesByTable[$scope.data.selectedTable.name];

			// If we already know the rules for this table
			if (rules) {
				$scope.data.rules = rules;
				$scope.data.selectedRule = kahuna.util.getFirstProperty(rules);
				if (kahuna.debug.currentBreakpoint)
					$scope.data.selectedRule = rules[kahuna.debug.currentBreakpoint.ruleIdent];
				$scope.ruleSelected();
				return;
			}

			$scope.fetchRules();
		};

		$scope.ruleSelected = function() {
			kahuna.debug.codeEditor.setValue($scope.data.selectedRule.rule_text1);

			KahunaData.query('admin:breakpoints', "rule_ident=" + $scope.data.selectedRule.ident, function(data){
				$scope.data.breakpoints = data;
				var bps = [];
				for (var i = 0; i < data.length; i++) {
					bps.push(data[i].line_num - 1);
				}
				kahuna.debug.codeEditor.getSession().setBreakpoints(bps);
			});

			if (kahuna.debug.currentBreakpoint && kahuna.debug.currentBreakpoint.ruleTable == $scope.data.selectedTable.name &&
					kahuna.debug.currentBreakpoint.ruleIdent == $scope.data.selectedRule.ident) {
				//console.log("Moving cursor to: " + kahuna.debug.currentBreakpoint.lineNum);
				kahuna.debug.codeEditor.getSession().getSelection().moveCursorTo(kahuna.debug.currentBreakpoint.lineNum - 1, 0);
				kahuna.debug.codeEditor.getSession().getSelection().selectLine();
			}
			else {
				kahuna.debug.codeEditor.getSession().getSelection().moveCursorFileStart();
			}
		};

		$scope.data.allTables = kahuna.meta.allTables;

		if (kahuna.debug.currentBreakpoint) {
			$scope.data.selectedTable = kahuna.meta.allTables[kahuna.debug.currentBreakpoint.ruleTable];
			$scope.data.debugVars = kahuna.util.jsonToTable(kahuna.debug.currentBreakpoint.data);
		}
		else {
			$scope.data.selectedTable = kahuna.meta.getFirstTable();
			$scope.data.debugVars = null;
		}
		$scope.tableSelected();

		// Show the values of variables for the current breakpoint
		function showVariables() {

			kahuna.util.currentVarId = 1;
			var varRows = "";
			for (var varName in kahuna.debug.currentBreakpoint.data) {
				if ( ! kahuna.debug.currentBreakpoint.data.hasOwnProperty(varName))
					continue;
				varRows += kahuna.util.jsonToTable(varName, kahuna.debug.currentBreakpoint.data[varName], null);
			}
			$("#DebugVarsTable tbody tr").remove(); // Clear up the treetable
			$("#DebugVarsTable").treetable({expandable: true}, true);
			$("#DebugVarsTable").treetable("loadBranch", null, $(varRows));
			$("#DebugVarsTable").treetable("collapseAll");

			// If a row is clicked, display the value
			$("#DebugVarsTable tbody").off("mousedown", "tr"); // Avoid multiple event listeners
			$("#DebugVarsTable tbody").on("mousedown", "tr", function() {
				$(".selected").not(this).removeClass("selected");
				$(this).toggleClass("selected");
				var cell = $(this).children()[1];
				var value = $(cell).html();
				if (value.substring(0, 15) == "<input readonly") {
					var input = $(cell).find("input")[0];
					console.log("Input is: " + input);
					value = $(input).val();
				}
				if (value == "&nbsp;" || value.match(/^&lt;\w+&gt;/) || value.substring(0, 6) == "array[")
					value = "";
				$("#VariableValue").val(value);
			});

			kahuna.debug.codeEditor.getSession().getSelection().moveCursorTo(kahuna.debug.currentBreakpoint.lineNum - 1, 0);
			kahuna.debug.codeEditor.getSession().getSelection().selectLine();
		}

		// This gets called when we get a WebSocket message from the server, after kahuna.debug.currentBreakpoint
		// has been set.
		$scope.$on('refreshBreakpoint', function() {

			if (! kahuna.debug.currentBreakpoint || kahuna.debug.currentBreakpoint.action == 'exit') {
				//console.log("Exiting frame");
				kahuna.debug.currentBreakpoint = null;
				kahuna.debug.codeEditor.getSession().getSelection().clearSelection();
				kahuna.debug.codeEditor.getSession().getSelection().selectLineStart();
				$("#DebugVarsTable tbody tr").remove(); // Clear up the treetable
				return;
			}
			else if (kahuna.debug.currentBreakpoint.action != 'break')
				console.log("Cannot refresh breakpoint: unknown action: " + kahuna.debug.currentBreakpoint.action);

			// We're on a breakpoint. First, select the correct table and rule, or event handler
			if (kahuna.debug.currentBreakpoint.eventHandlerIdent) {
				$scope.data.selectedLogicType = 'events';
				var theEvent = null;
				for (var i = 0; i < $scope.data.allEvents.length; i++) {
					if ($scope.data.allEvents[i].ident == kahuna.debug.currentBreakpoint.eventHandlerIdent) {
						theEvent = $scope.data.allEvents[i];
						break;
					}
				}
				$scope.data.selectedEvent = theEvent;
				$scope.eventSelected();
				showVariables();
			}
			else {
				$scope.data.selectedLogicType = 'rules';
				var tableName = kahuna.debug.currentBreakpoint.ruleTable;
				$scope.data.selectedTable = kahuna.meta.allTables[tableName];
				var rules = $scope.data.rulesByTable[tableName];
				if (rules) {
					$scope.data.rules = rules;
					$scope.data.selectedRule = kahuna.util.getFirstProperty(rules);
					if (kahuna.debug.currentBreakpoint)
						$scope.data.selectedRule = rules[kahuna.debug.currentBreakpoint.ruleIdent];
					$scope.ruleSelected();
					showVariables();
				}
				else {
					$scope.fetchRules(function(){
						showVariables();
					});
				}
			}
		});

		$scope.debugStep = function() {
			var msg = {
				action: "step"
			};
			if (kahuna.debug.socket)
				kahuna.debug.socket.send(JSON.stringify(msg));
		};

		$scope.debugContinue = function() {
			var msg = {
				action: "continue"
			};
			if (kahuna.debug.socket)
				kahuna.debug.socket.send(JSON.stringify(msg));
		};

		$scope.debugStop = function() {
			var msg = {
				action: "stop"
			};
			if (kahuna.debug.socket)
				kahuna.debug.socket.send(JSON.stringify(msg));
		};

		$scope.debugReleaseAll = function() {
			var msg = {
				action: "unfreezeAll"
			};
			if (kahuna.debug.socket)
				kahuna.debug.socket.send(JSON.stringify(msg));
		};
	}
};
