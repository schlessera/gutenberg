{

/** <?php
// The `maybeJSON` function is not needed in PHP because its return semantics
// are the same as `json_decode`

// array arguments are backwards because of PHP
if ( ! function_exists( 'peg_array_partition' ) ) {
    function peg_array_partition( $array, callable $predicate ) {
        $truthy = array();
        $falsey = array();

        foreach ( $array as $item ) {
            call_user_func( $predicate, $item )
                ? $truthy[] = $item
                : $falsey[] = $item;
        }

        return array( $truthy, $falsey );
    }
}

if ( ! function_exists( 'peg_join_blocks' ) ) {
    function peg_join_blocks( $pre, $tokens, $post ) {
        $blocks = array();
        
        if ( ! empty( $pre ) ) {
            $blocks[] = array( 'blockName' => 'core/freeform', 'innerHTML' => $pre );
        }
        
        foreach ( $tokens as $token ) {
            list( $token, $html ) = $token;
            
            $blocks[] = $token;
            
            if ( ! empty( $html ) ) {
                $blocks[] = array( 'blockName' => 'core/freeform', 'innerHTML' => $html );
            }
        }
        
        if ( ! empty( $post ) ) {
            $blocks[] = array( 'blockName' => 'core/freeform', 'innerHTML' => $post );
        }
    }
}

?> **/

function freeform( s ) {
  return s.length && {
    blockName: 'core/freeform',
    innerHTML: s
  };
}

function joinBlocks( pre, tokens, post ) {
    var blocks = [], i, l, html, item, token;
    
    if ( pre.length ) {
        blocks.push( freeform( pre ) );
    }
    
    for ( i = 0, l = tokens.length; i < l; i++ ) {
        item = tokens[ i ];
        token = item[ 0 ];
        html = item[ 1 ];
        
        blocks.push( token );
        if ( html.length ) {
            blocks.push( freeform( html ) );
        }
    }
    
    if ( post.length ) {
        blocks.push( freeform( post ) );
    }
    
    return blocks;
}

function maybeJSON( s ) {
    try {
        return JSON.parse( s );
    } catch (e) {
        return null;
    }
}

function partition( predicate, list ) {
    var i, l, item;
    var truthy = [];
    var falsey = [];

    // nod to performance over a simpler reduce
    // and clone model we could have taken here
    for ( i = 0, l = list.length; i < l; i++ ) {
        item = list[ i ];

        predicate( item )
            ? truthy.push( item )
            : falsey.push( item );
    };

    return [ truthy, falsey ];
}

}

Block_List
  = pre:$(!Token .)*
    ts:(t:Token html:$((!Token .)*) { /** <?php return $t; ?> **/ return [ t, html ] })*
    post:$(.*)
  { /** <?php return peg_join_blocks( $pre, $ts, $post ); ?> **/
    return joinBlocks( pre, ts, post );
  }

Token
  = Tag_More
  / Block_Void
  / Block_Balanced

Tag_More
  = "<!--" WS* "more" customText:(WS+ text:$((!(WS* "-->") .)+) { /** <?php return $text; ?> **/ return text })? WS* "-->" noTeaser:(WS* "<!--noteaser-->")?
  { /** <?php
    $attrs = array( 'noTeaser' => (bool) $noTeaser );
    if ( ! empty( $customText ) ) {
      $attrs['customText'] = $customText;
    }
    return array(
       'blockName' => 'core/more',
       'attrs' => $attrs,
       'innerHTML' => ''
    );
    ?> **/
    return {
      blockName: 'core/more',
      attrs: {
        customText: customText || undefined,
        noTeaser: !! noTeaser
      },
      innerHTML: ''
    }
  }

Block_Void
  = "<!--" WS+ "wp:" blockName:Block_Name WS+ attrs:(a:Block_Attributes WS+ {
    /** <?php return $a; ?> **/
    return a;
  })? "/-->"
  {
    /** <?php
    return array(
      'blockName'  => $blockName,
      'attrs'      => $attrs,
      'innerBlocks' => array(),
      'innerHTML' => '',
    );
    ?> **/

    return {
      blockName: blockName,
      attrs: attrs,
      innerBlocks: [],
      innerHTML: ''
    };
  }

Block_Balanced
  = s:Block_Start children:(Token / $(!Block_End .))+ e:Block_End
  {
    /** <?php
    list( $innerHTML, $innerBlocks ) = peg_array_partition( $children, 'is_string' );

    return array(
      'blockName'  => $s['blockName'],
      'attrs'      => $s['attrs'],
      'innerBlocks'  => $innerBlocks,
      'innerHTML'  => implode( '', $innerHTML ),
    );
    ?> **/

    var innerContent = partition( function( a ) { return 'string' === typeof a }, children );
    var innerHTML = innerContent[ 0 ];
    var innerBlocks = innerContent[ 1 ];

    return {
      blockName: s.blockName,
      attrs: s.attrs,
      innerBlocks: innerBlocks,
      innerHTML: innerHTML.join( '' )
    };
  }

Block_Start
  = "<!--" WS+ "wp:" blockName:Block_Name WS+ attrs:(a:Block_Attributes WS+ {
    /** <?php return $a; ?> **/
    return a;
  })? "-->"
  {
    /** <?php
    return array(
      'blockName' => $blockName,
      'attrs'     => $attrs,
    );
    ?> **/

    return {
      blockName: blockName,
      attrs: attrs
    };
  }

Block_End
  = "<!--" WS+ "/wp:" blockName:Block_Name WS+ "-->"
  {
    /** <?php
    return array(
      'blockName' => $blockName,
    );
    ?> **/

    return {
      blockName: blockName
    };
  }

Block_Name
  = Namespaced_Block_Name
  / Core_Block_Name

Namespaced_Block_Name
  = $(ASCII_Letter ASCII_AlphaNumeric* "/" ASCII_Letter ASCII_AlphaNumeric*)

Core_Block_Name
  = type:$(ASCII_Letter ASCII_AlphaNumeric*)
  {
    /** <?php return "core/$type"; ?> **/
    return 'core/' + type;
  }

Block_Attributes
  = attrs:$("{" (!("}" WS+ """/"? "-->") .)* "}")
  {
    /** <?php return json_decode( $attrs, true ); ?> **/
    return maybeJSON( attrs );
  }

ASCII_AlphaNumeric
  = ASCII_Letter
  / ASCII_Digit
  / Special_Chars

ASCII_Letter
  = [a-zA-Z]

ASCII_Digit
  = [0-9]

Special_Chars
  = [\-\_]

WS
  = [ \t\r\n]

Newline
  = [\r\n]

_
  = [ \t]

__
  = _+

Any
  = .
