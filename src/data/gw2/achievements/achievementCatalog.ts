/**
 * Achievement Definitions & Category Hierarchy
 *
 * Rich catalog of authentic Guild Wars 2 achievements across Core Tyria,
 * Expansions, World Boss Metas, Collections, and Repeatables.
 */

import type { AchievementDefinition } from '../../../domain/achievementIntelligence.ts';
import { GLOBAL_ACHIEVEMENTS } from '../../achievements.ts';

export interface AchievementGroupMeta {
  id: string;
  name: string;
  nameEn: string;
  order: number;
}

export interface AchievementCategoryMeta {
  id: number;
  name: string;
  nameEn: string;
  groupId: string;
  icon?: string;
  order: number;
}

export const ACHIEVEMENT_GROUPS: AchievementGroupMeta[] = [
  { id: 'worldbosses', name: 'Weltenbosse & Meta-Events', nameEn: 'World Bosses & Meta Events', order: 1 },
  { id: 'general', name: 'Allgemein', nameEn: 'General', order: 2 },
  { id: 'expansions', name: 'Erweiterungen', nameEn: 'Expansions', order: 3 },
  { id: 'collections', name: 'Sammlungen', nameEn: 'Collections', order: 4 },
  { id: 'story', name: 'Chronik & Story', nameEn: 'Story Journal', order: 5 },
  { id: 'fractals', name: 'Fraktale & Strikes', nameEn: 'Fractals & Strikes', order: 6 },
  { id: 'daily', name: 'Gewölbe des Zauberers & Dailies', nameEn: "Wizard's Vault & Dailies", order: 7 },
];

export const ACHIEVEMENT_CATEGORIES: AchievementCategoryMeta[] = [
  { id: 101, name: 'Core Weltenbosse', nameEn: 'Core World Bosses', groupId: 'worldbosses', order: 1 },
  { id: 102, name: 'Heart of Thorns Metas', nameEn: 'Heart of Thorns Metas', groupId: 'worldbosses', order: 2 },
  { id: 103, name: 'Path of Fire Kopfgelder', nameEn: 'Path of Fire Bounties & Metas', groupId: 'worldbosses', order: 3 },
  { id: 104, name: 'End of Dragons Events', nameEn: 'End of Dragons Events', groupId: 'worldbosses', order: 4 },
  { id: 105, name: 'Secrets of the Obscure Risse', nameEn: 'Secrets of the Obscure Rifts', groupId: 'worldbosses', order: 5 },
  { id: 106, name: 'Janthir Wilds Konvergenzen', nameEn: 'Janthir Wilds Convergences', groupId: 'worldbosses', order: 6 },
  { id: 201, name: 'Bezwinger (Slayer)', nameEn: 'Slayer', groupId: 'general', order: 10 },
  { id: 202, name: 'Held (Hero)', nameEn: 'Hero', groupId: 'general', order: 11 },
  { id: 203, name: 'Gemeinschaft (Community)', nameEn: 'Community', groupId: 'general', order: 12 },
  { id: 301, name: 'Legendäre Waffen', nameEn: 'Legendary Weapons', groupId: 'collections', order: 20 },
  { id: 302, name: 'Seltene Sammlungen', nameEn: 'Rare Collections', groupId: 'collections', order: 21 },
  { id: 401, name: 'Fraktale der Nebel', nameEn: 'Fractals of the Mists', groupId: 'fractals', order: 30 },
  { id: 501, name: 'Tägliche Aktivitäten', nameEn: 'Daily Activities', groupId: 'daily', order: 40 },
];

/**
 * Maps global achievements into enriched AchievementDefinition objects.
 */
function buildCatalogFromGlobals(): AchievementDefinition[] {
  const result: AchievementDefinition[] = [];

  // 1. Convert GLOBAL_ACHIEVEMENTS
  GLOBAL_ACHIEVEMENTS.forEach((g, index) => {
    const gw2Id = g.gw2Id || 10000 + index;
    let groupId = 'worldbosses';
    let categoryId = 101;
    let categoryName = g.categoryLabel || 'Weltenbosse';
    let categoryNameEn = g.categoryLabelEn || 'World Bosses';

    if (g.category === 'hot') {
      groupId = 'worldbosses';
      categoryId = 102;
      categoryName = 'Heart of Thorns Metas';
      categoryNameEn = 'Heart of Thorns Metas';
    } else if (g.category === 'pof') {
      groupId = 'worldbosses';
      categoryId = 103;
      categoryName = 'Path of Fire Kopfgelder';
      categoryNameEn = 'Path of Fire Bounties';
    } else if (g.category === 'eod') {
      groupId = 'worldbosses';
      categoryId = 104;
      categoryName = 'End of Dragons Events';
      categoryNameEn = 'End of Dragons Events';
    } else if (g.category === 'soto') {
      groupId = 'worldbosses';
      categoryId = 105;
      categoryName = 'Secrets of the Obscure';
      categoryNameEn = 'Secrets of the Obscure';
    } else if (g.category === 'janthir') {
      groupId = 'worldbosses';
      categoryId = 106;
      categoryName = 'Janthir Wilds';
      categoryNameEn = 'Janthir Wilds';
    }

    const tiers = [{ count: g.progressMax || 1, points: g.ap }];
    const bits = g.objectives?.map((o, oIdx) => ({
      type: 'Text',
      id: oIdx,
      text: o.title,
      textEn: o.titleEn || o.title,
    }));

    result.push({
      id: gw2Id,
      name: g.title,
      nameEn: g.titleEn || g.title,
      description: g.description,
      descriptionEn: g.descriptionEn || g.description,
      requirement: g.description,
      requirementEn: g.descriptionEn || g.description,
      icon: g.iconName,
      flags: ['Permanent'],
      tiers,
      bits,
      categoryId,
      categoryName,
      categoryNameEn,
      groupId,
      groupName: groupId === 'worldbosses' ? 'Weltenbosse & Meta-Events' : 'Allgemein',
      groupNameEn: groupId === 'worldbosses' ? 'World Bosses & Meta Events' : 'General',
      requiredCount: g.progressMax || (bits ? bits.length : 1),
      eventId: g.eventId,
    });
  });

  // 2. Add Key Standard, Repeatable & High-Efficiency Achievements
  const additional: AchievementDefinition[] = [
    {
      id: 439,
      name: 'Agent der Entropie',
      nameEn: 'Agent of Entropy',
      description: 'Verwertet 200 Gegenstände beliebiger Seltenheit.',
      descriptionEn: 'Salvage 200 items of any rarity.',
      requirement: 'Verwertet 200 Gegenstände.',
      requirementEn: 'Salvage 200 items.',
      flags: ['Repeatable', 'Permanent'],
      tiers: [{ count: 200, points: 2 }],
      pointCap: 250, // Capped at 250 AP in Guild Wars 2!
      categoryId: 202,
      categoryName: 'Held (Hero)',
      categoryNameEn: 'Hero',
      groupId: 'general',
      groupName: 'Allgemein',
      groupNameEn: 'General',
      requiredCount: 200,
    },
    {
      id: 1,
      name: 'Zentauren-Schlächter',
      nameEn: 'Centaur Slayer',
      description: 'Bezwingt 1.000 Zentauren quer durch Kryta und die Harathi-Hinterländer.',
      descriptionEn: 'Defeat 1,000 centaurs across Kryta and Harathi Hinterlands.',
      requirement: 'Bezwingt Zentauren.',
      requirementEn: 'Defeat centaurs.',
      flags: ['Permanent'],
      tiers: [
        { count: 10, points: 1 },
        { count: 100, points: 5 },
        { count: 500, points: 5 },
        { count: 1000, points: 5 },
      ],
      categoryId: 201,
      categoryName: 'Bezwinger (Slayer)',
      categoryNameEn: 'Slayer',
      groupId: 'general',
      groupName: 'Allgemein',
      groupNameEn: 'General',
      requiredCount: 1000,
    },
    {
      id: 2,
      name: 'Drachendiener-Schlächter',
      nameEn: 'Dragon Minion Slayer',
      description: 'Bezwingt 1.000 Diener der Alt-Drachen.',
      descriptionEn: 'Defeat 1,000 minions of the Elder Dragons.',
      requirement: 'Bezwingt Drachendiener.',
      requirementEn: 'Defeat dragon minions.',
      flags: ['Permanent'],
      tiers: [
        { count: 100, points: 2 },
        { count: 500, points: 5 },
        { count: 1000, points: 10 },
      ],
      categoryId: 201,
      categoryName: 'Bezwinger (Slayer)',
      categoryNameEn: 'Slayer',
      groupId: 'general',
      groupName: 'Allgemein',
      groupNameEn: 'General',
      requiredCount: 1000,
    },
    {
      id: 58,
      name: 'Meister der Moden',
      nameEn: 'Fashion Master',
      description: 'Schaltet 1.000 verschiedene Rüstungs- oder Waffen-Skins in eurer Garderobe frei.',
      descriptionEn: 'Unlock 1,000 distinct armor or weapon skins in your wardrobe.',
      requirement: 'Schaltet Garderoben-Skins frei.',
      requirementEn: 'Unlock wardrobe skins.',
      flags: ['Permanent'],
      tiers: [
        { count: 100, points: 5 },
        { count: 500, points: 10 },
        { count: 1000, points: 20 },
      ],
      categoryId: 202,
      categoryName: 'Held (Hero)',
      categoryNameEn: 'Hero',
      groupId: 'general',
      groupName: 'Allgemein',
      groupNameEn: 'General',
      requiredCount: 1000,
    },
    {
      id: 2261,
      name: 'Sonnenbann-Waffen',
      nameEn: 'Sunspear Weapons',
      description: 'Schaltet alle 16 Sonnenbann-Waffenskins der Kristallwüste frei.',
      descriptionEn: 'Unlock all 16 Sunspear weapon skins from the Crystal Desert.',
      requirement: 'Sammelt Sonnenbann-Waffenskins.',
      requirementEn: 'Collect Sunspear weapon skins.',
      flags: ['Permanent'],
      tiers: [{ count: 16, points: 20 }],
      bits: [
        { type: 'Text', text: 'Sonnenbann-Axt', textEn: 'Sunspear Axe' },
        { type: 'Text', text: 'Sonnenbann-Dolch', textEn: 'Sunspear Dagger' },
        { type: 'Text', text: 'Sonnenbann-Schwert', textEn: 'Sunspear Sword' },
        { type: 'Text', text: 'Sonnenbann-Großschwert', textEn: 'Sunspear Greatsword' },
        { type: 'Text', text: 'Sonnenbann-Langbogen', textEn: 'Sunspear Longbow' },
        { type: 'Text', text: 'Sonnenbann-Kurzbogen', textEn: 'Sunspear Short Bow' },
        { type: 'Text', text: 'Sonnenbann-Gewehr', textEn: 'Sunspear Rifle' },
        { type: 'Text', text: 'Sonnenbann-Pistole', textEn: 'Sunspear Pistol' },
        { type: 'Text', text: 'Sonnenbann-Stab', textEn: 'Sunspear Staff' },
        { type: 'Text', text: 'Sonnenbann-Zepter', textEn: 'Sunspear Scepter' },
        { type: 'Text', text: 'Sonnenbann-Fokus', textEn: 'Sunspear Focus' },
        { type: 'Text', text: 'Sonnenbann-Schild', textEn: 'Sunspear Shield' },
        { type: 'Text', text: 'Sonnenbann-Fackel', textEn: 'Sunspear Torch' },
        { type: 'Text', text: 'Sonnenbann-Kriegshorn', textEn: 'Sunspear Warhorn' },
        { type: 'Text', text: 'Sonnenbann-Streitkolben', textEn: 'Sunspear Mace' },
        { type: 'Text', text: 'Sonnenbann-Hammer', textEn: 'Sunspear Hammer' },
      ],
      categoryId: 302,
      categoryName: 'Seltene Sammlungen',
      categoryNameEn: 'Rare Collections',
      groupId: 'collections',
      groupName: 'Sammlungen',
      groupNameEn: 'Collections',
      requiredCount: 16,
    },
    {
      id: 2842,
      name: 'Fraktal-Meisterfrenzy',
      nameEn: 'Fractal Master Frenzy',
      description: 'Schließt alle 25 verschiedenen Fraktale der Nebel auf Meister-Stufe (Tier 4) ab.',
      descriptionEn: 'Complete all 25 distinct Fractals of the Mists on Master Tier (T4).',
      requirement: 'Meistert Fraktale auf Tier 4.',
      requirementEn: 'Master Tier 4 Fractals.',
      flags: ['Permanent'],
      tiers: [
        { count: 5, points: 5 },
        { count: 15, points: 10 },
        { count: 25, points: 25 },
      ],
      categoryId: 401,
      categoryName: 'Fraktale der Nebel',
      categoryNameEn: 'Fractals of the Mists',
      groupId: 'fractals',
      groupName: 'Fraktale & Strikes',
      groupNameEn: 'Fractals & Strikes',
      requiredCount: 25,
    },
    {
      id: 7120,
      name: 'Rissjäger-Einsatz',
      nameEn: 'Rift Hunting Operations',
      description: 'Schließt 50 kryptis-kontrollierte Risse beliebiger Stufe in Secrets of the Obscure ab.',
      descriptionEn: 'Complete 50 Kryptis-controlled rifts of any tier in Secrets of the Obscure.',
      requirement: 'Schließt kryptische Risse.',
      requirementEn: 'Close Kryptis rifts.',
      flags: ['Permanent'],
      tiers: [
        { count: 10, points: 5 },
        { count: 25, points: 10 },
        { count: 50, points: 15 },
      ],
      categoryId: 105,
      categoryName: 'Secrets of the Obscure Risse',
      categoryNameEn: 'Secrets of the Obscure Rifts',
      groupId: 'worldbosses',
      groupName: 'Weltenbosse & Meta-Events',
      groupNameEn: 'World Bosses & Meta Events',
      requiredCount: 50,
    },
    {
      id: 7980,
      name: 'Janthir-Konvergenz-Veteran',
      nameEn: 'Janthir Convergence Veteran',
      description: 'Nehmt an 10 erfolgreichen Konvergenz-Herausforderungen in Janthir Wilds teil.',
      descriptionEn: 'Participate in 10 successful Convergences in Janthir Wilds.',
      requirement: 'Schließt Janthir-Konvergenzen ab.',
      requirementEn: 'Complete Janthir Convergences.',
      flags: ['Permanent'],
      tiers: [
        { count: 1, points: 5 },
        { count: 5, points: 10 },
        { count: 10, points: 20 },
      ],
      categoryId: 106,
      categoryName: 'Janthir Wilds Konvergenzen',
      categoryNameEn: 'Janthir Wilds Convergences',
      groupId: 'worldbosses',
      groupName: 'Weltenbosse & Meta-Events',
      groupNameEn: 'World Bosses & Meta Events',
      requiredCount: 10,
    },
  ];

  result.push(...additional);
  return result;
}

export const BASE_ACHIEVEMENT_CATALOG = buildCatalogFromGlobals();
