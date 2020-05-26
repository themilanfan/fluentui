import { compose } from '@fluentui/react-bindings';

import { commonPropTypes } from '../../utils';
import Box, { BoxProps, BoxStylesProps } from '../Box/Box';

export interface ToolbarMenuRadioGroupWrapperOwnProps {}
export interface ToolbarMenuRadioGroupWrapperProps extends ToolbarMenuRadioGroupWrapperOwnProps, BoxProps {}

export type ToolbarMenuRadioGroupWrapperStylesProps = never;
export const toolbarMenuRadioGroupWrapperClassName = 'ui-toolbars__wrapper';

/**
 * An ToolbarMenuRadioGroupWrapper provides a wrapping slot for in  ToolbarMenuRadioGroup.
 */
const ToolbarMenuRadioGroupWrapper = compose<
  'li',
  ToolbarMenuRadioGroupWrapperOwnProps,
  ToolbarMenuRadioGroupWrapperStylesProps,
  BoxProps,
  BoxStylesProps
>(Box, {
  className: toolbarMenuRadioGroupWrapperClassName,
  displayName: 'ToolbarMenuRadioGroupWrapper',

  shorthandConfig: { mappedProp: 'content' },
});

ToolbarMenuRadioGroupWrapper.defaultProps = {
  as: 'li',
};
ToolbarMenuRadioGroupWrapper.propTypes = commonPropTypes.createCommon();

export default ToolbarMenuRadioGroupWrapper;
