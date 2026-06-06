'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, Flame, BarChart3, ChefHat, ArrowLeft, Coffee,
  Utensils, Timer, ShoppingBag, Heart, Shield, Brain,
  Sprout, Star, Zap, Apple, Info, ChevronDown, Lightbulb,
  Calendar, FlaskConical, Scroll
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
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
interface DayPlan {
  day: DayOfWeek; theme: string; nutritionFocus: string; emoji: string; accentColor: string;
  meals: Record<MealType, string>;
  dailyTotals: { calories: number; protein: number; carbs: number; fats: number; fiber: number };
  radarData: { subject: string; score: number; fullMark: number }[];
  highlight: string;
}
interface SpiceMix { spice: string; amount: string; benefit: string; note?: string }
interface Recipe {
  id: string; name: string; emoji: string; servings: number; prepTime: string;
  cookTime: string; oilUsed: string;
  ingredients: { item: string; quantity: string; note?: string }[];
  wholeSpiceMix: SpiceMix[]; steps: string[]; nutritionTip: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const DISHES: DishProfile[] = [
  {
    id: 'moong-cheela', name: 'Moong Dal Cheela', emoji: '🫓', meal: 'Breakfast', servingSize: '2 medium cheelas',
    nutrition: {
      calories: 185, protein: 12, carbs: 25, fats: 4, fiber: 5,
      micros: [
        { name: 'Iron', value: 2.5, unit: 'mg', rdv: 18, benefit: 'Red blood cell formation', color: '#D67D61' },
        { name: 'Folate', value: 125, unit: 'mcg', rdv: 400, benefit: 'DNA synthesis & cell growth', color: '#8BA88E' },
        { name: 'Magnesium', value: 48, unit: 'mg', rdv: 420, benefit: 'Muscle & nerve function', color: '#A8C5DA' },
        { name: 'Zinc', value: 1.5, unit: 'mg', rdv: 11, benefit: 'Immune defense', color: '#C4A882' },
      ],
    },
    wholeSpices: ['Cumin seeds (jeera)', 'Black pepper', 'Turmeric (haldi)', 'Green chili', 'Fresh coriander'],
    cookingTip: 'Soak dal 4 hours for better digestibility. Cook on medium heat with ½ tsp ghee. Squeeze lemon after cooking — Vitamin C boosts iron absorption.',
    benefits: ['High plant protein', 'Low glycemic index — sustained energy', 'Folate-rich for cellular health', 'Naturally gluten-free'],
    replaces: 'Poha & Jalebi',
    replaceReason: 'Removes refined sugar jalebi, adds 8g extra protein. Much lower glycemic load.'
  },
  {
    id: 'palak-dal', name: 'Palak Dal', emoji: '🌿', meal: 'Lunch', servingSize: '1 katori (200ml)',
    nutrition: {
      calories: 195, protein: 13, carbs: 28, fats: 4, fiber: 7,
      micros: [
        { name: 'Iron', value: 5.2, unit: 'mg', rdv: 18, benefit: 'Prevents anaemia — top plant source', color: '#D67D61' },
        { name: 'Vitamin A', value: 580, unit: 'mcg', rdv: 900, benefit: 'Eye health & immunity', color: '#F5C842' },
        { name: 'Calcium', value: 180, unit: 'mg', rdv: 1000, benefit: 'Bone density', color: '#A8C5DA' },
        { name: 'Vitamin K', value: 145, unit: 'mcg', rdv: 120, benefit: 'Blood clotting & bone metabolism', color: '#C4A882' },
      ],
    },
    wholeSpices: ['Mustard seeds (rai)', 'Cumin seeds', 'Dried red chili', 'Asafoetida (hing)', 'Turmeric'],
    cookingTip: 'Use 1 tsp ghee for tadka — enhances fat-soluble vitamin absorption. Always squeeze lemon at end: Vitamin C triples iron absorption from plant sources.',
    benefits: ['Iron + Vitamin C synergy maximises absorption', 'Spinach provides all 13 essential vitamins', 'Dal + rice = complete protein', 'Beta-carotene precursor of Vitamin A'],
    replaces: 'Dal Tadka (plain)',
    replaceReason: 'Adding spinach doubles iron and Vitamin A with only 20 extra calories.'
  },
  {
    id: 'ragi-idli', name: 'Ragi Idli', emoji: '⚪', meal: 'Breakfast', servingSize: '3 idlis (150g)',
    nutrition: {
      calories: 168, protein: 7, carbs: 32, fats: 2, fiber: 4.5,
      micros: [
        { name: 'Calcium', value: 244, unit: 'mg', rdv: 1000, benefit: 'Strongest plant calcium source', color: '#A8C5DA' },
        { name: 'Iron', value: 3.6, unit: 'mg', rdv: 18, benefit: 'Oxygen transport', color: '#D67D61' },
        { name: 'Phosphorus', value: 280, unit: 'mg', rdv: 700, benefit: 'Bone formation & energy storage', color: '#C4A882' },
        { name: 'Amino acids', value: 0, unit: 'methionine', rdv: 0, benefit: 'Rare essential amino acid in plant foods', color: '#8BA88E' },
      ],
    },
    wholeSpices: ['Fenugreek seeds in batter (methi)', 'Curry leaves in sambar', 'Mustard seeds', 'Cumin', 'Asafoetida'],
    cookingTip: 'Add ½ tsp fenugreek seeds while soaking urad dal — improves fermentation and adds iron. Ferment 10–12 hours for maximum probiotic benefit.',
    benefits: ['Highest calcium among Indian grains — rivals dairy', 'Naturally gluten-free', 'Low glycemic index (GI 40) — diabetic friendly', 'Fermentation enhances B12 bioavailability'],
    replaces: 'Aloo Paratha with butter',
    replaceReason: 'Saves 180 calories and 12g fat. Adds 244mg calcium (vs near zero in paratha), much lower glycemic impact.'
  },
  {
    id: 'rajma', name: 'Rajma (Kidney Beans)', emoji: '🫘', meal: 'Lunch', servingSize: '1 cup cooked (200g)',
    nutrition: {
      calories: 225, protein: 15, carbs: 40, fats: 1, fiber: 11,
      micros: [
        { name: 'Iron', value: 5, unit: 'mg', rdv: 18, benefit: 'Top plant iron source', color: '#D67D61' },
        { name: 'Potassium', value: 742, unit: 'mg', rdv: 4700, benefit: 'Heart health & blood pressure', color: '#F5C842' },
        { name: 'Folate', value: 230, unit: 'mcg', rdv: 400, benefit: 'DNA synthesis', color: '#8BA88E' },
        { name: 'Magnesium', value: 74, unit: 'mg', rdv: 420, benefit: 'Blood glucose regulation', color: '#A8C5DA' },
        { name: 'Zinc', value: 2, unit: 'mg', rdv: 11, benefit: 'Immune function', color: '#C4A882' },
      ],
    },
    wholeSpices: ['Bay leaf', 'Cinnamon', 'Cloves', 'Black cardamom', 'Cumin seeds', 'Freshly crushed coriander seeds', 'Turmeric'],
    cookingTip: 'Soak overnight 12h — reduces flatulence-causing oligosaccharides by 60%. Use 1 tsp oil. Tomato base provides natural Vitamin C to boost iron absorption.',
    benefits: ['11g fiber per serving — highest among common dals', 'Resistant starch feeds gut bacteria', 'Low glycemic index (GI 24)', 'Complete protein with rice — all amino acids'],
    replaces: 'Chole Bhature',
    replaceReason: 'Removes deep-fried bhatura (300+ calories, refined flour). Adds 6g more fiber, saves ~400 calories.'
  },
  {
    id: 'mushroom-palak', name: 'Mushroom Palak Masala', emoji: '🍄', meal: 'Dinner', servingSize: '1 cup (200g)',
    nutrition: {
      calories: 120, protein: 8, carbs: 12, fats: 5, fiber: 4,
      micros: [
        { name: 'Vitamin D', value: 5, unit: 'mcg', rdv: 20, benefit: 'Bone health & immune regulation', color: '#F5C842' },
        { name: 'Selenium', value: 25, unit: 'mcg', rdv: 55, benefit: 'Thyroid & antioxidant defense', color: '#C4A882' },
        { name: 'Iron', value: 3.5, unit: 'mg', rdv: 18, benefit: 'Oxygen transport in blood', color: '#D67D61' },
        { name: 'Vitamin K', value: 108, unit: 'mcg', rdv: 120, benefit: 'Blood clotting & bone metabolism', color: '#8BA88E' },
      ],
    },
    wholeSpices: ['Cumin seeds', 'Freshly crushed coriander seeds', 'Green cardamom', 'Black pepper (freshly ground)', 'Turmeric', 'Bay leaf'],
    cookingTip: 'Expose mushrooms to sunlight 1 hour before cooking — doubles their Vitamin D. Use only 1 tsp oil; mushrooms release their own moisture. Add spinach last minute to preserve iron and Vitamin K.',
    benefits: ['Mushrooms: one of few plant sources of Vitamin D', 'Selenium supports thyroid health', 'Beta-glucans in mushrooms modulate immune response', 'Spinach + mushroom Vitamin C = enhanced iron absorption'],
    replaces: 'Paneer Lababdar (high cream/butter)',
    replaceReason: 'Saves 200 calories and 18g saturated fat. Adds Vitamin D, Selenium, with near-zero cholesterol.'
  },
  {
    id: 'vegetable-khichdi', name: 'Vegetable Khichdi', emoji: '🥘', meal: 'Dinner', servingSize: '1 bowl (300g)',
    nutrition: {
      calories: 285, protein: 12, carbs: 48, fats: 6, fiber: 6,
      micros: [
        { name: 'Zinc', value: 2.2, unit: 'mg', rdv: 11, benefit: 'Immune defense & wound healing', color: '#C4A882' },
        { name: 'Magnesium', value: 60, unit: 'mg', rdv: 420, benefit: 'Relaxation & sleep quality', color: '#A8C5DA' },
        { name: 'B vitamins', value: 0, unit: 'complex', rdv: 0, benefit: 'Energy metabolism & nervous system', color: '#F5C842' },
        { name: 'Lysine', value: 0, unit: 'amino acid', rdv: 0, benefit: 'Complete protein via rice+dal synergy', color: '#8BA88E' },
      ],
    },
    wholeSpices: ['Cumin seeds', 'Bay leaf', 'Turmeric', 'Black peppercorns (2–3)', 'Fresh ginger'],
    cookingTip: 'Use 1 part moong dal : 1 part brown rice : seasonal vegetables. The 1 tsp ghee tadka at the end is essential — ghee provides butyrate for gut lining healing and carries fat-soluble vitamins.',
    benefits: ['Easiest to digest — ideal for dinner', 'Complete protein: rice supplies Methionine, dal supplies Lysine', 'Magnesium promotes muscle relaxation and sleep', 'Ayurvedic staple for gut restoration'],
    replaces: 'Noodles / Manchurian',
    replaceReason: 'Removes refined flour, MSG, and 1800mg+ sodium. Khichdi delivers complete nutrition with a fraction of sodium.'
  },
  {
    id: 'oats-upma', name: 'Oats Vegetable Upma', emoji: '🍲', meal: 'Breakfast', servingSize: '1 bowl (250g)',
    nutrition: {
      calories: 225, protein: 7, carbs: 36, fats: 6, fiber: 5,
      micros: [
        { name: 'Beta-glucan', value: 2, unit: 'g', rdv: 3, benefit: 'FDA-approved cholesterol lowering', color: '#8BA88E' },
        { name: 'Vitamin B1', value: 0.4, unit: 'mg', rdv: 1.2, benefit: 'Carbohydrate metabolism', color: '#F5C842' },
        { name: 'Magnesium', value: 52, unit: 'mg', rdv: 420, benefit: 'Energy production & bone health', color: '#A8C5DA' },
        { name: 'Avenanthramides', value: 0, unit: 'antioxidants', rdv: 0, benefit: 'Unique oat antioxidants — reduce inflammation', color: '#C4A882' },
      ],
    },
    wholeSpices: ['Mustard seeds', 'Cumin seeds', 'Curry leaves', 'Dried red chili', 'Fresh ginger', 'Turmeric'],
    cookingTip: 'Use steel-cut oats for lower GI (55 vs 79 for instant). Load with colourful vegetables. Add 1 tbsp roasted peanuts for protein. Use 1 tsp coconut oil — MCTs support brain health.',
    benefits: ['Beta-glucan: only food fiber with FDA cholesterol-lowering claim', 'Sustained energy 4–5 hours', 'Avenanthramide antioxidants unique to oats', 'Feeds Bifidobacterium probiotic bacteria'],
    replaces: 'Bread Omelette (with white bread)',
    replaceReason: 'Removes white bread (zero fiber). Adds beta-glucan, magnesium, and 5g fiber.'
  },
  {
    id: 'quinoa-pulao', name: 'Quinoa Vegetable Pulao', emoji: '🫙', meal: 'Lunch', servingSize: '1 cup cooked (200g)',
    nutrition: {
      calories: 220, protein: 8, carbs: 39, fats: 4, fiber: 4,
      micros: [
        { name: 'Complete Protein', value: 0, unit: 'all 9 EAAs', rdv: 0, benefit: 'Only grain with all essential amino acids', color: '#8BA88E' },
        { name: 'Magnesium', value: 118, unit: 'mg', rdv: 420, benefit: 'Highest among grains — 300+ reactions', color: '#A8C5DA' },
        { name: 'Iron', value: 2.8, unit: 'mg', rdv: 18, benefit: 'Pair with Vitamin C for best absorption', color: '#D67D61' },
        { name: 'Manganese', value: 1.2, unit: 'mg', rdv: 2.3, benefit: 'Antioxidant enzyme co-factor', color: '#C4A882' },
      ],
    },
    wholeSpices: ['Bay leaf', 'Green cardamom (2)', 'Cloves (2)', 'Cinnamon (half inch)', 'Cumin seeds', 'Black pepper', 'Star anise (1)'],
    cookingTip: 'Rinse quinoa thoroughly to remove saponins (bitter coating). Toast dry before cooking for nutty flavor. Use vegetable stock instead of water. Load with colourful vegetables.',
    benefits: ['One of very few complete plant proteins', 'Magnesium 4x higher than white rice', 'Gluten-free with high satiety factor', 'Flavonoid quercetin content rivals vegetables'],
    replaces: 'Hyderabadi Biryani (white basmati)',
    replaceReason: '3x the protein, 2x the fiber, complete amino acids vs white rice biryani.'
  },
  {
    id: 'kala-chana', name: 'Kala Chana Masala', emoji: '🟤', meal: 'Lunch', servingSize: '1 cup cooked (200g)',
    nutrition: {
      calories: 210, protein: 14, carbs: 35, fats: 2, fiber: 10,
      micros: [
        { name: 'Iron', value: 6, unit: 'mg', rdv: 18, benefit: 'Highest iron among chickpeas', color: '#D67D61' },
        { name: 'Phosphorus', value: 380, unit: 'mg', rdv: 700, benefit: 'Bone mineralization', color: '#C4A882' },
        { name: 'Zinc', value: 3, unit: 'mg', rdv: 11, benefit: 'Strong immune cells & skin repair', color: '#8BA88E' },
        { name: 'Potassium', value: 620, unit: 'mg', rdv: 4700, benefit: 'Blood pressure regulation', color: '#F5C842' },
      ],
    },
    wholeSpices: ['Dried pomegranate seeds (anardana)', 'Cumin seeds', 'Freshly crushed coriander seeds', 'Black cardamom', 'Bay leaf', 'Cinnamon', 'Turmeric'],
    cookingTip: 'Soak overnight. Slow cook — caramelises natural sugars in tomato and onion, building rich flavour without extra masala powder. Anardana adds Vitamin C naturally.',
    benefits: ['Dark pigment = higher antioxidants than white chickpeas', '10g fiber feeds gut microbiome', 'Resistant starch with slow glucose release (GI 28)', 'Iron + zinc combo for energy and immunity'],
    replaces: 'Pav Bhaji (Saturday lunch)',
    replaceReason: 'Removes refined bread, adds iron, zinc, and 8g more fiber. Saves ~350 calories.'
  },
  {
    id: 'sprout-chaat', name: 'Sprouted Moong Chaat', emoji: '🌱', meal: 'Snacks', servingSize: '1 bowl (100g)',
    nutrition: {
      calories: 140, protein: 8, carbs: 22, fats: 2, fiber: 6,
      micros: [
        { name: 'Vitamin C', value: 22, unit: 'mg', rdv: 90, benefit: 'Immune boost & iron absorption', color: '#F5C842' },
        { name: 'Iron', value: 2.2, unit: 'mg', rdv: 18, benefit: 'Haemoglobin synthesis', color: '#D67D61' },
        { name: 'Folate', value: 80, unit: 'mcg', rdv: 400, benefit: 'Cell division & growth', color: '#8BA88E' },
        { name: 'Digestive enzymes', value: 0, unit: 'active', rdv: 0, benefit: 'Sprouting activates live digestive enzymes', color: '#A8C5DA' },
      ],
    },
    wholeSpices: ['Roasted cumin powder (freshly ground)', 'Black salt (kala namak)', 'Fresh coriander', 'Green chili', 'Lemon juice'],
    cookingTip: 'No cooking needed — preserves all enzymes and heat-sensitive vitamins. Top with pomegranate, cucumber, and lime. Roast your own cumin and grind fresh for authentic chaat masala.',
    benefits: ['Sprouting doubles Vitamin C content', 'Live enzymes aid protein digestion', 'Anti-inflammatory isoflavones in moong sprouts', 'Raw = maximum micronutrient retention'],
    replaces: 'Samosa / Pakora',
    replaceReason: 'Saves 200+ calories, removes deep-frying. Adds live enzymes, Vitamin C, and 6g fiber vs near-zero in fried snacks.'
  },
  {
    id: 'dosa-sambar', name: 'Set Dosa + Sambar', emoji: '🥞', meal: 'Breakfast', servingSize: '2 dosas + 1 katori sambar',
    nutrition: {
      calories: 320, protein: 10, carbs: 56, fats: 6, fiber: 4,
      micros: [
        { name: 'Probiotics', value: 0, unit: 'live cultures', rdv: 0, benefit: 'Gut microbiome diversity', color: '#8BA88E' },
        { name: 'Iron', value: 3.2, unit: 'mg', rdv: 18, benefit: 'From dal in sambar', color: '#D67D61' },
        { name: 'Vitamin C', value: 15, unit: 'mg', rdv: 90, benefit: 'From tomatoes in sambar', color: '#F5C842' },
        { name: 'B12 (trace)', value: 0.3, unit: 'mcg', rdv: 2.4, benefit: 'Fermentation creates trace B12', color: '#A8C5DA' },
      ],
    },
    wholeSpices: ['Mustard seeds', 'Curry leaves', 'Dried red chili', 'Asafoetida (hing)', 'Turmeric', 'Cumin seeds'],
    cookingTip: 'Ferment batter 12–16 hours for maximum probiotic activity. Add drumstick (moringa) to sambar — it has 7x more Vitamin C than oranges. Make sambar without store-bought powder.',
    benefits: ['Fermentation increases bioavailability of all nutrients', 'Lactic acid bacteria improve gut flora diversity', 'Rice + Urad dal = synergistic amino acid profile', 'Probiotic support for immune system (70% of immunity is in the gut)'],
  },
];

const WEEK_PLAN: DayPlan[] = [
  {
    day: 'Monday', theme: 'Immunity & Iron Boost', emoji: '🛡️', accentColor: '#D67D61',
    nutritionFocus: 'Iron · Folate · Vitamin C · Plant Protein',
    meals: {
      Breakfast: 'Moong Dal Cheela + Mint Coriander Chutney',
      Lunch: 'Palak Dal + Brown Rice + Jeera Aloo',
      Snacks: 'Roasted Makhana + Tulsi Ginger Tea',
      Dinner: 'Vegetable Khichdi + Ghee Tadka',
    },
    dailyTotals: { calories: 1680, protein: 56, carbs: 258, fats: 44, fiber: 28 },
    radarData: [
      { subject: 'Protein', score: 93, fullMark: 100 },
      { subject: 'Fiber', score: 90, fullMark: 100 },
      { subject: 'Iron', score: 88, fullMark: 100 },
      { subject: 'Vitamins', score: 85, fullMark: 100 },
      { subject: 'Calcium', score: 62, fullMark: 100 },
      { subject: 'Balance', score: 92, fullMark: 100 },
    ],
    highlight: 'Lemon on Palak Dal multiplies iron absorption 3×. This day provides ~80% RDI iron — the best iron day of the week.',
  },
  {
    day: 'Tuesday', theme: 'Protein Power', emoji: '💪', accentColor: '#8BA88E',
    nutritionFocus: 'Calcium · Protein · Digestive Enzymes · Fermented Foods',
    meals: {
      Breakfast: 'Ragi Idli (3) + Coconut Chutney + Sambar',
      Lunch: 'Rajma + Brown Rice + Cucumber Raita',
      Snacks: 'Sprouted Moong Chaat + Amla Juice',
      Dinner: 'Egg Bhurji / Paneer Bhurji + Multigrain Roti',
    },
    dailyTotals: { calories: 1780, protein: 64, carbs: 272, fats: 50, fiber: 31 },
    radarData: [
      { subject: 'Protein', score: 100, fullMark: 100 },
      { subject: 'Fiber', score: 95, fullMark: 100 },
      { subject: 'Iron', score: 75, fullMark: 100 },
      { subject: 'Vitamins', score: 80, fullMark: 100 },
      { subject: 'Calcium', score: 88, fullMark: 100 },
      { subject: 'Balance', score: 90, fullMark: 100 },
    ],
    highlight: 'Ragi delivers 244mg calcium at breakfast. Combined with rajma and sprouts, Tuesday hits the highest protein of the week at 64g.',
  },
  {
    day: 'Wednesday', theme: 'Gut Health & Probiotics', emoji: '🦠', accentColor: '#A8C5DA',
    nutritionFocus: 'Probiotics · B Vitamins · Magnesium · Fenugreek',
    meals: {
      Breakfast: 'Poha + Peanuts + Curry Leaves + Lemon',
      Lunch: 'Bajra Roti + Methi Sabzi + Kadhi',
      Snacks: 'Chaas (Spiced Buttermilk) + Roasted Chana',
      Dinner: 'Masoor Dal + Seasonal Greens Sabzi + Roti',
    },
    dailyTotals: { calories: 1620, protein: 52, carbs: 265, fats: 42, fiber: 30 },
    radarData: [
      { subject: 'Protein', score: 82, fullMark: 100 },
      { subject: 'Fiber', score: 92, fullMark: 100 },
      { subject: 'Iron', score: 80, fullMark: 100 },
      { subject: 'Vitamins', score: 88, fullMark: 100 },
      { subject: 'Calcium', score: 75, fullMark: 100 },
      { subject: 'Balance', score: 88, fullMark: 100 },
    ],
    highlight: 'Kadhi + Chaas provide live probiotic cultures. Methi (fenugreek) is an iron and calcium powerhouse. Lightest calorie day for midweek recovery.',
  },
  {
    day: 'Thursday', theme: 'Energy & Endurance', emoji: '⚡', accentColor: '#F5C842',
    nutritionFocus: 'Complex Carbs · B Vitamins · Electrolytes · Vitamin D',
    meals: {
      Breakfast: 'Oats Upma + Colourful Vegetables',
      Lunch: 'South Indian Thali (Rice + Sambar + Rasam + Kootu)',
      Snacks: 'Seasonal Fruit Bowl + Coconut Water',
      Dinner: 'Mushroom Palak Masala + Jowar Roti',
    },
    dailyTotals: { calories: 1760, protein: 58, carbs: 285, fats: 50, fiber: 28 },
    radarData: [
      { subject: 'Protein', score: 90, fullMark: 100 },
      { subject: 'Fiber', score: 88, fullMark: 100 },
      { subject: 'Iron', score: 78, fullMark: 100 },
      { subject: 'Vitamins', score: 95, fullMark: 100 },
      { subject: 'Calcium', score: 70, fullMark: 100 },
      { subject: 'Balance', score: 91, fullMark: 100 },
    ],
    highlight: 'South Indian Thali is the most micronutrient-diverse meal of the week. Mushrooms exposed to sunlight provide the only plant-source Vitamin D at dinner.',
  },
  {
    day: 'Friday', theme: 'Omega & Antioxidants', emoji: '✨', accentColor: '#C4A882',
    nutritionFocus: 'Healthy Fats · Complete Proteins · Antioxidants · Omega-3',
    meals: {
      Breakfast: 'Methi Paratha + Fresh Set Curd',
      Lunch: 'Quinoa Vegetable Pulao + Cucumber Mint Raita',
      Snacks: 'Mixed Dry Fruit & Seed Mix + Jaggery Tea',
      Dinner: 'Whole Spice Tofu Tikka / Paneer Tikka + Brown Rice',
    },
    dailyTotals: { calories: 1820, protein: 60, carbs: 272, fats: 60, fiber: 27 },
    radarData: [
      { subject: 'Protein', score: 95, fullMark: 100 },
      { subject: 'Fiber', score: 85, fullMark: 100 },
      { subject: 'Iron', score: 70, fullMark: 100 },
      { subject: 'Vitamins', score: 90, fullMark: 100 },
      { subject: 'Calcium', score: 85, fullMark: 100 },
      { subject: 'Balance', score: 88, fullMark: 100 },
    ],
    highlight: 'Highest healthy fat day. Dry fruit mix provides omega-3 (walnuts), selenium (Brazil nuts), zinc (pumpkin seeds). Quinoa is the only grain with all 9 essential amino acids.',
  },
  {
    day: 'Saturday', theme: 'Fiber & Minerals', emoji: '🌾', accentColor: '#8BA88E',
    nutritionFocus: 'Iron · Zinc · Potassium · Fermented Foods · Phytonutrients',
    meals: {
      Breakfast: 'Set Dosa + Vegetable Sambar + Coconut Chutney',
      Lunch: 'Kala Chana Masala + Jowar Roti + Onion Kachumber',
      Snacks: 'Coconut Water + Seasonal Fruit',
      Dinner: 'Lentil Vegetable Soup + Multigrain Roti',
    },
    dailyTotals: { calories: 1700, protein: 55, carbs: 278, fats: 45, fiber: 34 },
    radarData: [
      { subject: 'Protein', score: 85, fullMark: 100 },
      { subject: 'Fiber', score: 100, fullMark: 100 },
      { subject: 'Iron', score: 92, fullMark: 100 },
      { subject: 'Vitamins', score: 82, fullMark: 100 },
      { subject: 'Calcium', score: 68, fullMark: 100 },
      { subject: 'Balance', score: 90, fullMark: 100 },
    ],
    highlight: 'Highest fiber day (34g vs 30g RDI) and highest iron from Kala Chana (6mg per cup). Fermented dosa starts the day with probiotics. Light soup eases digestion before rest day.',
  },
  {
    day: 'Sunday', theme: 'Rest & Restoration', emoji: '🌙', accentColor: '#D67D61',
    nutritionFocus: 'Digestive Healing · Gut Flora · Antioxidants · Calming Minerals',
    meals: {
      Breakfast: 'Besan Cheela + Tomato Ginger Chutney',
      Lunch: 'Dal Palak + Seasonal Sabzi + Brown Rice + Chapati',
      Snacks: 'Whole Spice Masala Chai + Roasted Groundnuts',
      Dinner: 'Light Mung Khichdi + Kadhi + Ghee',
    },
    dailyTotals: { calories: 1640, protein: 56, carbs: 258, fats: 48, fiber: 30 },
    radarData: [
      { subject: 'Protein', score: 90, fullMark: 100 },
      { subject: 'Fiber', score: 90, fullMark: 100 },
      { subject: 'Iron', score: 82, fullMark: 100 },
      { subject: 'Vitamins', score: 88, fullMark: 100 },
      { subject: 'Calcium', score: 72, fullMark: 100 },
      { subject: 'Balance', score: 94, fullMark: 100 },
    ],
    highlight: 'Most digestive-friendly day. Khichdi dinner has been Ayurvedic gut medicine for 5,000 years. Masala chai with whole spices (ginger + cinnamon + cardamom) reduces inflammation and aids digestion.',
  },
];

const RECIPES: Recipe[] = [
  {
    id: 'moong-cheela-recipe', name: 'Moong Dal Cheela', emoji: '🫓',
    servings: 4, prepTime: '10 min + 4h soak', cookTime: '20 min', oilUsed: '2 tsp ghee total',
    ingredients: [
      { item: 'Split yellow moong dal', quantity: '1 cup', note: 'Soaked 4 hours' },
      { item: 'Fresh ginger', quantity: '1 inch', note: 'Grated' },
      { item: 'Green chili', quantity: '1 small' },
      { item: 'Fresh coriander', quantity: '2 tbsp', note: 'Finely chopped' },
      { item: 'Rock salt', quantity: '½ tsp' },
      { item: 'Ghee', quantity: '½ tsp per cheela' },
      { item: 'Lemon juice', quantity: '1 tsp', note: 'Add after cooking — key for iron absorption' },
    ],
    wholeSpiceMix: [
      { spice: 'Cumin seeds (jeera)', amount: '½ tsp', benefit: 'Stimulates digestive enzymes, reduces bloating' },
      { spice: 'Turmeric (haldi)', amount: '¼ tsp', benefit: 'Curcumin — potent anti-inflammatory, liver protective' },
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
    nutritionTip: 'The cumin + turmeric + black pepper combination is Ayurvedic alchemy: cumin stimulates digestive fire (agni), turmeric fights inflammation, and piperine in black pepper amplifies all bioavailability by 20×. The lemon at the end maximises iron uptake from dal.',
  },
  {
    id: 'palak-dal-recipe', name: 'Palak Dal (Iron Powerhouse)', emoji: '🌿',
    servings: 4, prepTime: '15 min', cookTime: '25 min', oilUsed: '1 tsp ghee',
    ingredients: [
      { item: 'Toor dal (split pigeon peas)', quantity: '1 cup', note: 'Soaked 30 min' },
      { item: 'Fresh spinach (palak)', quantity: '3 cups', note: 'Roughly chopped' },
      { item: 'Tomatoes', quantity: '2 medium', note: 'Chopped — natural Vitamin C source' },
      { item: 'Garlic', quantity: '5 cloves', note: 'Minced' },
      { item: 'Fresh ginger', quantity: '1 inch', note: 'Grated' },
      { item: 'Ghee', quantity: '1 tsp', note: 'For tadka only' },
      { item: 'Lemon', quantity: '½', note: 'Squeeze at serving — CRITICAL for iron absorption' },
    ],
    wholeSpiceMix: [
      { spice: 'Mustard seeds (rai)', amount: '½ tsp', benefit: 'Anti-bacterial; glucosinolates with cancer-protective properties' },
      { spice: 'Cumin seeds (jeera)', amount: '½ tsp', benefit: 'Iron-containing; stimulates digestive enzyme secretion' },
      { spice: 'Dried red chili (whole)', amount: '1–2', benefit: 'Capsaicin: metabolism-boosting, anti-inflammatory' },
      { spice: 'Asafoetida (hing)', amount: 'Pinch', benefit: 'Eliminates flatulence from dal; digestive enzyme support' },
      { spice: 'Turmeric (haldi)', amount: '½ tsp', benefit: 'Anti-inflammatory, hepatoprotective' },
    ],
    steps: [
      'Pressure cook soaked dal with 3 cups water and turmeric for 3 whistles until soft.',
      'Blanch spinach in boiling water 2 minutes. Blend ⅔ to smooth paste; leave ⅓ chopped.',
      'Add both spinach forms to cooked dal. Stir, simmer 5 min.',
      'In a small pan, heat 1 tsp ghee on medium-high until shimmering.',
      'Add mustard seeds — wait for them to splutter (10 sec), then add cumin seeds.',
      'After 5 sec, add dried red chili and hing. Immediately add garlic and ginger.',
      'Stir 30 seconds. Add tomatoes, cook until softened (5 min).',
      'Pour hot tadka over dal. Stir well. Season with rock salt.',
      'CRITICAL: Squeeze lemon just before serving — triples iron absorption from plant sources.',
    ],
    nutritionTip: 'Plant iron is non-heme iron — only 3–8% is absorbed without help. Vitamin C (from tomatoes + lemon) converts it to the more absorbable ferrous form, boosting absorption to 15–20%. Never skip the lemon. Also avoid tea or coffee 1 hour before or after this meal — tannins block iron absorption.',
  },
  {
    id: 'khichdi-recipe', name: 'Healing Vegetable Khichdi', emoji: '🥘',
    servings: 3, prepTime: '10 min', cookTime: '20 min', oilUsed: '1 tsp ghee',
    ingredients: [
      { item: 'Split yellow moong dal', quantity: '½ cup', note: 'Washed' },
      { item: 'Brown rice (or white for easier digestion)', quantity: '½ cup', note: 'Soaked 30 min' },
      { item: 'Seasonal vegetables', quantity: '1 cup', note: 'Carrot, peas, beans, bottlegourd' },
      { item: 'Fresh ginger', quantity: '1 inch', note: 'Julienned' },
      { item: 'Ghee', quantity: '1 tsp', note: 'For finishing tadka — non-negotiable' },
      { item: 'Rock salt', quantity: 'to taste' },
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
      'Stir 30 seconds. Pour this tadka over khichdi and mix well.',
      'Season with rock salt. Eat hot with a dollop of fresh curd.',
    ],
    nutritionTip: 'Khichdi is a complete protein because rice (high Methionine, low Lysine) perfectly complements dal (low Methionine, high Lysine) — together all 9 essential amino acids are present. The 1 tsp ghee is non-negotiable: it provides butyrate (heals gut lining), carries fat-soluble vitamins from vegetables, and is Ayurveda\'s highest-ranked digestive food.',
  },
  {
    id: 'kala-chana-recipe', name: 'Whole Spice Kala Chana', emoji: '🟤',
    servings: 4, prepTime: '10 min + overnight soak', cookTime: '30 min', oilUsed: '1 tsp mustard oil',
    ingredients: [
      { item: 'Kala chana (black chickpeas)', quantity: '1.5 cups', note: 'Soaked overnight 12h — essential' },
      { item: 'Tomatoes', quantity: '3 medium', note: 'Pureed — natural Vitamin C for iron absorption' },
      { item: 'Onion', quantity: '1 large', note: 'Finely chopped' },
      { item: 'Garlic', quantity: '6 cloves', note: 'Minced' },
      { item: 'Fresh ginger', quantity: '1.5 inch', note: 'Grated' },
      { item: 'Dried pomegranate seeds (anardana)', quantity: '1 tsp', note: 'Use instead of amchur — natural Vitamin C source' },
      { item: 'Mustard oil', quantity: '1 tsp', note: 'Highest omega-3 among cooking oils' },
    ],
    wholeSpiceMix: [
      { spice: 'Black cardamom (badi elaichi)', amount: '2 pods — crush open', benefit: 'Digestive, detoxifying; deep smoky pairing with chana' },
      { spice: 'Cinnamon stick (dalchini)', amount: '1 inch', benefit: 'Blood sugar regulation; warm caramel-like base flavour' },
      { spice: 'Bay leaf (tejpatta)', amount: '2', benefit: 'Digestive enzymes; reduces bean-caused flatulence' },
      { spice: 'Cumin seeds (jeera)', amount: '1 tsp', benefit: 'Anti-flatulent, iron-containing, activates digestive fire' },
      { spice: 'Coriander seeds (dhaniya)', amount: '1 tsp', note: 'Freshly crushed in mortar', benefit: 'Anti-inflammatory, blood sugar lowering, fresh flavour' },
      { spice: 'Turmeric (haldi)', amount: '½ tsp', benefit: 'Anti-inflammatory; enhanced absorption when cooked in oil' },
    ],
    steps: [
      'Drain overnight-soaked chana. Pressure cook with 4 cups fresh water + bay leaf for 5–6 whistles until very tender.',
      'Heat 1 tsp mustard oil in a heavy pan until it just begins to smoke — this neutralises its pungency.',
      'Add cinnamon and black cardamom — bloom 30 seconds in the oil.',
      'Add cumin seeds. When they splutter, add onions. Cook medium-low 8–10 min until deep golden brown.',
      'Add garlic and ginger, stir 2 minutes until raw smell disappears.',
      'Add freshly crushed coriander seeds and turmeric. Stir 1 minute.',
      'Add tomato puree. Cook medium until oil separates from masala (5–7 min) — this is the secret to rich flavour without masala powder.',
      'Add pressure-cooked chana with its cooking water. Simmer 10 minutes.',
      'Add anardana and rock salt. Simmer 5 more minutes.',
      'Garnish with fresh ginger juliens and coriander. Serve with jowar roti.',
    ],
    nutritionTip: 'Black chickpeas have 6mg iron per cup, but only ~5% is absorbed without Vitamin C. The tomato gravy + anardana together provide enough Vitamin C to boost absorption to 18%+. Never use store-bought chole masala — it\'s mostly salt, artificial colour, and stale ground spices with zero therapeutic value.',
  },
  {
    id: 'tikka-recipe', name: 'Whole Spice Tikka Marinade', emoji: '🍢',
    servings: 4, prepTime: '15 min + 2h marinate', cookTime: '20 min', oilUsed: '1 tsp in marinade',
    ingredients: [
      { item: 'Paneer or firm tofu', quantity: '250g', note: 'Cubed into 2-inch pieces' },
      { item: 'Thick hung curd / Greek yogurt', quantity: '4 tbsp', note: 'Marinade base' },
      { item: 'Fresh ginger-garlic paste', quantity: '1 tsp', note: 'Freshly made — never bottled' },
      { item: 'Lemon juice', quantity: '1 tsp', note: 'Tenderising agent + Vitamin C' },
      { item: 'Cold-pressed oil', quantity: '1 tsp', note: 'Activates fat-soluble spice compounds' },
      { item: 'Dried mango powder (amchur)', quantity: '½ tsp', note: 'Natural souring — no citric acid powder' },
      { item: 'Rock salt', quantity: 'to taste' },
    ],
    wholeSpiceMix: [
      { spice: 'Coriander seeds — roasted & freshly ground', amount: '1 tsp', benefit: 'Anti-inflammatory polyphenols; complex earthy flavour layers' },
      { spice: 'Cumin seeds — roasted & freshly ground', amount: '½ tsp', benefit: 'Iron-containing, digestive, deep warm flavour' },
      { spice: 'Green cardamom — freshly ground (2 pods)', amount: '¼ tsp', benefit: 'Detoxifying, antimicrobial, aromatic brightness' },
      { spice: 'Turmeric (haldi)', amount: '¼ tsp', benefit: 'Natural colour + anti-inflammatory (no artificial colour needed)' },
      { spice: 'Black pepper — freshly crushed', amount: '¼ tsp', benefit: 'Piperine boosts curcumin and all spice compound absorption' },
      { spice: 'Kashmiri chili (whole, dried, deseeded & ground)', amount: '1–2', benefit: 'Natural carotenoids for vibrant red colour; mild heat' },
    ],
    steps: [
      'DRY ROAST: Heat a dry pan. Roast coriander seeds, then cumin seeds separately until fragrant (30 sec each). Cool.',
      'GRIND: Pound roasted seeds in a mortar. Add cardamom seeds (removed from pod). Grind to coarse powder.',
      'COMBINE: Mix curd, ginger-garlic paste, lemon juice, and oil in a bowl.',
      'Add all freshly ground spices + turmeric + black pepper + amchur. Stir well.',
      'Gently fold in paneer/tofu cubes. Coat thoroughly.',
      'Marinate minimum 2 hours (refrigerated). Overnight is best.',
      'Grill on grill pan or bake at 200°C for 18–20 minutes, turning once at 10 min.',
      'Optional: char slightly under broiler for 2 min for authentic smokiness.',
      'Serve with fresh mint-coriander chutney and onion rings.',
    ],
    nutritionTip: 'Freshly ground whole spices have 5–10× more active therapeutic compounds than store-bought powder that has been sitting in a jar for months. Dry roasting before grinding releases essential oils and maximises flavour. The oil in the marinade is not just flavour — it dissolves the fat-soluble active compounds in spices (curcumin, capsaicin, etc.) making them actually absorbable.',
  },
];

const MACRO_COLORS = { protein: '#D67D61', carbs: '#F5C842', fats: '#A8C5DA', fiber: '#8BA88E' };
const MEAL_ICONS: Record<MealType, React.ComponentType<{ className?: string }>> = {
  Breakfast: Coffee, Lunch: Utensils, Snacks: Apple, Dinner: Timer
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState<TabId>('weekly');
  const [activeDay, setActiveDay] = useState<DayOfWeek>('Monday');
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [activeMealFilter, setActiveMealFilter] = useState<MealType | 'All'>('All');

  const currentDayPlan = WEEK_PLAN.find(d => d.day === activeDay)!;
  const filteredDishes = activeMealFilter === 'All'
    ? DISHES
    : DISHES.filter(d => d.meal === activeMealFilter);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'weekly', label: 'Weekly Plan', icon: Calendar },
    { id: 'dishes', label: 'Dish Profiles', icon: Leaf },
    { id: 'balance', label: 'Daily Balance', icon: BarChart3 },
    { id: 'recipes', label: 'Recipes', icon: Scroll },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 lg:p-12 pb-24 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-secondary/5 rounded-full blur-[100px]" />
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -45, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1/4 -left-1/4 w-2/3 h-2/3 bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Link href="/food-hub"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Food Hub
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 block">
            <Sprout className="w-3.5 h-3.5 inline mr-1" /> Aaram Nutrition Science
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter uppercase leading-none">
            Nourish <span className="text-primary italic">Deeply</span>
          </h1>
          <p className="text-foreground/50 font-medium text-sm mt-2 uppercase tracking-widest max-w-xl">
            Organic · Whole Spices · Light on the Body · Complete Nutrition
          </p>
        </motion.div>

        {/* Philosophy Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Leaf, label: 'Organic Whole Foods', desc: 'Minimally processed, maximum nutrition' },
            { icon: FlaskConical, label: 'Whole Spice Science', desc: 'Each spice chosen for therapeutic benefit' },
            { icon: Heart, label: 'Light on the Body', desc: 'Easy digestion, no heavy processed oils' },
            { icon: Shield, label: 'Complete Nutrients', desc: 'Every macro & micro accounted for daily' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="soft-card p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-foreground uppercase tracking-tight">{label}</p>
                <p className="text-[10px] text-foreground/40 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-10">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all border',
              activeTab === tab.id
                ? 'btn-terracotta border-primary shadow-xl'
                : 'soft-button border-white text-foreground/40 hover:text-foreground/70'
            )}>
            <tab.icon className={cn('w-4 h-4', activeTab === tab.id && 'text-white')} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Tab 1: Weekly Plan ─────────────────────────────────────────────── */}
        {activeTab === 'weekly' && (
          <motion.div key="weekly" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-4 h-4" />
                </span>
                Balanced Weekly Menu
              </h2>
              <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest ml-11">
                No processed masala · Whole spice tadkas · Less than 2 tsp oil per dish
              </p>
            </div>

            {/* Day Selector */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8">
              {WEEK_PLAN.map(day => (
                <button key={day.day} onClick={() => setActiveDay(day.day)}
                  className={cn(
                    'flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border flex items-center gap-2',
                    activeDay === day.day
                      ? 'btn-terracotta border-primary shadow-xl scale-105'
                      : 'soft-button border-white text-foreground/30 hover:text-foreground/60'
                  )}>
                  <span>{day.emoji}</span>
                  {day.day.substring(0, 3)}
                </button>
              ))}
            </div>

            {/* Day Detail */}
            <AnimatePresence mode="wait">
              <motion.div key={activeDay} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Day Overview */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="soft-card p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-4xl">{currentDayPlan.emoji}</span>
                        <div>
                          <p className="text-xs font-black text-foreground/40 uppercase tracking-widest">{currentDayPlan.day}</p>
                          <h3 className="text-xl font-black text-foreground tracking-tight">{currentDayPlan.theme}</h3>
                        </div>
                      </div>
                      <div className="soft-well p-4 border border-white mb-4">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">Nutrition Focus</p>
                        <p className="text-xs font-bold text-foreground">{currentDayPlan.nutritionFocus}</p>
                      </div>
                      <div className="soft-well p-4 border border-white">
                        <div className="flex gap-2 mb-2">
                          <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Key Insight</p>
                        </div>
                        <p className="text-xs text-foreground/60 leading-relaxed">{currentDayPlan.highlight}</p>
                      </div>
                    </div>

                    {/* Daily Macros Summary */}
                    <div className="soft-card p-6">
                      <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest mb-4">Daily Totals</p>
                      <div className="space-y-3">
                        {[
                          { label: 'Calories', value: currentDayPlan.dailyTotals.calories, unit: 'kcal', max: 2200, color: '#D67D61' },
                          { label: 'Protein', value: currentDayPlan.dailyTotals.protein, unit: 'g', max: 70, color: '#8BA88E' },
                          { label: 'Carbs', value: currentDayPlan.dailyTotals.carbs, unit: 'g', max: 310, color: '#F5C842' },
                          { label: 'Fiber', value: currentDayPlan.dailyTotals.fiber, unit: 'g', max: 35, color: '#A8C5DA' },
                        ].map(m => (
                          <div key={m.label}>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-black text-foreground/60 uppercase">{m.label}</span>
                              <span className="text-[10px] font-black" style={{ color: m.color }}>{m.value}{m.unit}</span>
                            </div>
                            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full" style={{ backgroundColor: m.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Meals Grid */}
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(Object.entries(currentDayPlan.meals) as [MealType, string][]).map(([meal, dish]) => {
                        const Icon = MEAL_ICONS[meal];
                        return (
                          <motion.div key={meal} whileHover={{ scale: 1.02 }}
                            className="soft-card p-6 flex flex-col gap-3 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                              <Icon className="w-16 h-16" />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Icon className="w-4 h-4" />
                              </div>
                              <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{meal}</p>
                            </div>
                            <p className="text-base font-bold text-foreground leading-snug">{dish}</p>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Alternatives Callout */}
                    {DISHES.filter(d =>
                      d.replaces && Object.values(currentDayPlan.meals).some(m =>
                        d.replaces && m.toLowerCase().includes(d.replaces.toLowerCase().split(' ')[0].toLowerCase())
                      )
                    ).length > 0 && (
                      <div className="mt-4 soft-card p-5 border border-primary/20 bg-primary/5">
                        <div className="flex gap-2 items-center mb-2">
                          <Star className="w-4 h-4 text-primary" />
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Why This is Better</p>
                        </div>
                        {DISHES.filter(d => d.replaces && Object.values(currentDayPlan.meals).some(m =>
                          d.replaces && m.toLowerCase().includes(d.replaces.toLowerCase().split(' ')[0].toLowerCase())
                        )).map(d => (
                          <div key={d.id} className="text-xs text-foreground/60">
                            <span className="font-bold text-foreground">{d.name}</span> replaces <span className="line-through text-foreground/30">{d.replaces}</span>
                            {d.replaceReason && <span> — {d.replaceReason}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Weekly comparison row */}
                <div className="mt-8 soft-card p-6">
                  <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest mb-5">Week at a Glance — Nutritional Scores</p>
                  <div className="grid grid-cols-7 gap-3">
                    {WEEK_PLAN.map(day => {
                      const avgScore = Math.round(day.radarData.reduce((a, b) => a + b.score, 0) / day.radarData.length);
                      return (
                        <button key={day.day} onClick={() => setActiveDay(day.day)}
                          className={cn('flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border',
                            activeDay === day.day ? 'border-primary bg-primary/5' : 'soft-well border-white')}>
                          <span className="text-xl">{day.emoji}</span>
                          <p className="text-[9px] font-black text-foreground/50 uppercase">{day.day.substring(0, 3)}</p>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                            style={{ backgroundColor: day.accentColor }}>
                            {avgScore}
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

        {/* ── Tab 2: Dish Profiles ────────────────────────────────────────────── */}
        {activeTab === 'dishes' && (
          <motion.div key="dishes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><Leaf className="w-4 h-4" /></span>
                  Dish Nutrition Profiles
                </h2>
                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1 ml-11">Per-serving breakdown with whole spice benefits</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['All', 'Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const).map(f => (
                  <button key={f} onClick={() => setActiveMealFilter(f)}
                    className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                      activeMealFilter === f ? 'btn-terracotta border-primary' : 'soft-button border-white text-foreground/40 hover:text-foreground/70')}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredDishes.map((dish, idx) => (
                <motion.div key={dish.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="soft-card overflow-hidden">
                  {/* Card Header */}
                  <div className="p-6 pb-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{dish.emoji}</span>
                        <div>
                          <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-0.5">{dish.meal}</p>
                          <h3 className="text-base font-black text-foreground tracking-tight">{dish.name}</h3>
                          <p className="text-[9px] text-foreground/40">{dish.servingSize}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-foreground">{dish.nutrition.calories}</p>
                        <p className="text-[9px] font-black text-foreground/30 uppercase">kcal</p>
                      </div>
                    </div>

                    {/* Macro Bars */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {([
                        { key: 'protein', label: 'P', color: MACRO_COLORS.protein },
                        { key: 'carbs', label: 'C', color: MACRO_COLORS.carbs },
                        { key: 'fats', label: 'F', color: MACRO_COLORS.fats },
                        { key: 'fiber', label: 'Fi', color: MACRO_COLORS.fiber },
                      ] as const).map(m => (
                        <div key={m.key} className="soft-well p-2.5 border border-white text-center">
                          <p className="text-[9px] font-black uppercase" style={{ color: m.color }}>{m.label}</p>
                          <p className="text-sm font-black text-foreground">{dish.nutrition[m.key]}g</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Micro Nutrients */}
                  <div className="px-6 pb-4">
                    <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-2">Key Micronutrients</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dish.nutrition.micros.map(m => (
                        <div key={m.name} className="group relative">
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black border transition-colors cursor-default"
                            style={{ borderColor: m.color + '40', backgroundColor: m.color + '15', color: m.color }}>
                            {m.name}: {m.value !== 0 ? `${m.value}${m.unit}` : m.unit}
                          </span>
                          <div className="absolute bottom-full left-0 mb-1.5 bg-foreground text-background text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-48">
                            {m.benefit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expandable Section */}
                  <button onClick={() => setExpandedDish(expandedDish === dish.id ? null : dish.id)}
                    className="w-full px-6 py-3 flex items-center justify-between soft-well border-t border-white/40 hover:bg-white/20 transition-colors">
                    <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                      Whole Spices & Benefits
                    </span>
                    <ChevronDown className={cn('w-4 h-4 text-foreground/40 transition-transform', expandedDish === dish.id && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {expandedDish === dish.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 pb-6 pt-4 space-y-4">

                          {/* Whole Spices */}
                          <div>
                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-2">
                              <FlaskConical className="w-3 h-3 inline mr-1" /> Whole Spices Used
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {dish.wholeSpices.map(s => (
                                <span key={s} className="px-2.5 py-1 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg text-[9px] font-bold">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Cooking Tip */}
                          <div className="soft-well p-4 border border-white">
                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-1.5">
                              <Lightbulb className="w-3 h-3 inline mr-1 text-primary" /> Cooking Tip
                            </p>
                            <p className="text-xs text-foreground/60 leading-relaxed">{dish.cookingTip}</p>
                          </div>

                          {/* Health Benefits */}
                          <div>
                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-2">
                              <Heart className="w-3 h-3 inline mr-1 text-primary" /> Health Benefits
                            </p>
                            <ul className="space-y-1">
                              {dish.benefits.map(b => (
                                <li key={b} className="flex items-start gap-2 text-xs text-foreground/60">
                                  <Sprout className="w-3 h-3 text-secondary flex-shrink-0 mt-0.5" />
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Alternative */}
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

        {/* ── Tab 3: Daily Balance ────────────────────────────────────────────── */}
        {activeTab === 'balance' && (
          <motion.div key="balance" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><BarChart3 className="w-4 h-4" /></span>
                Daily Nutritional Balance
              </h2>
              <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest ml-11">
                Score reflects % of recommended daily intake met per nutrient dimension
              </p>
            </div>

            {/* Day Selector */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8">
              {WEEK_PLAN.map(day => (
                <button key={day.day} onClick={() => setActiveDay(day.day)}
                  className={cn('flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border',
                    activeDay === day.day ? 'btn-terracotta border-primary shadow-xl' : 'soft-button border-white text-foreground/30 hover:text-foreground/60')}>
                  <span>{day.emoji}</span> {day.day.substring(0, 3)}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`balance-${activeDay}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  {/* Radar Chart */}
                  <div className="soft-card p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl">{currentDayPlan.emoji}</span>
                      <div>
                        <h3 className="text-xl font-black text-foreground">{currentDayPlan.day}</h3>
                        <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">{currentDayPlan.theme}</p>
                      </div>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={currentDayPlan.radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid stroke="rgba(0,0,0,0.06)" radialLines={false} />
                          <PolarAngleAxis dataKey="subject"
                            tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--foreground)', opacity: 0.5 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Nutrition" dataKey="score" stroke={currentDayPlan.accentColor}
                            fill={currentDayPlan.accentColor} fillOpacity={0.25} strokeWidth={2} />
                          <Tooltip contentStyle={{ background: 'rgba(242,238,230,0.95)', borderRadius: '12px', border: 'none', fontSize: 11, fontWeight: 700 }}
                            formatter={(v) => [`${v}/100`, 'Score']} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="soft-card p-8">
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-6">Nutrient Score Breakdown</p>
                    <div className="space-y-4">
                      {currentDayPlan.radarData.map(item => (
                        <div key={item.subject}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs font-black text-foreground uppercase tracking-wide">{item.subject}</span>
                            <span className={cn('text-xs font-black',
                              item.score >= 90 ? 'text-secondary' : item.score >= 75 ? 'text-primary' : 'text-amber-500')}>
                              {item.score}/100
                            </span>
                          </div>
                          <div className="h-2 bg-foreground/8 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                              className="h-full rounded-full transition-colors"
                              style={{ backgroundColor: item.score >= 90 ? '#8BA88E' : item.score >= 75 ? '#D67D61' : '#F5C842' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 soft-well p-4 border border-white">
                      <div className="flex gap-2 items-start">
                        <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground/60 leading-relaxed">{currentDayPlan.highlight}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cross-week comparison bar chart */}
                <div className="mt-8 soft-card p-8">
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-6">Weekly Protein Comparison (g/day vs 60g target)</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={WEEK_PLAN.map(d => ({ day: d.day.substring(0, 3), protein: d.dailyTotals.protein, fiber: d.dailyTotals.fiber }))}>
                        <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--foreground)', opacity: 0.4 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--foreground)', opacity: 0.3 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'rgba(242,238,230,0.95)', borderRadius: '12px', border: 'none', fontSize: 11, fontWeight: 700 }} />
                        <Bar dataKey="protein" name="Protein (g)" radius={[6, 6, 0, 0]}>
                          {WEEK_PLAN.map((day) => (
                            <Cell key={day.day} fill={day.day === activeDay ? day.accentColor : day.accentColor + '60'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mt-2 text-center">
                    All days exceed 50g protein · Tuesday peaks at 64g · Target: 60g/day
                  </p>
                </div>

                {/* RDI Reference */}
                <div className="mt-8 soft-card p-8">
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-5">
                    <Info className="w-3.5 h-3.5 inline mr-1" /> Recommended Daily Intakes (Adults)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { nutrient: 'Protein', target: '50–60g', note: 'Complete with dal + grain combinations' },
                      { nutrient: 'Fiber', target: '25–35g', note: 'Achieved every day on this plan' },
                      { nutrient: 'Iron', target: '8–18mg', note: 'Enhance with lemon on iron-rich dishes' },
                      { nutrient: 'Calcium', target: '1000mg', note: 'Ragi + dairy + sesame provide this' },
                      { nutrient: 'Vitamin C', target: '65–90mg', note: 'Fresh seasonal fruit + tomatoes daily' },
                      { nutrient: 'Magnesium', target: '310–420mg', note: 'Legumes, nuts, whole grains cover this' },
                      { nutrient: 'Zinc', target: '8–11mg', note: 'Legumes, seeds, whole grains + soak first' },
                      { nutrient: 'Folate', target: '400mcg', note: 'Dal, leafy greens, sprouts are rich sources' },
                    ].map(r => (
                      <div key={r.nutrient} className="soft-well p-4 border border-white">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">{r.nutrient}</p>
                        <p className="text-base font-black text-foreground mb-1">{r.target}</p>
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
            <div className="mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><ChefHat className="w-4 h-4" /></span>
                Whole Spice Recipes
              </h2>
              <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest ml-11">
                No processed masala powder · Minimum oil · Every spice chosen for therapeutic benefit
              </p>
            </div>

            {/* Whole Spice Philosophy */}
            <div className="soft-card p-6 mb-8 border border-primary/20 bg-primary/5">
              <div className="flex gap-3 items-start">
                <FlaskConical className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Why Whole Spices vs Processed Masala Powder</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-foreground/60">
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5"><span className="text-secondary">✓</span> Freshly roasted & ground = 5–10× more active compounds</li>
                      <li className="flex items-start gap-1.5"><span className="text-secondary">✓</span> No artificial colour, anti-caking agents, or preservatives</li>
                      <li className="flex items-start gap-1.5"><span className="text-secondary">✓</span> Essential oils released at cooking time = maximum flavour</li>
                    </ul>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5"><span className="text-red-400">✗</span> Store powders lose 80% potency within 6 months of opening</li>
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

                  {/* Recipe Header — always visible */}
                  <button onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                    className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-white/20 transition-colors">
                    <div className="flex items-center gap-5">
                      <span className="text-4xl">{recipe.emoji}</span>
                      <div className="text-left">
                        <h3 className="text-xl font-black text-foreground tracking-tight">{recipe.name}</h3>
                        <div className="flex flex-wrap gap-3 mt-2">
                          <span className="text-[9px] font-black text-foreground/40 uppercase">⏱ Prep: {recipe.prepTime}</span>
                          <span className="text-[9px] font-black text-foreground/40 uppercase">🔥 Cook: {recipe.cookTime}</span>
                          <span className="text-[9px] font-black text-secondary uppercase">💧 Oil: {recipe.oilUsed}</span>
                          <span className="text-[9px] font-black text-foreground/40 uppercase">👥 Serves: {recipe.servings}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn('w-5 h-5 text-foreground/40 transition-transform flex-shrink-0', expandedRecipe === recipe.id && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {expandedRecipe === recipe.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 md:px-8 pb-8 space-y-8 border-t border-white/40 pt-6">

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Ingredients */}
                            <div>
                              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-4">Ingredients</p>
                              <div className="space-y-2">
                                {recipe.ingredients.map((ing, i) => (
                                  <div key={i} className="flex items-start gap-3 p-3 soft-well border border-white">
                                    <span className="text-[10px] font-black text-primary w-5 text-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                    <div className="flex-1">
                                      <span className="text-xs font-black text-foreground">{ing.item}</span>
                                      <span className="text-xs text-foreground/50 ml-2">— {ing.quantity}</span>
                                      {ing.note && <p className="text-[9px] text-foreground/30 mt-0.5 italic">{ing.note}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Whole Spice Mix */}
                            <div>
                              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-4">
                                <FlaskConical className="w-3.5 h-3.5 inline mr-1 text-secondary" />
                                Whole Spice Mix & Why
                              </p>
                              <div className="space-y-3">
                                {recipe.wholeSpiceMix.map((spice, i) => (
                                  <div key={i} className="p-4 soft-well border border-secondary/20 bg-secondary/5">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs font-black text-foreground">{spice.spice}</p>
                                      <span className="text-[9px] font-black text-secondary whitespace-nowrap">{spice.amount}</span>
                                    </div>
                                    {spice.note && <p className="text-[9px] text-foreground/40 italic mt-0.5">{spice.note}</p>}
                                    <p className="text-[9px] text-secondary/70 mt-1.5 leading-relaxed">{spice.benefit}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Method Steps */}
                          <div>
                            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-4">Method</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {recipe.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 soft-well border border-white">
                                  <span className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <p className="text-xs text-foreground/70 leading-relaxed">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Nutrition Tip */}
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

      {/* Footer Note */}
      <div className="mt-16 text-center">
        <p className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">
          Nutritional values are approximate per serving · Consult a dietitian for individual dietary needs
        </p>
      </div>
    </div>
  );
}
