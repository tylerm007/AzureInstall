/**
 * @ngdoc service
 * @name Masks
 * @description
 * A service mapping column types to masking types.
 */
espresso.app.service('Masks', ['$q', function ($q) {
	var Module = {
		/**
		 * @ngdoc property
		 * @name Masks.properties.maskTypes
		 * @propertyOf Masks
		 * 
		 * #capslock array values correspond to the actual column types, however generic types (in lower case, ex: "date") are now used
		 */
		maskTypes		: {
			date		: ['DATE', 'DATETIME', 'TIME', 'TIMESTAMP', 'date'],
			numeric		: ['DECIMAL', 'FLOAT', 'BIGINT', 'DOUBLE', 'INTEGER', 'NUMERIC', 'REAL',
							'SMALLINT', 'TINYINT', 'number'],
			text		: ['text']
		},
		/**
		 * @ngdoc property
		 * @name Masks.properties.maskDefaults
		 * @propertyOf Masks
		 */
		maskDefaults	: {
			numeric	: {
				'Currency'				: '$0,0.00',
				'Short Decimal'			: '0.00',
				'Integer'				: '0',
				'Integer with commas'	: '0,0'
			},
			date	: {
				'ISO-8601'			: 'yyyy-MM-ddTHH:mm:ss.sssZ',
				'Short Date Time'	: 'M/d/yy h:mm a',
				'Medium Date Time'	: 'MMM d, y h:mm:ss a',
				'Short Date'		: 'M/d/yy',
				'Medium Date'		: 'MMM d, y',
				'Long Date'			: 'MMMM d, y',
				'Full Date'			: 'EEEE, MMMM d,y',
				'Short Time'		: 'h:mm a',
				'Full Time'			: 'h:mm:ss a',
			},
			text: {
				'Text Line' : 'text',
				'Rich Text' : 'rich',
				'Small Textarea' : 'smallTextarea',
				'Large Textarea' : 'largeTextarea',
				'External Link' : 'link',
				'Popup Link' : 'popup',
				'Image Source' : 'imgSrc'
			}
		},
		/**
		 * @ngdoc method
		 * @name Masks.properties.get
		 * @param {string} the column type
		 * @return {promise} resolved with an object { type: 'type' , defaults: [] }
		 * @methodOf Masks
		 */
		get	: function( type ){
			var deferred = $q.defer();
			var maskType;
			angular.forEach( Module.maskTypes , function( element , index ){
				if( _.contains( element , type ) ){
					maskType = index;
				}
			});
			if( maskType ){
				deferred.resolve({
					type		: maskType,
					defaults	: Module.maskDefaults[ maskType ]
				});
			} else {
				deferred.reject();
			}
			deferred.promise.type = maskType;
			return deferred.promise;
		},
		//only used by detailInput
		getTemplate: function getMaskTemplate(columnMask) {
			var templates = {
				rich:
					"<div>" +
						"<div text-angular ng-change='updateFormInput(true);' class=\"scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
								"ta-toolbar=\"[['h1','h2','h3'],['bold','italics','underline'],['ol','ul','insertLink']]\" " +
								"ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}} display: inline-block;width:100%;{{result}};\" " +
								"ng-readonly=\"!valueIsEditable\" " +
								"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'></div>" +
							//"<div ta-bind ng-model='row[col.dataSource]'></div>" +
					"</div>",
				link:
					"<div>" +
						"<input ng-trim='false' ng-change='updateFormInput();' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
								"ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}} display: inline-block;{{result}};\" " +
								"ng-readonly=\"!valueIsEditable\" " +
								"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'/>"+
							" <a href='{{row[col.dataSource]}}' target='_blank'><i class='fa btn btn-default fa-external-link'></i></a>" +
					"</div>",
				popup:
					"<div>" +
						"<input ng-trim='false' ng-change='updateFormInput();' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
								"ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}} display: inline-block;{{result}};\" " +
								"ng-readonly=\"!valueIsEditable\" " +
								"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'/>"+
							" <a ng-click='popupExternalModal(row[col.dataSource])'><i class='fa btn btn-default fa-external-link'></i></a>" +
					"</div>",
				smallTextarea:
					"<div>" +
						"<textarea ng-change='updateFormInput();' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
								"ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}};width:100%;height:125px; display: inline-block;{{result}};\" " +
								"ng-readonly=\"!valueIsEditable\" " +
								"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'></textarea>"+
					"</div>",
				largeTextarea:
					"<div>" +
						"<textarea ng-change='updateFormInput();' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
								"ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}};width:100%;width:100%;height:250px;display: inline-block;{{result}};\" " +
								"ng-readonly=\"!valueIsEditable\" " +
								"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'></textarea>" +
					"</div>",
				imgSrc:
					"<div>" +
						"<img src='{{row[col.dataSource]}}' style='max-width:600px;max-height:300px;' />" +
						"<br/>" +
    					"<input ng-trim='false' ng-change='updateFormInput();' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
    							"ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}} display: inline-block;{{result}};\" " +
    							"ng-readonly=\"!valueIsEditable\" " +
    							"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'/>"+
    						" <a href='{{row[col.dataSource]}}' target='_blank'><i class='fa btn btn-default fa-external-link'></i></a>" +
    				"</div>",
					
			};
			if (templates[columnMask]) {
				return templates[columnMask];
			}
			return false;
		}
	};
	return Module;
}]);
