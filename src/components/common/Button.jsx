import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';
import Icon from './Icon';
import styles from '../../styles/Button.module.css';

/**
 * variant: primary | secondary | outline | ghost | danger | accent
 * size: sm | md | lg
 * Pass `to` to render a router Link, `href` for an anchor.
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon,
    iconRight,
    iconOnly = false,
    to,
    href,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  ref
) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth && styles.full,
    iconOnly && styles.iconOnly,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? (
        <Spinner size="sm" inline label="" />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />
      )}
      {children && <span className={styles.label}>{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} aria-disabled={disabled || undefined} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={cls} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
