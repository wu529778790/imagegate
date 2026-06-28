/**
 * AccessibleButton - Enhanced button with ARIA attributes
 */

import React from 'react';
import { Button, ButtonProps } from 'antd';

export interface AccessibleButtonProps extends ButtonProps {
  /** Accessible label (overrides children if provided) */
  ariaLabel?: string;
  /** Description for screen readers */
  ariaDescription?: string;
  /** Whether button is expanded (for toggle buttons) */
  ariaExpanded?: boolean;
  /** Whether button is pressed (for toggle buttons) */
  ariaPressed?: boolean;
  /** Controls element ID (for aria-controls) */
  ariaControls?: string;
}

export function AccessibleButton({
  ariaLabel,
  ariaDescription,
  ariaExpanded,
  ariaPressed,
  ariaControls,
  children,
  ...props
}: AccessibleButtonProps) {
  const ariaProps: React.AriaAttributes = {};
  if (ariaLabel) ariaProps['aria-label'] = ariaLabel;
  if (ariaDescription) ariaProps['aria-description'] = ariaDescription;
  if (ariaExpanded !== undefined) ariaProps['aria-expanded'] = ariaExpanded;
  if (ariaPressed !== undefined) ariaProps['aria-pressed'] = ariaPressed;
  if (ariaControls) ariaProps['aria-controls'] = ariaControls;

  return (
    <Button {...props} {...ariaProps}>
      {children}
    </Button>
  );
}
