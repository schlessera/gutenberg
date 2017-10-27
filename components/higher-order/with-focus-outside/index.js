/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';

function withFocusOutside( WrappedComponent ) {
	return class extends Component {
		constructor() {
			super( ...arguments );

			this.bindNode = this.bindNode.bind( this );
			this.cancelBlurCheck = this.cancelBlurCheck.bind( this );
			this.queueBlurCheck = this.queueBlurCheck.bind( this );
		}

		componentWillUnmount() {
			this.cancelBlurCheck();
		}

		bindNode( node ) {
			if ( node ) {
				this.node = node;
			} else {
				delete this.node;
				this.cancelBlurCheck();
			}
		}

		queueBlurCheck( event ) {
			this.isBlurring = true;
			this.blurCheckTimeout = setTimeout( () => {
				if ( 'function' === typeof this.node.handleFocusOutside ) {
					this.node.handleFocusOutside( event );
				}
			}, 0 );
		}

		cancelBlurCheck() {
			delete this.isBlurring;
			clearTimeout( this.blurCheckTimeout );
		}

		render() {
			return (
				<div
					onFocus={ this.cancelBlurCheck }
					onBlur={ this.queueBlurCheck }
				>
					<WrappedComponent
						ref={ this.bindNode }
						{ ...this.props } />
				</div>
			);
		}
	};
}

export default withFocusOutside;
