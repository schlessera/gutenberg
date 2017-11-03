
const IS_MOBILE = window && window.innerWidth < 782;

/**
 * Disables isSidebarOpened on rehydrate payload if the user is on a mobile screen size.
 *
 * @param  {Object}  payload   rehydrate payload
 * @param  {Boolean} isMobile  flag indicating if executing on mobile screen sizes or not
 *
 * @return {Object}            rehydrate payload with isSidebarOpened disabled if on mobile
 */
export const disableIsSidebarOpenedOnMobile = ( payload, isMobile = IS_MOBILE ) => (
	isMobile ? { ...payload, isSidebarOpened: false } : payload
);
