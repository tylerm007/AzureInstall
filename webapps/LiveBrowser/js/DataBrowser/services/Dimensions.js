/**
 * A service for interacting with screen dimensions responsively for specified layout panels.
 * 3 panels are currently tracked for sizing and saving: west, center, and south
 *
 */
angular.module( 'Dimensions' , [] ).factory( 'Dimensions' , [ function(){
	var Module = {
		initState	: true,
		/**
		 * Returns the current widths and heights in percentages of panels as compared to their containers max values.
		 */
		getDimensions	: function(){
			var $west = angular.element( '.outerLayout-pane-west' );
			var $center = angular.element( '.outerLayout-pane-center .rightLayout-pane-center' ); //occupies the top "east" portion of the screen
			var $south = angular.element( '.outerLayout-pane-center .rightLayout-pane-center' ); //occupies the bottom "east" portion of the screen
			var bodyWidth = angular.element( 'body' ).width();
			var centerPaneHeight = angular.element( '.outerLayout-pane-center .ui-layout-container' ).height();
			var dimensions = {
				'west'	: {
					'height'	: 100, //this pane is the only layout div in the wrapper, so naturally must be 100%
					'width'		: Module.toPercentage( $west.width() , bodyWidth )
				},
				'center'	: {
					'height'	: Module.toPercentage( $center.height() , centerPaneHeight ),
					'width'		: Module.toPercentage( $center.width() , bodyWidth )
				},
				'south'	: {
					'height'	: Module.toPercentage( $south.height() , centerPaneHeight ),
					'width'		: Module.toPercentage( $south.width() , bodyWidth )
				}
			};
			return dimensions;
		},
		setDimensions	: function( dimensions ){
//			dimensions = dimensions ? dimensions : {west: '50%', south: '40%'};
//			espresso.topLayout.sizePane( "west" , dimensions.west.width + "%");
//			espresso.rightLayout.sizePane( "center" , dimensions.south.height + '%' );
		},
		toPercentage	: function( part , whole ){
			return Math.floor((part/whole)*100);
		}
	};
	return Module;
}]);
