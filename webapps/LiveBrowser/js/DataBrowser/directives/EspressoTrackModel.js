espresso.app.directive( 'espressoTrackModel' , [
	
	function(){
		var Directive = {
			require		: 'ngModel',
			restrict	: 'A',
			link		: function( scope , element , attributes , controller ){
				var element = angular.element( element );
				element.addClass( 'updatable' );
				scope.$watch( attributes.ngModel , function( current , previous ){
					if( current != previous && window.event && window.event.type != 'click' ){
						element.addClass( 'updating' );
						setTimeout(function(){
							element.removeClass( 'updating' );
						},500);
					}
				});
			}
		};
		return Directive;
}]);
