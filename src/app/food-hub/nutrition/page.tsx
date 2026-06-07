'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, Flame, BarChart3, ChefHat, ArrowLeft, Coffee,
  Utensils, Timer, Heart, Shield, Brain,
  Sprout, Star, Zap, Apple, ChevronDown, Lightbulb,
  Calendar, FlaskConical, Scroll, Plus, X, Loader2,
  Edit3, Save, Check, RefreshCw
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
type TabId = 'weekly' | 'dishes' | 'balance' | 'recipes';
type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

interface Micro {
  name: string; value: number; unit: string; rdv: number; benefit: string; color: string;
}
interface DishNutrition {
  calories: number; protein: number; carbs: number; fats: number; fiber: number; micros: Micro[];
}
interface DishProfile {
  id: string; name: string; emoji: string; meal: MealType; servingSize: string;
  nutrition: DishNutrition; wholeSpices: string[]; cookingTip: string; benefits: string[];
  replaces?: string; replaceReason?: string;
}
interface DayMeta {
  day: DayOfWeek; theme: string; nutritionFocus: string; emoji: string;
  accentColor: string; highlight: string;
}
type WeekMeals = Record<DayOfWeek, Record<MealType, string | null>>;
interface SpiceMix { spice: string; amount: string; benefit: string; note?: string }
interface Recipe {
  id: string; name: string; emoji: string; servings: number; prepTime: string;
  cookTime: string; oilUsed: string;
  ingredients: { item: string; quantity: string; note?: string }[];
  wholeSpiceMix: SpiceMix[]; steps: string[]; nutritionTip: string;
}

// ─── Initial Dish Library ─────────────────────────────────────────────────────

const INITIAL_DISHES: DishProfile[] = [
  {
    id: 'moong-cheela', name: 'Moong Dal Cheela', emoji: '🫓', meal: 'Breakfast', servingSize: '2 medium cheelas',
    nutrition: { calories: 185, protein: 12, carbs: 25, fats: 4, fiber: 5, micros: [
      { name: 'Iron', value: 2.5, unit: 'mg', rdv: 18, benefit: 'Red blood cell formation', color: '#D67D61' },
      { name: 'Folate', value: 125, unit: 'mcg', rdv: 400, benefit: 'DNA synthesis & cell growth', color: '#8BA88E' },
      { name: 'Magnesium', value: 48, unit: 'mg', rdv: 420, benefit: 'Muscle & nerve function', color: '#A8C5DA' },
      { name: 'Zinc', value: 1.5, unit: 'mg', rdv: 11, benefit: 'Immune defense', color: '#C4A882' },
    ]},
    wholeSpices: ['Cumin seeds (jeera)', 'Black pepper', 'Turmeric (haldi)', 'Green chili', 'Fresh coriander'],
    cookingTip: 'Soak dal 4 hours for better digestibility. Cook on medium heat with ½ tsp ghee. Squeeze lemon after cooking — Vitamin C boosts iron absorption.',
    benefits: ['High plant protein', 'Low glycemic index — sustained energy', 'Folate-rich for cellular health', 'Naturally gluten-free'],
    replaces: 'Poha & Jalebi', replaceReason: 'Removes refined sugar, adds 8g extra protein. Lower glycemic load.'
  },
  {
    id: 'palak-dal', name: 'Palak Dal', emoji: '🌿', meal: 'Lunch', servingSize: '1 katori (200ml)',
    nutrition: { calories: 195, protein: 13, carbs: 28, fats: 4, fiber: 7, micros: [
      { name: 'Iron', value: 5.2, unit: 'mg', rdv: 18, benefit: 'Prevents anaemia — top plant source', color: '#D67D61' },
      { name: 'Vitamin A', value: 580, unit: 'mcg', rdv: 900, benefit: 'Eye health & immunity', color: '#F5C842' },
      { name: 'Calcium', value: 180, unit: 'mg', rdv: 1000, benefit: 'Bone density', color: '#A8C5DA' },
      { name: 'Vitamin K', value: 145, unit: 'mcg', rdv: 120, benefit: 'Blood clotting & bone metabolism', color: '#C4A882' },
    ]},
    wholeSpices: ['Mustard seeds (rai)', 'Cumin seeds', 'Dried red chili', 'Asafoetida (hing)', 'Turmeric'],
    cookingTip: 'Use 1 tsp ghee for tadka — enhances fat-soluble vitamin absorption. Always squeeze lemon at end: Vitamin C triples iron absorption from plant sources.',
    benefits: ['Iron + Vitamin C synergy maximises absorption', 'All 13 essential vitamins', 'Dal + rice = complete protein', 'Beta-carotene precursor of Vitamin A'],
    replaces: 'Dal Tadka (plain)', replaceReason: 'Adding spinach doubles iron and Vitamin A with only 20 extra calories.'
  },
  {
    id: 'ragi-idli', name: 'Ragi Idli', emoji: '⚪', meal: 'Breakfast', servingSize: '3 idlis (150g)',
    nutrition: { calories: 168, protein: 7, carbs: 32, fats: 2, fiber: 4.5, micros: [
      { name: 'Calcium', value: 244, unit: 'mg', rdv: 1000, benefit: 'Strongest plant calcium source', color: '#A8C5DA' },
      { name: 'Iron', value: 3.6, unit: 'mg', rdv: 18, benefit: 'Oxygen transport', color: '#D67D61' },
      { name: 'Phosphorus', value: 280, unit: 'mg', rdv: 700, benefit: 'Bone formation & energy storage', color: '#C4A882' },
    ]},
    wholeSpices: ['Fenugreek seeds in batter (methi)', 'Curry leaves in sambar', 'Mustard seeds', 'Cumin', 'Asafoetida'],
    cookingTip: 'Add ½ tsp fenugreek seeds while soaking urad dal — improves fermentation and adds iron. Ferment 10–12 hours for maximum probiotic benefit.',
    benefits: ['Highest calcium among Indian grains — rivals dairy', 'Naturally gluten-free', 'Low glycemic index (GI 40)', 'Fermentation enhances B12 bioavailability'],
    replaces: 'Aloo Paratha with butter', replaceReason: 'Saves 180 calories and 12g fat. Adds 244mg calcium, much lower glycemic impact.'
  },
  {
    id: 'rajma', name: 'Rajma (Kidney Beans)', emoji: '🫘', meal: 'Lunch', servingSize: '1 cup cooked (200g)',
    nutrition: { calories: 225, protein: 15, carbs: 40, fats: 1, fiber: 11, micros: [
      { name: 'Iron', value: 5, unit: 'mg', rdv: 18, benefit: 'Top plant iron source', color: '#D67D61' },
      { name: 'Potassium', value: 742, unit: 'mg', rdv: 4700, benefit: 'Heart health & blood pressure', color: '#F5C842' },
      { name: 'Folate', value: 230, unit: 'mcg', rdv: 400, benefit: 'DNA synthesis', color: '#8BA88E' },
      { name: 'Magnesium', value: 74, unit: 'mg', rdv: 420, benefit: 'Blood glucose regulation', color: '#A8C5DA' },
    ]},
    wholeSpices: ['Bay leaf', 'Cinnamon', 'Cloves', 'Black cardamom', 'Cumin seeds', 'Freshly crushed coriander', 'Turmeric'],
    cookingTip: 'Soak overnight 12h — reduces flatulence oligosaccharides by 60%. Use 1 tsp oil. Tomato base provides natural Vitamin C to boost iron absorption.',
    benefits: ['11g fiber per serving', 'Resistant starch feeds gut bacteria', 'Low glycemic index (GI 24)', 'Complete protein with rice'],
    replaces: 'Chole Bhature', replaceReason: 'Removes deep-fried bhatura. Adds 6g more fiber, saves ~400 calories.'
  },
  {
    id: 'mushroom-palak', name: 'Mushroom Palak Masala', emoji: '🍄', meal: 'Dinner', servingSize: '1 cup (200g)',
    nutrition: { calories: 120, protein: 8, carbs: 12, fats: 5, fiber: 4, micros: [
      { name: 'Vitamin D', value: 5, unit: 'mcg', rdv: 20, benefit: 'Bone health & immune regulation', color: '#F5C842' },
      { name: 'Selenium', value: 25, unit: 'mcg', rdv: 55, benefit: 'Thyroid & antioxidant defense', color: '#C4A882' },
      { name: 'Iron', value: 3.5, unit: 'mg', rdv: 18, benefit: 'Oxygen transport', color: '#D67D61' },
      { name: 'Vitamin K', value: 108, unit: 'mcg', rdv: 120, benefit: 'Blood clotting & bone metabolism', color: '#8BA88E' },
    ]},
    wholeSpices: ['Cumin seeds', 'Freshly crushed coriander seeds', 'Green cardamom', 'Black pepper', 'Turmeric', 'Bay leaf'],
    cookingTip: 'Expose mushrooms to sunlight 1 hour before cooking — doubles Vitamin D. Use 1 tsp oil; mushrooms release their own moisture.',
    benefits: ['Mushrooms: one of few plant sources of Vitamin D', 'Selenium supports thyroid health', 'Beta-glucans modulate immune response', 'Near-zero cholesterol'],
    replaces: 'Paneer Lababdar', replaceReason: 'Saves 200 calories and 18g saturated fat. Adds Vitamin D, Selenium.'
  },
  {
    id: 'vegetable-khichdi', name: 'Vegetable Khichdi', emoji: '🥘', meal: 'Dinner', servingSize: '1 bowl (300g)',
    nutrition: { calories: 285, protein: 12, carbs: 48, fats: 6, fiber: 6, micros: [
      { name: 'Zinc', value: 2.2, unit: 'mg', rdv: 11, benefit: 'Immune defense & wound healing', color: '#C4A882' },
      { name: 'Magnesium', value: 60, unit: 'mg', rdv: 420, benefit: 'Relaxation & sleep quality', color: '#A8C5DA' },
      { name: 'Lysine', value: 0.8, unit: 'g', rdv: 2.1, benefit: 'Complete protein via rice+dal synergy', color: '#8BA88E' },
    ]},
    wholeSpices: ['Cumin seeds', 'Bay leaf', 'Turmeric', 'Black peppercorns (2–3)', 'Fresh ginger'],
    cookingTip: 'Use 1 part moong dal : 1 part brown rice. The 1 tsp ghee tadka is essential — provides butyrate for gut lining healing.',
    benefits: ['Easiest to digest — ideal for dinner', 'Complete protein: rice + dal synergy', 'Magnesium promotes muscle relaxation & sleep', 'Ayurvedic gut restoration staple'],
    replaces: 'Noodles / Manchurian', replaceReason: 'Removes refined flour, MSG, and 1800mg+ sodium. Complete nutrition.'
  },
  {
    id: 'oats-upma', name: 'Oats Vegetable Upma', emoji: '🍲', meal: 'Breakfast', servingSize: '1 bowl (250g)',
    nutrition: { calories: 225, protein: 7, carbs: 36, fats: 6, fiber: 5, micros: [
      { name: 'Beta-glucan', value: 2, unit: 'g', rdv: 3, benefit: 'FDA-approved cholesterol lowering', color: '#8BA88E' },
      { name: 'Vitamin B1', value: 0.4, unit: 'mg', rdv: 1.2, benefit: 'Carbohydrate metabolism', color: '#F5C842' },
      { name: 'Magnesium', value: 52, unit: 'mg', rdv: 420, benefit: 'Energy production & bone health', color: '#A8C5DA' },
    ]},
    wholeSpices: ['Mustard seeds', 'Cumin seeds', 'Curry leaves', 'Dried red chili', 'Fresh ginger', 'Turmeric'],
    cookingTip: 'Use steel-cut oats (lower GI: 55 vs 79 for instant). Add 1 tbsp roasted peanuts for protein. Use 1 tsp coconut oil — MCTs support brain health.',
    benefits: ['Beta-glucan: only food fiber with FDA cholesterol-lowering claim', 'Sustained energy 4–5 hours', 'Avenanthramide antioxidants unique to oats', 'Feeds Bifidobacterium probiotic bacteria'],
  },
  {
    id: 'quinoa-pulao', name: 'Quinoa Vegetable Pulao', emoji: '🫙', meal: 'Lunch', servingSize: '1 cup cooked (200g)',
    nutrition: { calories: 220, protein: 8, carbs: 39, fats: 4, fiber: 4, micros: [
      { name: 'Complete Protein', value: 4.4, unit: 'g EAA', rdv: 8, benefit: 'All 9 essential amino acids in one grain', color: '#8BA88E' },
      { name: 'Magnesium', value: 118, unit: 'mg', rdv: 420, benefit: 'Highest among grains — 300+ reactions', color: '#A8C5DA' },
      { name: 'Iron', value: 2.8, unit: 'mg', rdv: 18, benefit: 'Pair with Vitamin C for best absorption', color: '#D67D61' },
    ]},
    wholeSpices: ['Bay leaf', 'Green cardamom (2)', 'Cloves (2)', 'Cinnamon', 'Cumin seeds', 'Black pepper', 'Star anise (1)'],
    cookingTip: 'Rinse quinoa thoroughly to remove saponins. Toast dry before cooking for nutty flavor. Use vegetable stock instead of water.',
    benefits: ['One of very few complete plant proteins', 'Magnesium 4× higher than white rice', 'Gluten-free with high satiety', 'Flavonoid quercetin rivals vegetables'],
    replaces: 'Biryani (white basmati)', replaceReason: '3× the protein, 2× the fiber, complete amino acids.'
  },
  {
    id: 'kala-chana', name: 'Kala Chana Masala', emoji: '🟤', meal: 'Lunch', servingSize: '1 cup cooked (200g)',
    nutrition: { calories: 210, protein: 14, carbs: 35, fats: 2, fiber: 10, micros: [
      { name: 'Iron', value: 6, unit: 'mg', rdv: 18, benefit: 'Highest iron among chickpeas', color: '#D67D61' },
      { name: 'Phosphorus', value: 380, unit: 'mg', rdv: 700, benefit: 'Bone mineralization', color: '#C4A882' },
      { name: 'Zinc', value: 3, unit: 'mg', rdv: 11, benefit: 'Strong immune cells & skin repair', color: '#8BA88E' },
      { name: 'Potassium', value: 620, unit: 'mg', rdv: 4700, benefit: 'Blood pressure regulation', color: '#F5C842' },
    ]},
    wholeSpices: ['Anardana (dried pomegranate)', 'Cumin seeds', 'Freshly crushed coriander', 'Black cardamom', 'Bay leaf', 'Cinnamon', 'Turmeric'],
    cookingTip: 'Soak overnight. Slow cook — caramelises natural sugars for rich flavour without masala powder. Anardana adds Vitamin C naturally.',
    benefits: ['Dark pigment = higher antioxidants', '10g fiber feeds gut microbiome', 'Resistant starch (GI 28)', 'Iron + zinc combo for energy and immunity'],
    replaces: 'Pav Bhaji', replaceReason: 'Removes refined bread, adds iron, zinc, and 8g more fiber. Saves ~350 calories.'
  },
  {
    id: 'sprout-chaat', name: 'Sprouted Moong Chaat', emoji: '🌱', meal: 'Breakfast', servingSize: '1 bowl (100g)',
    nutrition: { calories: 140, protein: 8, carbs: 22, fats: 2, fiber: 6, micros: [
      { name: 'Vitamin C', value: 22, unit: 'mg', rdv: 90, benefit: 'Immune boost & iron absorption', color: '#F5C842' },
      { name: 'Iron', value: 2.2, unit: 'mg', rdv: 18, benefit: 'Haemoglobin synthesis', color: '#D67D61' },
      { name: 'Folate', value: 80, unit: 'mcg', rdv: 400, benefit: 'Cell division & growth', color: '#8BA88E' },
    ]},
    wholeSpices: ['Roasted cumin (freshly ground)', 'Black salt (kala namak)', 'Fresh coriander', 'Green chili', 'Lemon juice'],
    cookingTip: 'No cooking needed — preserves all enzymes and heat-sensitive vitamins. Top with pomegranate, cucumber, and lime.',
    benefits: ['Sprouting doubles Vitamin C content', 'Live enzymes aid protein digestion', 'Anti-inflammatory isoflavones', 'Raw = maximum micronutrient retention'],
  },
  {
    id: 'dosa-sambar', name: 'Set Dosa + Sambar', emoji: '🥞', meal: 'Breakfast', servingSize: '2 dosas + 1 katori sambar',
    nutrition: { calories: 320, protein: 10, carbs: 56, fats: 6, fiber: 4, micros: [
      { name: 'Probiotics', value: 1, unit: 'billion CFU', rdv: 1, benefit: 'Gut microbiome diversity', color: '#8BA88E' },
      { name: 'Iron', value: 3.2, unit: 'mg', rdv: 18, benefit: 'From dal in sambar', color: '#D67D61' },
      { name: 'Vitamin C', value: 15, unit: 'mg', rdv: 90, benefit: 'From tomatoes in sambar', color: '#F5C842' },
    ]},
    wholeSpices: ['Mustard seeds', 'Curry leaves', 'Dried red chili', 'Asafoetida (hing)', 'Turmeric', 'Cumin seeds'],
    cookingTip: 'Ferment batter 12–16 hours for maximum probiotic activity. Add drumstick (moringa) to sambar — 7× more Vitamin C than oranges.',
    benefits: ['Fermentation increases nutrient bioavailability', 'Lactic acid bacteria improve gut flora', 'Rice + Urad dal = synergistic amino acids', 'Probiotic support for immunity'],
  },
  {
    id: 'besan-cheela', name: 'Besan Cheela', emoji: '🌮', meal: 'Breakfast', servingSize: '2 medium cheelas',
    nutrition: { calories: 165, protein: 10, carbs: 20, fats: 6, fiber: 4, micros: [
      { name: 'Folate', value: 140, unit: 'mcg', rdv: 400, benefit: 'DNA synthesis & neural health', color: '#8BA88E' },
      { name: 'Iron', value: 2, unit: 'mg', rdv: 18, benefit: 'Oxygen carrying capacity', color: '#D67D61' },
      { name: 'Vitamin B6', value: 0.2, unit: 'mg', rdv: 1.7, benefit: 'Mood regulation (serotonin synthesis)', color: '#F5C842' },
    ]},
    wholeSpices: ['Cumin seeds', 'Turmeric', 'Freshly ground coriander', 'Black pepper', 'Fresh ginger'],
    cookingTip: 'Stuff with grated carrots, spinach, and paneer for a complete macro profile. Use ½ tsp oil per cheela.',
    benefits: ['Chickpea flour = excellent plant protein + folate', 'Gluten-free', 'B6 supports neurotransmitter production', 'Stuffed with veg = minimal extra calories'],
  },
];

const INITIAL_WEEK_MEALS: WeekMeals = {
  Monday:    { Breakfast: 'moong-cheela',  Lunch: 'palak-dal',    Dinner: 'vegetable-khichdi' },
  Tuesday:   { Breakfast: 'ragi-idli',     Lunch: 'rajma',        Dinner: 'mushroom-palak' },
  Wednesday: { Breakfast: 'oats-upma',     Lunch: 'quinoa-pulao', Dinner: 'palak-dal' },
  Thursday:  { Breakfast: 'oats-upma',     Lunch: 'kala-chana',   Dinner: 'mushroom-palak' },
  Friday:    { Breakfast: 'besan-cheela',  Lunch: 'quinoa-pulao', Dinner: 'vegetable-khichdi' },
  Saturday:  { Breakfast: 'dosa-sambar',   Lunch: 'kala-chana',   Dinner: 'palak-dal' },
  Sunday:    { Breakfast: 'besan-cheela',  Lunch: 'palak-dal',    Dinner: 'vegetable-khichdi' },
};

// ─── Static Day Metadata ─────────────────────────────────────────────────────

const DAY_META: DayMeta[] = [
  { day: 'Monday',    theme: 'Immunity & Iron Boost',   emoji: '🛡️', accentColor: '#D67D61', nutritionFocus: 'Iron · Folate · Vitamin C · Plant Protein',        highlight: 'Lemon on Palak Dal multiplies iron absorption 3×. This day provides ~80% RDI iron — the best iron day of the week.' },
  { day: 'Tuesday',   theme: 'Protein Power',           emoji: '💪', accentColor: '#8BA88E', nutritionFocus: 'Calcium · Protein · Digestive Enzymes',              highlight: 'Ragi delivers 244mg calcium at breakfast. Combined with rajma, this day hits the highest protein of the week.' },
  { day: 'Wednesday', theme: 'Gut Health',              emoji: '🦠', accentColor: '#A8C5DA', nutritionFocus: 'Probiotics · B Vitamins · Magnesium',                highlight: 'Oats beta-glucan in the morning sets up sustained energy. Quinoa for lunch provides all 9 essential amino acids.' },
  { day: 'Thursday',  theme: 'Energy & Endurance',      emoji: '⚡', accentColor: '#F5C842', nutritionFocus: 'Complex Carbs · B Vitamins · Vitamin D',              highlight: 'Kala Chana delivers 6mg iron at lunch — the week\'s single highest-iron meal. Mushrooms at dinner provide the only plant-source Vitamin D.' },
  { day: 'Friday',    theme: 'Omega & Antioxidants',    emoji: '✨', accentColor: '#C4A882', nutritionFocus: 'Healthy Fats · Complete Proteins · Antioxidants',     highlight: 'Quinoa for lunch is the only grain with all 9 essential amino acids. Khichdi at dinner ensures complete protein and gut healing.' },
  { day: 'Saturday',  theme: 'Fiber & Minerals',        emoji: '🌾', accentColor: '#8BA88E', nutritionFocus: 'Iron · Zinc · Potassium · Fermented Foods',           highlight: 'Fermented dosa starts the day with probiotic benefits. Kala Chana delivers the week\'s best zinc (3mg) and iron (6mg).' },
  { day: 'Sunday',    theme: 'Rest & Restoration',      emoji: '🌙', accentColor: '#D67D61', nutritionFocus: 'Digestive Healing · Gut Flora · Calming Minerals',    highlight: 'Khichdi dinner has been Ayurvedic gut medicine for 5,000 years. Sunday is the most digestive-friendly and calming day.' },
];

// ─── Recipes ─────────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [
  {
    id: 'moong-cheela-recipe', name: 'Moong Dal Cheela', emoji: '🫓',
    servings: 4, prepTime: '10 min + 4h soak', cookTime: '20 min', oilUsed: '2 tsp ghee total',
    ingredients: [
      { item: 'Split yellow moong dal', quantity: '1 cup', note: 'Soaked 4 hours' },
      { item: 'Fresh ginger', quantity: '1 inch', note: 'Grated' },
      { item: 'Green chili', quantity: '1 small' },
      { item: 'Fresh coriander', quantity: '2 tbsp' },
      { item: 'Rock salt', quantity: '½ tsp' },
      { item: 'Ghee', quantity: '½ tsp per cheela' },
      { item: 'Lemon juice', quantity: '1 tsp', note: 'Add after cooking — key for iron absorption' },
    ],
    wholeSpiceMix: [
      { spice: 'Cumin seeds (jeera)', amount: '½ tsp', benefit: 'Stimulates digestive enzymes, reduces bloating' },
      { spice: 'Turmeric (haldi)', amount: '¼ tsp', benefit: 'Curcumin — potent anti-inflammatory' },
      { spice: 'Black pepper (kali mirch)', amount: 'A pinch', benefit: 'Piperine: enhances curcumin absorption by 2000%' },
    ],
    steps: [
      'Rinse soaked moong dal thoroughly. Drain all water.',
      'Blend dal with ginger, green chili, and 4–5 tbsp water to a smooth batter.',
      'Add cumin seeds, turmeric, black pepper, salt, and fresh coriander. Mix well.',
      'Heat a heavy tawa on medium flame. Once hot, add ¼ tsp ghee.',
      'Pour one ladle of batter and spread in a thin circle (like a crepe).',
      'Cook 2 minutes until edges turn golden. Flip, cook 1 minute more.',
      'Remove. Squeeze ½ tsp lemon juice. Serve immediately with mint-coriander chutney.',
    ],
    nutritionTip: 'The cumin + turmeric + black pepper combination is Ayurvedic alchemy: cumin stimulates digestive fire, turmeric fights inflammation, and piperine in black pepper amplifies bioavailability by 20×. The lemon at the end maximises iron uptake from dal.',
  },
  {
    id: 'palak-dal-recipe', name: 'Palak Dal (Iron Powerhouse)', emoji: '🌿',
    servings: 4, prepTime: '15 min', cookTime: '25 min', oilUsed: '1 tsp ghee',
    ingredients: [
      { item: 'Toor dal', quantity: '1 cup', note: 'Soaked 30 min' },
      { item: 'Fresh spinach', quantity: '3 cups', note: 'Roughly chopped' },
      { item: 'Tomatoes', quantity: '2 medium', note: 'Chopped — natural Vitamin C source' },
      { item: 'Garlic', quantity: '5 cloves', note: 'Minced' },
      { item: 'Fresh ginger', quantity: '1 inch' },
      { item: 'Ghee', quantity: '1 tsp', note: 'For tadka only' },
      { item: 'Lemon', quantity: '½', note: 'Squeeze at serving — CRITICAL for iron absorption' },
    ],
    wholeSpiceMix: [
      { spice: 'Mustard seeds (rai)', amount: '½ tsp', benefit: 'Anti-bacterial; glucosinolates with cancer-protective properties' },
      { spice: 'Cumin seeds (jeera)', amount: '½ tsp', benefit: 'Iron-containing; stimulates digestive enzyme secretion' },
      { spice: 'Dried red chili (whole)', amount: '1–2', benefit: 'Capsaicin: metabolism-boosting, anti-inflammatory' },
      { spice: 'Asafoetida (hing)', amount: 'Pinch', benefit: 'Eliminates flatulence from dal' },
      { spice: 'Turmeric (haldi)', amount: '½ tsp', benefit: 'Anti-inflammatory, hepatoprotective' },
    ],
    steps: [
      'Pressure cook soaked dal with 3 cups water and turmeric for 3 whistles.',
      'Blanch spinach in boiling water 2 minutes. Blend ⅔ to smooth paste; leave ⅓ chopped.',
      'Add both spinach forms to cooked dal. Stir, simmer 5 min.',
      'In a small pan, heat 1 tsp ghee on medium-high until shimmering.',
      'Add mustard seeds — wait for them to splutter, then add cumin seeds.',
      'After 5 sec, add dried red chili and hing. Add garlic and ginger.',
      'Stir 30 seconds. Add tomatoes, cook until softened (5 min).',
      'Pour hot tadka over dal. Season with rock salt.',
      'CRITICAL: Squeeze lemon just before serving — triples iron absorption.',
    ],
    nutritionTip: 'Plant iron is non-heme iron — only 3–8% is absorbed without help. Vitamin C from tomatoes + lemon converts it to the more absorbable ferrous form, boosting absorption to 15–20%. Avoid tea or coffee 1 hour before/after this meal — tannins block iron absorption.',
  },
  {
    id: 'khichdi-recipe', name: 'Healing Vegetable Khichdi', emoji: '🥘',
    servings: 3, prepTime: '10 min', cookTime: '20 min', oilUsed: '1 tsp ghee',
    ingredients: [
      { item: 'Split yellow moong dal', quantity: '½ cup' },
      { item: 'Brown rice', quantity: '½ cup', note: 'Soaked 30 min' },
      { item: 'Seasonal vegetables', quantity: '1 cup', note: 'Carrot, peas, beans, bottlegourd' },
      { item: 'Fresh ginger', quantity: '1 inch', note: 'Julienned' },
      { item: 'Ghee', quantity: '1 tsp', note: 'For finishing tadka — non-negotiable' },
    ],
    wholeSpiceMix: [
      { spice: 'Cumin seeds (jeera)', amount: '½ tsp', benefit: 'Digestive, carminative — prevents gas formation' },
      { spice: 'Turmeric (haldi)', amount: '¼ tsp', benefit: 'Anti-inflammatory, gut lining protection' },
      { spice: 'Bay leaf (tejpatta)', amount: '1', benefit: 'Linalool supports digestion and promotes relaxation' },
      { spice: 'Black peppercorns', amount: '3–4', benefit: 'Piperine activates digestive enzyme secretion' },
    ],
    steps: [
      'Combine washed rice and moong dal in pressure cooker.',
      'Add 3 cups water, turmeric, bay leaf, peppercorns, and vegetables.',
      'Pressure cook 3 whistles on medium. Let pressure release naturally.',
      'Open and stir — should be soft, porridge-like. Add warm water if too thick.',
      'In a small pan, heat 1 tsp ghee. Add cumin seeds — when they crackle, add ginger.',
      'Stir 30 seconds. Pour tadka over khichdi and mix well.',
      'Season with rock salt. Eat hot with a dollop of fresh curd.',
    ],
    nutritionTip: 'Khichdi is a complete protein because rice (high Methionine, low Lysine) perfectly complements dal (low Methionine, high Lysine). The 1 tsp ghee provides butyrate (heals gut lining) and carries fat-soluble vitamins from vegetables.',
  },
  {
    id: 'kala-chana-recipe', name: 'Whole Spice Kala Chana', emoji: '🟤',
    servings: 4, prepTime: '10 min + overnight soak', cookTime: '30 min', oilUsed: '1 tsp mustard oil',
    ingredients: [
      { item: 'Kala chana (black chickpeas)', quantity: '1.5 cups', note: 'Soaked overnight 12h — essential' },
      { item: 'Tomatoes', quantity: '3 medium', note: 'Pureed' },
      { item: 'Onion', quantity: '1 large', note: 'Finely chopped' },
      { item: 'Garlic', quantity: '6 cloves', note: 'Minced' },
      { item: 'Fresh ginger', quantity: '1.5 inch' },
      { item: 'Anardana (dried pomegranate)', quantity: '1 tsp', note: 'Natural souring + Vitamin C' },
      { item: 'Mustard oil', quantity: '1 tsp' },
    ],
    wholeSpiceMix: [
      { spice: 'Black cardamom (badi elaichi)', amount: '2 pods', benefit: 'Digestive, detoxifying; deep smoky pairing' },
      { spice: 'Cinnamon stick (dalchini)', amount: '1 inch', benefit: 'Blood sugar regulation; warm caramel base' },
      { spice: 'Cumin seeds (jeera)', amount: '1 tsp', benefit: 'Anti-flatulent, iron-containing, digestive fire' },
      { spice: 'Coriander seeds (dhaniya)', amount: '1 tsp', note: 'Freshly crushed in mortar', benefit: 'Anti-inflammatory, blood sugar lowering' },
      { spice: 'Turmeric (haldi)', amount: '½ tsp', benefit: 'Anti-inflammatory; enhanced absorption when cooked in oil' },
    ],
    steps: [
      'Drain overnight-soaked chana. Pressure cook with 4 cups fresh water + bay leaf for 5–6 whistles.',
      'Heat 1 tsp mustard oil until just smoking — neutralises pungency.',
      'Add cinnamon and black cardamom — bloom 30 seconds.',
      'Add cumin seeds. When they splutter, add onions. Cook medium-low 8–10 min until golden.',
      'Add garlic and ginger, stir 2 minutes.',
      'Add freshly crushed coriander seeds and turmeric. Stir 1 minute.',
      'Add tomato puree. Cook until oil separates from masala (5–7 min) — the secret to rich flavour.',
      'Add pressure-cooked chana with cooking water. Simmer 10 minutes.',
      'Add anardana and rock salt. Simmer 5 more minutes. Garnish and serve.',
    ],
    nutritionTip: 'Black chickpeas have 6mg iron per cup, but only ~5% is absorbed without Vitamin C. The tomato gravy + anardana together boost absorption to 18%+. Never use store-bought chole masala — it\'s mostly salt, artificial colour, and stale ground spices.',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];
const MACRO_COLORS = { protein: '#D67D61', carbs: '#F5C842', fats: '#A8C5DA', fiber: '#8BA88E' };
const MEAL_ICONS: Record<MealType, React.ComponentType<{ className?: string }>> = {
  Breakfast: Coffee, Lunch: Utensils, Dinner: Timer,
};

const LS_DISHES = 'aaram-dishes-v2';
const LS_MEALS  = 'aaram-week-meals-v2';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

// ─── Component ────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const [dishes, setDishes] = useState<DishProfile[]>(() => loadFromLS(LS_DISHES, INITIAL_DISHES));
  const [weekMeals, setWeekMeals] = useState<WeekMeals>(() => loadFromLS(LS_MEALS, INITIAL_WEEK_MEALS));
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('weekly');
  const [activeDay, setActiveDay] = useState<DayOfWeek>('Monday');
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [editingMeals, setEditingMeals] = useState(false);
  const [mealFilter, setMealFilter] = useState<MealType | 'All'>('All');

  // Add dish modal state
  const [showAddDish, setShowAddDish] = useState(false);
  const [addDishName, setAddDishName] = useState('');
  const [addDishMeal, setAddDishMeal] = useState<MealType>('Breakfast');
  const [addDishEmoji, setAddDishEmoji] = useState('🍽️');
  const [estimating, setEstimating] = useState(false);
  const [estimatedData, setEstimatedData] = useState<(DishNutrition & { servingSize: string; wholeSpices: string[]; benefits: string[]; cookingTip: string }) | null>(null);
  const [estimateError, setEstimateError] = useState('');

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(LS_DISHES, JSON.stringify(dishes)); }, [dishes]);
  useEffect(() => { localStorage.setItem(LS_MEALS, JSON.stringify(weekMeals)); }, [weekMeals]);

  // ── Dynamic computation ─────────────────────────────────────────────────────

  const getDayDishes = useCallback((day: DayOfWeek): DishProfile[] => {
    return MEALS.map(m => weekMeals[day][m])
      .filter(Boolean)
      .map(id => dishes.find(d => d.id === id))
      .filter(Boolean) as DishProfile[];
  }, [weekMeals, dishes]);

  const getDayTotals = useCallback((day: DayOfWeek) => {
    const ds = getDayDishes(day);
    return {
      calories: sum(ds.map(d => d.nutrition.calories)),
      protein:  sum(ds.map(d => d.nutrition.protein)),
      carbs:    sum(ds.map(d => d.nutrition.carbs)),
      fats:     sum(ds.map(d => d.nutrition.fats)),
      fiber:    sum(ds.map(d => d.nutrition.fiber)),
    };
  }, [getDayDishes]);

  const getMicroSum = useCallback((day: DayOfWeek, microName: string) => {
    return getDayDishes(day).reduce((s, d) => {
      const m = d.nutrition.micros.find(mi => mi.name.toLowerCase().includes(microName.toLowerCase()));
      return s + (m ? m.value : 0);
    }, 0);
  }, [getDayDishes]);

  const getRadarData = useCallback((day: DayOfWeek) => {
    const t = getDayTotals(day);
    const ds = getDayDishes(day);
    const iron = getMicroSum(day, 'iron');
    const calcium = getMicroSum(day, 'calcium');
    const vitaminScore = Math.min(100, 45 + ds.length * 12); // estimated from variety

    const scores = [
      { subject: 'Protein',  score: Math.min(100, Math.round((t.protein / 60) * 100)),  fullMark: 100 },
      { subject: 'Fiber',    score: Math.min(100, Math.round((t.fiber / 30) * 100)),    fullMark: 100 },
      { subject: 'Iron',     score: Math.min(100, Math.round((iron / 18) * 100)),       fullMark: 100 },
      { subject: 'Vitamins', score: vitaminScore,                                        fullMark: 100 },
      { subject: 'Calcium',  score: Math.min(100, Math.round((calcium / 1000) * 100)), fullMark: 100 },
      { subject: 'Balance',  score: 0,                                                  fullMark: 100 },
    ];
    const avg = Math.round(scores.slice(0, 5).reduce((s, x) => s + x.score, 0) / 5);
    scores[5].score = avg;
    return scores;
  }, [getDayTotals, getDayDishes, getMicroSum]);

  // memoised per-day computed values
  const dayTotals = useMemo(() => getDayTotals(activeDay), [activeDay, getDayTotals]);
  const radarData = useMemo(() => getRadarData(activeDay), [activeDay, getRadarData]);
  const dayMeta   = DAY_META.find(d => d.day === activeDay)!;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const updateMeal = (day: DayOfWeek, meal: MealType, dishId: string | null) => {
    setWeekMeals(prev => ({ ...prev, [day]: { ...prev[day], [meal]: dishId } }));
  };

  const estimateNutrition = async () => {
    if (!addDishName.trim()) return;
    setEstimating(true);
    setEstimateError('');
    setEstimatedData(null);
    try {
      const res = await fetch('/api/nutrition/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: addDishName }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setEstimatedData(data);
    } catch {
      setEstimateError('Could not estimate nutrition. Please try again.');
    } finally {
      setEstimating(false);
    }
  };

  const saveDish = () => {
    if (!estimatedData || !addDishName.trim()) return;
    const id = addDishName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const newDish: DishProfile = {
      id, name: addDishName.trim(), emoji: addDishEmoji, meal: addDishMeal,
      servingSize: estimatedData.servingSize || '1 serving',
      nutrition: {
        calories: estimatedData.calories, protein: estimatedData.protein,
        carbs: estimatedData.carbs, fats: estimatedData.fats, fiber: estimatedData.fiber,
        micros: estimatedData.micros || [],
      },
      wholeSpices: estimatedData.wholeSpices || [],
      cookingTip: estimatedData.cookingTip || '',
      benefits: estimatedData.benefits || [],
    };
    setDishes(prev => [...prev, newDish]);
    setShowAddDish(false);
    setAddDishName('');
    setEstimatedData(null);
    setAddDishEmoji('🍽️');
  };

  const resetToDefaults = () => {
    setDishes(INITIAL_DISHES);
    setWeekMeals(INITIAL_WEEK_MEALS);
  };

  const deleteDish = (id: string) => {
    setDishes(prev => prev.filter(d => d.id !== id));
    // Remove from week meals
    setWeekMeals(prev => {
      const next = { ...prev };
      DAYS.forEach(day => {
        MEALS.forEach(meal => {
          if (next[day][meal] === id) next[day] = { ...next[day], [meal]: null };
        });
      });
      return next;
    });
  };

  const filteredDishes = mealFilter === 'All' ? dishes : dishes.filter(d => d.meal === mealFilter);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'weekly',   label: 'Weekly Plan',    icon: Calendar },
    { id: 'dishes',   label: 'Dish Library',   icon: Leaf },
    { id: 'balance',  label: 'Daily Balance',  icon: BarChart3 },
    { id: 'recipes',  label: 'Recipes',        icon: Scroll },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 lg:p-12 pb-24 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 25, repeat: Infinity }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-secondary/5 rounded-full blur-[100px]" />
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 18, repeat: Infinity }}
          className="absolute -bottom-1/4 -left-1/4 w-2/3 h-2/3 bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/food-hub"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-primary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Food Hub
          </Link>
          <div className="flex items-center gap-3">
            {isAdminMode && (
              <button onClick={resetToDefaults}
                className="soft-button px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/30 hover:text-primary flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
              </button>
            )}
            <button onClick={() => { setIsAdminMode(!isAdminMode); setEditingMeals(false); }}
              className={cn('soft-button px-5 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all',
                isAdminMode ? 'bg-primary text-white border-primary' : 'text-foreground/40 hover:text-primary')}>
              <Shield className="w-3.5 h-3.5" />
              {isAdminMode ? 'Admin Active' : 'Admin Mode'}
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            <Sprout className="w-3.5 h-3.5" /> Aaram Nutrition Science
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter uppercase leading-none">
            Nourish <span className="text-primary italic">Deeply</span>
          </h1>
          <p className="text-foreground/50 font-medium text-sm mt-2 uppercase tracking-widest">
            Organic · Whole Spices · Light on the Body · Complete Nutrition
          </p>
        </motion.div>

        {/* Philosophy cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Leaf,      label: 'Organic Whole Foods',  desc: 'Minimally processed, maximum nutrition' },
            { icon: FlaskConical, label: 'Whole Spice Science', desc: 'Each spice chosen for therapeutic benefit' },
            { icon: Heart,     label: 'Light on the Body',    desc: 'Easy digestion, no heavy processed oils' },
            { icon: Shield,    label: 'Complete Nutrients',   desc: 'Every macro & micro accounted for daily' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="soft-card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-foreground uppercase tracking-tight">{label}</p>
                <p className="text-[9px] text-foreground/40 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-10">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all border',
              activeTab === tab.id
                ? 'btn-terracotta border-primary shadow-xl'
                : 'soft-button border-white text-foreground/40 hover:text-foreground/70')}>
            <tab.icon className={cn('w-4 h-4', activeTab === tab.id && 'text-white')} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Tab 1: Weekly Plan ──────────────────────────────────────────────── */}
        {activeTab === 'weekly' && (
          <motion.div key="weekly" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-1">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Calendar className="w-4 h-4" /></span>
                  Balanced Weekly Menu
                </h2>
                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest ml-11">No processed masala · Whole spice tadkas · Max 2 tsp oil per dish</p>
              </div>
              {isAdminMode && (
                <button onClick={() => setEditingMeals(!editingMeals)}
                  className={cn('flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all',
                    editingMeals ? 'btn-terracotta border-primary' : 'soft-button border-white text-foreground/40 hover:text-foreground/70')}>
                  {editingMeals ? <><Save className="w-3.5 h-3.5" /> Done Editing</> : <><Edit3 className="w-3.5 h-3.5" /> Edit Meals</>}
                </button>
              )}
            </div>

            {/* Day selector */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8">
              {DAY_META.map(meta => (
                <button key={meta.day} onClick={() => setActiveDay(meta.day)}
                  className={cn('flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border',
                    activeDay === meta.day
                      ? 'btn-terracotta border-primary shadow-xl scale-105'
                      : 'soft-button border-white text-foreground/30 hover:text-foreground/60')}>
                  <span>{meta.emoji}</span> {meta.day.substring(0, 3)}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeDay} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Day overview */}
                  <div className="space-y-4">
                    <div className="soft-card p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-4xl">{dayMeta.emoji}</span>
                        <div>
                          <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">{dayMeta.day}</p>
                          <h3 className="text-xl font-black text-foreground">{dayMeta.theme}</h3>
                        </div>
                      </div>
                      <div className="soft-well p-4 border border-white mb-3">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">Nutrition Focus</p>
                        <p className="text-xs font-bold text-foreground">{dayMeta.nutritionFocus}</p>
                      </div>
                      <div className="soft-well p-4 border border-white">
                        <div className="flex gap-2 mb-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Key Insight</p>
                        </div>
                        <p className="text-xs text-foreground/60 leading-relaxed">{dayMeta.highlight}</p>
                      </div>
                    </div>

                    {/* Dynamic daily totals */}
                    <div className="soft-card p-6">
                      <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest mb-4">Daily Totals (dynamic)</p>
                      <div className="space-y-3">
                        {[
                          { label: 'Calories', value: dayTotals.calories, unit: 'kcal', max: 2200, color: '#D67D61' },
                          { label: 'Protein',  value: dayTotals.protein,  unit: 'g',    max: 70,   color: '#8BA88E' },
                          { label: 'Carbs',    value: dayTotals.carbs,    unit: 'g',    max: 310,  color: '#F5C842' },
                          { label: 'Fiber',    value: dayTotals.fiber,    unit: 'g',    max: 35,   color: '#A8C5DA' },
                        ].map(m => (
                          <div key={m.label}>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-black text-foreground/60 uppercase">{m.label}</span>
                              <span className="text-[10px] font-black" style={{ color: m.color }}>{m.value}{m.unit}</span>
                            </div>
                            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                              <motion.div
                                key={`${activeDay}-${m.label}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full rounded-full" style={{ backgroundColor: m.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Meal slots */}
                  <div className="lg:col-span-2 space-y-4">
                    {MEALS.map(meal => {
                      const Icon = MEAL_ICONS[meal];
                      const dishId = weekMeals[activeDay][meal];
                      const dish = dishes.find(d => d.id === dishId);

                      return (
                        <motion.div key={meal} className="soft-card p-6 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <Icon className="w-16 h-16" />
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">{meal}</p>

                              {editingMeals && isAdminMode ? (
                                <select
                                  value={dishId || ''}
                                  onChange={e => updateMeal(activeDay, meal, e.target.value || null)}
                                  className="w-full p-2 soft-well border border-white text-sm font-bold text-foreground bg-background rounded-xl outline-none focus:ring-2 ring-primary/20">
                                  <option value="">— Empty —</option>
                                  {dishes.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.meal})</option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-lg font-bold text-foreground">
                                  {dish ? `${dish.emoji} ${dish.name}` : <span className="text-foreground/30 italic">No dish selected</span>}
                                </p>
                              )}

                              {dish && !editingMeals && (
                                <div className="flex gap-3 mt-2">
                                  <span className="text-[9px] font-bold text-foreground/40">{dish.nutrition.calories} kcal</span>
                                  <span className="text-[9px] font-bold text-foreground/40">{dish.nutrition.protein}g protein</span>
                                  <span className="text-[9px] font-bold text-foreground/40">{dish.nutrition.fiber}g fiber</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {editingMeals && isAdminMode && (
                      <div className="soft-card p-4 border border-primary/20 bg-primary/5">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                          <Star className="w-3.5 h-3.5 inline mr-1" /> Editing Mode
                        </p>
                        <p className="text-xs text-foreground/50">
                          Select dishes from the dropdown. Daily Balance charts update automatically. Add new dishes in the Dish Library tab.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Week-at-a-glance */}
                <div className="mt-8 soft-card p-6">
                  <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest mb-5">Week at a Glance — Dynamic Scores</p>
                  <div className="grid grid-cols-7 gap-3">
                    {DAY_META.map(meta => {
                      const r = getRadarData(meta.day);
                      const avg = Math.round(r.find(x => x.subject === 'Balance')?.score || 0);
                      return (
                        <button key={meta.day} onClick={() => setActiveDay(meta.day)}
                          className={cn('flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border',
                            activeDay === meta.day ? 'border-primary bg-primary/5' : 'soft-well border-white')}>
                          <span className="text-xl">{meta.emoji}</span>
                          <p className="text-[9px] font-black text-foreground/50 uppercase">{meta.day.substring(0, 3)}</p>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                            style={{ backgroundColor: meta.accentColor }}>
                            {avg}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Tab 2: Dish Library ──────────────────────────────────────────────── */}
        {activeTab === 'dishes' && (
          <motion.div key="dishes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-1">
                  <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><Leaf className="w-4 h-4" /></span>
                  Dish Nutrition Library
                </h2>
                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1 ml-11">
                  {dishes.length} dishes · Per-serving breakdown with whole spice benefits
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['All', 'Breakfast', 'Lunch', 'Dinner'] as const).map(f => (
                  <button key={f} onClick={() => setMealFilter(f)}
                    className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                      mealFilter === f ? 'btn-terracotta border-primary' : 'soft-button border-white text-foreground/40')}>
                    {f}
                  </button>
                ))}
                {isAdminMode && (
                  <button onClick={() => { setShowAddDish(true); setEstimatedData(null); setEstimateError(''); setAddDishName(''); }}
                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Dish
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredDishes.map((dish, idx) => (
                <motion.div key={dish.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }} className="soft-card overflow-hidden">

                  <div className="p-6 pb-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{dish.emoji}</span>
                        <div>
                          <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-0.5">{dish.meal}</p>
                          <h3 className="text-base font-black text-foreground">{dish.name}</h3>
                          <p className="text-[9px] text-foreground/40">{dish.servingSize}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-2xl font-black text-foreground">{dish.nutrition.calories}</p>
                        <p className="text-[9px] font-black text-foreground/30 uppercase">kcal</p>
                        {isAdminMode && (
                          <button onClick={() => deleteDish(dish.id)}
                            className="text-[8px] font-black text-red-400/50 hover:text-red-400 uppercase tracking-wider mt-1">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {([
                        { key: 'protein' as const, label: 'P', color: MACRO_COLORS.protein },
                        { key: 'carbs'   as const, label: 'C', color: MACRO_COLORS.carbs },
                        { key: 'fats'    as const, label: 'F', color: MACRO_COLORS.fats },
                        { key: 'fiber'   as const, label: 'Fi', color: MACRO_COLORS.fiber },
                      ]).map(m => (
                        <div key={m.key} className="soft-well p-2.5 border border-white text-center">
                          <p className="text-[9px] font-black uppercase" style={{ color: m.color }}>{m.label}</p>
                          <p className="text-sm font-black text-foreground">{dish.nutrition[m.key]}g</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Micros */}
                  <div className="px-6 pb-4">
                    <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-2">Key Micronutrients</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dish.nutrition.micros.map(m => (
                        <div key={m.name} className="group relative">
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black border cursor-default"
                            style={{ borderColor: m.color + '40', backgroundColor: m.color + '15', color: m.color }}>
                            {m.name}{m.value > 0 ? `: ${m.value}${m.unit}` : ''}
                          </span>
                          <div className="absolute bottom-full left-0 mb-1.5 bg-foreground text-background text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-48">
                            {m.benefit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expandable */}
                  <button onClick={() => setExpandedDish(expandedDish === dish.id ? null : dish.id)}
                    className="w-full px-6 py-3 flex items-center justify-between soft-well border-t border-white/40 hover:bg-white/20 transition-colors">
                    <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Spices & Benefits</span>
                    <ChevronDown className={cn('w-4 h-4 text-foreground/40 transition-transform', expandedDish === dish.id && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {expandedDish === dish.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 pb-6 pt-4 space-y-4">
                          <div>
                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-2">Whole Spices</p>
                            <div className="flex flex-wrap gap-1.5">
                              {dish.wholeSpices.map(s => (
                                <span key={s} className="px-2.5 py-1 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg text-[9px] font-bold">{s}</span>
                              ))}
                            </div>
                          </div>
                          {dish.cookingTip && (
                            <div className="soft-well p-4 border border-white">
                              <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-1.5">
                                <Lightbulb className="w-3 h-3 inline mr-1 text-primary" /> Cooking Tip
                              </p>
                              <p className="text-xs text-foreground/60 leading-relaxed">{dish.cookingTip}</p>
                            </div>
                          )}
                          <ul className="space-y-1">
                            {dish.benefits.map(b => (
                              <li key={b} className="flex items-start gap-2 text-xs text-foreground/60">
                                <Sprout className="w-3 h-3 text-secondary flex-shrink-0 mt-0.5" /> {b}
                              </li>
                            ))}
                          </ul>
                          {dish.replaces && (
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                              <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Replaces</p>
                              <p className="text-xs text-foreground/60">
                                <span className="line-through text-foreground/30">{dish.replaces}</span>
                                {dish.replaceReason && <span className="ml-1">— {dish.replaceReason}</span>}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Tab 3: Daily Balance ──────────────────────────────────────────────── */}
        {activeTab === 'balance' && (
          <motion.div key="balance" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-1">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><BarChart3 className="w-4 h-4" /></span>
                Daily Nutritional Balance
              </h2>
              <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest ml-11">
                Updates dynamically based on your weekly plan selections
              </p>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8">
              {DAY_META.map(meta => (
                <button key={meta.day} onClick={() => setActiveDay(meta.day)}
                  className={cn('flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border',
                    activeDay === meta.day ? 'btn-terracotta border-primary shadow-xl' : 'soft-button border-white text-foreground/30')}>
                  <span>{meta.emoji}</span> {meta.day.substring(0, 3)}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`balance-${activeDay}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  {/* Radar */}
                  <div className="soft-card p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{dayMeta.emoji}</span>
                      <div>
                        <h3 className="text-xl font-black text-foreground">{dayMeta.day}</h3>
                        <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">{dayMeta.theme}</p>
                      </div>
                    </div>
                    {/* Active dishes for this day */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {MEALS.map(meal => {
                        const dish = dishes.find(d => d.id === weekMeals[activeDay][meal]);
                        return dish ? (
                          <span key={meal} className="px-2.5 py-1 bg-foreground/5 rounded-xl text-[9px] font-bold text-foreground/60">
                            {dish.emoji} {dish.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="rgba(0,0,0,0.06)" radialLines={false} />
                          <PolarAngleAxis dataKey="subject"
                            tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--foreground)', opacity: 0.5 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Nutrition" dataKey="score" stroke={dayMeta.accentColor}
                            fill={dayMeta.accentColor} fillOpacity={0.25} strokeWidth={2} />
                          <Tooltip contentStyle={{ background: 'rgba(242,238,230,0.95)', borderRadius: '12px', border: 'none', fontSize: 11, fontWeight: 700 }}
                            formatter={(v) => [`${v}/100`, 'Score']} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="soft-card p-8">
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-6">Score Breakdown (% of RDI)</p>
                    <div className="space-y-4">
                      {radarData.map(item => (
                        <div key={item.subject}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs font-black text-foreground uppercase">{item.subject}</span>
                            <span className={cn('text-xs font-black',
                              item.score >= 85 ? 'text-secondary' : item.score >= 65 ? 'text-primary' : 'text-amber-500')}>
                              {item.score}/100
                            </span>
                          </div>
                          <div className="h-2 bg-foreground/8 rounded-full overflow-hidden">
                            <motion.div
                              key={`${activeDay}-${item.subject}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.score >= 85 ? '#8BA88E' : item.score >= 65 ? '#D67D61' : '#F5C842' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 soft-well p-4 border border-white">
                      <div className="flex gap-2 items-start">
                        <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground/60 leading-relaxed">{dayMeta.highlight}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weekly protein chart — dynamic */}
                <div className="mt-8 soft-card p-8">
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-6">
                    Weekly Protein vs 60g Target — Live from Plan
                  </p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={DAY_META.map(meta => {
                        const t = getDayTotals(meta.day);
                        return { day: meta.day.substring(0, 3), protein: t.protein, fiber: t.fiber, accentColor: meta.accentColor };
                      })}>
                        <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--foreground)', opacity: 0.4 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--foreground)', opacity: 0.3 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'rgba(242,238,230,0.95)', borderRadius: '12px', border: 'none', fontSize: 11, fontWeight: 700 }} />
                        <Bar dataKey="protein" name="Protein (g)" radius={[6, 6, 0, 0]}>
                          {DAY_META.map(meta => (
                            <Cell key={meta.day} fill={meta.day === activeDay ? meta.accentColor : meta.accentColor + '55'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* RDI reference */}
                <div className="mt-8 soft-card p-8">
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-5">Recommended Daily Intakes (Adults)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { n: 'Protein', t: '50–60g',    note: 'Complete with dal + grain combinations' },
                      { n: 'Fiber',   t: '25–35g',    note: 'Achieved every day on this plan' },
                      { n: 'Iron',    t: '8–18mg',    note: 'Enhance with lemon on iron-rich dishes' },
                      { n: 'Calcium', t: '1000mg',    note: 'Ragi + dairy + sesame provide this' },
                      { n: 'Vit C',   t: '65–90mg',  note: 'Fresh seasonal fruit + tomatoes daily' },
                      { n: 'Magnesium', t: '310–420mg', note: 'Legumes, nuts, whole grains cover this' },
                      { n: 'Zinc',    t: '8–11mg',    note: 'Legumes + seeds + soak before cooking' },
                      { n: 'Folate',  t: '400mcg',   note: 'Dal, leafy greens, sprouts are rich sources' },
                    ].map(r => (
                      <div key={r.n} className="soft-well p-4 border border-white">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">{r.n}</p>
                        <p className="text-base font-black text-foreground mb-1">{r.t}</p>
                        <p className="text-[9px] text-foreground/40 leading-snug">{r.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Tab 4: Recipes ──────────────────────────────────────────────────── */}
        {activeTab === 'recipes' && (
          <motion.div key="recipes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-1">
                <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><ChefHat className="w-4 h-4" /></span>
                Whole Spice Recipes
              </h2>
              <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest ml-11">No processed masala · Minimum oil · Every spice chosen for therapeutic benefit</p>
            </div>

            {/* Philosophy */}
            <div className="soft-card p-5 mb-8 border border-primary/20 bg-primary/5">
              <div className="flex gap-3 items-start">
                <FlaskConical className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Why Whole Spices vs Processed Masala Powder</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-foreground/60">
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5"><span className="text-secondary">✓</span> Freshly roasted & ground = 5–10× more active compounds</li>
                      <li className="flex items-start gap-1.5"><span className="text-secondary">✓</span> No artificial colour, anti-caking agents, or preservatives</li>
                      <li className="flex items-start gap-1.5"><span className="text-secondary">✓</span> Essential oils released at cooking time = maximum flavour</li>
                    </ul>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5"><span className="text-red-400">✗</span> Store powders lose 80% potency within 6 months</li>
                      <li className="flex items-start gap-1.5"><span className="text-red-400">✗</span> Processed masala = mostly salt, starch, and artificial colour</li>
                      <li className="flex items-start gap-1.5"><span className="text-red-400">✗</span> No therapeutic benefit remains in stale ground spices</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {RECIPES.map((recipe, idx) => (
                <motion.div key={recipe.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 }} className="soft-card overflow-hidden">
                  <button onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                    className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-white/20 transition-colors">
                    <div className="flex items-center gap-5">
                      <span className="text-4xl">{recipe.emoji}</span>
                      <div className="text-left">
                        <h3 className="text-xl font-black text-foreground">{recipe.name}</h3>
                        <div className="flex flex-wrap gap-3 mt-2">
                          <span className="text-[9px] font-black text-foreground/40 uppercase">⏱ {recipe.prepTime}</span>
                          <span className="text-[9px] font-black text-foreground/40 uppercase">🔥 {recipe.cookTime}</span>
                          <span className="text-[9px] font-black text-secondary uppercase">💧 {recipe.oilUsed}</span>
                          <span className="text-[9px] font-black text-foreground/40 uppercase">👥 Serves {recipe.servings}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn('w-5 h-5 text-foreground/40 transition-transform flex-shrink-0', expandedRecipe === recipe.id && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {expandedRecipe === recipe.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 md:px-8 pb-8 pt-4 space-y-8 border-t border-white/40">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-4">Ingredients</p>
                              <div className="space-y-2">
                                {recipe.ingredients.map((ing, i) => (
                                  <div key={i} className="flex items-start gap-3 p-3 soft-well border border-white">
                                    <span className="text-[10px] font-black text-primary w-5 text-center flex-shrink-0">{i + 1}</span>
                                    <div>
                                      <span className="text-xs font-black text-foreground">{ing.item}</span>
                                      <span className="text-xs text-foreground/50 ml-2">— {ing.quantity}</span>
                                      {ing.note && <p className="text-[9px] text-foreground/30 mt-0.5 italic">{ing.note}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-4">
                                <FlaskConical className="w-3.5 h-3.5 inline mr-1 text-secondary" /> Whole Spice Mix & Why
                              </p>
                              <div className="space-y-3">
                                {recipe.wholeSpiceMix.map((s, i) => (
                                  <div key={i} className="p-4 soft-well border border-secondary/20 bg-secondary/5">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs font-black text-foreground">{s.spice}</p>
                                      <span className="text-[9px] font-black text-secondary whitespace-nowrap">{s.amount}</span>
                                    </div>
                                    {s.note && <p className="text-[9px] text-foreground/40 italic mt-0.5">{s.note}</p>}
                                    <p className="text-[9px] text-secondary/70 mt-1.5 leading-relaxed">{s.benefit}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-4">Method</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {recipe.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 soft-well border border-white">
                                  <span className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">
                                    {i + 1}
                                  </span>
                                  <p className="text-xs text-foreground/70 leading-relaxed">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="p-5 rounded-2xl bg-secondary/10 border border-secondary/20">
                            <div className="flex gap-3 items-start">
                              <Brain className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1.5">Nutrition Science Tip</p>
                                <p className="text-xs text-foreground/70 leading-relaxed">{recipe.nutritionTip}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-16 text-center">
        <p className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">
          Nutritional values are approximate per serving · Consult a dietitian for individual dietary needs
        </p>
      </div>

      {/* ── Add Dish Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddDish && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddDish(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg soft-card p-8 space-y-6 max-h-[90vh] overflow-y-auto">

              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter">
                  Add <span className="text-primary italic">Dish</span>
                </h3>
                <button onClick={() => setShowAddDish(false)}
                  className="w-10 h-10 rounded-xl soft-button border-white text-foreground/40 hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1 block mb-2">Emoji</label>
                    <input value={addDishEmoji} onChange={e => setAddDishEmoji(e.target.value)}
                      className="w-full p-3 soft-well bg-white/40 border border-white outline-none focus:ring-2 ring-primary/20 text-center text-2xl rounded-xl" />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1 block mb-2">Dish Name</label>
                    <input value={addDishName} onChange={e => setAddDishName(e.target.value)}
                      placeholder="e.g. Methi Thepla, Pongal, Baingan Bharta"
                      className="w-full p-3 soft-well bg-white/40 border border-white outline-none focus:ring-2 ring-primary/20 text-sm font-bold rounded-xl placeholder:text-foreground/20" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1 block mb-2">Meal Type</label>
                  <div className="flex gap-3">
                    {MEALS.map(m => (
                      <button key={m} onClick={() => setAddDishMeal(m)}
                        className={cn('flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                          addDishMeal === m ? 'btn-terracotta border-primary' : 'soft-button border-white text-foreground/40')}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={estimateNutrition} disabled={!addDishName.trim() || estimating}
                  className="w-full py-4 btn-terracotta text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  {estimating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analysing with Gemini AI...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Auto-Detect Nutrition</>
                  )}
                </button>

                {estimateError && (
                  <p className="text-xs text-red-400 text-center font-bold">{estimateError}</p>
                )}
              </div>

              {/* Estimated results */}
              {estimatedData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-2 border-t border-white/40">
                  <div className="flex items-center gap-2 text-secondary">
                    <Check className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nutrition Detected — Serving: {estimatedData.servingSize}</p>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: 'Cal',     value: estimatedData.calories, unit: 'kcal', color: '#D67D61' },
                      { label: 'Protein', value: estimatedData.protein,  unit: 'g',    color: '#8BA88E' },
                      { label: 'Carbs',   value: estimatedData.carbs,    unit: 'g',    color: '#F5C842' },
                      { label: 'Fats',    value: estimatedData.fats,     unit: 'g',    color: '#A8C5DA' },
                      { label: 'Fiber',   value: estimatedData.fiber,    unit: 'g',    color: '#C4A882' },
                    ].map(m => (
                      <div key={m.label} className="soft-well p-3 border border-white text-center">
                        <p className="text-[8px] font-black uppercase" style={{ color: m.color }}>{m.label}</p>
                        <p className="text-sm font-black text-foreground">{m.value}</p>
                        <p className="text-[8px] text-foreground/30">{m.unit}</p>
                      </div>
                    ))}
                  </div>

                  {/* Whole spices */}
                  {estimatedData.wholeSpices?.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-2">Whole Spices</p>
                      <div className="flex flex-wrap gap-1.5">
                        {estimatedData.wholeSpices.map(s => (
                          <span key={s} className="px-2.5 py-1 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg text-[9px] font-bold">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {estimatedData.benefits?.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-2">Health Benefits</p>
                      <ul className="space-y-1">
                        {estimatedData.benefits.map(b => (
                          <li key={b} className="flex items-start gap-2 text-xs text-foreground/60">
                            <Sprout className="w-3 h-3 text-secondary flex-shrink-0 mt-0.5" /> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEstimatedData(null)}
                      className="flex-1 py-3 soft-button border-white text-foreground/40 text-[10px] font-black uppercase tracking-widest">
                      Retry
                    </button>
                    <button onClick={saveDish}
                      className="flex-[2] py-3 btn-terracotta text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Add to Library
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
