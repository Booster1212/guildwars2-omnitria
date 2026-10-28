import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Origin } from '../../domain/sources';
import { splitCoins } from '../../domain/costs';
import { isUntradable, DisciplineId } from '../../domain/types';
import { WEAPON_TYPE_DE } from '../../domain/legendary';
import {
  getItem,
  useItem,
  cleanDescription,
  getItemLanguage,
  markIconUrlFailed,
  isIconUrlFailed,
} from '../../data/gw2/items';
import { getPrice } from '../../data/gw2/prices';
import { getAccountState } from '../../data/gw2/account';
import {
  ITEM_TYPE_DE,
  RARITY_DE,
  fmtInt,
  DISCIPLINE_ICONS,
  DISCIPLINE_ICON_ITEM,
  DISCIPLINE_DE,
  DISCIPLINE_EN,
} from './labels';

/* ---------- Coins ---------- */
export const Coin: React.FC<{ copper: number | null | undefined; approx?: boolean }> = ({ copper, approx }) => {
  if (copper === null || copper === undefined) return <span className="coin none">–</span>;
  const { gold, silver, copper: c } = splitCoins(copper);
  return (
    <span className="coin" title={`${fmtInt(copper)} Kupfer`}>
      {approx && <span className="coin-approx">≈</span>}
      {gold > 0 && (
        <span className="coin-part">
          {fmtInt(gold)}
          <i className="cn g" />
        </span>
      )}
      {(gold > 0 || silver > 0) && (
        <span className="coin-part">
          {silver}
          <i className="cn s" />
        </span>
      )}
      <span className="coin-part">
        {c}
        <i className="cn c" />
      </span>
    </span>
  );
};

/* ---------- Fortschrittsbalken ---------- */
export const ProgressBar: React.FC<{ value: number; label?: string; tone?: 'gold' | 'green'; slim?: boolean }> = ({
  value,
  label,
  tone = 'green',
  slim,
}) => {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={`pbar ${tone} ${slim ? 'slim' : ''} ${v >= 1 ? 'full' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="pbar-fill" style={{ width: `${v * 100}%` }} />
      {label !== undefined && <span className="pbar-label">{label}</span>}
    </div>
  );
};

/* ---------- Hinweise ---------- */
export const Notice: React.FC<{
  tone?: 'info' | 'warn' | 'error' | 'ok';
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ tone = 'info', title, children, action }) => (
  <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <div className="notice-body">
      {title && <strong>{title}</strong>}
      {children && <span>{children}</span>}
    </div>
    {action}
  </div>
);

/* ---------- Reiter ---------- */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; badge?: string | number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          className={`tab ${t.id === value ? 'on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge !== undefined && <span className="tab-badge">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Herkunft ---------- */
const ORIGIN_META: Record<Origin | 'personal', { label: string; labelEn: string; title: string; titleEn: string }> = {
  official: {
    label: 'API',
    labelEn: 'API',
    title: 'Offizielle GW2-API',
    titleEn: 'Official GW2 API',
  },
  community: {
    label: 'Community',
    labelEn: 'Community',
    title: 'Community-Datensatz (nicht offiziell, nicht per API prüfbar)',
    titleEn: 'Community dataset (curated, not verifiable via official API)',
  },
  derived: {
    label: 'Berechnet',
    labelEn: 'Derived',
    title: 'Aus den vorhandenen Daten berechnet',
    titleEn: 'Calculated from available data',
  },
  unknown: {
    label: 'Unbekannt',
    labelEn: 'Unknown',
    title: 'Keine verlässliche Quelle vorhanden',
    titleEn: 'No verified source available',
  },
  personal: {
    label: 'Konto',
    labelEn: 'Account',
    title: 'Persönliche Daten aus deinem Account',
    titleEn: 'Personal data from your synced GW2 account',
  },
};
export const OriginBadge: React.FC<{ origin: Origin | 'personal' }> = ({ origin }) => {
  const isEn = getItemLanguage() === 'en';
  const meta = ORIGIN_META[origin];
  return (
    <span className={`origin o-${origin}`} title={isEn ? meta.titleEn : meta.title}>
      {isEn ? meta.labelEn : meta.label}
    </span>
  );
};

/* ---------- Checkboxes ---------- */
export const Check: React.FC<{
  checked: boolean;
  onChange: () => void;
  label?: string;
  title?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, title, disabled }) => (
  <label className={`chk ${disabled ? 'dis' : ''}`} title={title}>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
    <span className="chk-box" aria-hidden="true" />
    {label && <span className="chk-label">{label}</span>}
  </label>
);

export const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <span className="spinner-wrap">
    <i className="spinner" aria-hidden="true" />
    {label && <span>{label}</span>}
  </span>
);

/* ---------- Item icon with game-style tooltip ---------- */
interface TipState {
  x: number;
  y: number;
}

const ICON_SIZE_PX: Record<'s' | 'm' | 'l', number> = {
  s: 22,
  m: 34,
  l: 44,
};

export const ItemIcon: React.FC<{
  id: number;
  count?: number;
  size?: 's' | 'm' | 'l';
  onClick?: () => void;
  /** Additional tooltip lines (e.g. "Demand 12 / Owned 4") */
  extra?: string[];
  dim?: boolean;
  fallbackIcon?: string;
}> = React.memo(({ id, count, size = 'm', onClick, extra, dim, fallbackIcon }) => {
  // Subscribe only to this specific item ID to prevent O(N) mass re-renders across all icons
  const item = useItem(id);
  const ref = useRef<HTMLElement | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const primaryIconUrl = item?.icon;
  const [imgFailed, setImgFailed] = useState<boolean>(() => isIconUrlFailed(primaryIconUrl));

  useEffect(() => {
    setImgFailed(isIconUrlFailed(primaryIconUrl));
  }, [id, primaryIconUrl]);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setTip({ x: r.right + 6, y: r.top });
  };
  const rarity = item?.rarity ?? 'Basic';
  const cls = `gi gi-${size} r-${rarity} ${onClick ? 'clickable' : ''} ${dim ? 'dim' : ''}`;
  const pxDim = ICON_SIZE_PX[size] ?? 34;

  const iconSrc = !imgFailed && primaryIconUrl ? primaryIconUrl : fallbackIcon;
  const isEn = getItemLanguage() === 'en';
  const accessibleLabel = item?.name ?? (isEn ? `Item ${id}` : `Gegenstand ${id}`);

  const inner = (
    <>
      {iconSrc && !isIconUrlFailed(iconSrc) ? (
        <img
          src={iconSrc}
          alt={item?.name || ''}
          width={pxDim}
          height={pxDim}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => {
            markIconUrlFailed(iconSrc);
            setImgFailed(true);
          }}
        />
      ) : (
        <span className="gi-empty" aria-hidden="true" />
      )}
      {count !== undefined && count > 1 && <span className="gi-count">{count > 9999 ? '9999+' : fmtInt(count)}</span>}
    </>
  );
  const handlers = { onMouseEnter: show, onMouseLeave: () => setTip(null), onFocus: show, onBlur: () => setTip(null) };
  return (
    <>
      {onClick ? (
        <button
          type="button"
          ref={ref as React.RefObject<HTMLButtonElement>}
          className={cls}
          onClick={onClick}
          aria-label={accessibleLabel}
          {...handlers}
        >
          {inner}
        </button>
      ) : (
        <span ref={ref as React.RefObject<HTMLSpanElement>} className={cls} {...handlers}>
          {inner}
        </span>
      )}
      {tip && createPortal(<ItemTooltip id={id} x={tip.x} y={tip.y} extra={extra} />, document.body)}
    </>
  );
});

/* ---------- Discipline symbol (Official discipline emblem with fallback) ---------- */
export const DisciplineIcon: React.FC<{
  discipline: DisciplineId;
  size?: 's' | 'm' | 'l';
  onClick?: () => void;
}> = React.memo(({ discipline, size = 'm', onClick }) => {
  const iconUrl = DISCIPLINE_ICONS[discipline];
  const [imgFailed, setImgFailed] = useState<boolean>(() => isIconUrlFailed(iconUrl));
  const repItemId = DISCIPLINE_ICON_ITEM[discipline];
  const pxDim = ICON_SIZE_PX[size] ?? 34;
  const isEn = getItemLanguage() === 'en';
  const discLabel = isEn ? DISCIPLINE_EN[discipline] : DISCIPLINE_DE[discipline];

  useEffect(() => {
    setImgFailed(isIconUrlFailed(iconUrl));
  }, [discipline, iconUrl]);

  if (!imgFailed && iconUrl) {
    const cls = `gi gi-${size} r-Ascended disc-emblem-wrap ${onClick ? 'clickable' : ''}`;
    const imgEl = (
      <img
        src={iconUrl}
        alt={discLabel}
        width={pxDim - 4}
        height={pxDim - 4}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => {
          markIconUrlFailed(iconUrl);
          setImgFailed(true);
        }}
        className="disc-emblem-img"
      />
    );
    if (onClick) {
      return (
        <button type="button" className={cls} onClick={onClick} title={discLabel} aria-label={discLabel}>
          {imgEl}
        </button>
      );
    }
    return (
      <span className={cls} title={discLabel}>
        {imgEl}
      </span>
    );
  }

  return <ItemIcon id={repItemId} size={size} onClick={onClick} />;
});

const ItemTooltip: React.FC<{ id: number; x: number; y: number; extra?: string[] }> = ({ id, x, y, extra }) => {
  const item = getItem(id);
  const price = getPrice(id);
  const stock = getAccountState().stockMap.get(id);
  const hasStock = getAccountState().hasStockData;
  const isEn = getItemLanguage() === 'en';
  const ref = useRef<HTMLDivElement | null>(null);
  // Correct position if tooltip overflows window boundary
  const [pos, setPos] = useState({ left: x, top: y });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + r.width > window.innerWidth - 4) left = Math.max(4, x - r.width - 46);
    if (top + r.height > window.innerHeight - 4) top = Math.max(4, window.innerHeight - r.height - 4);
    setPos({ left, top });
  }, [x, y, id]);

  if (!item) {
    return (
      <div className="tip" ref={ref} style={pos}>
        <div className="tip-name">{isEn ? `Item ${id}` : `Gegenstand ${id}`}</div>
        <div className="tip-dim">{isEn ? 'Loading item data…' : 'Daten werden geladen …'}</div>
      </div>
    );
  }
  const typeLine = isEn
    ? (item.type === 'Weapon' && item.weaponType ? item.weaponType : item.type)
    : (item.type === 'Weapon' && item.weaponType
      ? `${WEAPON_TYPE_DE[item.weaponType] ?? item.weaponType}`
      : (ITEM_TYPE_DE[item.type] ?? item.type));
  const rarityLabel = isEn ? item.rarity : (RARITY_DE[item.rarity] ?? item.rarity);
  const desc = cleanDescription(item.description);
  return (
    <div className="tip" ref={ref} style={pos} role="tooltip">
      <div className={`tip-name r-${item.rarity}`}>{item.name}</div>
      <div className="tip-type">
        {rarityLabel} · {typeLine}
        {item.level > 0 ? (isEn ? ` · Level ${item.level}` : ` · Stufe ${item.level}`) : ''}
      </div>
      {desc && <div className="tip-desc">{desc}</div>}
      {isUntradable(item) && (
        <div className="tip-bind">
          {item.flags.includes('AccountBound')
            ? (isEn ? 'Account Bound' : 'Accountgebunden')
            : (isEn ? 'Soulbound' : 'Seelengebunden')}
        </div>
      )}
      {price && price.sell > 0 && !isUntradable(item) && (
        <div className="tip-row">
          <span>{isEn ? 'Trading Post' : 'Handelsgesellschaft'}</span>
          <Coin copper={price.sell} />
        </div>
      )}
      {item.vendorValue > 0 && (
        <div className="tip-row dim">
          <span>{isEn ? 'Vendor Value' : 'Händlerwert'}</span>
          <Coin copper={item.vendorValue} />
        </div>
      )}
      {hasStock && (
        <div className="tip-row">
          <span>{isEn ? 'In Inventory' : 'Im Besitz'}</span>
          <b>{fmtInt(stock ?? 0)}</b>
        </div>
      )}
      {extra?.map((l, i) => (
        <div className="tip-extra" key={i}>
          {l}
        </div>
      ))}
    </div>
  );
};
