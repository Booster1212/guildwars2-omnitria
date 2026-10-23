import React, { useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Origin } from '../../domain/sources';
import { splitCoins } from '../../domain/costs';
import { isUntradable, DisciplineId } from '../../domain/types';
import { WEAPON_TYPE_DE } from '../../domain/legendary';
import { getItem, useItems, cleanDescription, getItemLanguage } from '../../data/gw2/items';
import { getPrice } from '../../data/gw2/prices';
import { getAccountState } from '../../data/gw2/account';
import { ITEM_TYPE_DE, RARITY_DE, fmtInt, DISCIPLINE_ICONS, DISCIPLINE_ICON_ITEM, DISCIPLINE_DE } from './labels';

/* ---------- Münzen ---------- */
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
const ORIGIN_META: Record<Origin | 'personal', { label: string; title: string }> = {
  official: { label: 'API', title: 'Offizielle GW2-API' },
  community: { label: 'Community', title: 'Community-Datensatz (nicht offiziell, nicht per API prüfbar)' },
  derived: { label: 'Berechnet', title: 'Aus den vorhandenen Daten berechnet' },
  unknown: { label: 'Unbekannt', title: 'Keine verlässliche Quelle vorhanden' },
  personal: { label: 'Konto', title: 'Persönliche Daten aus deinem Account' },
};
export const OriginBadge: React.FC<{ origin: Origin | 'personal' }> = ({ origin }) => (
  <span className={`origin o-${origin}`} title={ORIGIN_META[origin].title}>
    {ORIGIN_META[origin].label}
  </span>
);

/* ---------- Kontrollkästchen ---------- */
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

/* ---------- Item-Symbol mit Tooltip im Spielstil ---------- */
interface TipState {
  x: number;
  y: number;
}

export const ItemIcon: React.FC<{
  id: number;
  count?: number;
  size?: 's' | 'm' | 'l';
  onClick?: () => void;
  /** Zusätzliche Tooltip-Zeilen (z. B. „Bedarf 12 / Vorhanden 4“) */
  extra?: string[];
  dim?: boolean;
  fallbackIcon?: string;
}> = ({ id, count, size = 'm', onClick, extra, dim, fallbackIcon }) => {
  // Automatically subscribe and fetch item icon from official API
  const { get } = useItems(id > 0 ? [id] : []);
  const item = id > 0 ? get(id) : undefined;
  const ref = useRef<HTMLElement | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setTip({ x: r.right + 6, y: r.top });
  };
  const rarity = item?.rarity ?? 'Basic';
  const cls = `gi gi-${size} r-${rarity} ${onClick ? 'clickable' : ''} ${dim ? 'dim' : ''}`;
  
  const iconSrc = (!imgFailed && item?.icon) ? item.icon : fallbackIcon;

  const inner = (
    <>
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={item?.name || ''}
          loading="lazy"
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="gi-empty" />
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
          aria-label={item?.name ?? `Gegenstand ${id}`}
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
};

/* ---------- Berufs-Symbol (Offizielles Disziplin-Emblem mit Fallback) ---------- */
export const DisciplineIcon: React.FC<{
  discipline: DisciplineId;
  size?: 's' | 'm' | 'l';
  onClick?: () => void;
}> = ({ discipline, size = 'm', onClick }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const iconUrl = DISCIPLINE_ICONS[discipline];
  const repItemId = DISCIPLINE_ICON_ITEM[discipline];

  if (!imgFailed && iconUrl) {
    const cls = `gi gi-${size} r-Ascended disc-emblem-wrap ${onClick ? 'clickable' : ''}`;
    return (
      <span className={cls} onClick={onClick} title={DISCIPLINE_DE[discipline]}>
        <img
          src={iconUrl}
          alt={DISCIPLINE_DE[discipline]}
          loading="lazy"
          draggable={false}
          onError={() => setImgFailed(true)}
          className="disc-emblem-img"
        />
      </span>
    );
  }

  return <ItemIcon id={repItemId} size={size} onClick={onClick} />;
};

const ItemTooltip: React.FC<{ id: number; x: number; y: number; extra?: string[] }> = ({ id, x, y, extra }) => {
  const item = getItem(id);
  const price = getPrice(id);
  const stock = getAccountState().stockMap.get(id);
  const hasStock = getAccountState().hasStockData;
  const isEn = getItemLanguage() === 'en';
  const ref = useRef<HTMLDivElement | null>(null);
  // Position korrigieren, falls der Tooltip aus dem Fenster ragt
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
