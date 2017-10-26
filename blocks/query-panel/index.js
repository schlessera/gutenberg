/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import CategorySelect from './category-select';
import RangeControl from '../inspector-controls/range-control';
import SelectControl from '../inspector-controls/select-control';

const DEFAULT_MIN_ITEMS = 1;
const DEFAULT_MAX_ITEMS = 100;

export default function QueryPanel( {
	category,
	numberOfItems,
	order,
	orderBy,
	maxItems = DEFAULT_MAX_ITEMS,
	minItems = DEFAULT_MIN_ITEMS,
	onCategoryChange,
	onNumberOfItemsChange,
	onOrderChange,
	onOrderByChange,
} ) {
	return (
		<div>
			{ ( onOrderChange || onOrderByChange ) && (
				<SelectControl
					label={ __( 'Order by' ) }
					value={ `${ orderBy }/${ order }` }
					options={ [
						{
							label: __( 'Newest to Oldest' ),
							value: 'date/desc',
						},
						{
							label: __( 'Oldest to Newest' ),
							value: 'date/asc',
						},
						{

							/* translators: label for ordering posts by title in ascending order, translation may be required for languages using non latin alphabet */
							label: __( 'A → Z' ),
							value: 'title/asc',
						},
						{

							/* translators: label for ordering posts by title in descending order, translation may be required for languages using non latin alphabet */
							label: __( 'Z → A' ),
							value: 'title/desc',
						},
					] }
					onChange={ ( value ) => {
						const [ newOrderBy, newOrder ] = value.split( '/' );
						if ( newOrder !== order && 'function' === typeof onOrderChange ) {
							onOrderChange( newOrder );
						}
						if ( newOrderBy !== orderBy && 'function' === typeof onOrderByChange ) {
							onOrderByChange( newOrderBy );
						}
					} }
				/>
			) }
			{ onCategoryChange &&
				<CategorySelect
					label={ __( 'Category' ) }
					noOptionLabel={ __( 'All' ) }
					selectedCategory={ category }
					onChange={ onCategoryChange }
				/>
			}
			{ onNumberOfItemsChange &&
				<RangeControl
					label={ __( 'Number of items' ) }
					value={ numberOfItems }
					onChange={ onNumberOfItemsChange }
					min={ minItems }
					max={ maxItems }
				/>
			}
		</div>
	);
}
