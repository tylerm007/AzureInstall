/**
 * Perhaps a home to all row retrieval parameters (filters, orders, etc)
 * Currently only used to store order Query info
 */
espresso.app.service('Query', [
	'$rootScope', 'Tables',
	function ($rootScope, Tables) {
		/**
		 * 
		 */
		var Query = {
			/**
			 * 
			 */
			queries : {},
			/**
			 * 
			 */
			sortMap : {
				'field' : 'fields'
			},
			/**
			 * 
			 */
			selected : '',
			
			clear : function () {
				Query.queries = {};
				Query.selected = '';
			},
			
			/**
			 * 
			 */
			table : function (tableName) {
				if (angular.isUndefined(tableName)) {
					//getter
					return Query.selected;
				}
				
				//setter
				Query.selected = tableName;
				if (angular.isUndefined(Query.queries[tableName])) {
					Query.queries[tableName] = Query.initialize();
				}
				return Query;
			},
			/**
			 * 
			 */
			sort : function (info) {
				if (angular.isDefined(info)) {
					if (angular.isString(info)) {
						return Query.queries[Query.selected].sort[info][0];
					}
					else {
						Query.queries[Query.selected].sort = info;
						return Query;
					}
				}
				else {
					if (angular.isDefined(Query.queries[Query.selected]) && !angular.equals(null, Query.queries[Query.selected].sort)) {
						return Query.queries[Query.selected].sort.fields[0] + ' ' + Query.queries[Query.selected].sort.directions[0];
					}
					else {
						return null;
					}
				}
			},
			/**
			 * 
			 */
			initialize : function () {
				return {
					sort : null
				};
			}
		};
		return Query;
	}
]); 