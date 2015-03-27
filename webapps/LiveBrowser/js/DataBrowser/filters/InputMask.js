/**
 * @ngdoc Mask
 * @name Mask
 * @description Filter for input masking.
 *
 */
espresso.app.filter( 'InputMask' , [
	'$filter' ,
	function ( $filter ) {
		return function (value, maskType, mask, types, area, genericType) {
			if (maskType === 'null' && mask === 'null' && (genericType === 'date' || area === 'date')) {
				maskType = 'date';
				mask = 'MM-dd-yy';
				var defaultDateBehavior = true;
			}
			//console.log(value); console.log(maskType); console.log(mask);
			if (angular.isDefined( maskType ) && !angular.equals( maskType , null ) && angular.isDefined( value )) {
				if (maskType === 'numeric') {
					value = numeral( value ).format( mask );
					return value;
				}
				if (maskType === 'date') {
					var momentDate = moment(value).local().format('MMMM DD, YYYY');
					if((defaultDateBehavior || mask === 'null') && momentDate != 'Invalid date') {
						return momentDate;
					}
					else {
						return $filter('date')(value, mask);
					}
				}
			}
			return value;
		};
}]);
