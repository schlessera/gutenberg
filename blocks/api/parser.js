/**
 * External dependencies
 */
import { parse as hpqParse } from 'hpq';
import { mapValues, reduce, pickBy, find } from 'lodash';

/**
 * Internal dependencies
 */
import { parse as grammarParse } from './post.pegjs';
import { getBlockType, getUnknownTypeHandlerName } from './registration';
import { createBlock } from './factory';
import { isEquivalentHTML } from './validation';
import { getCommentDelimitedContent, getSaveContent } from './serializer';

/**
 * Returns true if the provided function is a valid attribute source, or false
 * otherwise.
 *
 * Sources are implemented as functions receiving a DOM node to select data
 * from. Using the DOM is incidental and we shouldn't guarantee a contract that
 * this be provided, else block implementers may feel inclined to use the node.
 * Instead, sources are intended as a generic interface to query data from any
 * tree shape. Here we pick only sources which include an internal flag.
 *
 * @param  {Function} source Function to test
 * @return {Boolean}         Whether function is an attribute source
 */
export function isValidSource( source ) {
	return !! source && '_wpBlocksKnownSource' in source;
}

/**
 * Returns the block attributes parsed from raw content.
 *
 * @param  {String} rawContent Raw block content
 * @param  {Object} schema     Block attribute schema
 * @return {Object}            Block attribute values
 */
export function getSourcedAttributes( rawContent, schema ) {
	const sources = mapValues(
		// Parse only sources with source defined
		pickBy( schema, ( attributeSchema ) => isValidSource( attributeSchema.source ) ),

		// Transform to object where source is value
		( attributeSchema ) => attributeSchema.source
	);

	return hpqParse( rawContent, sources );
}

/**
 * Returns value coerced to the specified JSON schema type string
 *
 * @see http://json-schema.org/latest/json-schema-validation.html#rfc.section.6.25
 *
 * @param  {*}      value Original value
 * @param  {String} type  Type to coerce
 * @return {*}            Coerced value
 */
export function asType( value, type ) {
	switch ( type ) {
		case 'string':
			return String( value );

		case 'boolean':
			return Boolean( value );

		case 'object':
			return Object( value );

		case 'null':
			return null;

		case 'array':
			if ( Array.isArray( value ) ) {
				return value;
			}

			return Array.from( value );

		case 'integer':
		case 'number':
			return Number( value );
	}

	return value;
}

/**
 * Returns block attributes given a schema of attributes
 *
 * @param  {?Object} schema        Attributes Schema
 * @param  {string}  rawContent    Raw block content
 * @param  {?Object} attributes    Known block attributes (from delimiters)
 * @return {Object}                All block attributes
 */
export function getBlockAttributes( schema, rawContent, attributes ) {
	// Retrieve additional attributes sourced from content
	const sourcedAttributes = getSourcedAttributes(
		rawContent,
		schema
	);

	const blockAttributes = reduce( schema, ( result, source, key ) => {
		let value;
		if ( sourcedAttributes.hasOwnProperty( key ) ) {
			value = sourcedAttributes[ key ];
		} else if ( attributes ) {
			value = attributes[ key ];
		}

		// Return default if attribute value not assigned
		if ( undefined === value ) {
			// Nest the condition so that constructor coercion never occurs if
			// value is undefined and block type doesn't specify default value
			if ( 'default' in source ) {
				value = source.default;
			} else {
				return result;
			}
		}

		// Coerce value to specified type
		const coercedValue = asType( value, source.type );

		if ( 'development' === process.env.NODE_ENV &&
				! sourcedAttributes.hasOwnProperty( key ) &&
				value !== coercedValue ) {
			// Only in case of sourcing attribute from content do we want to
			// allow coercion, as comment attributes are serialized respecting
			// original data type. In development environments, log if value
			// coerced to specified type is not strictly equal. We still allow
			// coerced value to be assigned into attributes to avoid errors.
			//
			// Example:
			//   Number( 5 ) === 5
			//   Number( '5' ) !== '5'

			// eslint-disable-next-line no-console
			console.error(
				`Expected attribute "${ key }" of type ${ source.type }`
			);
		}

		result[ key ] = coercedValue;
		return result;
	}, {} );
	/*
	// If the block supports anchor, parse the id
	if ( blockType.supportAnchor ) {
		blockAttributes.anchor = hpqParse( rawContent, attr( '*', 'id' ) );
	}

	// If the block supports a custom className parse it
	if ( blockType.className !== false && attributes && attributes.className ) {
		blockAttributes.className = attributes.className;
	}
*/
	return blockAttributes;
}

/**
 * Creates a block with fallback to the unknown type handler.
 *
 * @param  {?String} name       Block type name
 * @param  {String}  rawContent Raw block content
 * @param  {?Object} attributes Attributes obtained from block delimiters
 * @param  {?Number} version    The block version
 * @return {?Object}            An initialized block object (if possible)
 */
export function createBlockWithFallback( name, rawContent, attributes, version ) {
	let originalContent = rawContent; // originalContent before parsing
	let contentToValidate; // Content serialized after parsing or after migration from old block
	let parsedAttributes; // Parsed block attributes or migrated to

	// Convert 'core/text' blocks in existing content to the new
	// 'core/paragraph'.
	if ( name === 'core/text' || name === 'core/cover-text' ) {
		name = 'core/paragraph';
	}
	let shouldFallback = false;

	// Checking The BlockType
	const blockType = getBlockType( name );
	const fallbackBlockName = getUnknownTypeHandlerName();
	if ( blockType ) {
		const blockTypeVersion = blockType.version || 1;
		if ( blockTypeVersion !== version ) {
			const migration = find( blockType.migrations, ( mig ) => mig.version === version );
			if ( ! migration ) {
				shouldFallback = true;
			} else {
				// Needs to pass the migration.attributes instead to do the parsing
				const oldAttributes = getBlockAttributes( migration.attributes, rawContent, attributes );

				// Serialize using the old save
				contentToValidate = getSaveContent( migration.save, oldAttributes );

				// Migrate the old attributes
				parsedAttributes = migration.migrate( oldAttributes );
			}
		} else {
			parsedAttributes = getBlockAttributes( blockType.attributes, rawContent, attributes );
			contentToValidate = getSaveContent( blockType.save, parsedAttributes );
		}
	} else {
		shouldFallback = true;
	}

	// Fallback to the fallback block type
	if ( shouldFallback ) {
		// Explicit empty fallback blocks are ignored
		if ( ! name && ! rawContent ) {
			return;
		}

		const fallbackBlockType = getBlockType( fallbackBlockName );
		if ( ! fallbackBlockType ) {
			// eslint-disable-next-line no-console
			console.warn( `Block ${ name } ignored, no fallback block` );
			return;
		}

		if ( name ) {
			originalContent = getCommentDelimitedContent( name, attributes, rawContent, version );
		}

		name = fallbackBlockName;
		parsedAttributes = getBlockAttributes( fallbackBlockType.attributes, rawContent, attributes );
		contentToValidate = getSaveContent( fallbackBlockType.save, parsedAttributes );
	}

	const block = createBlock(
		name,
		parsedAttributes
	);

	block.isValid = isEquivalentHTML( originalContent, contentToValidate );

	// Preserve original content for future use in case the block is parsed
	// as invalid, or future serialization attempt results in an error
	block.originalContent = originalContent;

	return block;
}

/**
 * Parses the post content with a PegJS grammar and returns a list of blocks.
 *
 * @param  {String} content The post content
 * @return {Array}          Block list
 */
export function parseWithGrammar( content ) {
	return grammarParse( content ).reduce( ( memo, blockNode ) => {
		const { blockName, rawContent, attrs, version } = blockNode;
		const block = createBlockWithFallback( blockName, rawContent.trim(), attrs, version );
		if ( block ) {
			memo.push( block );
		}
		return memo;
	}, [] );
}

export default parseWithGrammar;
