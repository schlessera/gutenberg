/**
 * Internal dependencies
 */
import { disableIsSidebarOpenedOnMobile } from '../mobile';

describe( 'disableIsSidebarOpenOnMobile()', () => {
	it( 'should disable isSidebarOpen on mobile and keep other properties as before', () => {
		const input = {
			isSidebarOpened: true,
			dummyPref: 'dummy',
		};
		const output = {
			isSidebarOpened: false,
			dummyPref: 'dummy',
		};
		expect( disableIsSidebarOpenedOnMobile( input, true ) ).toEqual( output );
	} );

	it( 'should keep isSidebarOpen on non-mobile and keep other properties as before', () => {
		const input = {
			isSidebarOpened: true,
			dummy: 'non-dummy',
		};
		const output = {
			isSidebarOpened: true,
			dummy: 'non-dummy',
		};
		expect( disableIsSidebarOpenedOnMobile( input, false ) ).toEqual( output );
	} );
} );
