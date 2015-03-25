espresso.app.directive('espressoMask', [
	'$filter' ,
	function ($filter) {
		var Directive = {
			require		: 'ngModel',
			restrict	: 'A',
			link		: function( scope , element , attributes , controller ){
				var column = scope.col;
				/**
				 * Parses a column view value and maskType to get the model value.
				 * Used when restoring or saving masked values for values to be saved by the server.
				 * This is passed to a directive's modelController $parser, and expects an input value.
				 * @return (mixed) the raw input value
				 */
				var unmask = function( input ){
					if (angular.isUndefined(column.maskType)) {
						return input;
					}
					//the masked input representation of the model
					if (input) {
						if( angular.equals( column.maskType , null ) ){
							return input;
						}
						if( column.maskType === 'numeric' ){
							if (input === 0) {
								return 0;
							}
							return numeral().unformat( input );
						}
						if( column.maskType === 'date' ){
							return controller.$modelValue;
						}
					}
					return input;
				};
				var mask = function( input ){
					if (column.maskType===null) {
						if (column.mask===null && (
							column.type === 'TIMESTAMP' ||
							column.type === 'DATETIME'
						)) {
							var mask = 'yyyy-MM-ddTHH:MM:ss.sssZ';
							return $filter( 'date' )( input , mask );
						}
						else {
							return input;
						}
					}
					//the actual model value
					if( input ){
						if( angular.equals( column.maskType , null ) ){
							//probably text
							return input;
						}
						if( column.maskType === 'numeric' ){
							return numeral( input ).format( column.mask );
						}
						if( column.maskType === 'date' ){
							return $filter( 'date' )( input , column.mask );
						}
					}
					return input;
				};
				angular.element( element ).focus(function(){
					scope.$evalAsync(function(){
						controller.$setViewValue( unmask( controller.$viewValue ) );
						controller.$render();
					});
				});
				angular.element( element ).blur(function(){
					return;
					scope.$evalAsync(function(){
						controller.$setViewValue( mask( controller.$viewValue ) );
						controller.$modelValue = unmask( controller.$modelValue);
						controller.$render();
					});
				});
				controller.$formatters.push( mask );
				controller.$parsers.push( unmask );
			}
		};
		return Directive;
}]);
