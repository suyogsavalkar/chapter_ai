import * as React from 'react';
import { cn } from '@/lib/utils';

type SwitchProps = {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  'aria-label'?: string;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      id,
      checked,
      defaultChecked,
      disabled,
      onCheckedChange,
      className,
      ...props
    },
    ref,
  ) => {
    const [internal, setInternal] = React.useState<boolean>(!!defaultChecked);
    const isControlled = typeof checked === 'boolean';
    const value = isControlled ? checked! : internal;

    const toggle = () => {
      if (disabled) return;
      const next = !value;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        type="button"
        id={id}
        ref={ref}
        role="switch"
        aria-checked={value}
        aria-disabled={disabled}
        onClick={toggle}
        disabled={disabled}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          value ? 'bg-primary' : 'bg-input',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition-transform',
            value ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    );
  },
);

Switch.displayName = 'Switch';

export default Switch;
