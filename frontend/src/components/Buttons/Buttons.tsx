import React, { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "warning"
  | "ghost"
  | "navy"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  /** Button label. */
  title: string;
  /** Explicit color/intent. Defaults to "primary". */
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string; // Tabler icon class, e.g. "ti-trash"
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  /** Render as a square icon-only button. Requires `icon` and uses `title` as aria-label. */
  iconOnly?: boolean;
  children?: ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    title,
    variant = "primary",
    size = "md",
    icon,
    iconPosition = "left",
    loading = false,
    fullWidth = false,
    iconOnly = false,
    disabled,
    className = "",
    children,
    ...rest
  },
  ref
) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? "btn--full" : "",
    iconOnly ? "btn--icon-only" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? title : undefined}
      {...rest}
    >
      {loading && <i className="ti ti-loader-2 btn-spinner" aria-hidden="true" />}
      {!loading && icon && iconPosition === "left" && (
        <i className={`ti ${icon}`} aria-hidden="true" />
      )}
      {!iconOnly && <span>{children ?? title}</span>}
      {!loading && icon && iconPosition === "right" && (
        <i className={`ti ${icon}`} aria-hidden="true" />
      )}
    </button>
  );
});

export default Button;
