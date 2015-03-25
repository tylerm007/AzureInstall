// uses http://bootstraptour.com/
// width: http://stackoverflow.com/questions/19448902/changing-the-width-of-bootstrap-popover

kahuna.learning = {

	LearningCtrl: function ($scope, $rootScope, $routeParams, $location, $timeout, KahunaData) {

		$rootScope.currentPage = 'learning';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication#TOC-Authentication-Provider';

		//////////////////////////////////////////////////////////////////////////////////////////
		// Templates

		$scope.stepTemplateStart = "<div class='popover tour'>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='btn btn-primary' data-role='next' id='tour-next-button'>Next &#9654;</button>" +
			"</div>" +
		"</div>";
		$scope.stepTemplateInitial = "<div class='popover tour'>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='btn btn-primary' data-role='next' id='tour-next-button'>Next &#9654;</button>" +
				"<span class='pull-right' style='font-size: 7pt; color: #C0C0C0; margin: 10px; cursor: pointer;' " +
					"onclick=\"angular.element(document.getElementById('learningDiv')).scope().skipLearningGoals()\">I've already done this tour</span>" +
			"</div>" +
		"</div>";
		$scope.stepTemplateEnd = "<div class='popover tour'>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='btn btn-primary' data-role='end'>Done</button>" +
			"</div>" +
		"</div>";
		$scope.stepTemplateSingle = "<div class='popover tour'>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='btn btn-primary' data-role='end'>Done</button>" +
			"</div>" +
		"</div>";

		//run before a tour, tours may start if the return value evaluates to true
		$scope.preTour = function preTour(params) {
			if ($(".tour-backdrop").length) {
				return false;
			}
			return true;
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal 1 - connect to the DB

		$scope.startTourConnect = function startTourConnect() {
			if ($rootScope.currentUserName == 'sa')
				return;
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var steps = [
				{
					title: "delay",
					element: "#projectSelect",
					template: "<div style=\"display: hidden\"></div>",
					duration: 1000,
					onShow: function () {
						$('#projectSelect').dropdown('toggle');
					}
				},
				{
					element: "#projectSelect",
					title: "Enterprise API Creation",
					placement: 'left',
					content: "<span class='tour-bold'><b>10X faster</b></span> RESTful server creation.<span class='tour-bold'><b> Declaratively...</b></span><br/><br/><ul>" +
						"<li><span class='tour-bold'><strong>Connect </strong></span> to mobile apps, other systems -<br/>RESTful API<br/><br/></li>" +
						"<li><span class='tour-bold'><strong>Integrate </strong></span> Multiple Data Sources and Tables -<br/> Point and Click<br/><br/></li>" +
						"<li><span class='tour-bold'><strong>Enforce </strong></span>Business Policy for Logic and Security -<br/> Rules and JavaScript<br/><br/></li>" +
						// "<ul><li><span class='tour-bold'><strong>Integration:  </strong></span>resources can combine data from multiple sources (SQL, Mongo and RESTful), and coordinate updates between them.<br/><br/></li>" +
						"</ul>",
					reflex: true,
					template: $scope.stepTemplateInitial,
					onShow: function (tour) {
					},
					onNext: function (tour) {
						$rootScope.connectWizard();
						$rootScope.trackAction('ld-learn-connect-1');
					}
				},
				{
					title: "delay",
					element: "#projectSelect",
					template: "<div style=\"display: hidden\"></div>",
					duration: 1500
				},
				{
					element: "#ConnectToNorthwindButton",
					title: "Connect to database",
					content: "Espresso RESTful services are based on databases, <br/>" +
						"so the first thing to do is to connect to a database.<br/><br/>" +
						"To illustrate, let's connect to the sample Northwind database.  " +
						"You can of course use your own database(s) later.<br/><br/>" +
						"Espresso supports these data sources, including MongoDB,<br/>" +
						"in the cloud or on premise.",
					reflex: true,
					orphan: true,
					template: $scope.stepTemplateStart,
					onNext: function (tour) {
						$rootScope.trackAction('ld-learn-connect-2');
						$('#ConnectToNorthwindButton').click();
					}
				},
				{
					title: "delay",
					element: "#connectMenuItem",
					template: "<div style=\"display: hidden\"></div>",
					duration: 1000
				},
				{
					element: "#dbConnectContinue",
					title: "Connect to database",
					content: "Now let's finish the connection.",   //  FIXME this just hangs, never closes
					//reflex: true,
					orphan: true,
					template: $scope.stepTemplateEnd,
					onHidden: function (tour) {
						$scope.completedConnect = true;
						$rootScope.trackAction('ld-learn-connect-3');
						$('#dbConnectContinue').click();
						$scope.completeLearningGoal('connect');
					}
				}
			];

			$scope.tourConnect = new Tour({
				name: 'learnConnect',
				backdrop: true,
				storage: false,
				steps: steps,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$('#projectSelect').data('bs.popover', null);
				}
			});

			// Initialize the tour
			$scope.tourConnect.init();

			// Start the tour
			$scope.tourConnect.start();

			$timeout(function () {
				$(".tour-backdrop").click(function (evt) {
					var ctrl = document.elementFromPoint(evt.pageX, evt.pageY);
					if (ctrl.tagName == "BUTTON" && ctrl.innerText.startsWith('Next'))
						return;
					evt.stopPropagation();
				});
			}, 500);
		};

		$rootScope.$on('dbWizardFinished', function () {
			return;
			$rootScope.trackAction('ld-learn-lb-1');
			console.log('DB wizard finished - start learning step 2?');
			if (localStorage[lsPrefix + 'lb']) {
				return;
			}
			$scope.startTourRestLab();
		});

		$rootScope.$on('ResourcesCtrlInit', function (event, scope) {
			$timeout(function () {
				if (localStorage['eslo-ld-learn-resource']) {
					return;
				}
				$scope.startTourResources();
			}, 2250);
		});

		$rootScope.$on('LiveBrowserCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-lb']) {
				return;
			}
			$scope.startTourLB();
		});

		$rootScope.$on('RestLabCtrlInit', function (event, scope) {
			console.log('DB wizard finished - start learning step 2?');
			if (localStorage['eslo-ld-learn-restlab']) {
				return;
			}
			$timeout(function () {
				$rootScope.trackAction('ld-learn-lb-1');
				$scope.startTourRestLab();
			}, 1000);
		});

		$rootScope.$on('AllRulesCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-logic']) {
				return;
			}
			$scope.startTourLogic();
		});

		$rootScope.$on('RoleCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-security']) {
				return;
			}
			$scope.startTourSecurity();
		});
		//////////////////////////////////////////////////////////////////////////////////////////
		// REST Lab

		$scope.startTourRestLab = function startTourRestLab() {
			if ($('.tour').length) { return; }
			var elClass = '.leftBarRestLab';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			var steps = [
				{
					element: elClass,
					title: "Default API Creation",
					placement: 'right',
					content: "Database connection has created a <span class='tour-bold'><b>Default REST API</b></span><ul>" +
							"<li><span style='font-family:courier;'>Put, Post, Delete, and Get</span></li>" +
							"<li>For each Table, View, Stored Procedure </li>" +
							"<li>Swagger  support</li></ul>" +
						"<span class='tour-bold'><b>Architectural pattern automation</b></span>  for<ul>" +
							"<li>Filtering, sort, etc.</li>" +
							"<li>Pagination, Optimistic Locking</li>" +
							"<li>Logic and Security - <span class='tour-bold'><b>Rules</b></span> and <span style='font-family:courier;'>JavaScript</span></li></ul></br/>" +
						"It's ready now - test it here in the <span class='tour-bold'><b>REST Lab</b></span>.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onNext: function (tour) {
						$timeout(function () {
							$location.path('/projects/' + $rootScope.currentProject.ident + '/restlab');
						});
						$rootScope.trackAction('ld-learn-rest-1');
						//$scope.completeLearningGoal('restlab');
					}
				},
				{
					title: "delay",
					element: elClass,
					template: "<div style=\"display: hidden\"></div>",
					duration: 300
				},
				{
					element: "#apiTypeControl",
					title: "Custom Resources too",
					placement: 'right',
					content: "Default 'flat' relational resources are great, <br>" +
					"but integration and mobile apps need a richer API:<ul>" +
					"<li>Integrate <span class='tour-bold'><b>multiple databases</b></span></li>" +
					"<li><span class='tour-bold'><b>Choose and alias attributes</b></span></li>" +
					"<li>Create <span class='tour-bold'><b>nested document </b></span> updatable JSON responses, like this:</li></ul>" +
					"<span style='font-family:courier;display:block;padding-left:56px;'>" +
					"{<br/>" +
					"&nbsp;\"ID\": \"ALFKI\",<br/>" +
					"&nbsp;\"Balance\": 0,<br/>" +
					"&nbsp;\"Orders\": [<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"OrderID\": 10643,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"Total\": 814.5,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"Items\": [<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"ProductID\": 9004,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Quantity\": 2,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;etc&hellip;<br/>" +
					"}<br/><br/>" +
					" </span>" +
					"You can build resources using a simple point-and-click procedure (on the \"Customize\" page).<br/><br/>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHidden: function (tour) {
						kahuna.applyFunctionInScope($scope, function () {
							$location.path('/projects/' + $rootScope.currentProject.ident + '/restlab');
						});
						$rootScope.trackAction('ld-learn-rest-2');
						kahuna.applyFunctionInScope($rootScope, function () {
							// $rootScope.navMaskEnabled = true;
							// $rootScope.navMaskStep = 'restlab';
							$scope.completeLearningGoal('restlab');
							//$scope.startTourLogic();
						});
					}
				}
			];

			var tour = new Tour({
				name: 'learnConnectRestLab',
				backdrop: true,
				storage: false,
				steps: steps,
				onStart: function () {},
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$('.leftBarRestLab').data('bs.popover', null);
				}
			});

			$scope.$evalAsync(function () {
				// Initialize the tour
				tour.init();

				// Start the tour
				tour.start();
			});
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - resources
		$scope.startTourResources = function startTourResources() {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var elClass = '.leftBarResources';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			console.log('clicked');
			$location.path('/projects/' + $rootScope.currentProject.ident + ' /resources');
			var steps = [
//				{
//					element: elClass,
//					title: "API - Custom Resources",
//					placement: 'right',
//					content: "As noted earlier, default 'flat' relational resources are great, <br>" +
//						"but integration and mobile apps need a richer API -<br/> "+
//						"<ul><li><span class='tour-bold'><b>document-oriented</b></span> JSON responses</li>" +
//						"<li>choose/alias columns<li>combine multiple data sources</ul>" +
//						"Select this item to view and edit resources, <br/>and shape your own API.",
//					reflex: false,
//					template: $scope.stepTemplateStart,
//					onNext: function (tour) {
//						$rootScope.trackAction('ld-learn-api-1');
//						kahuna.applyFunctionInScope($scope, function () {
//							$location.path('/projects/1000/resources');
//						});
//					}
//				},
//				{
//					title: "delay",
//					element: elClass,
//					template: "<div style=\"display: hidden\"></div>",
//					duration: 1000
//				},
				{
					element: "#topResourcesList",
					title: "API – Custom Resources: creating resources",
					placement: 'right',
					content: "Each resource is an API endpoint.<br/><br/>" +
							"They are described to the far right <i class='fa fa-arrow-right'></i>.<br/><br/>" +
							"Click the Add button to create your own, exposing your data in the way you want.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onNext: function (tour) {
						$rootScope.trackAction('ld-learn-api-2');
					}
				},
				{
					title: "delay",
					element: "#connectMenuItem",
					template: "<div style=\"display: hidden\"></div>",
					duration: 300
				},
				{
					element: "#resourceTreeDiv",
					title: "API – Custom Resources: creating new Resources",
					placement: 'right',
					content: "Click \"New Resource\", and select a table.<br/><br/> " +
						"Click  \"New Level\", and select a <em>related</em> table <br/>" +
						"to create <span class='tour-bold'><b>Sub Resources</b></span> " +
						"for a tree-like document model.<br/><br/>" +
						"Use the Attributes tab to specify <br/>which columns are included, and their alias names.<br/><br/>" +
						"Test with the REST Lab (just click \"Test.\")",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onNext: function (tour) {
					},
					onHidden: function () {
						$scope.completeLearningGoal('resource');
					}
				},

//				{
//					title: "delay",
//					element: "#connectMenuItem",
//					template: "<div style=\"display: hidden\"></div>",
//					duration: 300
//				},
//				{
//					element: "#resourceDiv",
//					title: "API – Custom Resources: creating Sub Resources",
//					placement: 'right',
//					content: "Click the \"New Level\" button, and select a related table.<br/><br/>" +
//					"You can override the <span class='tour-bold'><b>defaulted join clause</b></span> as needed.<br><br>" +
//					"Use the Attributes tab to specify which columns are included, and their alias names.",
//					reflex: false,
//					template: $scope.stepTemplateEnd,
//					onHidden: function (tour) {
//						$rootScope.trackAction('ld-learn-api-3');
//						$scope.showLearningGoals();
//						$rootScope.trackAction('ld-learn-api-4');
//						$scope.completeLearningGoal('resource');
//					}
//				},

//				{
//					title: "delay",
//					element: "#connectMenuItem",
//					template: "<div style=\"display: hidden\"></div>",
//					duration: 300
//				},
//				{
//					element: ".leftBarRestLab",
//					title: "REST Lab",
//					placement: 'right',
//					content: "It's now ready to run (no compile, no deploy).<br><br>" +
//					"As you've already seen, you can now explore REST APIs for <ul><li>resources<li>tables<li>views<li>stored procedures</ul> using the REST Lab.",
//					reflex: false,
//					template: $scope.stepTemplateEnd,
//					onHidden: function (tour) {
//						$scope.showLearningGoals();
//						$rootScope.trackAction('ld-learn-api-4');
//						$scope.completeLearningGoal('resource');
//					}
//				}
			];

			var tour = new Tour({
				name: 'learnConnectResources',
				backdrop: true,
				storage: false,
				steps: steps,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$(elClass).data('bs.popover', null);
				}
			});

			// wait for DOM
			$timeout(function () {
				// Initialize the tour
				tour.init();

				// Start the tour
				tour.start();
			}, 250);
		};

		$rootScope.$on('DatabaseListCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-integrate']) {
				return;
			}
			$scope.startTourIntegrate();
		});

		//////////////////////////////////////////////////////////////////////////////////////////
		// DB integrate tour segment
		$scope.startTourIntegrate = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			$location.path('/projects/' + $rootScope.currentProject.ident + '/databases');
			var elClass = '.leftBarIntegrate';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			var steps = [
				{
					element: elClass,
					title: "Integrate Multiple Data Sources",
					placement: 'right',
					content: "Add new database(s), and <span class='tour-bold'><b>Relationships</b></span> between them,<br/>" +
						"for use in Resources, Rules and the Live Browser" +
						"<ul><li>Explore the <b>MDBDemoCustomers</b> Resource <br/>in the Espresso Logic Demo project.</li></ul>" +
						"Synchronize databases with Resources, <br/>" +
						"which project / alias data to match external formats.<br/>" +
						"<ul><li>Learn more about integration <a href='http://docs.espressologic.com/docs/rest-apis/data-integration' target='_blank'> here.</a></li></ul>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onNext: function onNext(tour) {
					},
					onHidden: function onHidden() {
						$scope.completeLearningGoal('integrate');
					}
				}
			];

			var tour = new Tour({
				name: 'learnMore',
				backdrop: true,
				storage: false,
				steps: steps
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - More goals

		$scope.startTourMore = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var steps = [
				{
					element: "#learningGoalsTitle",
					title: "Basic Tour Complete",
					placement: 'left',
					content: "You've seen how to create an API by connecting, and<ol>" +
							"<li>Test it in the RESTlab</li>" +
							"<li>Extend it with Custom <span class='tour-bold'><b>Resources</b></span>" +
							"<li>Declare <span class='tour-bold'><b>Business Logic</b></span> for database integrity</li></ol>" +
						"May we suggest you try the remaining Tour elements at your convenience?<br/>" +
						"<ul><li>Click the red buttons to see these additional Tours.</li></ul>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onNext: function (tour) {
					}
				}
			];

			var tour = new Tour({
				name: 'learnMore',
				backdrop: true,
				storage: false,
				steps: steps
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - Rules

		$scope.startTourLogic = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var steps = [
				{
					element: "#leftBarRules",
					title: "Rules",
					placement: 'right',
					content: "An API should enforce the integrity of your data.<br/><br/>" +
						"<img  src='images/update-logic.png' border='0'  /><br/><br/>" +
						"So, Espresso enables you to define <span class='tour-bold'><b>spreadsheet-like Rules</b></span>, enforced on update requests..<br/><br/>" +
						"Rules are <span class='tour-bold'><b>40X</b></span> more concise than procedural code, " +
						"and integrate with <span class='tour-bold'><b>JavaScript</b></span> for full control.<br/><br/>" +
						"<span class='tour-bold'><b>Click here</b></span> for a <a onclick='return showVideo(&quot;https://player.vimeo.com/video/91112386&quot;)' href='#'>Logic Overview</a>.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onNext: function (tour) {
						$rootScope.trackAction('ld-learn-logic-1');
						var nwProject = _.find($rootScope.allProjects, function (o) { return o.name.match(/^Northwind.*/); });
						if ( ! nwProject) {
							throw "Unable to find Northwind project";
						}
						$rootScope.projectSelected(nwProject, true);
						kahuna.applyFunctionInScope($scope, function () {
							var projUrl = '/projects/' + nwProject.ident + '/rules';
							$location.path(projUrl);
						});
						kahuna.layout.open('east');
						if (kahuna.helpLayout.state.north.innerHeight < 250) {
							kahuna.helpLayout.sizePane('north', "70%");
						}
					}
				},
				{
					title: "delay",
					element: "#leftBarRules",
					template: "<div style=\"display: hidden\"></div>",
					duration: 500,
					onHidden: function (tour) {
						kahuna.learning.rulesUrls = [];
						// Timing is critical here -- if the rules are not yet loaded, we're dead.
						if ($('.Rule').length > 0) {
							console.log('Getting rules inventory');
							$('.Rule').each(function () {
								kahuna.learning.rulesUrls.push(this.href.split('#')[1]);
							});
						}
						else {
							setTimeout(function () {
								console.log('Getting rules inventory after delay');
								$('.Rule').each(function () {
									kahuna.learning.rulesUrls.push(this.href.split('#')[1]);
								});
							}, 1500);
						}
					}
				},
				{
					element: "",
					title: "Creating Rules",
					orphan: 'true',
					content: "You can explore these pre-loaded sample Rules to get a feel for how they are specified.<br/><br/>" +
						"They operate as shown in the Context Help to the right <i class='fa fa-arrow-right'></i>.<br/><ol>" +
						"<li>You <span class='tour-bold'><b>declare spreadsheet-like expressions</b></span> for database columns.  The system then provides</li>" +
						"<li><span class='tour-bold'><b>Change Detection</b></span> for referenced data on update requests, and</li>" +
						"<li><span class='tour-bold'><b>Change Propagation</b></span> to adjust the referencing data</li>" +
						"<li><span class='tour-bold'><b>Transaction Bracketing</b></span> is automatic - each request is a transaction</li></ol>" +
						"Use the <i class='glyphicon glyphicon-question-sign ContextHelpButton'></i> " +
						"icons to get some assistance.<br/><br/>" +
						"These Rules were defined to <strong>Check Credit</strong> when adding a new order" +
						" - ensure that the customers balance does not exceed their credit limit.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onHidden: function (tour) {
						$rootScope.trackAction('ld-learn-logic-2');
						kahuna.applyFunctionInScope($scope, function () {
							$location.path(kahuna.learning.rulesUrls[1]);
						});
					}
				},
				{
					title: "delay",
					orphan: true,
					template: "<div style=\"display: hidden\"></div>",
					duration: 1000,
					onNext: function () {
					}
				},
				{
					element: "#constraintError",
					title: "Validation rule example",
					placement: 'top',
					content: "If the condition (expressed as a JavaScript expression) returns false, the database transaction " +
						"will be rolled back, and the caller will receive the error below.<br/><br/>" +
						"Now, let's explore how the balance is derived. It involves 3 tables, starting with the OrderDetails.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onHidden: function (tour) {
						$scope.showLearningGoals();
						$rootScope.trackAction('ld-learn-logic-3');
						//$scope.completeLearningGoal('logic');
						//$scope.showLearningGoals();
					}
				},
				{
					title: "delay",
					orphan: true,
					template: "<div style=\"display: hidden\"></div>",
					duration: 300,
					onNext: function () {
							kahuna.applyFunctionInScope($scope, function () {
								$location.path(kahuna.learning.rulesUrls[3]);
							});
					}
				},
				{
					orphan: true,
					title: "Parent copy rule example",
					placement: 'bottom',
					content: "First we need to compute the OrderDetails.Amount, and to do that we need the UnitPrice.<br/><br/>" +
							"This is a parent copy rule: it automatically <em>copies</em> the product price into the line item, " +
							"so that the line item will not be affected if the product price changes in the future.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onHidden: function (tour) {
						$rootScope.trackAction('ld-learn-logic-4');
					}
				},
				{
					title: "delay",
					orphan: true,
					template: "<div style=\"display: hidden\"></div>",
					duration: 300,
					onNext: function () {
							kahuna.applyFunctionInScope($scope, function () {
								$location.path(kahuna.learning.rulesUrls[2]);
							});
					}
				},
				{
					orphan: true,
					title: "Formula rule example",
					placement: 'bottom',
					content:
						"This is a formula, which computes the <em>amount</em> for an OrderDetail.<p/>"+
						"The syntax is JavaScript so you can do if/else logic as shown here. " +
						"<code>Row</code> is the OrderDetails row.<p/>"+
						"Recall that Rules operate like a spreadsheet, providing automatic <span class='tour-bold'><b>Change Detection / Propagation.</b></span><br/><br/>" +
						"So, for example, if the OrderDetail is assigned a new product,<ol>" +
							"<li>the product's price will be copied over</li>" +
							"<li>which will automatically update the amount of the OrderDetail.</li></ol><p/>" +
						"This is called <span class='tour-bold'><b>Rule Chaining</b></span> - " +
						"a change from one Rule <em>triggers</em> another<br/><br/>" +
						"This is <em>very</em> powerful, enabling you to solve complex problems with a series of simple Rules.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onHidden: function (tour) {
						$rootScope.trackAction('ld-learn-logic-5');
					}
				},
			{
					title: "delay",
					orphan: true,
					template: "<div style=\"display: hidden\"></div>",
					duration: 300,
					onNext: function () {
							kahuna.applyFunctionInScope($scope, function () {
								$location.path(kahuna.learning.rulesUrls[4]);
							});
					}
				},
				{
					orphan: true,
					title: "Sum Rule example",
					placement: 'top',
					content: "Expressions work <em>across tables</em>, so you can address multi-table transactions.<p/>" +
						"This 'expression' (entered via the combo boxes) computes the Orders' amountTotal from " +
						"the sum of the OrderDetail amounts.<p/>" +
						"The combo box choices are computed from the schema (tables, columns, foreign keys such as OrderDetailsList).<p/>" +
						"This sum <em>reacts</em> to <ol>" +
							"<li><span class='tour-bold'><b>Inserts</b></span> of new OrderDetails (a new amount)</li>" +
							"<li><span class='tour-bold'><b>Updates</b></span> to OrderDetails.amount (via chaining)</li>" +
							"<li><span class='tour-bold'><b>Deletes</b></span> of OrderDetails</li></ol>",
					reflex: false,
					template: $scope.stepTemplateStart,
					onHidden: function (tour) {
						$rootScope.trackAction('ld-learn-logic-5');
					}
				},
				{
					title: "delay",
					orphan: true,
					template: "<div style=\"display: hidden\"></div>",
					duration: 300,
					onNext: function () {
							kahuna.applyFunctionInScope($scope, function () {
								$location.path(kahuna.learning.rulesUrls[0]);
							});
					}
				},
				{
					orphan: true,
					title: "Customer Balance sum",
					placement: 'top',
					content: "We use the same technique to compute the Customers' balance<p/>" +
						"Changes to this will be checked against our credit validation<p/>" +
						"Note: sums and counts are important tools, since they are simple, and <em>efficient:</em> <ol>" +
							"<li>They use <span class='tour-bold'><b>1 row updates</b></span> (not expensive <em>select sum</em> queries)</li>" +
							"<li>And there is no sql at all if the child summed field is not changed <span class='tour-bold'><b>(rule pruning)</b></span><br/><br/></li></ol>" +
							"Wrap<br/>" +
							"Click Home > Tech Doc to <span class='tour-bold'><b>visualize</b></span> the Rules, " +
							"and see how they support much more than just Place Order / Check Credit",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHidden: function (tour) {
						$rootScope.trackAction('ld-learn-logic-7');
						kahuna.applyFunctionInScope($scope, function () {
							$scope.completeLearningGoal('logic');
							$location.path("/");
						});
						$scope.startTourMore();
					}
				},
			];

			var tour = new Tour({
				name: 'learnConnectLB',
				backdrop: true,
				storage: false,
				steps: steps,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$('#leftBarRules').data('bs.popover', null);
				},
				debug: true
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();

		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - Security

		$scope.startTourSecurity = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var elClass = '.leftBarRoles';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			$("#leftBarRoles")[0].scrollIntoView();
			var steps = [
				{
					element: elClass,
					title: "Security",
					placement: 'right',
					content: "An API should enforce the security of your data.<br/><br/>" +
						"This defines who can do what, to what data.<br/><br/>" +
						"Espresso uses roles to control" +
						"<ul><li>End Point Access<li>Row and Column level access</ul>" +
						"Create users and roles to define access levels.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onNext: function (tour) {
						$rootScope.trackAction('ld-learn-sec-1');
						kahuna.applyFunctionInScope($scope, function () {
							$location.path('/projects/1000/roles');
						});
					}
				},
				{
					title: "delay",
					element: elClass,
					template: "<div style=\"display: hidden\"></div>",
					duration: 1000
				},
				{
					element: "#rolesListDiv",
					title: "Roles",
					placement: 'right',
					content: "Each role has a set of <span class='tour-bold'><b>Permissions</b></span>, defining what users with that role can and cannot do.",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHidden: function (tour) {
						$rootScope.trackAction('ld-learn-sec-2');
						$("#leftBarUsers")[0].scrollIntoView();
						$scope.showLearningGoals();
						$rootScope.trackAction('ld-learn-sec-3');
						$scope.completeLearningGoal('security');
					}
				},
//				{
//					title: "delay",
//					element: "#connectMenuItem",
//					template: "<div style=\"display: hidden\"></div>",
//					duration: 300
//				},
//				{
//					element: "#leftBarUsers",
//					title: "Users",
//					placement: 'right',
//					content: "You can then assign roles to users, and combine roles for precise permission management.<br/><br/>" +
//					"You can define roles here, or use an Authentication Provider to use your Enteprise security system.",
//					reflex: false,
//					template: $scope.stepTemplateEnd,
//					onHidden: function (tour) {
//						$scope.showLearningGoals();
//						$rootScope.trackAction('ld-learn-sec-3');
//						$scope.completeLearningGoal('security');
//					}
//				}
			];

			var tour = new Tour({
				name: 'learnConnectResources',
				backdrop: true,
				storage: false,
				steps: steps,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$(elClass).data('bs.popover', null);
				}
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();

		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Live Browser

		$scope.startTourLB = function startTourLB() {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var elClass = '.leftBarLiveBrowser';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			$location.path('/livebrowser');
			var steps = [
				{
					element: elClass,
					title: "Live Browser",
					placement: 'right',
					content: "The Live Browser gives you complete read/write access to your data without <em>any</em> coding required.<br/><br/>" +
						"<ul>" +
						"  <li>It uses the REST API, and therefore:" +
						"  <li>Security is enforced" +
						"  <li>Rules are enforced" +
						"  <li>and it's configurable" +
						"<ul>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHidden: function onHidden(tour) {
						$rootScope.trackAction('ld-learn-lb-1');
						$location.path('/livebrowser');
						$scope.completeLearningGoal('lb');
						kahuna.layout.close('east');
					}
				}
			];

			var tour = new Tour({
				name: 'learnConnectLB',
				backdrop: true,
				storage: false,
				steps: steps,
				onStart: function onStart() {
				}
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();

		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - Wrap up

		$rootScope.$on('EventCtrlInit', function (event, handle, scope) {
			//this might interupt the LB tour, ignore that controller
			if (handle === 'LiveBrowserCtrl') {return;}
			var incomplete = false;
			var goals = _.pluck($scope.data.goals, 'name');
			angular.forEach(goals, function (goal, index) {
				if (!localStorage['eslo-ld-learn-' + goal]) {
					incomplete = true;
				}
			});

			//if complete, show wrap-up dialog
			if (!incomplete && !localStorage['eslo-ld-learn-complete']) {
				$scope.startTourWrapUp();
				console.log('wrap up');
				localStorage['eslo-ld-learn-complete'] = true;
			}
		});

		$scope.startTourWrapUp = function startTourWrapUp() {
			if ($('.tour').length) {
				return;
			}
			if (!$scope.preTour({})) {
				return;
			}
			var steps = [
				{
					orphan: true,
					title: "Thank you for completing the Espresso Tour!",
					content: "<div class='form-group'>\n" +
						"	<b>Ready to try Espresso Logic with your own data?</b><br/><br/>" +
						"   Please enter your contact information and we'll help you build a <b>Proof of Concept</b>:\n" +
						"</div>\n" +
						"<div class='form-group'>\n" +
						"<label for='name'>Your name:</label>\n" +
						"<input type='text' class='form-control' id='name' placeholder='Jane Doe' />\n" +
						"</div>\n" +
						"<div class='form-group'>\n" +
						"<label for='email'>Your email:</label>\n" +
						"<input type='email' class='form-control' id='email' placeholder='jdoe@acme.com' />\n" +
						"</div>\n" +
						"<div class='form-group'>\n" +
						"<label for='tel'>Telephone number:</label>\n" +
						"<input type='tel' class='form-control' id='phone' placeholder='+1 212 555 1212' />\n" +
						"</div>\n" +
						"<br/>Was this quick tour helpful?" +
						"<form role='form'>\n" +
						"<div class='radio'>\n" +
						"<label>\n" +
						"<input type='radio' name='wasHelpful' id='wasHelpfulYes' value='yes'>\n" +
						"	Yes, I have a good feel for what Espresso can do for me\n" +
						"</label>\n" +
						"</div>\n" +
						"<div class='radio'>\n" +
						"<label>\n" +
						"<input type='radio' name='wasHelpful' id='wasHelpfulNo' value='no'>\n" +
						"	No, I still don't understand what Espresso is\n" +
						"</label>\n" +
						"</div>\n" +
						"<div class='form-group'>\n" +
						"<label for='explanation'>Comments:</label>\n" +
						"<textarea class='form-control' rows='2' id='explanation'></textarea>\n" +
						"</div>\n" +
						"</form>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHide: function onHide(tour) {
						var feedback = {};
						var wasHelpfulYes = $("#wasHelpfulYes").is(":checked");
						var wasHelpfulNo = $("#wasHelpfulNo").is(":checked");
						if (wasHelpfulYes) {
							feedback.wasHelpful = "yes";
						}
						else if (wasHelpfulNo) {
							feedback.wasHelpful = "no";
						}
						else {
							feedback.wasHelpful = "unspecified";
						}
						feedback.comments = $('#explanation').val();
						feedback.name = $('#name').val();
						feedback.email = $('#email').val();
						feedback.phone = $('#phone').val();
						$rootScope.trackAction('ld-learn-feedback', feedback);

						// Record with Agile too
						var agileProps = {};
						if ($('#name').val())
							agileProps['EvalTourUserName'] = $('#name').val();
						if ($('#phone').val())
							agileProps['EvalTourUserPhone'] = $('#phone').val();
						if ($('#email').val())
							agileProps['EvalTourUserEmail'] = $('#email').val();
						if ($('#explanation').val())
							agileProps['EvalTourComments'] = $('#explanation').val();
						agileProps['EvalTourWasHelpful'] = feedback.wasHelpful;
						if (Object.keys(agileProps).length > 0)
							$rootScope.setAgileProperties(agileProps);
					}
				}
			];

			var tour = new Tour({
				name: 'learnWrapUp',
				backdrop: true,
				storage: false,
				steps: steps
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();
		};

		//////////////////////////////////////////////////////////////////////////////////////
		// The tour

		$scope.data = {
			goals: [
				{
					index: '1',
					name: "connect",
					title: 'Connect to database',
					runTour: $scope.startTourConnect
				},
				{
					index: '2',
					name: "restlab",
					title: 'Use your API',
					runTour: $scope.startTourRestLab
				},
				{
					index: '3',
					name: "resource",
					title: 'Customize your API',
					runTour: $scope.startTourResources
				},
				{
					index: '4',
					name: "logic",
					title: 'Declare Business Logic',
					runTour: $scope.startTourLogic
				},
				{
					index: '5',
					name: "security",
					title: 'Declare Security',
					runTour: $scope.startTourSecurity
				},
				{
					index: '6',
					name: "integrate",
					title: 'Add Database Connections',
					runTour: $scope.startTourIntegrate
				},
				{
					index: '7',
					name: "lb",
					title: 'Browse and edit data',
					runTour: $scope.startTourLB
				}
			]
		};

		var lsPrefix = "eslo-ld-learn-";
		for (var i = 0; i < $scope.data.goals.length; i++) {
			$scope.data.goals[i].cls = "learn-step-todo";
			$scope.data.goals[i].markerCls = "learn-step-marker-todo fa-graduation-cap";
			if (localStorage[lsPrefix + $scope.data.goals[i].name]) {
				$scope.data.goals[i].cls = "learn-step-done";
				$scope.data.goals[i].markerCls = "learn-step-marker-done fa-check";
			}
		}

		$scope.doLearningGoal = function doLearningGoal(name, evt) {
			if (evt.shiftKey) {
				evt.stopPropagation();
				var theGoal = _.find($scope.data.goals, function (g) { return g.name == name; }
				);
				if (localStorage[lsPrefix + name]) {
					localStorage.removeItem(lsPrefix + name);
					theGoal.cls = "learn-step-todo";
					theGoal.markerCls = "learn-step-marker-todo fa-graduation-cap";
					$scope.allGoalsCompleted = false;
					localStorage.removeItem(lsPrefix + 'complete');
				}
				else {
					$scope.completeLearningGoal(name);
				}

				return;
			}
			var theGoal = _.find($scope.data.goals, function (goal) { return goal.name == name; });
			if (theGoal.runTour)
				theGoal.runTour();
		};

		$scope.completeLearningGoal = function completeLearningGoal(name) {
			var theGoal = _.find($scope.data.goals, function (goal) { return goal.name == name; });
			kahuna.applyFunctionInScope($scope, function () {
				theGoal.cls = "learn-step-done";
				theGoal.markerCls = "learn-step-marker-done fa-check";
			});
			localStorage[lsPrefix + name] = true;
			$rootScope.trackAction('ld-learn-' + name);
			$scope.checkAllGoalsCompleted();
		};

		$scope.checkAllGoalsCompleted = function checkAllGoalsCompleted() {
			var oldComplete = localStorage[lsPrefix + 'complete'];
			$scope.allGoalsCompleted = true;
			// See if we've completed all goals
			_.each($scope.data.goals, function (goal) {
				if ( ! localStorage[lsPrefix + goal.name])
					$scope.allGoalsCompleted = false;
			});
			if ($scope.allGoalsCompleted && !oldComplete) {
				localStorage[lsPrefix + 'complete'] = true;
				$rootScope.trackAction('ld-learn-complete');
				$scope.allGoalsCompleted = false;
				$timeout(function () {
					$scope.allGoalsCompleted = true;
				}, 10000);
				$timeout(function () {
					$scope.startTourWrapUp();
				}, 150);
			}
		};

		$scope.resetLearningGoals = function () {
			_.each($scope.data.goals, function (goal) {
				if (goal.name == "connect") {
					// Do not reset Connect -- user wouldn't want to do it twice
					return;
				}
				localStorage.removeItem(lsPrefix + goal.name);
				goal.cls = "learn-step-todo";
				goal.markerCls = "learn-step-marker-todo fa-graduation-cap";
			});
			$scope.allGoalsCompleted = false;
			localStorage.removeItem(lsPrefix + 'complete');
			localStorage.removeItem('introSeen');
		};

		$scope.skipLearningGoals = function skipLearningGoals() {
			_.each($scope.data.goals, function (goal) {
				localStorage[lsPrefix + goal.name] = true;
				goal.cls = "learn-step-done";
				goal.markerCls = "learn-step-marker-done fa-check";
			});
			$scope.allGoalsCompleted = true;
			localStorage[lsPrefix + 'complete'] = true;
			localStorage['introSeen'] = true;
			if ($scope.tourConnect)
				$scope.tourConnect.end();
			$scope.$digest();
		};

		// After a short while, check whether we need to start the tour
		$rootScope.$watch('currentServer', function () {
			if ( ! $rootScope.currentServer)
				return;
			$timeout(function () {
				if ( ! localStorage[lsPrefix + 'connect']) {
					console.log('Starting guided tour...');
					//$rootScope.connectWizard();
					$scope.startTourConnect();
				}
			}, 2500);
			$scope.checkAllGoalsCompleted();
		});

		// When user is done exploring something and clicks Continue in left nav pane
		$rootScope.$watch('navMaskEnabled', function (oldValue) {
			if ($rootScope.navMaskEnabled)
				return;
			if ($rootScope.navMaskStep == 'restlab')
				$scope.startTourLogic();
		});

		// If user shift-clicks the Learning Goals title, reset steps
		$scope.learningTitleClicked = function learningTitleClicked(evt) {
			if (evt.shiftKey)
				$scope.resetLearningGoals();
		};

		// Make sure the learning goals are visible
		$scope.showLearningGoals = function showLearningGoals() {
			//disabled
			return;
			kahuna.layout.open('east');
			if (kahuna.helpLayout.state.center.innerHeight < 250) {
				kahuna.helpLayout.sizePane('north', "200");
			}
		};
	}
};
