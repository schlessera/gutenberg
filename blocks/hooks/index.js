/**
 * WordPress dependencies
 */
import createHooks from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import anchor from './anchor';

const { applyFilters, addFilter } = createHooks();

export { applyFilters };
export { addFilter };

addFilter( 'registerBlockType', 'supports-anchor', anchor );
