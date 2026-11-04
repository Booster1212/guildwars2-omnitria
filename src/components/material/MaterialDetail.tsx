import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronLeft,
  ExternalLink,
  X,
  BookOpen,
  Copy,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  Info,
} from 'lucide-react';
import type { LegendaryModel } from '../../domain/legendary';
import { WEAPON_TYPE_DE } from '../../domain/legendary';
import { resolveSources, KIND_META } from '../../domain/sources';
import type { Recipe } from '../../domain/types';
import { isUntradable } from '../../domain/types';
import { getItem, useItems, cleanDescription } from '../../data/gw2/items';
import { usePrices } from '../../data/gw2/prices';
import { useAccountState } from '../../data/gw2/account';
import { useRecipeDb } from '../../data/gw2/recipes';
import { openExternal, wikiSearchUrl, encodeItemChatCode } from '../../data/external';
import { Coin, ItemIcon, Notice, OriginBadge, ProgressBar } from '../common/ui';
import { getDisciplineName, getItemTypeName, getRarityName, fmtInt } from '../common/labels';
import type { DisciplineId } from '../../domain/types';
import { useTranslation } from '../../i18n';

interface Props {
  itemId: number;
  model: LegendaryModel;
  /** Demand from current view (weapon/planner) */
  need?: { total: number; missing: number } | null;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenItem: (id: number) => void;
}

export const MaterialDetail: React.FC<Props> = ({
  itemId,
  model,
  need,
  canGoBack,
  onBack,
  onClose,
  onOpenItem,
}) => {
  const { lang, t } = useTranslation();
  const recipeDb = useRecipeDb(false);
  const account = useAccountState();
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  // Keyboard shortcut: Escape to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const breakdownLabels = useMemo(() => {
    return lang === 'en'
      ? ['Material Storage', 'Bank', 'Shared Inventory', 'Characters']
      : ['Materiallager', 'Bank', 'Geteiltes Inventar', 'Charaktere'];
  }, [lang]);

  // Official recipes that craft / consume this item
  const official = recipeDb.byOutput.get(itemId) ?? [];
  const usedIn = useMemo(() => {
    if (recipeDb.status !== 'ready') return [] as Recipe[];
    return recipeDb.recipes.filter((r) => r.ingredients.some((i) => i.itemId === itemId));
  }, [recipeDb.recipes, recipeDb.status, itemId]);

  const communityRecipe = model.recipeFor(itemId);
  const shownRecipes: Recipe[] = communityRecipe ? [communityRecipe] : official.slice(0, 3);

  const relatedIds = useMemo(() => {
    const ids = new Set<number>([itemId]);
    shownRecipes.forEach((r) => {
      ids.add(r.outputId);
      r.ingredients.forEach((i) => ids.add(i.itemId));
    });
    usedIds(usedIn).forEach((i) => ids.add(i));
    return [...ids];
  }, [itemId, shownRecipes, usedIn]);
  useItems(relatedIds);
  const prices = usePrices(useMemo(() => [itemId], [itemId]));

  const item = getItem(itemId);
  const price = prices.map.get(itemId);
  const tags = model.tags(itemId);
  const sources = resolveSources({
    item,
    tags,
    recipe: communityRecipe ?? official[0],
    vendorRecipe: model.vendorRecipeFor(itemId),
    price,
  });
  const caveats = [
    ...new Set(
      sources.flatMap((s) =>
        lang === 'en' ? (s.caveatsEn && s.caveatsEn.length ? s.caveatsEn : s.caveats) : s.caveats
      )
    ),
  ];
  const stock = account.stockMap.get(itemId) ?? 0;
  const bd = account.data?.breakdown[itemId];
  const charBd = account.data?.characterBreakdown?.[itemId];
  const charEntries = useMemo(() => {
    if (!charBd) return [];
    return Object.entries(charBd)
      .filter(([name, cnt]) => Boolean(name) && cnt > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [charBd]);
  const untradable = isUntradable(item);

  const usedInOutputs = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const r of usedIn) {
      if (!seen.has(r.outputId)) {
        seen.add(r.outputId);
        out.push(r.outputId);
      }
    }
    return out;
  }, [usedIn]);
  useItems(usedInOutputs.slice(0, 16));

  const chatCode = useMemo(() => encodeItemChatCode(itemId), [itemId]);

  const handleCopyChatCode = () => {
    if (!chatCode) return;
    navigator.clipboard.writeText(chatCode);
    setCopiedAction('chatCode');
    setTimeout(() => setCopiedAction(null), 2200);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(itemId));
    setCopiedAction('id');
    setTimeout(() => setCopiedAction(null), 2200);
  };

  // Demand progress fraction
  const demandProgress = need && need.total > 0 ? Math.min(1, Math.max(0, (need.total - need.missing) / need.total)) : 0;

  return (
    <aside className="drawer innovative-item-drawer" aria-label="Materialdetails">
      {/* Drawer Sticky Header */}
      <div className="drawer-head">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button className="btn ghost sm drawer-back-btn" onClick={onBack} title={lang === 'en' ? 'Back' : 'Zurück'}>
              <ChevronLeft size={14} /> {lang === 'en' ? 'Back' : 'Zurück'}
            </button>
          )}
          <span className="drawer-title">{lang === 'en' ? 'Item Details' : 'Gegenstands-Details'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn icon ghost drawer-close-btn"
            onClick={onClose}
            title={lang === 'en' ? 'Close (Esc)' : 'Schließen (Esc)'}
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="drawer-body">
        {/* 1. Hero Item Card */}
        <div className="md-hero-card">
          <div className="md-hero-top">
            <ItemIcon id={itemId} size="l" />
            <div className="md-hero-info">
              <h3 className={`md-hero-title r-${item?.rarity ?? 'Basic'}`}>
                {item?.name ?? (lang === 'en' ? `Item #${itemId}` : `Gegenstand #${itemId}`)}
              </h3>
              <div className="md-hero-sub dim flex items-center gap-1.5 flex-wrap">
                <span className={`rarity-label r-${item?.rarity ?? 'Basic'}`}>
                  {item ? getRarityName(item.rarity, lang) : '…'}
                </span>
                <span className="sep">·</span>
                <span>
                  {item
                    ? item.type === 'Weapon' && item.weaponType
                      ? (lang === 'en' ? item.weaponType : (WEAPON_TYPE_DE[item.weaponType] ?? item.weaponType))
                      : getItemTypeName(item.type, lang)
                    : '…'}
                </span>
                {item?.level !== undefined && item.level > 0 && (
                  <>
                    <span className="sep">·</span>
                    <span>Lv. {item.level}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {item?.description && (
            <div className="md-hero-desc">
              <p>{cleanDescription(item.description)}</p>
            </div>
          )}

          {/* Quick Innovative Action Bar */}
          <div className="md-quick-actions">
            {/* Primary Action: Look up in Wiki */}
            <button
              type="button"
              className="md-action-btn primary-wiki-btn"
              onClick={() => openExternal(wikiSearchUrl(item?.name ?? String(itemId), lang))}
              title={lang === 'en' ? 'Open official Guild Wars 2 Wiki' : 'Offizielles Guild Wars 2 Wiki öffnen'}
            >
              <BookOpen size={13} className="text-amber-400" />
              <span>{lang === 'en' ? 'Wiki Lookup' : 'Im Wiki nachschlagen'}</span>
              <ExternalLink size={10} className="opacity-70 ml-0.5" />
            </button>

            {/* Copy In-Game Chat Link */}
            {chatCode && (
              <button
                type="button"
                className={`md-action-btn chat-link-btn ${copiedAction === 'chatCode' ? 'copied' : ''}`}
                onClick={handleCopyChatCode}
                title={lang === 'en' ? `Copy in-game chat link (${chatCode})` : `In-Game Chat-Link kopieren (${chatCode})`}
              >
                <Copy size={12} />
                <span>{copiedAction === 'chatCode' ? (lang === 'en' ? 'Copied!' : 'Kopiert!') : 'Chat-Code'}</span>
              </button>
            )}

            {/* Copy Item ID */}
            <button
              type="button"
              className={`md-action-btn id-btn ${copiedAction === 'id' ? 'copied' : ''}`}
              onClick={handleCopyId}
              title={lang === 'en' ? 'Copy Item ID' : 'Item-ID kopieren'}
            >
              <span className="font-mono text-[10.5px]">#{itemId}</span>
            </button>

            {/* Trading Post / BLTC Link */}
            {!untradable && (
              <button
                type="button"
                className="md-action-btn bltc-btn"
                onClick={() => openExternal(`https://www.gw2bltc.com/en/item/${itemId}`)}
                title={lang === 'en' ? 'View live Trading Post history on GW2BLTC' : 'Live-Handelsposten auf GW2BLTC ansehen'}
              >
                <TrendingUp size={12} className="text-emerald-400" />
                <span>TP</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Quantities & Demand Card */}
        <section className="md-sec md-quantities-card">
          <div className="md-sec-header">
            <Package size={14} className="gold" />
            <h4>{lang === 'en' ? 'Stock & Demand' : 'Bestand & Bedarf'}</h4>
          </div>

          {need && (
            <div className="md-demand-progress-box">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="dim">{lang === 'en' ? 'Demand Fulfilled' : 'Bedarfs-Abdeckung'}</span>
                <span className="font-mono font-bold text-amber-300">{Math.round(demandProgress * 100)}%</span>
              </div>
              <ProgressBar value={demandProgress} tone="gold" slim />
            </div>
          )}

          <div className="md-kpi-grid">
            {need && (
              <div className="md-kpi-box">
                <span className="md-kpi-label">{lang === 'en' ? 'Total Demand' : 'Gesamtbedarf'}</span>
                <span className="md-kpi-val font-mono">{fmtInt(need.total)}</span>
              </div>
            )}
            <div className="md-kpi-box">
              <span className="md-kpi-label">{lang === 'en' ? 'Owned' : 'Im Besitz'}</span>
              <span className="md-kpi-val font-mono text-emerald-400">
                {account.hasStockData ? fmtInt(stock) : '–'}
              </span>
            </div>
            {need && (
              <div className="md-kpi-box">
                <span className="md-kpi-label">{lang === 'en' ? 'Missing' : 'Noch fehlend'}</span>
                <span className={`md-kpi-val font-mono ${need.missing > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {need.missing > 0 ? fmtInt(need.missing) : (lang === 'en' ? '0 (Done!)' : '0 (Erledigt!)')}
                </span>
              </div>
            )}
          </div>

          {/* Inventory Breakdown if available */}
          {bd && bd.some((n) => n > 0) && (
            <div className="md-breakdown-subtable">
              <span className="text-[11px] dim font-semibold mb-1 block">
                {lang === 'en' ? 'Storage Locations:' : 'Lagerorte:'}
              </span>
              <div className="space-y-1">
                {bd.map((n, i) =>
                  n > 0 ? (
                    <div key={i} className="flex justify-between items-center text-xs px-2 py-0.5 bg-black/30 rounded">
                      <span className="dim">{breakdownLabels[i]}</span>
                      <span className="font-mono font-semibold">{fmtInt(n)}</span>
                    </div>
                  ) : null
                )}
                {charEntries.length > 0 && (
                  <div className="pt-1 border-t border-white/5">
                    {charEntries.map(([charName, charCnt]) => (
                      <div key={`char-${charName}`} className="flex justify-between items-center text-[11px] px-2 py-0.5 dim">
                        <span className="truncate max-w-[180px]">↳ {charName}</span>
                        <span className="font-mono">{fmtInt(charCnt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!account.hasStockData && (
            <p className="hint text-xs dim italic mt-2">
              {lang === 'en'
                ? 'Stock tracking requires an API key with "inventories" permission.'
                : 'Bestände benötigen einen API-Schlüssel mit der Berechtigung „inventories“.'}
            </p>
          )}
        </section>

        {/* 3. Trading Post Market Card */}
        <section className="md-sec md-market-card">
          <div className="md-sec-header">
            <ShoppingBag size={14} className="gold" />
            <h4>{lang === 'en' ? 'Trading Post Market' : 'Handelsposten & Markt'}</h4>
          </div>

          {untradable ? (
            <div className="untradable-banner">
              <Info size={13} className="opacity-70" />
              <span>
                {lang === 'en'
                  ? `Item is ${item?.flags.includes('AccountBound') ? 'Account Bound' : 'Soulbound'} – not tradable.`
                  : `Gegenstand ist ${item?.flags.includes('AccountBound') ? 'accountgebunden' : 'seelengebunden'} – nicht handelbar.`}
              </span>
            </div>
          ) : price && (price.sell > 0 || price.buy > 0) ? (
            <div className="market-dual-cards">
              <div className="market-price-pill sell-pill">
                <span className="market-type-label">{lang === 'en' ? 'Instant Buy (Sell Offer)' : 'Sofortkauf (Verkaufsangebot)'}</span>
                <div className="market-coin-row">
                  <Coin copper={price.sell || null} />
                </div>
                <span className="market-qty-meta font-mono">
                  {fmtInt(price.sellQty)} {lang === 'en' ? 'available' : 'verfügbar'}
                </span>
              </div>

              <div className="market-price-pill buy-pill">
                <span className="market-type-label">{lang === 'en' ? 'Highest Buy Order' : 'Höchstes Kaufgesuch'}</span>
                <div className="market-coin-row">
                  <Coin copper={price.buy || null} />
                </div>
                <span className="market-qty-meta font-mono">
                  {fmtInt(price.buyQty)} {lang === 'en' ? 'orders' : 'Gesuche'}
                </span>
              </div>
            </div>
          ) : (
            <p className="hint text-xs dim italic">
              {lang === 'en' ? 'No active listing / not tradable.' : 'Kein aktuelles Angebot / nicht gelistet.'}
            </p>
          )}

          {prices.error && (
            <Notice tone="warn">
              {lang === 'en' ? 'Failed to refresh prices' : 'Preise konnten nicht aktualisiert werden'}: {prices.error}
            </Notice>
          )}
        </section>

        {/* 4. Crafting Recipes */}
        {shownRecipes.length > 0 && (
          <section className="md-sec md-recipe-card">
            <div className="md-sec-header">
              <Layers size={14} className="gold" />
              <h4>{lang === 'en' ? 'Crafting Recipe' : 'Herstellungs-Rezept'}</h4>
            </div>

            {shownRecipes.map((r) => (
              <div className="recipe-box" key={r.id}>
                <div className="recipe-meta flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#f4e3a8]">
                    {r.kind === 'mf'
                      ? (lang === 'en' ? 'Mystic Forge' : 'Mystische Schmiede')
                      : r.disciplines.length
                        ? r.disciplines.map((d) => getDisciplineName(d as DisciplineId, lang)).join(', ')
                        : (lang === 'en' ? 'Vendor' : 'Händler')}
                    {r.rating > 0 && ` · Lv. ${r.rating}`}
                    {r.outputCount > 1 && ` · x${r.outputCount}`}
                  </span>
                  <OriginBadge origin={r.source === 'official' ? 'official' : 'community'} />
                </div>

                <div className="recipe-ings">
                  {r.ingredients.map((ing) => (
                    <div
                      className="recipe-ing interactive-ing"
                      key={ing.itemId}
                      onClick={() => onOpenItem(ing.itemId)}
                      title={lang === 'en' ? 'Click to inspect ingredient' : 'Klicken, um Zutat zu inspizieren'}
                    >
                      <ItemIcon id={ing.itemId} count={ing.count} />
                      <span className="truncate max-w-[140px] text-xs">
                        {getItem(ing.itemId)?.name ?? `#${ing.itemId}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 5. Used In Recipes */}
        {usedInOutputs.length > 0 && (
          <section className="md-sec md-used-in-card">
            <div className="md-sec-header">
              <Sparkles size={14} className="gold" />
              <h4>
                {lang === 'en' ? 'Used In' : 'Verwendet in'}{' '}
                <span className="dim text-xs font-mono font-normal">
                  ({fmtInt(usedInOutputs.length)})
                </span>
              </h4>
            </div>

            <div className="icon-row flex flex-wrap gap-2">
              {usedInOutputs.slice(0, 16).map((id) => (
                <div
                  key={id}
                  className="used-in-node cursor-pointer"
                  onClick={() => onOpenItem(id)}
                  title={getItem(id)?.name ?? `#${id}`}
                >
                  <ItemIcon id={id} size="m" />
                </div>
              ))}
              {usedInOutputs.length > 16 && (
                <span className="self-center dim text-xs font-mono">+{usedInOutputs.length - 16}</span>
              )}
            </div>
          </section>
        )}

        {/* 6. Acquisition Sources */}
        <section className="md-sec md-sources-card">
          <div className="md-sec-header">
            <h4>{lang === 'en' ? 'Acquisition' : 'Beschaffung'}</h4>
          </div>

          <ul className="srcs">
            {sources.map((s, i) => (
              <li key={i} className={`src k-${s.kind}`}>
                <div className="src-head">
                  <span className="src-kind">{lang === 'en' ? (s.labelEn || s.label) : s.label}</span>
                  <OriginBadge origin={s.origin} />
                  <span className={`amount a-${s.amount}`}>
                    {s.amount === 'guaranteed'
                      ? (lang === 'en' ? 'guaranteed' : 'garantiert')
                      : s.amount === 'random'
                      ? (lang === 'en' ? 'random' : 'zufällig')
                      : (lang === 'en' ? 'amount unknown' : 'Menge unbekannt')}
                  </span>
                </div>
                <div className="src-detail">{lang === 'en' ? (s.detailEn || s.detail) : s.detail}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* 7. Notes & Caveats */}
        {caveats.length > 0 && (
          <section className="md-sec md-caveats-card">
            <h4>{lang === 'en' ? 'Notes & Caveats' : 'Unsicherheiten & Hinweise'}</h4>
            <ul className="caveats">
              {caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
};

function usedIds(rs: Recipe[]): number[] {
  return rs.slice(0, 16).map((r) => r.outputId);
}