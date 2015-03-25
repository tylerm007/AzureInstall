// Handling of the rules pages.
// This contains the controllers for the rules list, and all the rule-specific pages.

kahuna.rules = {

	aceEditor: null,

	saveRule: function saveRule(scope, KahunaData, fun) {
		var wasActive = scope.data.currentRule.active;
		scope.data.currentRule.entity_name = scope.data.currentTable.name;
		KahunaData.update(scope.data.currentRule, function (data) {
			if (data.txsummary) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj["@metadata"].resource == "AllRules" && modObj.ident == scope.data.currentRule.ident) {
						scope.data.currentRule['@metadata'].checksum = modObj['@metadata'].checksum;
						scope.data.currentRule.auto_name = modObj.auto_name;
						if (wasActive && !modObj.active) {
							scope.data.currentRule.active = false;
							kahuna.util.warning('Rule was saved, but cannot be marked as active because it is incomplete.');
						}
						else {
							kahuna.util.info('Rule was saved');
						}
					}
				}
			}

			if (scope.data.currentRule.active) {
				fun && fun();
			}

			// Refresh versions
			setTimeout(scope.fetchRuleVersions, 1000);
		});
		scope.saveTopics();

		try { woopra.track('rule_updated'); } catch(e) { console.log('Woopra error: ' + e); }
	},

	saveAndCloseRule : function saveAndCloseRule(scope, KahunaData, location) {
		scope.data.currentRule.active = true;
		kahuna.rules.saveRule(scope, KahunaData, function () {
			kahuna.setLocation(scope, location, "/projects/" + scope.currentProject.ident + "/rules");
		});
	},

	createEditor: function createEditor(rule) {
		kahuna.rules.aceEditor = ace.edit("ruleJSCode");
		kahuna.rules.aceEditor.setTheme("ace/theme/xcode");
		kahuna.rules.aceEditor.getSession().setMode("ace/mode/javascript");
		kahuna.rules.aceEditor.setValue(rule.rule_text1);
		kahuna.rules.aceEditor.getSession().getSelection().moveCursorFileStart();
		// kahuna.rules.aceEditor.getSession().getDocument().on("change", function (e) {
		//     console.log("Event: " + e);
		// });
	},

	///////////////////////////////////////////////////////////////
	// Controllers

	AllRulesCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData, jqueryUI, Delta, Notices) {
		$rootScope.currentPage = 'rules';
		$rootScope.currentPageHelp = 'docs/logic-designer/business-logic';
		$scope.data = {};

		$scope.data.showTopics = localStorage['eslo-ld-rules-hideTopics'] == 'true' ? false : true;
		$scope.showTopicsClicked = function() {
			localStorage['eslo-ld-rules-hideTopics'] = $scope.data.showTopics ? false : true;
		};
		
		$scope.editTopic = function() {
			$rootScope.syncAction.topicEditor = {
					action: 'edit',
					topic: $scope.data.selectedTopic
				};
				$location.path('/projects');
		};

		var localStorageSearchName = 'eslo-ld-rules-search-' + $rootScope.currentProject.ident;

		$scope.data.searchText = localStorage[localStorageSearchName];
		if (!$scope.data.searchText) {
			$scope.data.searchText = null;
		}

		// kahuna.meta.getAllRules($rootScope.currentProject, null, function () {
		//     kahuna.putInScope('allRulesByTable', kahuna.meta.allRulesByTable);
		// });
		$scope.javascriptAllowed = kahuna.globals.fullJavascriptAllowed;
		$scope.javaAllowed = kahuna.globals.accountJavaAllowed;

		kahuna.meta.getRuleTypes(function () {
			kahuna.setInScope($scope, 'ruleTypes', kahuna.meta.ruleTypes);

			if ( !kahuna.globals.fullJavascriptAllowed) {
				$scope.javaRulesMessage = "Note: Javascript rules can be created or edited with strict limitations in this account." +
				"Full Javascript rules can be used only in the Professional edition of Espresso Logic.";
			}
			else {
				$scope.javaRulesMessage = "This account can define JavaScript rules without limitations.";
			}

			$scope.disabledRuleTypes = [];
			// $scope.disabledRuleTypes[0] = true; // Allocations disabled for now
			// if (!kahuna.globals.projectJavascriptAllowed && !kahuna.globals.projectJavaAllowed) {
			//     $scope.disabledRuleTypes[0] = true;
			//     $scope.disabledRuleTypes[2] = true;
			//     $scope.disabledRuleTypes[5] = true;
			//     $scope.data.selectedRuleType = kahuna.meta.ruleTypes['commit validation'];
			// }
			// else
			$scope.data.selectedRuleType = kahuna.meta.ruleTypes["event"];
		});

		$scope.data.allRulesByTopic = {};
		KahunaData.query('admin:topics', {
			pagesize : 1000,
			filter : 'project_ident=' + $scope.currentProject.ident
		}, function (data) {
			kahuna.applyFunctionInScope($scope, function () {
				$scope.data.allTopics = data;
				$scope.data.allTopicsByIdent = {};
				_.each(data, function(t) {
					$scope.data.allTopicsByIdent[t.ident] = t;
					if ( ! $scope.data.allRulesByTopic[t.ident]) {
						$scope.data.allRulesByTopic[t.ident] = [];
					}
				});
				if (localStorage['eslo-ld-rules-selectedTopic']) {
					$scope.data.selectedTopic = $scope.data.allTopicsByIdent[localStorage['eslo-ld-rules-selectedTopic']];
				}
				else if (data && data.length > 0) {
					$scope.data.selectedTopic = data[0];
				}
			});
		});

		$scope.ruleTopicClicked = function(topicIdent) {
			$scope.data.topicsTab = true;
			$scope.data.rulesTab = false;
			$scope.data.selectedTopic = $scope.data.allTopicsByIdent[topicIdent];
		};

		// $scope.disabledRuleTypes = [];
		// if ( !kahuna.globals.projectOptions.javascriptAllowed && !kahuna.globals.projectOptions.javaAllowed) {
		//     $scope.disabledRuleTypes.push('action', 'early action', 'commit action');
		// }

		$scope.searchRules = function searchRules(params) {
			var term = $scope.data.searchText;
			params = params || {};
			if (term && term.trim().length) {
				var filteredTerm = term.replace(/\W/g, ' ');
				var encTerm = escape(filteredTerm);
				var like = " like '%" + encTerm + "%' ";
				params.filter = "entity_name" + like + " or " +
					"attribute_name" + like + " or " +
					"rule_text1" + like + " or " +
					"rule_text2" + like + " or " +
					"rule_text3" + like + " or " +
					"name" + like + " or " +
					"auto_name" + like + " or " +
					"comments" + like;
			}
			kahuna.meta.getAllRules($rootScope.currentProject, params, function (allRulesByTable, nextUrl) {
				// Sort topics by topic name
				_.each(allRulesByTable, function(r, tblName) {
					_.each(r, function(r2) {
						r2.RuleTopics = _.sortBy(r2.RuleTopics, function(t) { return t.Topic.name; });
					});
				});
				// Sort rules by topic
				_.each(allRulesByTable, function(r, tblName) {
					_.each(r, function(r2) {
						_.each(r2.RuleTopics, function(t) {
							var perTopic = $scope.data.allRulesByTopic[t.topic_ident];
							if ( ! perTopic) {
								perTopic = [];
								$scope.data.allRulesByTopic[t.topic_ident] = perTopic;
							}
							perTopic.push(r2);
						});
					});
				});

				// Sort rules by topic and table
				$scope.data.allRulesByTopicAndTable = {};
				_.each(allRulesByTable, function(r, tblName) {
					_.each(r, function(r2) {
						_.each(r2.RuleTopics, function(t) {
							var perTopic = $scope.data.allRulesByTopicAndTable[t.topic_ident];
							if ( ! perTopic) {
								perTopic = {};
								$scope.data.allRulesByTopicAndTable[t.topic_ident] = perTopic;
							}
							var perTable = perTopic[tblName];
							if ( ! perTable) {
								perTable = [];
								perTopic[tblName] = perTable;
							}
							perTable.push(r2);
						});
					});
				});
				kahuna.putInScope('allRulesByTable', allRulesByTable);
				if (nextUrl) {
					kahuna.putInScope('nextUrl', nextUrl);
				}
				else {
					kahuna.removeFromScope('nextUrl');
				}
			});

			if ($scope.data.searchText) {
				localStorage[localStorageSearchName] = $scope.data.searchText;
			}
			else {
				localStorage.removeItem(localStorageSearchName);
			}
		};

		$scope.searchRules();

		$scope.clearSearchText = function() {
			$scope.data.searchText = null;
			localStorage.removeItem(localStorageSearchName);
			$scope.searchRules();
		};

		$scope.objectIsEmpty = function objectIsEmpty(obj) {
			return angular.equals({}, obj);
		};

		$scope.fetchMoreRules = function fetchMoreRules() {
			if ( ! $scope.nextUrl) {
				return;
			}
			$scope.searchRules({ nextUrl: $scope.nextUrl });
		};

		$scope.openNewRuleDialog = function openNewRuleDialog() {
			if ( ! kahuna.meta.getFirstTable()) {
				alert("You cannot create a new rule until you have defined an active database.");
				return;
			}
			$scope.ruleTypes = kahuna.meta.ruleTypes;
			$scope.tables = kahuna.meta.allTables;
			var firstTable = null;
			for (var name in kahuna.meta.allTables) {
				if (kahuna.meta.allTables.hasOwnProperty(name)) {
					firstTable = kahuna.meta.allTables[name];
					break;
				}
			}
			$scope.data.selectedRuleTable = firstTable;

			//the select input operating on $scope.data.selectedRuleTable belongs to another scope
			//this propagates the change back up to the RulesCtrl $scope object
			$scope.updateTableInRulesCtrl = function updateTableInRulesCtrl(selectedTable) {
				$scope.data.selectedRuleTable = selectedTable;
			};

			$scope.currentRule = {};
			var options = {
				modal: true,
				buttons: {
					OK: function OK() {
						$scope.currentRule.ruletype_ident = $scope.data.selectedRuleType.ident;
						if ($scope.currentRule.ruletype_ident == 3 ||
								$scope.currentRule.ruletype_ident == 5 ||
								$scope.currentRule.ruletype_ident == 6 ||
								$scope.currentRule.ruletype_ident == 7 ||
								$scope.currentRule.ruletype_ident == 8 ||
								$scope.currentRule.ruletype_ident == 9 ||
								$scope.currentRule.ruletype_ident == 10 ||
								$scope.currentRule.ruletype_ident == 13)
							$scope.currentRule.prop4 = 'javascript';
						$scope.currentRule.entity_name = $scope.data.selectedRuleTable.name;
						$scope.currentRule.project_ident = $scope.currentProject.ident;
						$scope.currentRule.active = false;
						console.log($scope.currentRule);
						KahunaData.create("AllRules", $scope.currentRule, function (data) {
							var newRule = null;
							for (var i = 0; i < data.txsummary.length; i++) {
								var modObj = data.txsummary[i];
								if (modObj["@metadata"].resource == "AllRules") {
									modObj.RuleType = kahuna.meta.ruleTypes[modObj.ruletype_ident];
									kahuna.meta.allRulesById[modObj.ident] = modObj;
									kahuna.meta.addRule(modObj);
									if (modObj["@metadata"].verb == "INSERT")
										newRule = modObj;
								}
							}
							if (newRule) {
								$location.path("/projects/" + $scope.currentProject.ident + "/rule/" + newRule.ident);
								kahuna.logEvalProgress("created rule");
							}
						});
						$(this).dialog("close");
					},
					Cancel: function Cancel() {
						$(this).dialog("close");
					}
				}
			};
			jqueryUI.wrapper('#newRuleDialog', 'dialog', options);
		};

		function getRuleTypeName(rule) {
			switch(rule.ruletype_ident) {
				case 1: return "Sum";
				case 2: return "Count";
				case 3: return "Formula";
				case 4: return "Parent copy";
				case 5: return "Validation";
				case 6: return "Commit validation";
				case 7: return "Event";
				case 8: return "Early event";
				case 9: return "Commit event";
				case 10: return "Allocation";
				case 11: return "Minimum";
				case 12: return "Maximum";
				case 13: return "Managed Parent";
				default: return "Unknown rule type (" + rule.ruletype_ident + ")";
			}
		}

		// Generate a readable name for a rule -- used to display the list of rules
		$scope.getRuleName = function getRuleName(rule) {
			var name = rule.name;
			if (name) {
				name = getRuleTypeName(rule) + ": " + name;  // precede user-specified name with rule type
			}
			else {
				if ( ! rule.auto_name)
					name = "New " + getRuleTypeName(rule);
				else
					name = rule.auto_name;
			}
			if (rule.active)
				return name;
			return name + " (inactive)";
		};

		$scope.getRuleClass = function getRuleClass(rule) {
			return rule.active ? "Rule" : "RuleInactive";
		};
	},

	RuleEditCtrl : function ($scope, $http, $resource, $routeParams, $location, KahunaData, Delta, Notices, $rootScope) {
		$scope.data = {};
		$scope.ruleId = $routeParams.ruleId;
		$scope.data.currentRule = kahuna.meta.allRulesById[$routeParams.ruleId];
		$scope.showAttribsHelp = false;
		$scope.codeSizeText = "Bigger code";

		$scope.javascriptAllowed = kahuna.globals.fullJavascriptAllowed;
		$scope.javaAllowed = kahuna.globals.accountJavaAllowed;
		// if ( !kahuna.globals.fullJavascriptAllowed && !kahuna.globals.accountJavaAllowed)
		//     $scope.codeDisallowed = true;

		$scope.javaRulesMessage = '';
		if ( !kahuna.globals.fullJavascriptAllowed) {
			$scope.javaRulesMessage = "Note: JavaScript rules can be created or edited with strict limitations in this account.<br/>" +
			"Full JavaScript rules can be used only in the Professional edition of Espresso Logic.";
		}
		else {
			$scope.javaRulesMessage = "This account can define JavaScript rules without limitations.";
		}

		$scope.switchCodeSize = function switchCodeSize() {
			if ($scope.codeSizeText == "Bigger code") {
				$("#ruleJSCode").css('height', '40em');
				$scope.codeSizeText = "Smaller code";
				kahuna.rules.aceEditor.resize(true);
			}
			else {
				$scope.codeSizeText = "Bigger code";
				$("#ruleJSCode").css('height', '15em');
				kahuna.rules.aceEditor.resize(true);
			}
		};

		var setTableDetails = function setTableDetails(data) {
			if ( ! data || !data.columns) {
				alert('This rule is defined for a non-existent table: ' + $scope.data.currentRule.entity_name +
						". Suggestion: select the appropriate table from the drop-down and save the rule.");
				return;
			}
			$scope.data.currentTable = data;
		};

		$scope.tableSelected = function tableSelected() {
			var tableName = $scope.data.selectedTable.name;
			kahuna.meta.getTableDetails(tableName, function (data) {
				if ( ! $scope.$$phase) {
					$scope.$apply(function () {
						setTableDetails(data);
					});
				}
				else {
					setTableDetails(data);
				}
			});
		};

		// Insert text into an Ace editor
		function injectText(e, v) {
			kahuna.rules.aceEditor.insert(v);
			kahuna.rules.aceEditor.focus();
		}

		function injectTextarea(e, v) {
			var e_dom = document.getElementById(e);
			e_dom.focus();
			if (document.selection) {
				sel = document.selection.createRange();
				sel.text = v;
				e_dom.selectionStart = sel.endOffset + v.length;
				e_dom.selectionEnd = e_dom.selectionStart;
			}
			else if (e_dom.selectionStart || e_dom.selectionStart == "0") {
				var t_start = e_dom.selectionStart;
				var t_end = e_dom.selectionEnd;
				var val_start = e_dom.value.substring(0,t_start);
				var val_end = e_dom.value.substring(t_end, e_dom.value.length);
				e_dom.value = val_start + v + val_end;
				e_dom.selectionStart = t_end + v.length;
				e_dom.selectionEnd = e_dom.selectionStart;
			} else {
				e_dom.value += v;
			}
			$scope.data.currentRule.rule_text1 = e_dom.value;
		}

		// User selected an attribute: insert attribute name in expression and reset select
		$scope.insertAttributeSelected = function insertAttributeSelected() {
			injectText("expressionText", "row." + $scope.data.insertAttrib);
			$scope.data.insertAttrib = null;
		};

		// User selected an attribute for an aggregate qualification -- no row. prefix
		$scope.insertAttributeSelectedTextarea = function insertAttributeSelectedTextarea() {
			injectTextarea("expressionText", $scope.data.insertAttrib);
			$scope.data.insertAttrib = null;
		};

		$scope.parentSelected = function parentSelected() {
			if ( ! $scope.data.selectedParent)
				return;
			kahuna.meta.getTableDetails($scope.data.selectedParent.parent_table, function (data) {
				if ( ! $scope.$$phase)
					$scope.$apply(function () {
						$scope.data.parentTableDetails = data;
						$scope.data.insertParentAttrib = null;
					});
				else {
					$scope.data.parentTableDetails = data;
					$scope.data.insertParentAttrib = null;
				}
			});
		};

		// Note: despite the name, the attribute selected may be a child attribute in the case of aggregate qualifications
		$scope.parentAttributeSelected = function parentAttributeSelected() {
			injectText("expressionText", "row." + $scope.data.selectedParent.name + "." + $scope.data.insertParentAttrib);
			$scope.data.selectedParent = null;
			$scope.data.insertParentAttrib = null;
		};

		$scope.tables = kahuna.meta.allTables;
		if (kahuna.meta.allTables[$scope.data.currentRule.entity_name]) {
			$scope.data.selectedTable = kahuna.meta.allTables[$scope.data.currentRule.entity_name];
			$scope.tableSelected();
		}
		else {
			alert('This rule is defined for a non-existent table: ' + $scope.data.currentRule.entity_name +
				". Suggestion: select the appropriate table from the drop-down and save the rule.");
		}

		$scope.saveRule = function saveRule() {
			Delta.reset();
			kahuna.rules.saveRule($scope, KahunaData);
		};

		$scope.saveAndCloseRule = function saveAndCloseRule() {
			kahuna.rules.saveAndCloseRule($scope, KahunaData, $location);
			Delta.reset();
		};

		$scope.deleteRule = function deleteRule() {
			if ( ! confirm("Delete this rule?"))
				return;
			KahunaData.remove($scope.data.currentRule, function (data) {
				if (data.txsummary.length > 0) {
					kahuna.meta.removeRule(data.txsummary[0]);
					kahuna.util.info('Rule was deleted');
					$location.path("/projects/" + $scope.currentProject.ident + "/rules");
				}
				else
					alert('Error: No delete was performed');
			});
			Delta.reset();
		};

		// Rule versions
		$scope.fetchRuleVersions = function fetchRuleVersions() {
			kahuna.meta.getRuleVersions($scope.data.currentRule.ident, function(data) {
				_.each(data, function(v) {
					v.formattedDate = (new Date(v.ts)).format();
				});
				kahuna.applyFunctionInScope($scope, function() {
					$scope.ruleVersions = data;
				});
			});
		};
		$scope.fetchRuleVersions();

		$scope.ruleVersionSelected = function ruleVersionSelected(version) {
			console.log('Version selected: ' + version);
			kahuna.applyFunctionInScope($scope, function() {
				$scope.data.currentRule.entity_name = version.entity_name;
				$scope.data.selectedTable = $scope.tables[version.entity_name];
				$scope.tableSelected();
				$scope.data.currentRule.attribute_name = version.attribute_name;
				$scope.data.currentRule.prop1 = version.prop1;
				$scope.data.currentRule.prop2 = version.prop2;
				$scope.data.currentRule.prop3 = version.prop3;
				$scope.data.currentRule.prop4 = version.prop4;
				$scope.data.currentRule.prop5 = version.prop5;
				$scope.data.currentRule.rule_text1 = version.rule_text1;
				$scope.data.currentRule.rule_text2 = version.rule_text2;
				$scope.data.currentRule.rule_text3 = version.rule_text3;
				$scope.data.currentRule.rule_text4 = version.rule_text4;
				$scope.data.currentRule.rule_text5 = version.rule_text5;
				$scope.data.currentRule.predicate = version.predicate;
				$scope.data.currentRule.name = version.name;
				$scope.data.currentRule.auto_name = version.auto_name;
				$scope.data.currentRule.verbs = version.verbs;
				$scope.data.currentRule.comments = version.comments;
				kahuna.rules.aceEditor.setValue(version.rule_text1);
				kahuna.util.info("The version you selected has been restored; don't forget to save if you want to keep this.");
			});
		};

		///////////////////////////////////////////////////
		// Topics
		$scope.data.allTopics = [];
		$scope.data.allTopicsByIdent = {};
		$scope.data.ruleTopics = [];
		$scope.data.ruleTopicsByTopicIdent = {};

		KahunaData.query('admin:topics', {
			pagesize : 1000,
			filter : 'project_ident=' + $scope.currentProject.ident
		}, function (data) {
			kahuna.applyFunctionInScope($scope, function () {
				$scope.data.allTopics = data;
				for (var i = 0; i < data.length; i++) {
					$scope.data.allTopicsByIdent[data[i].ident] = data[i];
				}

				// Build an array of all the topics associated with this rule
				KahunaData.query('admin:rule_topics', {
					pagesize : 1000,
					filter : 'rule_ident=' + $scope.data.currentRule.ident
				}, function (data2) {
					data2 = _.sortBy(data2, function(t) {
						return $scope.data.allTopicsByIdent[t.topic_ident].name;
					});
					kahuna.applyFunctionInScope($scope, function () {
						$scope.data.originalRuleTopics = data2;
						for (var i = 0; i < data2.length; i++) {
							// If this is a duplicate, delete it
							if ($scope.data.ruleTopicsByTopicIdent[data2[i].topic_ident]) {
								KahunaData.remove(data2[i]);
							}
							else {
								$scope.data.ruleTopics.push($scope.data.allTopicsByIdent[data2[i].topic_ident]);
								$scope.data.ruleTopicsByTopicIdent[data2[i].topic_ident] = data2[i];
							}
						}
					});
				});
			});
		});


//		$scope.addTopic = function() {
//			if ( !$scope.data.allTopics || $scope.data.allTopics.length == 0) {
//				alert('You cannot add a topic because there is none. You can create one by going to the Project page, Topics tab.');
//				return;
//			}
//			var newRuleTopic = {
//					topic_ident: $scope.data.allTopics[0].ident,
//					rule_ident: $scope.data.currentRule.ident
//				};
//
//				KahunaData.create("RuleTopics", newRuleTopic, function (data) {
//					kahuna.applyFunctionInScope($scope, function () {
//						for (var i = 0; i < data.txsummary.length; i++) {
//							var topic = data.txsummary[i];
//							if (topic['@metadata'].resource === 'RuleTopics' && topic['@metadata'].verb === 'INSERT') {
//								$scope.data.ruleTopics.push(topic);
//							}
//						}
//					});
//					kahuna.util.info("Added topic");
//				});
//		};

		$scope.testStyle = {
			'background-color': '#FF0000'
		};

		$scope.topicClicked = function(evt) {
			console.log('topicClicked: ' + evt);
		};

		$scope.saveTopics = function() {
			// First, any new topics?
			_.each($scope.data.ruleTopics, function(t) {
				if ( ! _.find($scope.data.originalRuleTopics, function(ort) { return ort.topic_ident == t.ident; })) {
					var newRuleTopic = {
						rule_ident: $scope.data.currentRule.ident,
						topic_ident: t.ident
					};
					KahunaData.create("admin:rule_topics", newRuleTopic, function (data) {
						kahuna.applyFunctionInScope($scope, function () {
							for (var i = 0; i < data.txsummary.length; i++) {
								var rt = data.txsummary[i];
								if (rt['@metadata'].resource === 'admin:rule_topics' &&
										rt['@metadata'].verb === 'INSERT') {
									$scope.data.originalRuleTopics.push(rt);
								}
							}
						});
					});
				}
			});

			// Any topics removed?
			_.each($scope.data.originalRuleTopics, function(ort, ortIdx) {
				if ( ! _.find($scope.data.ruleTopics, function(rt) { return ort.topic_ident == rt.ident; })) {
					KahunaData.remove(ort);
					$scope.data.originalRuleTopics.splice(ortIdx, 1);
				}
			});
		};
	},

	RuleConstraintCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData, Delta, Notices) {
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'Constraint', localStorage['eslo-ld-learn-complete']);
		$scope.$on('$locationChangeStart', function (event, next, current) {
			console.log($location.path());
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					// no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					// unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						// save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						// Delta.scope.$apply();
						$location.path(path);
					});
				});
			}
		});
		$scope.$on('controllerSave', function () {
			Delta.reset();
		});

		$scope.saveRule = function saveRule() {
			if ($scope.commitConstraint)
				$scope.data.currentRule.ruletype_ident = 6;
			else
				$scope.data.currentRule.ruletype_ident = 5;
			if ($scope.data.currentRule.prop4 == 'javascript') {
				var code = kahuna.rules.aceEditor.getValue();
				if (!code.match(/\breturn\b/g)) {
					$scope.data.currentRule.active = false;
					kahuna.util.warning('This validation does not seem to return anything. All validations must return a boolean value.');
				}
				$scope.data.currentRule.rule_text1 = code;
			}
			kahuna.rules.saveRule($scope, KahunaData);
			$scope.$broadcast('controllerSave');
		};
		$scope.saveAndCloseRule = function saveAndCloseRule() {
			if ($scope.commitConstraint) {
				$scope.data.currentRule.ruletype_ident = 6;
			}
			else {
				$scope.data.currentRule.ruletype_ident = 5;
			}
			$scope.data.currentRule.active = true;
			var code = kahuna.rules.aceEditor.getValue();
			if ($scope.data.currentRule.prop4 == 'javascript') {
				$scope.data.currentRule.rule_text1 = code;
			}

			if (!code.match(/\breturn\b/g)) {
				kahuna.util.warning('This validation does not seem to return anything. All validations must return a boolean value.');
				$scope.data.currentRule.active = false;
				kahuna.rules.saveRule($scope, KahunaData);
			}
			else {
				kahuna.rules.saveRule($scope, KahunaData, function () {
					kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
				});
			}
			$scope.$broadcast('controllerSave');
		};

		$scope.commitConstraint = ($scope.data.currentRule.ruletype_ident == 6);

		if ( ! $scope.data.currentRule.prop4) {
			$scope.data.currentRule.prop4 = '';
		}

		// function createEditor() {
		//     kahuna.rules.aceEditor = ace.edit("ruleJSCode");
		//     kahuna.rules.aceEditor.setTheme("ace/theme/xcode");
		//     kahuna.rules.aceEditor.getSession().setMode("ace/mode/javascript");
		//     kahuna.rules.aceEditor.setValue($scope.data.currentRule.rule_text1);
		//     kahuna.rules.aceEditor.getSession().getSelection().moveCursorFileStart();
		// }

		if ($('#ruleJSCode').length) {
			// if ($scope.data.currentRule.prop4 == 'javascript') {
			kahuna.rules.createEditor($scope.data.currentRule);
		}

		// $scope.codeTypeChanged = function () {
		//     if ($scope.data.currentRule.prop4 == 'javascript') {
		//         createEditor($scope.data.currentRule);
		//     }
		// };
	},

	RuleSumCtrl: function ($rootScope, $scope, $http, $resource, $location, $routeParams, KahunaData, Delta, Notices) {
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'Sum', localStorage['eslo-ld-learn-complete']);
		$scope.$on('$locationChangeStart', function (event, next, current) {
			console.log($location.path());
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					// no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					// unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						// save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						// Delta.scope.$apply();
						$location.path(path);
					});
				});
			}
		});
		$scope.$on('controllerSave', function () {
			Delta.reset();
		});
		$scope.saveRule = function saveRule() {
			$scope.data.currentRule.rule_text1 = $scope.selectedChildRole.name;
			kahuna.rules.saveRule($scope, KahunaData);
			$scope.$broadcast('controllerSave');
		};
		$scope.saveAndCloseRule = function saveAndCloseRule() {
			$scope.data.currentRule.rule_text1 = $scope.selectedChildRole.name;
			$scope.data.currentRule.active = true;
			kahuna.rules.saveRule($scope, KahunaData, function () {
				kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
			});
			$scope.$broadcast('controllerSave');
		};

		$scope.childRoleSelected = function childRoleSelected() {
			kahuna.meta.getTableDetails($scope.selectedChildRole.child_table, function (data) {
					var numericColumns = data.columns.filter(function f(el, index, array) {
						return 'number' === el.generic_type;
					});
					kahuna.setInScope($scope, 'childRoleAttributes', numericColumns);
					kahuna.setInScope($scope, 'allChildAttributes', data.columns);
			});
		};

		kahuna.meta.getTableDetails($scope.data.currentRule.entity_name, function (data) {
			kahuna.setInScope($scope, 'currentRuleTable', data);
			if (!data || !data.children || !data.children.length) {
				kahuna.setInScope($scope, 'selectedChildRole', null);
			}
			else {
				for (var i = 0; i < data.children.length; i++) {
					if (data.children[i].name == $scope.data.currentRule.rule_text1) {
						kahuna.setInScope($scope, 'selectedChildRole', data.children[i]);
						$scope.childRoleSelected();
						break;
					}
				}
			}
		});
	},

	RuleCountCtrl: function ($rootScope, $scope, $http, $resource, $location, $routeParams, KahunaData, Delta, Notices) {
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'Count', localStorage['eslo-ld-learn-complete']);
		$scope.$on('$locationChangeStart', function (event, next, current) {
			console.log($location.path());
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					//no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					//unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						//save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						//Delta.scope.$apply();
						$location.path(path);
					});
				});
			}
		});
		$scope.$on('controllerSave', function () {
			Delta.reset();
		});
		$scope.saveRule = function () {
			$scope.data.currentRule.rule_text1 = $scope.selectedChildRole.name;
			kahuna.rules.saveRule($scope, KahunaData);
			$scope.$broadcast('controllerSave');
		};
		$scope.saveAndCloseRule = function () {
			$scope.data.currentRule.rule_text1 = $scope.selectedChildRole.name;
			$scope.data.currentRule.active = true;
			kahuna.rules.saveRule($scope, KahunaData, function () {
				kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
			});
			$scope.$broadcast('controllerSave');
		};
		kahuna.meta.getTableDetails($scope.data.currentRule.entity_name, function (data) {
			kahuna.setInScope($scope, 'currentRuleTable', data);
			try {
			for (var i = 0; i < data.children.length; i++) {
				if (data.children[i].name == $scope.data.currentRule.rule_text1) {
					kahuna.setInScope($scope, 'selectedChildRole', data.children[i]);
					kahuna.setInScope($scope, 'allChildAttributes', data.columns);
				}
			}
			} catch(e){
				console.log('This table or relationship did not exist');
			}
		});
	},

	RuleActionCtrl: function ($rootScope, $scope, $http, $resource, $location, $routeParams, KahunaData, Delta, Notices, $modal) {
		//take snapshots
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'Action', localStorage['eslo-ld-learn-complete']);
		if ( ! localStorage['eslo-ld-event-info'] && !kahuna.learning.rulesUrls) {
			$modal.open({
				templateUrl: 'help/rule/ActionInfo.html',
				controller: function($scope, $modalInstance) {
					$scope.ok = function() {
						$modalInstance.close();
					};
				},
				size: 'lg'
			});
			localStorage['eslo-ld-event-info'] = true;
		}
		$scope.$on('$locationChangeStart', function (event, next, current) {
			console.log($location.path());
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					//no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					//unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						//save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						//Delta.scope.$apply();
						$location.path(path);
					});
				});
			}
		});
		$scope.saveRule = function () {
			if ($scope.data.currentRule.prop4 == 'javascript') {
				$scope.data.currentRule.rule_text1 = kahuna.rules.aceEditor.getValue();
			}
			var verbs = "";
			if ($scope.data.verbInsert) verbs += "INSERT,";
			if ($scope.data.verbUpdate) verbs += "UPDATE,";
			if ($scope.data.verbDelete) verbs += "DELETE,";
			$scope.data.currentRule.verbs = verbs;
			kahuna.rules.saveRule($scope, KahunaData);
			Delta.reset();
		};
		$scope.saveAndCloseRule = function () {
			$scope.data.currentRule.active = true;
			if ($scope.data.currentRule.prop4 == 'javascript')
				$scope.data.currentRule.rule_text1 = kahuna.rules.aceEditor.getValue();
			var verbs = "";
			if ($scope.data.verbInsert) verbs += "INSERT,";
			if ($scope.data.verbUpdate) verbs += "UPDATE,";
			if ($scope.data.verbDelete) verbs += "DELETE,";
			$scope.data.currentRule.verbs = verbs;
			kahuna.rules.saveRule($scope, KahunaData, function () {
				kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
			});
			Delta.reset();
		};

		if ( ! $scope.data.currentRule.prop4)
			$scope.data.currentRule.prop4 = '';

		if ($scope.data.currentRule.prop2 == 'async')
			$scope.data.async = true;

		if ($scope.data.currentRule.prop4 == 'javascript') {
			kahuna.rules.createEditor($scope.data.currentRule);
		}

		if ( ! $scope.data.currentRule.verbs) {
			$scope.data.currentRule.verbs = "";
		}
		$scope.data.verbInsert = $scope.data.currentRule.verbs.indexOf("INSERT") > -1;
		$scope.data.verbUpdate = $scope.data.currentRule.verbs.indexOf("UPDATE") > -1;
		$scope.data.verbDelete = $scope.data.currentRule.verbs.indexOf("DELETE") > -1;

		$scope.codeTypeChanged = function () {
			if ($scope.data.currentRule.prop4 == 'javascript') {
				kahuna.rules.createEditor($scope.data.currentRule);
			}
		};

		$scope.asyncChanged = function () {
			$scope.data.currentRule.prop2 = $scope.data.async ? 'async' : null;
			Delta.reset();
		};
	},

	RuleFormulaCtrl: function ($rootScope, $scope, $http, $resource, $location, $routeParams, KahunaData, Delta, Notices) {
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'Formula', localStorage['eslo-ld-learn-complete']);
		$scope.$on('$locationChangeStart', function (event, next, current) {
			console.log($location.path());
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					// no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					// unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						// save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						//Delta.scope.$apply();
						$location.path(path);
					});
				});
			}
		});
		$scope.$on('controllerSave', function () {
			Delta.reset();
		});
		$scope.saveRule = function () {
			if ($scope.data.currentRule.prop4 == 'javascript') {
				var code = kahuna.rules.aceEditor.getValue();
				$scope.data.currentRule.rule_text1 = code;
				if (!code.match(/\breturn\b/g)) {
					$scope.data.currentRule.active = false;
					kahuna.util.warning('This formula does not seem to return anything. All formula must return either null, or a value.');
				}
			}
			kahuna.rules.saveRule($scope, KahunaData);
			$scope.$broadcast('controllerSave');
		};
		$scope.saveAndCloseRule = function () {
			$scope.data.currentRule.active = true;
			var code = kahuna.rules.aceEditor.getValue();
			if ($scope.data.currentRule.prop4 == 'javascript') {
				$scope.data.currentRule.rule_text1 = code;
			}
			if (!code.match(/\breturn\b/g)) {
				$scope.data.currentRule.active = false;
				kahuna.util.warning('This formula does not seem to return anything. All formula must return either null, or a value.');
				kahuna.rules.saveRule($scope, KahunaData);
			}
			else {
				kahuna.rules.saveRule($scope, KahunaData, function () {
					kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
				});
			}
			$scope.$broadcast('controllerSave');
		};

		if ( ! $scope.data.currentRule.prop4)
			$scope.data.currentRule.prop4 = '';

		if ($scope.data.currentRule.prop4 == 'javascript') {
			kahuna.rules.createEditor($scope.$parent.data.currentRule);
		}

		$scope.codeTypeChanged = function () {
			if ($scope.data.currentRule.prop4 == 'javascript') {
				kahuna.rules.createEditor($scope.data.currentRule);
			}
		};
	},

	RuleParentCopyCtrl: function ($rootScope, $scope, $http, $resource, $location, $routeParams, KahunaData, Delta, Notices) {
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'ParentCopy', localStorage['eslo-ld-learn-complete']);
		$scope.$on('$locationChangeStart', function (event, next, current) {
			console.log($location.path());
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					// no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					// unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						// save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						$location.path(path);
					});
				});
			}
		});
		$scope.$on('controllerSave', function () {
			Delta.reset();
		});

		$scope.saveRule = function () {
			$scope.data.currentRule.rule_text1 = $scope.selectedParentRole.name;
			$scope.data.currentRule.rule_text2 = $scope.selectedParentColumn.name;
			kahuna.rules.saveRule($scope, KahunaData);
			$scope.$broadcast('controllerSave');
		};

		$scope.saveAndCloseRule = function () {
			$scope.data.currentRule.rule_text1 = $scope.selectedParentRole.name;
			$scope.data.currentRule.rule_text2 = $scope.selectedParentColumn.name;
			$scope.data.currentRule.active = true;
			kahuna.rules.saveRule($scope, KahunaData, function () {
				kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
			});
			$scope.$broadcast('controllerSave');
		};

		$scope.parentRoleSelected = function () {
			kahuna.meta.getTableDetails($scope.selectedParentRole.parent_table, function (data) {
					kahuna.setInScope($scope, 'parentRoleAttributes', data.columns);
					for (var i = 0; i < data.columns.length; i++) {
						if (data.columns[i].name == $scope.data.currentRule.rule_text2) {
							kahuna.setInScope($scope, 'selectedParentColumn', data.columns[i]);
							break;
						}
					}
			});
		};

		kahuna.meta.getTableDetails($scope.data.currentRule.entity_name, function (data) {
			kahuna.setInScope($scope, 'currentRuleTable', data);

			// May be null if table was dropped
			if (data.parents) {
				for (var i = 0; i < data.parents.length; i++) {
					if (data.parents[i].name == $scope.data.currentRule.rule_text1) {
						kahuna.setInScope($scope, 'selectedParentRole', data.parents[i]);
						$scope.parentRoleSelected();
						break;
					}
				}
			}
		});
	},

	RuleMinMaxCtrl : function ($rootScope, $scope, $http, $resource, $location, $routeParams, KahunaData, Delta, Notices) {
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'MinMax', localStorage['eslo-ld-learn-complete']);
		$scope.$on('$locationChangeStart', function (event, next, current) {
			console.log($location.path());
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					// no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					// unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						// save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						$location.path(path);
					});
				});
			}
		});

		$scope.$on('controllerSave', function () {
			Delta.reset();
		});

		$scope.ruleType = $scope.data.currentRule.ruletype_ident == 11 ? 'Minimum' : 'Maximum';
		$scope.saveRule = function () {
			$scope.data.currentRule.rule_text1 = $scope.selectedChildRole.name;
			kahuna.rules.saveRule($scope, KahunaData);
			$scope.$broadcast('controllerSave');
		};
		$scope.saveAndCloseRule = function () {
			$scope.data.currentRule.rule_text1 = $scope.selectedChildRole.name;
			$scope.data.currentRule.active = true;
			kahuna.rules.saveRule($scope, KahunaData, function () {
				kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
			});
			$scope.$broadcast('controllerSave');
		};

		$scope.childRoleSelected = function () {
			kahuna.meta.getTableDetails($scope.selectedChildRole.child_table, function (data) {
					var numericColumns = data.columns.filter(function f(el, index, array) {
						return 'number' === el.generic_type;
					});
					kahuna.setInScope($scope, 'childRoleAttributes', numericColumns);
			});
		};

		kahuna.meta.getTableDetails($scope.data.currentRule.entity_name, function (data) {
			kahuna.setInScope($scope, 'currentRuleTable', data);
			for (var i = 0; i < data.children.length; i++) {
				if (data.children[i].name == $scope.data.currentRule.rule_text1) {
					kahuna.setInScope($scope, 'selectedChildRole', data.children[i]);
					$scope.childRoleSelected();
					break;
				}
			}
		});
	},

	RuleManagedParentCtrl : function ($rootScope, $scope, $http, $resource, $location, $routeParams, KahunaData, Delta, Notices) {
		Delta.put($scope).snapshot('data.currentRule');
		$rootScope.helpDialog('rule', 'ManagedParent', localStorage['eslo-ld-learn-complete']);
		$scope.$on('$locationChangeStart', function (event, next, current) {
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review().then(function () {
					// no changes, resume navigation
					$location.path(path);
				})['catch'](function (scope) {
					// unsaved changes
					Delta.reviewed = false;
					Notices.confirmUnsaved().then(function (save) {
						// save changes and resume navigation
						if (save) {
							Delta.scope.saveRule();
						}
						$location.path(path);
					});
				});
			}
		});
		$scope.$on('controllerSave', function () {
			Delta.reset();
		});
		kahuna.rules.createEditor($scope.data.currentRule);

		$scope.saveRule = function () {
			$scope.data.currentRule.rule_text1 = kahuna.rules.aceEditor.getValue();
			$scope.data.currentRule.rule_text2 = $scope.selectedParentRole.name;
			kahuna.rules.saveRule($scope, KahunaData);
			$scope.$broadcast('controllerSave');
		};
		$scope.saveAndCloseRule = function () {
			$scope.data.currentRule.rule_text1 = kahuna.rules.aceEditor.getValue();
			$scope.data.currentRule.rule_text2 = $scope.selectedParentRole.name;
			$scope.data.currentRule.active = true;
			kahuna.rules.saveRule($scope, KahunaData, function () {
				kahuna.setLocation($scope, $location, "/projects/" + $scope.currentProject.ident + "/rules");
			});
			$scope.$broadcast('controllerSave');
		};

		kahuna.meta.getTableDetails($scope.data.currentRule.entity_name, function (data) {
			console.log('Setting currentRuleTable now');
			kahuna.setInScope($scope, 'currentRuleTable', data);
			// $scope.data.currentRuleTable = data;
			for (var i = 0; i < data.parents.length; i++) {
				if (data.parents[i].name == $scope.data.currentRule.rule_text2) {
					kahuna.setInScope($scope, 'selectedParentRole', data.parents[i]);
					break;
				}
			}
		});
	}
};
