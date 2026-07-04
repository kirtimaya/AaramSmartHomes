'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, BarChart3, ChefHat, ArrowLeft, Coffee,
  Utensils, Timer, Heart, Shield, Brain,
  Sprout, Zap, ChevronDown, Lightbulb,
  Calendar, FlaskConical, Scroll, Loader2,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

function getWeekMondayIST(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay();
  const monday = new Date(ist);
  monday.setUTCDate(ist.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function addDaysToIST(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Phase 5: this page is now a read-only nutrition showcase. Dishes come from
// dish_catalog (admin-approved, managed via the kitchen page's Dishes tab —
// see Phase 3). The weekly plan reflects the REAL menu (managed via the
// kitchen page's menu builder), not a locally-editable mock. Admin editing
// for both moved entirely to /admin/kitchen; this page only reads.

export default function NutritionPage() {
  const [dishes, setDishes] = useState<DishProfile[]>([]);
  const [weekMeals, setWeekMeals] = useState<WeekMeals>(
    Object.fromEntries(DAYS.map(d => [d, Object.fromEntries(MEALS.map(m => [m, null]))])) as WeekMeals
  );
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('weekly');
  const [activeDay, setActiveDay] = useState<DayOfWeek>('Monday');
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [mealFilter, setMealFilter] = useState<MealType | 'All'>('All');

  // ── Load approved dishes + the current week's real menu from Supabase ────────

  useEffect(() => {
    (async () => {
      setDataLoading(true);

      const weekStart = getWeekMondayIST();
      const weekDates = DAYS.map((_, i) => addDaysToIST(weekStart, i));

      const [{ data: dishRows }, { data: menuRows }] = await Promise.all([
        supabase
          .from('dish_catalog')
          .select('id, name, calories, protein_g, carbs_g, fats_g, fiber_g, micros, whole_spices, benefits, cooking_tip, serving_size')
          .eq('nutrition_status', 'approved')
          .order('name'),
        supabase
          .from('menus')
          .select('date, meal_block, menu_items(dish_id)')
          .in('date', weekDates),
      ]);

      // Which meal block each dish_id showed up under this week — used purely to
      // give the Dish Library's meal-type filter a real (if approximate) value;
      // dish_catalog itself has no meal classification column.
      const inferredMeal = new Map<string, MealType>();
      for (const row of (menuRows ?? []) as any[]) {
        const block = row.meal_block as MealType;
        if (!MEALS.includes(block)) continue;
        for (const item of (row.menu_items ?? []) as any[]) {
          if (item.dish_id && !inferredMeal.has(item.dish_id)) inferredMeal.set(item.dish_id, block);
        }
      }

      const mappedDishes: DishProfile[] = ((dishRows ?? []) as any[]).map(d => ({
        id: d.id,
        name: d.name,
        emoji: '🍽️',
        meal: inferredMeal.get(d.id) ?? 'Breakfast',
        servingSize: d.serving_size ?? '1 serving',
        nutrition: {
          calories: d.calories ?? 0, protein: d.protein_g ?? 0, carbs: d.carbs_g ?? 0,
          fats: d.fats_g ?? 0, fiber: d.fiber_g ?? 0, micros: d.micros ?? [],
        },
        wholeSpices: d.whole_spices ?? [],
        cookingTip: d.cooking_tip ?? '',
        benefits: d.benefits ?? [],
      }));

      const freshWeekMeals: WeekMeals =
        Object.fromEntries(DAYS.map(d => [d, Object.fromEntries(MEALS.map(m => [m, null]))])) as WeekMeals;

      for (const row of (menuRows ?? []) as any[]) {
        const dayIdx = weekDates.indexOf(row.date);
        if (dayIdx < 0) continue;
        const block = row.meal_block as MealType;
        if (!MEALS.includes(block)) continue;
        const firstDishId = ((row.menu_items ?? []) as any[]).find(i => i.dish_id)?.dish_id ?? null;
        freshWeekMeals[DAYS[dayIdx]][block] = firstDishId;
      }

      setDishes(mappedDishes);
      setWeekMeals(freshWeekMeals);
      setDataLoading(false);
    })();
  }, []);

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

  // Menus and dishes are both read-only here (admin editing lives in
  // /admin/kitchen) — no handlers needed beyond the UI toggles above.

  const filteredDishes = mealFilter === 'All' ? dishes : dishes.filter(d => d.meal === mealFilter);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'weekly',   label: 'Weekly Plan',    icon: Calendar },
    { id: 'dishes',   label: 'Dish Library',   icon: Leaf },
    { id: 'balance',  label: 'Daily Balance',  icon: BarChart3 },
    { id: 'recipes',  label: 'Recipes',        icon: Scroll },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

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
          <Link href="/admin/kitchen"
            className="soft-button px-5 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground/40 hover:text-primary transition-colors">
            <Shield className="w-3.5 h-3.5" /> Manage in Kitchen Dashboard
          </Link>
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

                              <p className="text-lg font-bold text-foreground">
                                {dish ? `${dish.emoji} ${dish.name}` : <span className="text-foreground/30 italic">No dish selected</span>}
                              </p>

                              {dish && (
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

    </div>
  );
}
