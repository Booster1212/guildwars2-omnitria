import React, { useMemo } from 'react';
import { ChevronLeft, ExternalLink, X } from 'lucide-react';
import type { LegendaryModel } from '../../domain/legendary';
import { WEAPON_TYPE_DE } from '../../domain/legendary';
import { resolveSources, KIND_META } from '../../domain/sources';
import type { Recipe } from '../../domain/types';
import { isUntradable } from '../../domain/types';
import { getItem, useItems, cleanDescription } from '../../data/gw2/items';
import { usePrices } from '../../data/gw2/prices';
import { useAccountState } from '../../data/gw2/account';
import { useRecipeDb } from '../../data/gw2/recipes';
import { openExternal, wikiSearchUrl } from '../../data/external';
import { Coin, ItemIcon, Notice, OriginBadge } from '../common/ui';
import { getDisciplineName, getItemTypeName, getRarityName, fmtInt } from '../common/labels';
import type { DisciplineId } from '../../domain/types';
import { useTranslation } from '../../i18n';

interface Props {
  itemId: number;
  model: LegendaryModel;
  /** Bedarf aus der aktuellen Ansicht (Waffe/Planer) */
  need?: { total: number; missing: number } | null;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenItem: (id: number) => void;
}

export const MaterialDetail: React.FC<Props> = ({ itemId, model, need, canGoBack, onBack, onClose, onOpenItem }) => {
  const { lang } = useTranslation();
  const recipeDb = useRecipeDb(false);
  const account = useAccountState();

  const breakdownLabels = useMemo(() => {
    return lang === 'en'
      ? ['Material Storage', 'Bank', 'Shared Inventory', 'Characters']
      : ['Materiallager', 'Bank', 'Geteiltes Inventar', 'Charaktere'];
  }, [lang]);

  // Offizielle Rezepte, die diesen Gegenstand herstellen / verbrauchen
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
    ...new Set(sources.flatMap((s) => (lang === 'en' ? (s.caveatsEn && s.caveatsEn.length ? s.caveatsEn : s.caveats) : s.caveats))),
  ];
  const stock = account.stockMap.get(itemId) ?? 0;
  const bd = account.data?.breakdown[itemId];
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
  useItems(usedInOutputs.slice(0, 12));

  return (
    <aside className="drawer" aria-label="Materialdetails">
      <div className="drawer-head">
        {canGoBack && (
          <button className="btn ghost sm" onClick={onBack} title={lang === 'en' ? 'Back' : 'Zurück'}>
            <ChevronLeft size={13} /> {lang === 'en' ? 'Back' : 'Zurück'}
          </button>
        )}
        <span className="drawer-title">{lang === 'en' ? 'Material Details' : 'Material'}</span>
        <button className="btn icon ghost" onClick={onClose} title={lang === 'en' ? 'Close' : 'Schließen'} aria-label="Schließen">
          <X size={14} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="md-head">
          <ItemIcon id={itemId} size="l" />
          <div className="md-head-text">
            <h3 className={`md-name r-${item?.rarity ?? 'Basic'}`}>{item?.name ?? `Item #${itemId}`}</h3>
            <div className="dim">
              {item
                ? `${getRarityName(item.rarity, lang)} · ${
                    item.type === 'Weapon' && item.weaponType
                      ? (lang === 'en' ? item.weaponType : (WEAPON_TYPE_DE[item.weaponType] ?? item.weaponType))
                      : getItemTypeName(item.type, lang)
                  }`
                : lang === 'en' ? 'Loading…' : 'Wird geladen …'}
              <span className="sep">·</span>ID {itemId}
            </div>
            {item?.description && <p className="md-desc">{cleanDescription(item.description)}</p>}
          </div>
        </div>

        <section className="md-sec">
          <h4>{lang === 'en' ? 'Quantities' : 'Mengen'}</h4>
          <table className="tbl kv">
            <tbody>
              {need && (
                <>
                  <tr>
                    <td>{lang === 'en' ? 'Total Demand' : 'Gesamtbedarf'}</td>
                    <td className="num">{fmtInt(need.total)}</td>
                    <td>
                      <OriginBadge origin="derived" />
                    </td>
                  </tr>
                  <tr>
                    <td>{lang === 'en' ? 'Still Missing' : 'Noch fehlend'}</td>
                    <td className={`num ${need.missing > 0 ? 'bad' : 'good'}`}>{fmtInt(need.missing)}</td>
                    <td>
                      <OriginBadge origin="derived" />
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td>{lang === 'en' ? 'In Possession' : 'Im Besitz'}</td>
                <td className="num">{account.hasStockData ? fmtInt(stock) : '–'}</td>
                <td>
                  <OriginBadge origin="personal" />
                </td>
              </tr>
              {bd &&
                bd.map((n, i) =>
                  n > 0 ? (
                    <tr key={i} className="sub">
                      <td>{breakdownLabels[i]}</td>
                      <td className="num">{fmtInt(n)}</td>
                      <td />
                    </tr>
                  ) : null,
                )}
            </tbody>
          </table>
          {!account.hasStockData && (
            <p className="hint">
              {lang === 'en'
                ? 'Stock tracking requires an API key with "inventories" permission.'
                : 'Bestände benötigen einen API-Schlüssel mit der Berechtigung „inventories“.'}
            </p>
          )}
        </section>

        <section className="md-sec">
          <h4>{lang === 'en' ? 'Trading Post' : 'Handelsgesellschaft'}</h4>
          {untradable ? (
            <p className="hint">
              {lang === 'en'
                ? `Item is ${item?.flags.includes('AccountBound') ? 'Account Bound' : 'Soulbound'} – not tradable.`
                : `Gegenstand ist ${item?.flags.includes('AccountBound') ? 'accountgebunden' : 'seelengebunden'} – nicht handelbar.`}
            </p>
          ) : price && (price.sell > 0 || price.buy > 0) ? (
            <table className="tbl kv">
              <tbody>
                <tr>
                  <td>{lang === 'en' ? 'Instant Buy (Lowest Offer)' : 'Sofortkauf (niedrigstes Angebot)'}</td>
                  <td className="num">
                    <Coin copper={price.sell || null} />
                  </td>
                  <td className="dim num">{fmtInt(price.sellQty)} {lang === 'en' ? 'pcs.' : 'Stk.'}</td>
                </tr>
                <tr>
                  <td>{lang === 'en' ? 'Highest Buy Order' : 'Höchstes Kaufgesuch'}</td>
                  <td className="num">
                    <Coin copper={price.buy || null} />
                  </td>
                  <td className="dim num">{fmtInt(price.buyQty)} {lang === 'en' ? 'pcs.' : 'Stk.'}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="hint">{lang === 'en' ? 'No active listing / not tradable.' : 'Kein aktuelles Angebot / nicht gelistet.'}</p>
          )}
          {prices.error && <Notice tone="warn">{lang === 'en' ? 'Failed to refresh prices' : 'Preise konnten nicht aktualisiert werden'}: {prices.error}</Notice>}
        </section>

        <section className="md-sec">
          <h4>{lang === 'en' ? 'Acquisition' : 'Beschaffung'}</h4>
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
          <p className="hint">
            {lang === 'en' ? 'Categories:' : 'Kategorien:'}{' '}
            {Object.values(KIND_META)
              .map((k) => (lang === 'en' ? (k.labelEn || k.label) : k.label))
              .join(' · ')}.
          </p>
        </section>

        {shownRecipes.length > 0 && (
          <section className="md-sec">
            <h4>{lang === 'en' ? 'Recipe' : 'Rezept'}</h4>
            {shownRecipes.map((r) => (
              <div className="recipe-box" key={r.id}>
                <div className="recipe-meta">
                  {r.kind === 'mf'
                    ? (lang === 'en' ? 'Mystic Forge' : 'Mystische Schmiede')
                    : r.disciplines.length
                      ? r.disciplines.map((d) => getDisciplineName(d as DisciplineId, lang)).join(', ')
                      : (lang === 'en' ? 'Vendor' : 'Händler')}
                  {r.rating > 0 && ` · ${lang === 'en' ? `Rank ${r.rating}` : `Rang ${r.rating}`}`}
                  {r.outputCount > 1 && ` · ${lang === 'en' ? `yields ${r.outputCount}` : `ergibt ${r.outputCount}`}`}
                  <OriginBadge origin={r.source === 'official' ? 'official' : 'community'} />
                </div>
                <div className="recipe-ings">
                  {r.ingredients.map((ing) => (
                    <div className="recipe-ing" key={ing.itemId}>
                      <ItemIcon id={ing.itemId} count={ing.count} onClick={() => onOpenItem(ing.itemId)} />
                      <span>{getItem(ing.itemId)?.name ?? `#${ing.itemId}`}</span>
                    </div>
                  ))}
                </div>
                {r.yield !== undefined && r.yield < 1 && (
                  <p className="hint">
                    {lang === 'en'
                      ? `RNG recipe – success rate approx. ${Math.round(r.yield * 100)}% (estimate).`
                      : `Zufallsrezept – Erfolgsquote ca. ${Math.round(r.yield * 100)} % (Schätzung).`}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {usedInOutputs.length > 0 && (
          <section className="md-sec">
            <h4>
              {lang === 'en' ? 'Used In' : 'Verwendet in'} <span className="dim">({fmtInt(usedInOutputs.length)} {lang === 'en' ? 'items' : 'Gegenstände'})</span>
            </h4>
            <div className="icon-row">
              {usedInOutputs.slice(0, 12).map((id) => (
                <ItemIcon key={id} id={id} onClick={() => onOpenItem(id)} />
              ))}
              {usedInOutputs.length > 12 && <span className="dim">+{usedInOutputs.length - 12}</span>}
            </div>
            <p className="hint">
              {lang === 'en'
                ? 'Official crafting recipes only (Mystic Forge recipes are not exposed by the API).'
                : 'Nur offizielle Handwerksrezepte (Mystische-Schmiede-Rezepte sind nicht in der API).'}
            </p>
          </section>
        )}

        <section className="md-sec">
          <h4>{lang === 'en' ? 'Notes & Caveats' : 'Unsicherheiten & Hinweise'}</h4>
          {caveats.length > 0 ? (
            <ul className="caveats">
              {caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">{lang === 'en' ? 'No known restrictions for this material.' : 'Keine bekannten Einschränkungen für dieses Material.'}</p>
          )}
          <button className="btn sm" onClick={() => openExternal(wikiSearchUrl(item?.name ?? String(itemId)))}>
            <ExternalLink size={12} /> {lang === 'en' ? 'Lookup in Wiki' : 'Im Wiki nachschlagen'}
          </button>
        </section>
      </div>
    </aside>
  );
};

function usedIds(rs: Recipe[]): number[] {
  return rs.slice(0, 12).map((r) => r.outputId);
}
