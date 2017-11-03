/**
 * External dependencies
 */
import { connect } from 'react-redux';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import { NoticeList, Popover, navigateRegions } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import './style.scss';
import Header from '../header';
import Sidebar from '../sidebar';
import TextEditor from '../modes/text-editor';
import VisualEditor from '../modes/visual-editor';
import UnsavedChangesWarning from '../unsaved-changes-warning';
import DocumentTitle from '../document-title';
import AutosaveMonitor from '../autosave-monitor';
import { removeNotice, toggleSidebar } from '../actions';
import MetaBoxes from '../meta-boxes';
import {
	getEditorMode,
	isEditorSidebarOpened,
	getNotices,
} from '../selectors';

const MOBILE_WIDTH = 762;

class Layout extends Component {
	constructor() {
		super( ...arguments );
		this.onUpdateDimensions = this.onUpdateDimensions.bind( this );
		this.saveLastWindowWidth = this.saveLastWindowWidth.bind( this );
		this.state = {
			lastWindowWidth: null,
		};
	}

	saveLastWindowWidth() {
		this.setState( {
			lastWindowWidth: window.innerWidth,
		} );
	}

	onUpdateDimensions() {
		if ( this.props.isSidebarOpened &&
			this.state.lastWindowWidth > MOBILE_WIDTH &&
			window.innerWidth < MOBILE_WIDTH
		) {
			this.props.toggleSidebar();
		}
		this.saveLastWindowWidth();
	}

	componentDidMount() {
		if ( window ) {
			if ( ! this.state.lastWindowWidth ) {
				this.saveLastWindowWidth();
			}
			window.addEventListener( 'resize', this.onUpdateDimensions );
		}
	}

	componentWillUnmount() {
		if ( window ) {
			window.removeEventListener( 'resize', this.onUpdateDimensions );
		}
	}

	render() {
		const { mode, isSidebarOpened, notices } = this.props;
		const className = classnames( 'editor-layout', {
			'is-sidebar-opened': isSidebarOpened,
		} );
		return (
			<div className={ className }>
				<DocumentTitle />
				<NoticeList onRemove={ this.props.removeNotice } notices={ notices } />
				<UnsavedChangesWarning />
				<AutosaveMonitor />
				<Header />
				<div className="editor-layout__content" role="region" aria-label={ __( 'Editor content' ) } tabIndex="-1">
					<div className="editor-layout__editor">
						{ mode === 'text' && <TextEditor /> }
						{ mode === 'visual' && <VisualEditor /> }
					</div>
					<div className="editor-layout__metaboxes">
						<MetaBoxes location="normal" />
					</div>
				</div>
				{ isSidebarOpened && <Sidebar /> }
				<Popover.Slot />
			</div>
		);
	}
}

export default connect(
	( state ) => ( {
		mode: getEditorMode( state ),
		isSidebarOpened: isEditorSidebarOpened( state ),
		notices: getNotices( state ),
	} ),
	{ removeNotice, toggleSidebar }
)( navigateRegions( Layout ) );
