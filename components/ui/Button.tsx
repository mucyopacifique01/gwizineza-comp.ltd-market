import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'dark' | 'sun' | 'outline' | 'ghost' | 'danger' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

type Common = { variant?: Variant; size?: Size; block?: boolean; icon?: IconName; iconRight?: IconName; iconOnly?: boolean; loading?: boolean; children?: ReactNode };

function classes({ variant = 'primary', size = 'md', block, iconOnly }: Common, extra?: string) {
  return ['btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block', iconOnly && 'btn-icon', extra].filter(Boolean).join(' ');
}

function Inner({ icon, iconRight, loading, children, size }: Common) {
  const s = size === 'sm' ? 16 : 18;
  return (
    <>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={s} /> : null}
      {children !== undefined && <span className="btn-label">{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={s} />}
    </>
  );
}

export function Button({ variant, size, block, icon, iconRight, iconOnly, loading, children, className, disabled, type = 'button', ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  const props = { variant, size, block, icon, iconRight, iconOnly, loading, children };
  return (
    <button type={type} className={classes(props, className)} disabled={disabled || loading} data-loading={loading ? 'true' : undefined} aria-busy={loading || undefined} {...rest}>
      <Inner {...props} />
    </button>
  );
}

export function ButtonLink({ href, variant, size, block, icon, iconRight, iconOnly, children, className, ...rest }: Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const props = { variant, size, block, icon, iconRight, iconOnly, children };
  const external = /^https?:\/\//.test(href);
  if (external) return <a href={href} className={classes(props, className)} target="_blank" rel="noopener noreferrer" {...rest}><Inner {...props} /></a>;
  return <Link href={href} className={classes(props, className)} {...rest}><Inner {...props} /></Link>;
}
