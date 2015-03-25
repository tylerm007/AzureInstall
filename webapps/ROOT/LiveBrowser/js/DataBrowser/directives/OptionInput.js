espresso.app.directive("espressoOptionInput", [
		'$compile',
		'$filter',
		'Tables',
		'Notifications',
		'EspressoData',
		'$modal',
		function($compile, $filter, Tables, Notifications, EspressoData, $modal) {

			var Directive = null;
			Directive = {
				restrict : "E", // directive is an Element (not Attribute)
				replace : true,
				scope : { // set up directive's isolated scope
					optionType : "=", // Both passed by reference
					option : "="
				},
				template : // replacement HTML (can use our scope vars here)
				"<input ng-trim='false' type=\"text\" class=\"form-control {{inputClass}}\" id=\"option{{optionType.ident}}\" "
						+ "ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}} />",
				replace : true, // replace original markup with template
				transclude : false, // do not copy original HTML content
				link : function($scope, element, attrs, controller) {

//					var input = element.find("input");
					switch ($scope.col.type) {
						case 'number':
							$scope.inputType = "number"; //if this is set to number, currencies cell formats won't output in some browsers
							$scope.inputStyle = "text-align: right; width: 120px;";
							break;
						case 'string':
							$scope.inputType = "text"; //if this is set to number, currencies cell formats won't output in some browsers
							$scope.inputStyle = "width: 300px;";
							break;
						case 'boolean':
							$scope.inputType = "checkbox"; //if this is set to number, currencies cell formats won't output in some browsers
							$scope.inputStyle = "text-align: right; width: 120px;";
							break;
					}
				},
			};
		} ]);