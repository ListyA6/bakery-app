"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import BarcodeScanner from './BarcodeScanner';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

export default function IngredientsList({ userRole }) {
  // ============= STATE DECLARATIONS =============
  const [activeTab, setActiveTab] = useState('inventory');
  const [expandedMenus, setExpandedMenus] = useState({});
  const [ingredients, setIngredients] = useState([]);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingMenuAction, setPendingMenuAction] = useState(null);
  const [pendingEditMenu, setPendingEditMenu] = useState(null);
  const MENU_PASSWORD = 'sadesbetbang';
  const [showCostModal, setShowCostModal] = useState(false);
  const [selectedMenuForCost, setSelectedMenuForCost] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isSubmittingSpoilage, setIsSubmittingSpoilage] = useState(false);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseData, setPurchaseData] = useState({
    barcode: '',
    name: '',
    quantity: '',
    unit: 'g',
    price: '',
    isTotalPrice: false,
    expDate: ''
  });
  
  const [showSpoilageForm, setShowSpoilageForm] = useState(false);
  const [selectedSpoilageIngredient, setSelectedSpoilageIngredient] = useState(null);
  const [spoilageRecords, setSpoilageRecords] = useState([]);
  
  const [spoilageForm, setSpoilageForm] = useState({
    ingredientId: '',
    quantity: '',
    reason: 'spilled',
    notes: ''
  });
  
  const [menuItems, setMenuItems] = useState([]);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    minBatch: 1,
    notes: '',
    recipe: []
  });
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [recipeQuantity, setRecipeQuantity] = useState('');
  
  const [selectedMenu, setSelectedMenu] = useState('');
  const [bakeQuantity, setBakeQuantity] = useState(1);
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [editingMinStock, setEditingMinStock] = useState(null);
  const [minStockValue, setMinStockValue] = useState('');

  // ============= LOAD FUNCTIONS =============
  const findRecipesUsingIngredient = (ingredientId) => {
    return menuItems
      .filter(menu => menu.recipe.some(r => r.ingredientId === ingredientId))
      .map(menu => menu.name);
  };

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*');
    
    if (error) {
      console.error('Error loading ingredients:', error);
      return;
    }
    
    if (data) {
      const transformed = data.map(item => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        stock: item.stock,
        minStock: item.min_stock,
        pricePerUnit: item.price_per_unit,
        expDate: item.exp_date || 'No expiry'
      }));
      setIngredients(transformed);
    }
  };

  const loadMenuItems = async () => {
    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .select('*');
    
    if (menuError) {
      console.error('Error loading menu items:', menuError);
      return;
    }

    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*');
    
    if (recipeError) {
      console.error('Error loading recipes:', recipeError);
      return;
    }

    const transformed = await Promise.all(menuData.map(async (menu) => {
      const recipes = recipeData.filter(r => r.menu_item_id === menu.id);
      
      const recipeWithNames = await Promise.all(recipes.map(async (r) => {
        const { data: ing } = await supabase
          .from('ingredients')
          .select('name')
          .eq('id', r.ingredient_id)
          .single();
        
        return {
          ingredientId: r.ingredient_id,
          name: ing?.name || 'Unknown',
          quantity: r.quantity
        };
      }));

      return {
        id: menu.id,
        name: menu.name,
        minBatch: menu.min_batch,
        notes: menu.notes || '',
        recipe: recipeWithNames
      };
    }));
    
    setMenuItems(transformed);
  };

  const loadSpoilageRecords = async () => {
    const { data, error } = await supabase
      .from('spoilage_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error loading spoilage records:', error);
      return;
    }
    
    setSpoilageRecords(data || []);
  };

  const loadPurchaseRecords = async () => {
    const { data, error } = await supabase
      .from('purchase_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error loading purchase records:', error);
      return;
    }
    
    setPurchaseRecords(data || []);
  };

  // ============= CATEGORY FUNCTION =============
  const getCategory = (ingredientName) => {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('minyak') || name.includes('oil') || name.includes('canola') || name.includes('sayur') || 
        name.includes('vegetable') || name.includes('coconut oil') || name.includes('minyak goreng') || 
        name.includes('minyak kelapa') || name.includes('minyak zaitun') || name.includes('olive oil') ||
        name.includes('minyak jagung') || name.includes('corn oil') || name.includes('minyak wijen') || 
        name.includes('sesame oil') || name.includes('minyak kanola') || name.includes('minyak bunga matahari') ||
        name.includes('sunflower oil') || name.includes('palm oil') || name.includes('minyak sawit') || 
        name.includes('shortening')) return '🫒 Oil';
    
    if (name.includes('butter') || name.includes('mentega') || name.includes('margarin') || name.includes('margarine') ||
        name.includes('unsalted butter') || name.includes('mentega tawar') || name.includes('salted butter') || 
        name.includes('mentega asin') || name.includes('wijsman') || name.includes('anchor') ||
        name.includes('blue band') || name.includes('forvita') || name.includes('pastry margarine') || 
        name.includes('margarin pastry') || name.includes('buttercream') || name.includes('mentega putih') ||
        name.includes('ghee') || name.includes('minyak samin') || name.includes('clarified butter')) return '🧈 Butter';
    
    if (name.includes('susu') || name.includes('milk') || name.includes('fresh milk') || name.includes('susu segar') ||
        name.includes('uht') || name.includes('ultra milk') || name.includes('susu cair') || name.includes('liquid milk') ||
        name.includes('susu bubuk') || name.includes('milk powder') || name.includes('susu skim') || name.includes('skim milk') ||
        name.includes('susu full cream') || name.includes('full cream milk') || name.includes('susu evaporasi') || 
        name.includes('evaporated milk') || name.includes('susu kental manis') || name.includes('condensed milk') ||
        name.includes('skm') || name.includes('kental manis') || name.includes('susu almond') || name.includes('almond milk') ||
        name.includes('susu kedelai') || name.includes('soy milk') || name.includes('susu oat') || name.includes('oat milk') ||
        name.includes('buttermilk') || name.includes('susu asam')) return '🥛 Milk';
    
    if (name.includes('cream') || name.includes('krim') || name.includes('whipping cream') || name.includes('krim kocok') ||
        name.includes('heavy cream') || name.includes('krim berat') || name.includes('light cream') || name.includes('krim ringan') ||
        name.includes('double cream') || name.includes('krim ganda') || name.includes('sour cream') || name.includes('krim asam') ||
        name.includes('pastry cream') || name.includes('krim pastry') || name.includes('custard') || name.includes('vla') ||
        name.includes('non-dairy cream') || name.includes('krim nabati') || name.includes('whipped cream') || 
        name.includes('krim kocok jadi') || name.includes('cream cheese') || name.includes('keju krim') ||
        name.includes('mascarpone') || name.includes('marscapone')) return '🥛 Cream';
    
    if (name.includes('tepung') || name.includes('flour') || name.includes('terigu') || name.includes('gandum') ||
        name.includes('protein tinggi') || name.includes('high protein') || name.includes('protein sedang') || 
        name.includes('medium protein') || name.includes('protein rendah') || name.includes('low protein') ||
        name.includes('cakra') || name.includes('cakra kembar') || name.includes('segitiga biru') || name.includes('segitiga') ||
        name.includes('kunci biru') || name.includes('lencana merah') || name.includes('tepung roti') || name.includes('bread flour') ||
        name.includes('tepung serbaguna') || name.includes('all purpose flour') || name.includes('tepung kue') || name.includes('cake flour') ||
        name.includes('tepung pastry') || name.includes('pastry flour') || name.includes('tepung gandum utuh') || 
        name.includes('whole wheat flour') || name.includes('tepung beras') || name.includes('rice flour') ||
        name.includes('tepung ketan') || name.includes('glutinous flour') || name.includes('tepung tapioka') || 
        name.includes('tapioca starch') || name.includes('tepung maizena') || name.includes('cornstarch') ||
        name.includes('tepung sagu') || name.includes('sago flour') || name.includes('tepung almond') || name.includes('almond flour') ||
        name.includes('gluten free flour') || name.includes('tepung bebas gluten') || name.includes('self-raising flour') || 
        name.includes('tepung instan') || name.includes('spelt') || name.includes('rye') || name.includes('gandum hitam')) return '🌾 Flour';
    
    if (name.includes('gula') || name.includes('sugar') || name.includes('sweetener') || name.includes('pemanis') ||
        name.includes('gula pasir') || name.includes('granulated sugar') || name.includes('gula halus') || name.includes('icing sugar') ||
        name.includes('gula bubuk') || name.includes('powdered sugar') || name.includes('gula kastor') || name.includes('caster sugar') ||
        name.includes('gula merah') || name.includes('brown sugar') || name.includes('gula aren') || name.includes('palm sugar') ||
        name.includes('gula kelapa') || name.includes('coconut sugar') || name.includes('honey') || name.includes('madu') ||
        name.includes('sirup') || name.includes('syrup') || name.includes('maple syrup') || name.includes('sirup maple') ||
        name.includes('corn syrup') || name.includes('sirup jagung') || name.includes('glukosa') || name.includes('glucose') ||
        name.includes('tetes') || name.includes('molasses') || name.includes('sukrosa') || name.includes('sucrose') ||
        name.includes('dekstrosa') || name.includes('dextrose') || name.includes('fruktosa') || name.includes('fructose') ||
        name.includes('gula invers') || name.includes('invert sugar') || name.includes('stevia') || name.includes('splenda')) return '🍚 Sugar';
    
    if (name.includes('jam') || name.includes('selai') || name.includes('curd') || name.includes('lemon curd') ||
        name.includes('pastry cream') || name.includes('krim pastry') || name.includes('custard') || name.includes('vla') ||
        name.includes('puree') || name.includes('pure') || name.includes('compote') || name.includes('kompot') ||
        name.includes('filling') || name.includes('isi') || name.includes('selai stroberi') || name.includes('strawberry jam') ||
        name.includes('selai blueberry') || name.includes('blueberry jam') || name.includes('selai nanas') || name.includes('pineapple jam') ||
        name.includes('selai kacang') || name.includes('peanut butter') || name.includes('nutella') || name.includes('hazelnut spread') ||
        name.includes('coklat oles') || name.includes('chocolate spread') || name.includes('kaya') || name.includes('srikaya') ||
        name.includes('durian') || name.includes('durian filling') || name.includes('ubi ungu') || name.includes('purple yam') ||
        name.includes('taro') || name.includes('talas') || name.includes('kacang hijau') || name.includes('mung bean') ||
        name.includes('kacang merah') || name.includes('red bean') || name.includes('pasta kacang merah') || name.includes('anko')) return '🍯 Fillings';
    
    if (name.includes('icing') || name.includes('royal icing') || name.includes('glaze') || name.includes('lapisan') ||
        name.includes('fondant') || name.includes('fondan') || name.includes('mirror glaze') || name.includes('glaze cermin') ||
        name.includes('ganache') || name.includes('ganas') || name.includes('buttercream') || name.includes('butter krim') ||
        name.includes('cream cheese frosting') || name.includes('frosting') || name.includes('meringue') || 
        name.includes('meringue buttercream') || name.includes('swiss meringue') || name.includes('italian meringue') ||
        name.includes('glaze coklat') || name.includes('chocolate glaze') || name.includes('glaze buah') || name.includes('fruit glaze') ||
        name.includes('apricot glaze') || name.includes('glaze aprikot') || name.includes('gelatin') || name.includes('gelatine') ||
        name.includes('cake decor') || name.includes('hiasan kue')) return '✨ Glazes';
    
    if (name.includes('ragi') || name.includes('yeast') || name.includes('fermipan') || name.includes('saf') ||
        name.includes('baking powder') || name.includes('baking soda') || name.includes('soda kue') || name.includes('soda api') ||
        name.includes('ammonium bicarbonate') || name.includes('ammonium') || name.includes('sourdough') || name.includes('starter') ||
        name.includes('ragi instan') || name.includes('instant yeast') || name.includes('ragi kering') || name.includes('dry yeast') ||
        name.includes('ragi basah') || name.includes('fresh yeast') || name.includes('ragi roti') || name.includes('bread yeast') ||
        name.includes('saf-instant') || name.includes('mauripan') || name.includes('natrium bikarbonat') || 
        name.includes('baking powder double acting') || name.includes('cream of tartar') || name.includes('krim tartar')) return '⚗️ Leavening';
    
    if (name.includes('coklat') || name.includes('chocolate') || name.includes('cocoa') || name.includes('kakao') ||
        name.includes('couverture') || name.includes('dark chocolate') || name.includes('coklat hitam') ||
        name.includes('milk chocolate') || name.includes('coklat susu') || name.includes('white chocolate') || name.includes('coklat putih') ||
        name.includes('ruby chocolate') || name.includes('coklat ruby') || name.includes('chocolate chip') || name.includes('chocochip') ||
        name.includes('chocolate chunk') || name.includes('coklat batangan') || name.includes('coklat bubuk') || name.includes('cocoa powder') ||
        name.includes('coklat pasta') || name.includes('cocoa paste') || name.includes('coklat butter') || name.includes('cocoa butter') ||
        name.includes('lemak coklat') || name.includes('coklat compound') || name.includes('coklat coin') || name.includes('chocolate coin') ||
        name.includes('coklat butiran') || name.includes('chocolate pearl') || name.includes('coklat decorating') || name.includes('chocolate deco') ||
        name.includes('bubuk kakao') || name.includes('cocoa bubuk') || name.includes('chocolate bar') || name.includes('coklat batang')) return '🍫 Chocolate';
    
    if (name.includes('kacang') || name.includes('nut') || name.includes('almond') || name.includes('badam') ||
        name.includes('walnut') || name.includes('kenari') || name.includes('pecan') || name.includes('pekans') ||
        name.includes('cashew') || name.includes('mede') || name.includes('hazelnut') || name.includes('hazel') ||
        name.includes('pistachio') || name.includes('pistasi') || name.includes('macadamia') || name.includes('makadamia') ||
        name.includes('kacang tanah') || name.includes('peanut') || name.includes('kacang almond') || 
        name.includes('kacang kenari') || name.includes('kacang mede') || name.includes('kacang hazel') || 
        name.includes('kacang pistachio') || name.includes('kismis') || name.includes('raisin') ||
        name.includes('currant') || name.includes('kurent') || name.includes('cranberry') || name.includes('kranberi') ||
        name.includes('blueberry') || name.includes('bluberi') || name.includes('cherry') || name.includes('ceri') ||
        name.includes('aprikot') || name.includes('apricot') || name.includes('prune') || name.includes('plum') ||
        name.includes('dates') || name.includes('kurma') || name.includes('fig') || name.includes('ara') ||
        name.includes('buah kering') || name.includes('dried fruit') || name.includes('coconut') || name.includes('kelapa') ||
        name.includes('kelapa kering') || name.includes('desiccated') || name.includes('coconut flakes') || name.includes('keripik kelapa')) return '🥜 Nuts & Fruits';
    
    if (name.includes('vanilla') || name.includes('vanili') || name.includes('vanilli') || name.includes('vanilla extract') ||
        name.includes('vanili bubuk') || name.includes('vanilla powder') || name.includes('vanilla paste') || name.includes('vanili pasta') ||
        name.includes('cinnamon') || name.includes('kayu manis') || name.includes('cassia') || name.includes('kasia') ||
        name.includes('cinnamon powder') || name.includes('bubuk kayu manis') || name.includes('nutmeg') || name.includes('pala') ||
        name.includes('pala bubuk') || name.includes('nutmeg powder') || name.includes('cardamom') || name.includes('kapulaga') ||
        name.includes('kapulaga bubuk') || name.includes('cardamom powder') || name.includes('clove') || name.includes('cengkeh') ||
        name.includes('cengkeh bubuk') || name.includes('clove powder') || name.includes('ginger') || name.includes('jahe') ||
        name.includes('jahe bubuk') || name.includes('ginger powder') || name.includes('anise') || name.includes('adas') ||
        name.includes('star anise') || name.includes('pekak') || name.includes('fennel') || name.includes('adas manis') ||
        name.includes('salt') || name.includes('garam') || name.includes('garam halus') || name.includes('fine salt') ||
        name.includes('garam kasar') || name.includes('coarse salt') || name.includes('sea salt') || name.includes('garam laut') ||
        name.includes('himayala') || name.includes('himalayan salt') || name.includes('flaky salt') || name.includes('garam flakes') ||
        name.includes('extract') || name.includes('ekstrak') || name.includes('essence') || name.includes('esens') ||
        name.includes('flavor') || name.includes('perasa') || name.includes('pasta') || name.includes('paste') ||
        name.includes('cocoa butter') || name.includes('lemak coklat') || name.includes('coffee') || name.includes('kopi') ||
        name.includes('kopi bubuk') || name.includes('coffee powder') || name.includes('espresso') || name.includes('espresso powder') ||
        name.includes('matcha') || name.includes('matcha bubuk') || name.includes('teh hijau') || name.includes('green tea') ||
        name.includes('lemon zest') || name.includes('kulit lemon') || name.includes('orange zest') || name.includes('kulit jeruk') ||
        name.includes('peppermint') || name.includes('permén') || name.includes('spekuk') || name.includes('speculaas')) return '🌶️ Spices';
    
    if (name.includes('telur') || name.includes('egg') || name.includes('yolk') || name.includes('kuning') ||
        name.includes('kuning telur') || name.includes('egg yolk') || name.includes('putih telur') || name.includes('egg white') ||
        name.includes('albumin') || name.includes('albumen') || name.includes('egg powder') || name.includes('telur bubuk') ||
        name.includes('frozen egg') || name.includes('telur beku') || name.includes('liquid egg') || name.includes('telur cair') ||
        name.includes('egg white powder') || name.includes('putih telur bubuk') || name.includes('egg yolk powder') || name.includes('kuning telur bubuk') ||
        name.includes('telur ayam') || name.includes('chicken egg') || name.includes('telur bebek') || name.includes('duck egg') ||
        name.includes('telur puyuh') || name.includes('quail egg')) return '🥚 Eggs';
    
    if (name.includes('buah') || name.includes('fruit') || name.includes('pisang') || name.includes('banana') ||
        name.includes('apel') || name.includes('apple') || name.includes('jeruk') || name.includes('orange') ||
        name.includes('lemon') || name.includes('lemon') || name.includes('limau') || name.includes('lime') ||
        name.includes('strawberry') || name.includes('stroberi') || name.includes('blueberry') || name.includes('bluberi') ||
        name.includes('raspberry') || name.includes('rasberi') || name.includes('blackberry') || name.includes('blackberi') ||
        name.includes('mangga') || name.includes('mango') || name.includes('nanas') || name.includes('pineapple') ||
        name.includes('pepaya') || name.includes('papaya') || name.includes('alpukat') || name.includes('avocado') ||
        name.includes('kelapa') || name.includes('coconut') || name.includes('nangka') || name.includes('jackfruit') ||
        name.includes('durian') || name.includes('durian') || name.includes('rambutan') || name.includes('rambutan') ||
        name.includes('markisa') || name.includes('passion fruit') || name.includes('kiwi') || name.includes('kiwi') ||
        name.includes('anggur') || name.includes('grape') || name.includes('pir') || name.includes('pear') ||
        name.includes('semangka') || name.includes('watermelon') || name.includes('melon') || name.includes('melon')) return '🍎 Fresh Fruits';
    
    if (name.includes('box') || name.includes('kotak') || name.includes('bag') || name.includes('kantong') ||
        name.includes('plastic') || name.includes('plastik') || name.includes('wrapper') || name.includes('pembungkus') ||
        name.includes('kemasan') || name.includes('packaging') || name.includes('container') || name.includes('wadah') ||
        name.includes('cup') || name.includes('gelas') || name.includes('lid') || name.includes('tutup') ||
        name.includes('tray') || name.includes('nampan') || name.includes('label') || name.includes('stiker') ||
        name.includes('kertas roti') || name.includes('parchment paper') || name.includes('baking paper') || name.includes('kertas panggang') ||
        name.includes('aluminium foil') || name.includes('alumunium foil') || name.includes('plastic wrap') || name.includes('plastik wrap') ||
        name.includes('cling wrap') || name.includes('plastik bening') || name.includes('cake box') || name.includes('dus kue') ||
        name.includes('cookie box') || name.includes('dus kue kering') || name.includes('cupcake liner') || name.includes('paper cup') ||
        name.includes('kertas kue') || name.includes('baking cup') || name.includes('piping bag') || name.includes('segitiga') ||
        name.includes('piping tip') || name.includes('spuit') || name.includes('decorating tip') || name.includes('tip spuit') ||
        name.includes('cake stand') || name.includes('standing pouch')) return '📦 Packaging';
    
    return '📦 Other';
  };

  // ============= FILTERED VALUES =============
  const filteredIngredients = ingredients.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || getCategory(item.name) === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(ingredients.map(i => getCategory(i.name)))];

  // ============= EFFECTS =============
  useEffect(() => {
    loadIngredients();
    loadMenuItems();
    loadSpoilageRecords();
    loadPurchaseRecords();
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    });

    checkInstallability();

    const timer = setTimeout(() => {
      checkInstallability();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // ============= COMPUTED VALUES =============
  const lowStockItems = ingredients.filter(item => item.stock < item.minStock);
  const totalValue = ingredients.reduce((sum, item) => sum + (item.stock * item.pricePerUnit), 0);

  // ============= CSV EXPORT FUNCTIONS =============
  const exportToCSV = (data, filename, headers) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ============= HANDLER FUNCTIONS =============
  const checkInstallability = async () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is already installed');
      return;
    }

    if (deferredPrompt) {
      setShowInstallButton(true);
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
      alert('To install this app on iPhone:\n1. Tap Share button\n2. Scroll down and tap "Add to Home Screen"');
    } else if (!isStandalone) {
      setShowInstallButton(true);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('📱 On iPhone:\n1. Tap Share button (box with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in top right');
        return;
      }
      alert('Your browser supports installing apps. Look for "Install" or "Add to Home Screen" in your browser menu.');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  const handleBake = () => {
    const menu = menuItems.find(m => m.id === parseInt(selectedMenu));
    if (!menu) return;

    if (bakeQuantity < menu.minBatch) {
      alert(`Minimum batch size for ${menu.name} is ${menu.minBatch}`);
      return;
    }

    const insufficientItems = [];
    menu.recipe.forEach(recipeItem => {
      const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
      if (!ingredient) return;
      
      const totalNeeded = recipeItem.quantity * (bakeQuantity / menu.minBatch);
      
      if (ingredient.stock < totalNeeded) {
        insufficientItems.push({
          name: ingredient.name,
          needed: totalNeeded,
          available: ingredient.stock,
          unit: ingredient.unit
        });
      }
    });

    if (insufficientItems.length > 0) {
      setShowLowStockAlert(true);
      alert('Not enough ingredients! Check "Need to Buy" tab.');
    } else {
      const updatedIngredients = ingredients.map(ingredient => {
        const recipeItem = menu.recipe.find(r => r.ingredientId === ingredient.id);
        if (recipeItem) {
          const deductAmount = recipeItem.quantity * (bakeQuantity / menu.minBatch);
          return {
            ...ingredient,
            stock: ingredient.stock - deductAmount
          };
        }
        return ingredient;
      });
      
      setIngredients(updatedIngredients);
      alert(`Successfully baked ${bakeQuantity} ${menu.name}!`);
    }
  };

  const barcodeDatabase = {
    '123456789': { name: 'Flour (All Purpose)', unit: 'g', defaultPrice: 1.2 },
    '987654321': { name: 'Sugar (Granulated)', unit: 'g', defaultPrice: 1.8 },
    '555555555': { name: 'Butter (Unsalted)', unit: 'g', defaultPrice: 4.5 },
    '444444444': { name: 'Eggs (Large)', unit: 'pieces', defaultPrice: 250 },
    '123123123': { name: 'Chocolate Chips', unit: 'g', defaultPrice: 5.5 },
  };

  const handleScan = (barcode) => {
    console.log('Scanned:', barcode);
    const product = barcodeDatabase[barcode];
    if (product) {
      setPurchaseData({
        ...purchaseData,
        barcode: barcode,
        name: product.name,
        quantity: '',
        price: product.defaultPrice,
        expDate: ''
      });
      setShowScanner(false);
      alert(`Found: ${product.name}`);
    } else {
      alert('Product not found in database. Please enter manually.');
      setPurchaseData({
        ...purchaseData,
        barcode: barcode,
        name: '',
        quantity: '',
        price: '',
        expDate: ''
      });
      setShowScanner(false);
    }
  };

  const handleAddPurchase = async () => {
    if (!purchaseData.name || !purchaseData.quantity || !purchaseData.price) {
      alert('Please fill in product name, quantity, and price');
      return;
    }

    let baseQuantity = parseFloat(purchaseData.quantity);
    let baseUnit = purchaseData.unit;
    
    if (purchaseData.unit === 'kg') {
      baseQuantity = baseQuantity * 1000;
      baseUnit = 'g';
    } else if (purchaseData.unit === 'L') {
      baseQuantity = baseQuantity * 1000;
      baseUnit = 'ml';
    }

    let pricePerUnit;
    if (purchaseData.isTotalPrice) {
      pricePerUnit = parseFloat(purchaseData.price) / parseFloat(purchaseData.quantity);
      if (purchaseData.unit === 'kg' || purchaseData.unit === 'L') {
        pricePerUnit = pricePerUnit / 1000;
      }
    } else {
      pricePerUnit = parseFloat(purchaseData.price);
      if (purchaseData.unit === 'kg' || purchaseData.unit === 'L') {
        pricePerUnit = pricePerUnit / 1000;
      }
    }

    const existingIngredient = ingredients.find(i => i.name === purchaseData.name);
    
    if (existingIngredient) {
      const newStock = existingIngredient.stock + baseQuantity;
      
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ 
          stock: newStock,
          price_per_unit: pricePerUnit
        })
        .eq('id', existingIngredient.id);
      
      if (updateError) {
        console.error('Error updating ingredient:', updateError);
        alert('Failed to update database');
        return;
      }

      const updatedIngredients = ingredients.map(i => {
        if (i.id === existingIngredient.id) {
          return {
            ...i,
            stock: newStock,
            pricePerUnit: pricePerUnit,
            unit: baseUnit
          };
        }
        return i;
      });
      setIngredients(updatedIngredients);
      
      await supabase.from('purchase_records').insert([{
        ingredient_id: existingIngredient.id,
        ingredient_name: existingIngredient.name,
        quantity: baseQuantity,
        unit: baseUnit,
        price: pricePerUnit,
        total_cost: purchaseData.isTotalPrice ? parseFloat(purchaseData.price) : baseQuantity * pricePerUnit,
        date: new Date().toISOString().split('T')[0]
      }]);
      
      alert(`Added ${baseQuantity}${baseUnit} to ${existingIngredient.name}`);
    } else {
      const { data, error } = await supabase
        .from('ingredients')
        .insert([{
          name: purchaseData.name,
          unit: baseUnit,
          stock: baseQuantity,
          min_stock: 1000,
          price_per_unit: pricePerUnit,
          exp_date: purchaseData.expDate || null
        }])
        .select();
      
      if (error) {
        console.error('Error adding ingredient:', error);
        alert('Failed to save to database');
        return;
      }

      const newIngredient = {
        id: data[0].id,
        name: purchaseData.name,
        unit: baseUnit,
        stock: baseQuantity,
        minStock: 1000,
        pricePerUnit: pricePerUnit,
        expDate: purchaseData.expDate || 'No expiry'
      };
      
      setIngredients([...ingredients, newIngredient]);
      
      await supabase.from('purchase_records').insert([{
        ingredient_id: data[0].id,
        ingredient_name: purchaseData.name,
        quantity: baseQuantity,
        unit: baseUnit,
        price: pricePerUnit,
        total_cost: purchaseData.isTotalPrice ? parseFloat(purchaseData.price) : baseQuantity * pricePerUnit,
        date: new Date().toISOString().split('T')[0]
      }]);
      
      alert(`Added new ingredient: ${purchaseData.name}`);
    }
    
    setShowPurchaseForm(false);
    setPurchaseData({
      barcode: '',
      name: '',
      quantity: '',
      unit: 'g',
      price: '',
      isTotalPrice: false,
      expDate: ''
    });
    
    loadPurchaseRecords();
  };

  // ============= RETURN JSX =============
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">🥖 Floural Inventory System</h1>
        <div className="bg-blue-50 p-3 rounded-lg w-full md:w-auto">
          <span className="text-sm text-blue-600">Total Inventory Value</span>
          <p className="text-xl font-bold text-blue-800">
            Rp {totalValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </p>
        </div>
      </div>
      {/* Install Button */}
      {showInstallButton && (
        <div className="mb-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg shadow-lg p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📱</span>
              <div>
                <h3 className="text-white font-bold text-lg">Install Bakery App</h3>
                <p className="text-purple-100 text-sm">Get faster access with one tap on your home screen</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-gray-100 font-bold flex items-center gap-2 shadow-lg transform hover:scale-105 transition-transform"
            >
              📲 Install Now
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-4 flex flex-col sm:flex-row justify-end gap-2">
        <button
          onClick={() => setShowPurchaseForm(true)}
          className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 flex items-center justify-center"
        >
          <span className="mr-2">➕</span> Add Purchase
        </button>
        {userRole === 'admin' && (
          <button
            onClick={() => {
              setPendingMenuAction('add');
              setPendingEditMenu(null);
              setShowPasswordModal(true);
            }}
            className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 flex items-center justify-center"
          >
            <span className="mr-2">📝</span> Edit Menu
          </button>
        )}
      </div>

      {/* Mobile Menu Toggle */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-full bg-gray-100 p-3 rounded-lg flex items-center justify-between"
        >
          <span className="font-medium text-gray-900">Menu: {activeTab}</span>
          <span className="text-gray-700">{mobileMenuOpen ? '▲' : '▼'}</span>
        </button>
        
        {mobileMenuOpen && (
          <div className="mt-2 bg-white rounded-lg shadow-lg p-2 border">
            <button onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-gray-900">📦 Inventory</button>
            <button onClick={() => { setActiveTab('menu'); setMobileMenuOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-gray-900">📋 Menu</button>
            <button onClick={() => { setActiveTab('bake'); setMobileMenuOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-gray-900">🥐 Bake</button>
            <button onClick={() => { setActiveTab('needToBuy'); setMobileMenuOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-gray-900">🛒 Need to Buy</button>
            <button onClick={() => { setActiveTab('expenses'); setMobileMenuOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-gray-900">💰 Expenses</button>
            <button onClick={() => { setActiveTab('spoilage'); setMobileMenuOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-gray-900">🗑️ Spoilage</button>
            {userRole === 'admin' && (
              <button onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-gray-900">👥 Users</button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Tabs */}
      <div className="overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        <div className="flex space-x-2 min-w-max">
          {userRole === 'admin' && (
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>📊 Dashboard</button>
          )}
          <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 whitespace-nowrap ${activeTab === 'inventory' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>📦 Inventory</button>
          <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 whitespace-nowrap ${activeTab === 'menu' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>📋 Menu</button>
          <button onClick={() => setActiveTab('bake')} className={`px-4 py-2 whitespace-nowrap ${activeTab === 'bake' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>🥐 Bake</button>
          <button onClick={() => setActiveTab('needToBuy')} className={`px-4 py-2 whitespace-nowrap ${activeTab === 'needToBuy' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>🛒 Need to Buy</button>
          <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 whitespace-nowrap ${activeTab === 'expenses' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>💰 Expenses</button>
          <button onClick={() => setActiveTab('spoilage')} className={`px-4 py-2 whitespace-nowrap ${activeTab === 'spoilage' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>🗑️ Spoilage</button>
        </div>
      </div>
      {/* Dashboard Tab - Admin Only */}
      {activeTab === 'dashboard' && userRole === 'admin' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Welcome back, Admin! 👋</h2>
            <p className="text-blue-100">Here's what's happening in your bakery today.</p>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Inventory</p>
                  <p className="text-2xl font-bold text-gray-900">{ingredients.length} items</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <span className="text-xl">📦</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Rp {totalValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} value</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Menu Items</p>
                  <p className="text-2xl font-bold text-gray-900">{menuItems.length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <span className="text-xl">📋</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">{menuItems.filter(m => m.recipe.length > 0).length} have recipes</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <span className="text-xl">⚠️</span>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-2">Need to buy soon</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rp {purchaseRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <span className="text-xl">💰</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">All time purchases</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Value Chart */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Inventory Value by Ingredient</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ingredients.slice(0, 5).map(i => ({
                      name: i.name.length > 15 ? i.name.substring(0, 12) + '...' : i.name,
                      value: i.stock * i.pricePerUnit
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ingredients.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rp ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 text-center mt-2">Top 5 ingredients by value</p>
            </div>

            {/* Monthly Expenses Chart */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Monthly Expenses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  const monthly = {};
                  purchaseRecords.forEach(record => {
                    const month = record.date.substring(0, 7);
                    monthly[month] = (monthly[month] || 0) + (record.total_cost || 0);
                  });
                  return Object.entries(monthly).slice(-6).map(([month, total]) => ({
                    month: month.substring(5) + '/' + month.substring(2, 4),
                    total
                  }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `Rp ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`} />
                  <Bar dataKey="total" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Spoilage by Reason */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🗑️ Spoilage by Reason</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(
                      spoilageRecords.reduce((acc, r) => {
                        acc[r.reason] = (acc[r.reason] || 0) + (r.cost || 0);
                        return acc;
                      }, {})
                    ).map(([reason, cost]) => ({ reason, cost }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ reason, percent }) => `${reason} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    dataKey="cost"
                  >
                    {spoilageRecords.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rp ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Low Stock Alerts</h3>
              {lowStockItems.length > 0 ? (
                <div className="space-y-3">
                  {lowStockItems.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-600">Stock: {item.stock} {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-red-600 font-semibold">Min: {item.minStock}</p>
                        <p className="text-xs text-red-500">Need: {(item.minStock - item.stock).toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                  {lowStockItems.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">+{lowStockItems.length - 5} more items</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">✨ All stock levels are good!</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🕒 Recent Activity</h3>
            <div className="space-y-2">
              {[...purchaseRecords.slice(0, 3), ...spoilageRecords.slice(0, 3)]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((item, idx) => {
                  if (item.ingredient_name) {
                    return (
                      <div key={`p-${idx}`} className="flex items-center text-sm p-2 bg-gray-50 rounded">
                        <span className="text-green-600 mr-3">💰</span>
                        <span className="text-gray-700 font-medium">{item.date}:</span>
                        <span className="ml-2 text-gray-900">Added {item.quantity} {item.unit} of {item.ingredient_name}</span>
                      </div>
                    );
                  } else {
                    return (
                      <div key={`s-${idx}`} className="flex items-center text-sm p-2 bg-gray-50 rounded">
                        <span className="text-red-600 mr-3">🗑️</span>
                        <span className="text-gray-700 font-medium">{item.date}:</span>
                        <span className="ml-2 text-gray-900">{item.ingredientName} - {item.quantity} {item.unit} ({item.reason})</span>
                      </div>
                    );
                  }
                })}
            </div>
          </div>
        </div>
      )}

      {/* Bake Tab */}
      {activeTab === 'bake' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">What would you like to bake?</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Menu Item</label>
              <select 
                className="w-full p-2 border rounded-lg text-gray-900 bg-white"
                value={selectedMenu}
                onChange={(e) => setSelectedMenu(e.target.value)}
              >
                <option value="" className="text-gray-700">Choose...</option>
                {menuItems.map(item => (
                  <option key={item.id} value={item.id} className="text-gray-900">
                    {item.name} (Min: {item.minBatch})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Bake</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded-lg text-gray-900 bg-white"
                value={bakeQuantity}
                onChange={(e) => setBakeQuantity(parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>

            {selectedMenu && menuItems.find(m => m.id === parseInt(selectedMenu))?.notes && (
              <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                <p className="text-sm text-yellow-700 whitespace-pre-wrap">
                  <span className="font-medium">📝 Notes:</span> {menuItems.find(m => m.id === parseInt(selectedMenu))?.notes}
                </p>
              </div>
            )}

            {selectedMenu && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Ingredients needed:</h3>
                {menuItems.find(m => m.id === parseInt(selectedMenu))?.recipe.map((item, idx) => {
                  const ingredient = ingredients.find(i => i.id === item.ingredientId);
                  
                  if (!ingredient) {
                    return (
                      <div key={idx} className="flex justify-between text-sm mb-1 text-red-600">
                        <span>{item.name}:</span>
                        <span>Ingredient not found in inventory! (ID: {item.ingredientId})</span>
                      </div>
                    );
                  }
                  
                  const totalNeeded = item.quantity * (bakeQuantity / menuItems.find(m => m.id === parseInt(selectedMenu)).minBatch);
                  const hasEnough = ingredient.stock >= totalNeeded;
                  
                  return (
                    <div key={idx} className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{ingredient.name}:</span>
                      <span className={hasEnough ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {totalNeeded.toFixed(2)} {ingredient.unit} 
                        {!hasEnough && ` (have ${ingredient.stock})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleBake}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-medium"
            >
              Bake!
            </button>
          </div>
        </div>
      )}

      {/* Need to Buy Tab */}
      {activeTab === 'needToBuy' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {lowStockItems.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-yellow-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Ingredient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Min Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase">Need to Buy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-900">{item.stock} {item.unit}</td>
                    <td className="px-6 py-4 text-gray-900">{item.minStock} {item.unit}</td>
                    <td className="px-6 py-4 text-red-600 font-semibold">
                      {(item.minStock - item.stock).toFixed(2)} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-700">All stock levels are good! 🎉</p>
          )}
        </div>
      )}

      {/* Menu Management Tab */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Menu Items & Recipes</h2>
            {userRole === 'admin' && (
              <button
                onClick={() => {
                  setPendingMenuAction('add');
                  setPendingEditMenu(null);
                  setShowPasswordModal(true);
                }}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center"
              >
                <span className="mr-2">➕</span> Add New Menu Item
              </button>
            )}
          </div>
          
          {menuItems.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {menuItems.map((menu) => (
                <div key={menu.id} className="p-4 hover:bg-gray-50">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedMenus({
                      ...expandedMenus,
                      [menu.id]: !expandedMenus[menu.id]
                    })}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 text-lg">
                        {expandedMenus[menu.id] ? '▼' : '▶'}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{menu.name}</h3>
                        <p className="text-sm text-gray-500">Min Batch: {menu.minBatch} unit</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      {userRole === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              setPendingMenuAction('edit');
                              setPendingEditMenu(menu);
                              setShowPasswordModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border rounded-lg"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete ${menu.name}?`)) {
                                await supabase.from('recipes').delete().eq('menu_item_id', menu.id);
                                await supabase.from('menu_items').delete().eq('id', menu.id);
                                loadMenuItems();
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border rounded-lg"
                          >
                            🗑️ Delete
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMenuForCost(menu);
                              setShowCostModal(true);
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium px-3 py-1 border rounded-lg"
                          >
                            💰 View Cost
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {expandedMenus[menu.id] && (
                    <div className="mt-4 ml-8 space-y-3">
                      {menu.notes && (
                        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">📝 Notes & Instructions:</h4>
                          <p className="text-sm text-yellow-700 whitespace-pre-wrap">{menu.notes}</p>
                        </div>
                      )}
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">📋 Ingredients:</h4>
                        <div className="space-y-2">
                          {menu.recipe.map((item, idx) => {
                            const ingredient = ingredients.find(i => i.id === item.ingredientId);
                            return (
                              <div key={idx} className="flex items-center py-1 border-b border-gray-200 last:border-0">
                                <span className="text-gray-600 w-32">{item.name}:</span>
                                <span className="font-medium text-gray-900 ml-4">
                                  {item.quantity} {ingredient?.unit || ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {userRole === 'admin' && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">Cost per batch:</span> Rp {menu.recipe.reduce((total, item) => {
                              const ingredient = ingredients.find(i => i.id === item.ingredientId);
                              return total + (item.quantity * (ingredient?.pricePerUnit || 0));
                            }, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-2">No menu items yet</p>
              <p className="text-sm text-gray-400">Click "Add New Menu Item" to create your first recipe!</p>
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Purchase History</h2>
              
              <div className="flex space-x-2">
                <button onClick={() => setExpenseFilter('all')} className={`px-3 py-1 rounded-lg text-sm ${expenseFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
                <button onClick={() => setExpenseFilter('today')} className={`px-3 py-1 rounded-lg text-sm ${expenseFilter === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Today</button>
                <button onClick={() => setExpenseFilter('week')} className={`px-3 py-1 rounded-lg text-sm ${expenseFilter === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>This Week</button>
                <button onClick={() => setExpenseFilter('month')} className={`px-3 py-1 rounded-lg text-sm ${expenseFilter === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>This Month</button>
                <button onClick={() => exportToCSV(purchaseRecords.map(record => ({ Date: record.date, Ingredient: record.ingredient_name, Quantity: record.quantity, Unit: record.unit, Price_Per_Unit: `Rp ${record.price?.toFixed(0) || '0'}`, Total_Cost: `Rp ${record.total_cost?.toFixed(0) || '0'}` })), 'expenses_export', ['Date', 'Ingredient', 'Quantity', 'Unit', 'Price_Per_Unit', 'Total_Cost'])} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 flex items-center">📥 Export</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-600">Total Purchases</p>
                <p className="text-xl font-bold text-blue-800">{purchaseRecords.length} items</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-600">Total Spent</p>
                <p className="text-xl font-bold text-green-800">Rp {purchaseRecords.reduce((sum, record) => sum + (record.total_cost || 0), 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm text-purple-600">Average per Purchase</p>
                <p className="text-xl font-bold text-purple-800">Rp {purchaseRecords.length > 0 ? (purchaseRecords.reduce((sum, record) => sum + (record.total_cost || 0), 0) / purchaseRecords.length).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}</p>
              </div>
            </div>
          </div>

          {purchaseRecords.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ingredient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Price/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseRecords.filter(record => {
                  if (expenseFilter === 'all') return true;
                  const today = new Date();
                  const recordDate = new Date(record.date);
                  if (expenseFilter === 'today') return recordDate.toDateString() === today.toDateString();
                  if (expenseFilter === 'week') {
                    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                    return recordDate >= weekAgo;
                  }
                  if (expenseFilter === 'month') {
                    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return recordDate >= monthAgo;
                  }
                  return true;
                }).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{record.ingredient_name}</td>
                    <td className="px-6 py-4 text-gray-900">{record.quantity} {record.unit}</td>
                    <td className="px-6 py-4 text-gray-900">Rp {record.price?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/{record.unit}</td>
                    <td className="px-6 py-4 font-medium text-green-600">Rp {record.total_cost?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="4" className="px-6 py-3 text-right font-medium text-gray-700">Total:</td>
                  <td className="px-6 py-3 font-bold text-green-600">Rp {purchaseRecords.filter(record => {
                    if (expenseFilter === 'all') return true;
                    const today = new Date();
                    const recordDate = new Date(record.date);
                    if (expenseFilter === 'today') return recordDate.toDateString() === today.toDateString();
                    if (expenseFilter === 'week') {
                      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                      return recordDate >= weekAgo;
                    }
                    if (expenseFilter === 'month') {
                      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
                      return recordDate >= monthAgo;
                    }
                    return true;
                  }).reduce((sum, record) => sum + (record.total_cost || 0), 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-2">No purchase records yet</p>
              <p className="text-sm text-gray-400">Add a purchase to see it here!</p>
            </div>
          )}
        </div>
      )}

      {/* Spoilage Records Tab */}
      {activeTab === 'spoilage' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Spoilage Records</h2>
            <div className="text-sm text-gray-600">
              Total Loss: Rp {spoilageRecords.reduce((sum, record) => sum + (record.cost || 0), 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </div>
          </div>
          
          {spoilageRecords.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ingredient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {spoilageRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{record.ingredientName}</td>
                    <td className="px-6 py-4 text-gray-900">{record.quantity} {record.unit}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.reason === 'spilled' ? 'bg-blue-100 text-blue-800' : ''} ${record.reason === 'burned' ? 'bg-orange-100 text-orange-800' : ''} ${record.reason === 'expired' ? 'bg-yellow-100 text-yellow-800' : ''} ${record.reason === 'broken' ? 'bg-purple-100 text-purple-800' : ''} ${record.reason === 'contaminated' ? 'bg-red-100 text-red-800' : ''} ${record.reason === 'other' ? 'bg-gray-100 text-gray-800' : ''}`}>
                        {record.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-red-600 font-medium">Rp {record.cost?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-gray-700">No spoilage records yet 🎉</p>
          )}
        </div>
      )}
      {/* Inventory Tab */}
{activeTab === 'inventory' && (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    {/* Search and Filter Bar */}
    <div className="p-4 bg-gray-50 border-b space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="🔍 Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border rounded-lg text-gray-900"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto p-2 border rounded-lg text-gray-900 bg-white"
        >
          <option value="all">📋 All Categories</option>
          {categories.filter(c => c !== 'all').map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => exportToCSV(
            filteredIngredients.map(item => ({
              Category: getCategory(item.name),
              Ingredient: item.name,
              Stock: item.stock,
              Unit: item.unit,
              Min_Stock: item.minStock,
              Price_Per_Unit: `Rp ${item.pricePerUnit.toFixed(0)}`,
              Expiry: item.expDate,
              Status: item.stock < item.minStock ? 'Low Stock' : 'Good'
            })),
            'inventory_export',
            ['Category', 'Ingredient', 'Stock', 'Unit', 'Min_Stock', 'Price_Per_Unit', 'Expiry', 'Status']
          )}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center whitespace-nowrap"
        >
          📥 Export CSV
        </button>
      </div>
      
      {/* Results count */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">
          Showing {filteredIngredients.length} of {ingredients.length} ingredients
        </span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear search
          </button>
        )}
      </div>
    </div>

    {/* Scrollable Table Container */}
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Ingredient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Stock</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Unit</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Min Stock</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Price/Unit</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Expiry</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredIngredients.map((item, index) => {
            const category = getCategory(item.name);
            // Alternate background colors: white for even rows, gray-50 for odd rows
            const rowBgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            // Keep red background for low stock items (overrides the alternating)
            const finalBgColor = item.stock < item.minStock ? 'bg-red-50' : rowBgColor;
            
            return (
              <tr key={item.id} className={finalBgColor}>
                <td className="px-6 py-4" data-label="Category">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs whitespace-nowrap">
                    {category}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap" data-label="Ingredient">{item.name}</td>
                <td className="px-6 py-4 text-gray-900 whitespace-nowrap" data-label="Stock">{item.stock}</td>
                <td className="px-6 py-4 text-gray-700 whitespace-nowrap" data-label="Unit">{item.unit}</td>
                <td className="px-6 py-4 text-gray-900 whitespace-nowrap" data-label="Min Stock">{item.minStock}</td>
                <td className="px-6 py-4 text-gray-900 whitespace-nowrap" data-label="Price">
                  Rp {item.pricePerUnit.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </td>
                <td className="px-6 py-4 text-gray-700 whitespace-nowrap" data-label="Expiry">{item.expDate}</td>
                <td className="px-6 py-4 whitespace-nowrap" data-label="Status">
                  {item.stock < item.minStock ? (
                    <span className="text-red-600 font-semibold">⚠️ Low Stock</span>
                  ) : (
                    <span className="text-green-600 font-semibold">✅ Good</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap" data-label="Actions">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Report Button */}
                    <button
                      onClick={() => {
                        console.log('Report clicked for:', item.name);
                        setSelectedSpoilageIngredient(item);
                        setSpoilageForm({
                          ...spoilageForm,
                          ingredientId: item.id,
                          quantity: '',
                          reason: 'spilled',
                          notes: ''
                        });
                        setShowSpoilageForm(true);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium whitespace-nowrap"
                    >
                      🗑️ Report
                    </button>
                    
                    {/* Admin Only Buttons */}
                    {userRole === 'admin' && (
                      <>
                        {/* Min Stock Button */}
                        <button
                          onClick={() => {
                            console.log('Min Stock clicked for:', item.name);
                            setEditingMinStock(item);
                            setMinStockValue(item.minStock);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                        >
                          📝 Min Stock
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={async () => {
                            const isUsedInRecipe = menuItems.some(menu => 
                              menu.recipe.some(r => r.ingredientId === item.id)
                            );
                            
                            if (isUsedInRecipe) {
                              const usedIn = menuItems
                                .filter(menu => menu.recipe.some(r => r.ingredientId === item.id))
                                .map(menu => menu.name)
                                .join(', ');
                              alert(`❌ Cannot delete "${item.name}" because it's used in: ${usedIn}. Remove it from these recipes first.`);
                              return;
                            }
                            
                            if (confirm(`Are you sure you want to delete "${item.name}"? This cannot be undone.`)) {
                              const { error } = await supabase
                                .from('ingredients')
                                .delete()
                                .eq('id', item.id);
                              
                              if (error) {
                                console.error('Error deleting ingredient:', error);
                                alert('Failed to delete ingredient');
                                return;
                              }
                              
                              setIngredients(ingredients.filter(i => i.id !== item.id));
                              alert(`✅ "${item.name}" deleted successfully!`);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium whitespace-nowrap"
                        >
                          ❌ Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    
    {/* Empty state */}
    {filteredIngredients.length === 0 && (
      <div className="p-8 text-center">
        <p className="text-gray-500">No ingredients found matching your search</p>
        <button
          onClick={() => {
            setSearchTerm('');
            setCategoryFilter('all');
          }}
          className="mt-2 text-blue-600 hover:text-blue-800"
        >
          Clear filters
        </button>
      </div>
    )}
  </div>
)}

      {/* Other tabs remain the same - Dashboard, Bake, Need to Buy, Menu, Expenses, Spoilage */}
      {/* I've kept them identical to your original code to avoid breaking anything */}
      {/* ... (rest of your tabs remain unchanged) ... */}

      {/* ============= MODALS ============= */}
      {/* Spoilage Form Modal */}
{showSpoilageForm && selectedSpoilageIngredient && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Report Spoilage</h2>
      
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-gray-700">
          <span className="font-medium">Ingredient:</span> {selectedSpoilageIngredient.name}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Current Stock:</span> {selectedSpoilageIngredient.stock} {selectedSpoilageIngredient.unit}
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Spoiled *</label>
          <input
            type="number"
            step="0.01"
            className="w-full p-2 border rounded-lg text-gray-900"
            value={spoilageForm.quantity}
            onChange={(e) => setSpoilageForm({...spoilageForm, quantity: e.target.value})}
            placeholder={`Enter quantity in ${selectedSpoilageIngredient.unit}`}
            max={selectedSpoilageIngredient.stock}
          />
          <p className="text-xs text-gray-500 mt-1">
            Max: {selectedSpoilageIngredient.stock} {selectedSpoilageIngredient.unit}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
          <select
            className="w-full p-2 border rounded-lg text-gray-900"
            value={spoilageForm.reason}
            onChange={(e) => setSpoilageForm({...spoilageForm, reason: e.target.value})}
          >
            <option value="spilled">💧 Spilled</option>
            <option value="burned">🔥 Burned</option>
            <option value="expired">📅 Expired</option>
            <option value="broken">💔 Broken</option>
            <option value="contaminated">⚠️ Contaminated</option>
            <option value="other">❓ Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            className="w-full p-2 border rounded-lg text-gray-900"
            rows="2"
            value={spoilageForm.notes}
            onChange={(e) => setSpoilageForm({...spoilageForm, notes: e.target.value})}
            placeholder="Any additional details..."
          />
        </div>

        <div className="flex space-x-2 pt-4">
          <button
  onClick={async () => {
    // Prevent double submission
    if (isSubmittingSpoilage) {
      console.log('Already submitting, please wait...');
      return;
    }

    console.log('Submit spoilage clicked');
    console.log('Quantity:', spoilageForm.quantity);
    console.log('Ingredient:', selectedSpoilageIngredient);
    
    // Validate
    if (!spoilageForm.quantity || parseFloat(spoilageForm.quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (parseFloat(spoilageForm.quantity) > selectedSpoilageIngredient.stock) {
      alert('Cannot spoil more than current stock');
      return;
    }

    // Disable button and show loading state
    setIsSubmittingSpoilage(true);

    try {
      // Calculate new stock
      const newStock = selectedSpoilageIngredient.stock - parseFloat(spoilageForm.quantity);
      
      // 1. Update ingredient stock in Supabase
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ stock: newStock })
        .eq('id', selectedSpoilageIngredient.id);
      
      if (updateError) {
        console.error('Error updating stock:', updateError);
        alert('Failed to update database');
        setIsSubmittingSpoilage(false);
        return;
      }

      // 2. Update local state for ingredients
      const updatedIngredients = ingredients.map(i => {
        if (i.id === selectedSpoilageIngredient.id) {
          return {
            ...i,
            stock: newStock
          };
        }
        return i;
      });
      setIngredients(updatedIngredients);

      // 3. Calculate cost
      const cost = parseFloat(spoilageForm.quantity) * selectedSpoilageIngredient.pricePerUnit;
      
      // 4. Insert spoilage record in Supabase
      const { data, error: insertError } = await supabase
        .from('spoilage_records')
        .insert([{
          ingredient_id: selectedSpoilageIngredient.id,
          ingredient_name: selectedSpoilageIngredient.name,
          quantity: parseFloat(spoilageForm.quantity),
          unit: selectedSpoilageIngredient.unit,
          reason: spoilageForm.reason,
          notes: spoilageForm.notes,
          cost: cost,
          date: new Date().toISOString().split('T')[0]
        }])
        .select();
      
      if (insertError) {
        console.error('Error recording spoilage:', insertError);
        alert('Failed to save spoilage record');
        setIsSubmittingSpoilage(false);
        return;
      }

      // 5. Update local state for spoilage records
      setSpoilageRecords([data[0], ...spoilageRecords]);
      
      // 6. Reset and close modal
      setShowSpoilageForm(false);
      setSelectedSpoilageIngredient(null);
      setSpoilageForm({
        ingredientId: '',
        quantity: '',
        reason: 'spilled',
        notes: ''
      });
      
      alert(`✅ Reported ${spoilageForm.quantity} ${selectedSpoilageIngredient.unit} of ${selectedSpoilageIngredient.name} as ${spoilageForm.reason}`);
      
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
    } finally {
      // Re-enable button
      setIsSubmittingSpoilage(false);
    }
  }}
  disabled={isSubmittingSpoilage}
  className={`flex-1 py-2 rounded-lg ${
    isSubmittingSpoilage 
      ? 'bg-red-300 cursor-not-allowed' 
      : 'bg-red-500 hover:bg-red-600 text-white'
  }`}
>
  {isSubmittingSpoilage ? 'Processing...' : 'Report Spoilage'}
</button>
          <button
            onClick={() => {
              setShowSpoilageForm(false);
              setSelectedSpoilageIngredient(null);
              setSpoilageForm({
                ingredientId: '',
                quantity: '',
                reason: 'spilled',
                notes: ''
              });
            }}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{/* Min Stock Editor Modal */}
{editingMinStock && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Minimum Stock</h2>
      
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-gray-700">
          <span className="font-medium">Ingredient:</span> {editingMinStock.name}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Current Stock:</span> {editingMinStock.stock} {editingMinStock.unit}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Current Min Stock:</span> {editingMinStock.minStock} {editingMinStock.unit}
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Minimum Stock Level
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              step="0.01"
              className="flex-1 p-2 border rounded-lg text-gray-900"
              value={minStockValue}
              onChange={(e) => setMinStockValue(e.target.value)}
              placeholder={`Enter min stock in ${editingMinStock.unit}`}
            />
            <span className="w-20 p-2 bg-gray-100 rounded-lg text-gray-700 text-center">
              {editingMinStock.unit}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            When stock goes below this number, it will appear in "Need to Buy" tab
          </p>
        </div>

        <div className="flex space-x-2 pt-4">
          <button
            onClick={async () => {
              if (!minStockValue || parseFloat(minStockValue) < 0) {
                alert('Please enter a valid minimum stock level');
                return;
              }

              const { error } = await supabase
                .from('ingredients')
                .update({ min_stock: parseFloat(minStockValue) })
                .eq('id', editingMinStock.id);

              if (error) {
                console.error('Error updating min stock:', error);
                alert('Failed to update database');
                return;
              }

              const updatedIngredients = ingredients.map(i => {
                if (i.id === editingMinStock.id) {
                  return {
                    ...i,
                    minStock: parseFloat(minStockValue)
                  };
                }
                return i;
              });
              setIngredients(updatedIngredients);

              setEditingMinStock(null);
              setMinStockValue('');
              alert('Minimum stock updated!');
            }}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Update
          </button>
          <button
            onClick={() => {
              setEditingMinStock(null);
              setMinStockValue('');
            }}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{/* Cost Details Modal */}
{showCostModal && selectedMenuForCost && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150]">
    <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">💰 Cost Breakdown</h2>
        <button onClick={() => setShowCostModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{selectedMenuForCost.name}</h3>
        <p className="text-sm text-gray-600">Minimum Batch: {selectedMenuForCost.minBatch} units</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600">Cost per Batch</p>
          <p className="text-2xl font-bold text-blue-800">
            Rp {selectedMenuForCost.recipe.reduce((total, item) => {
              const ingredient = ingredients.find(i => i.id === item.ingredientId);
              return total + (item.quantity * (ingredient?.pricePerUnit || 0));
            }, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Cost per Unit</p>
          <p className="text-2xl font-bold text-green-800">
            Rp {(selectedMenuForCost.recipe.reduce((total, item) => {
              const ingredient = ingredients.find(i => i.id === item.ingredientId);
              return total + (item.quantity * (ingredient?.pricePerUnit || 0));
            }, 0) / selectedMenuForCost.minBatch).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </p>
        </div>
      </div>
      <h4 className="font-medium text-gray-700 mb-3">Ingredient Costs:</h4>
      <table className="min-w-full mb-4 border">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Ingredient</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Quantity</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Price/Unit</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {selectedMenuForCost.recipe.map((item, idx) => {
            const ingredient = ingredients.find(i => i.id === item.ingredientId);
            const itemCost = item.quantity * (ingredient?.pricePerUnit || 0);
            return (
              <tr key={idx}>
                <td className="px-4 py-2 text-gray-900">{item.name}</td>
                <td className="px-4 py-2 text-right text-gray-900">{item.quantity} {ingredient?.unit}</td>
                <td className="px-4 py-2 text-right text-gray-900">
                  Rp {ingredient?.pricePerUnit.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/{ingredient?.unit}
                </td>
                <td className="px-4 py-2 text-right font-medium text-green-600">
                  Rp {itemCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td colSpan="3" className="px-4 py-3 text-right font-bold text-gray-700">Total per Batch:</td>
            <td className="px-4 py-3 text-right font-bold text-green-600">
              Rp {selectedMenuForCost.recipe.reduce((total, item) => {
                const ingredient = ingredients.find(i => i.id === item.ingredientId);
                return total + (item.quantity * (ingredient?.pricePerUnit || 0));
              }, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="bg-yellow-50 p-4 rounded-lg mt-4">
        <h4 className="font-medium text-yellow-800 mb-2">💡 Suggested Selling Price</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-yellow-700">2x Cost</p>
            <p className="text-lg font-bold text-yellow-800">
              Rp {(selectedMenuForCost.recipe.reduce((total, item) => {
                const ingredient = ingredients.find(i => i.id === item.ingredientId);
                return total + (item.quantity * (ingredient?.pricePerUnit || 0));
              }, 0) * 2 / selectedMenuForCost.minBatch).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </p>
          </div>
          <div>
            <p className="text-sm text-yellow-700">2.5x Cost</p>
            <p className="text-lg font-bold text-yellow-800">
              Rp {(selectedMenuForCost.recipe.reduce((total, item) => {
                const ingredient = ingredients.find(i => i.id === item.ingredientId);
                return total + (item.quantity * (ingredient?.pricePerUnit || 0));
              }, 0) * 2.5 / selectedMenuForCost.minBatch).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </p>
          </div>
          <div>
            <p className="text-sm text-yellow-700">3x Cost</p>
            <p className="text-lg font-bold text-yellow-800">
              Rp {(selectedMenuForCost.recipe.reduce((total, item) => {
                const ingredient = ingredients.find(i => i.id === item.ingredientId);
                return total + (item.quantity * (ingredient?.pricePerUnit || 0));
              }, 0) * 3 / selectedMenuForCost.minBatch).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </p>
          </div>
        </div>
        <p className="text-xs text-yellow-600 mt-2 text-center">Suggested prices based on common markup percentages</p>
      </div>
      <div className="flex justify-end mt-6">
        <button onClick={() => setShowCostModal(false)} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400">Close</button>
      </div>
    </div>
  </div>
)}
{/* Password Modal for Menu Editor */}
{showPasswordModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-900">🔐 Authorized Access Only</h2>
      <p className="text-gray-600 mb-4">Enter password to {pendingMenuAction === 'add' ? 'add new menu item' : 'edit menu item'}:</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input type="password" className="w-full p-2 border rounded-lg text-gray-900" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Enter password" onKeyDown={(e) => { if (e.key === 'Enter') { if (passwordInput === MENU_PASSWORD) { setShowPasswordModal(false); setPasswordInput(''); if (pendingMenuAction === 'add') { setEditingMenu(null); setMenuForm({ name: '', minBatch: 1, recipe: [] }); setShowMenuEditor(true); } else if (pendingMenuAction === 'edit' && pendingEditMenu) { setEditingMenu(pendingEditMenu); setMenuForm({ name: pendingEditMenu.name, minBatch: pendingEditMenu.minBatch, recipe: pendingEditMenu.recipe.map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity })) }); setShowMenuEditor(true); } } else { alert('Incorrect password!'); setPasswordInput(''); } } }} />
        </div>
        <div className="flex space-x-2">
          <button onClick={() => { if (passwordInput === MENU_PASSWORD) { setShowPasswordModal(false); setPasswordInput(''); if (pendingMenuAction === 'add') { setEditingMenu(null); setMenuForm({ name: '', minBatch: 1, recipe: [] }); setShowMenuEditor(true); } else if (pendingMenuAction === 'edit' && pendingEditMenu) { setEditingMenu(pendingEditMenu); setMenuForm({ name: pendingEditMenu.name, minBatch: pendingEditMenu.minBatch, recipe: pendingEditMenu.recipe.map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity })) }); setShowMenuEditor(true); } } else { alert('Incorrect password!'); setPasswordInput(''); } }} className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600">Submit</button>
          <button onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setPendingMenuAction(null); setPendingEditMenu(null); }} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  </div>
)}
{/* Purchase Form Modal */}
{showPurchaseForm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Add Purchase</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
          <div className="flex space-x-2">
            <input type="text" className="flex-1 p-2 border rounded-lg text-gray-900" value={purchaseData.barcode} onChange={(e) => setPurchaseData({...purchaseData, barcode: e.target.value})} placeholder="Scan or enter barcode" />
            <button onClick={() => setShowScanner(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">📷 Scan</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input type="text" className="w-full p-2 border rounded-lg text-gray-900" value={purchaseData.name} onChange={(e) => setPurchaseData({...purchaseData, name: e.target.value})} placeholder="Type or select from existing" list="existing-ingredients" />
          <datalist id="existing-ingredients">{ingredients.map(item => (<option key={item.id} value={item.name} />))}</datalist>
          {purchaseData.name && (<div className="mt-2">{ingredients.find(i => i.name === purchaseData.name) ? (<div className="text-green-600 text-sm">✅ Will update existing ingredient</div>) : (<div className="text-yellow-600 text-sm">🆕 Will add as new ingredient</div>)}</div>)}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <div className="flex space-x-2">
            <input type="number" className="flex-1 p-2 border rounded-lg text-gray-900" value={purchaseData.quantity} onChange={(e) => setPurchaseData({...purchaseData, quantity: e.target.value})} placeholder="How much did you buy?" />
            <select className="w-24 p-2 border rounded-lg text-gray-900 bg-white" value={purchaseData.unit} onChange={(e) => setPurchaseData({...purchaseData, unit: e.target.value})}><option value="g">grams (g)</option><option value="kg">kilograms (kg)</option><option value="ml">milliliters (ml)</option><option value="L">liters (L)</option><option value="pieces">pieces</option></select>
          </div>
          {purchaseData.quantity && purchaseData.unit && purchaseData.unit !== 'g' && purchaseData.unit !== 'ml' && (<div className="text-xs text-blue-600 mt-1">↪ Will convert to: {purchaseData.unit === 'kg' ? (parseFloat(purchaseData.quantity) * 1000) + ' g' : purchaseData.unit === 'L' ? (parseFloat(purchaseData.quantity) * 1000) + ' ml' : purchaseData.quantity + ' ' + purchaseData.unit}</div>)}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rp)</label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="totalPriceMode" className="rounded" checked={purchaseData.isTotalPrice} onChange={(e) => setPurchaseData({...purchaseData, isTotalPrice: e.target.checked})} />
              <label htmlFor="totalPriceMode" className="text-sm text-gray-700">I paid total price (not per unit)</label>
            </div>
            <div className="flex space-x-2">
              <input type="number" step="0.01" className="flex-1 p-2 border rounded-lg text-gray-900" value={purchaseData.price} onChange={(e) => setPurchaseData({...purchaseData, price: e.target.value})} placeholder={purchaseData.isTotalPrice ? "Total paid amount" : "Price per unit"} />
              <span className="w-24 p-2 bg-gray-100 rounded-lg text-gray-700 text-center">{purchaseData.isTotalPrice ? 'total' : '/' + (purchaseData.unit || 'unit')}</span>
            </div>
            {purchaseData.isTotalPrice && purchaseData.quantity && purchaseData.price && (<div className="bg-blue-50 p-2 rounded-lg text-sm"><span className="text-blue-700">Per unit: Rp {(parseFloat(purchaseData.price) / parseFloat(purchaseData.quantity)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /{purchaseData.unit || 'unit'}</span></div>)}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
          <input type="date" className="w-full p-2 border rounded-lg text-gray-900" value={purchaseData.expDate} onChange={(e) => setPurchaseData({...purchaseData, expDate: e.target.value})} />
        </div>
        <div className="flex space-x-2 pt-4">
  <button
    onClick={async () => {
      // Prevent double submission
      if (isSubmittingPurchase) {
        console.log('Already submitting, please wait...');
        return;
      }

      setIsSubmittingPurchase(true);
      
      // Call the existing handleAddPurchase
      await handleAddPurchase();
      
      // Re-enable button (handleAddPurchase might close the modal)
      setIsSubmittingPurchase(false);
    }}
    disabled={isSubmittingPurchase}
    className={`flex-1 py-2 rounded-lg ${
      isSubmittingPurchase 
        ? 'bg-green-300 cursor-not-allowed' 
        : 'bg-green-500 hover:bg-green-600 text-white'
    }`}
  >
    {isSubmittingPurchase ? 'Adding...' : 'Add to Inventory'}
  </button>
  
  <button
    onClick={() => {
      if (!isSubmittingPurchase) {
        setShowPurchaseForm(false);
        setPurchaseData({
          barcode: '',
          name: '',
          quantity: '',
          unit: 'g',
          price: '',
          isTotalPrice: false,
          expDate: ''
        });
      }
    }}
    disabled={isSubmittingPurchase}
    className={`flex-1 py-2 rounded-lg ${
      isSubmittingPurchase 
        ? 'bg-gray-200 cursor-not-allowed' 
        : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
    }`}
  >
    Cancel
  </button>
</div>
      </div>
    </div>
  </div>
)}
{/* Barcode Scanner Modal */}
{showScanner && (
  <BarcodeScanner 
    onScan={handleScan}
    onClose={() => setShowScanner(false)}
  />
)}
{/* Menu Editor Modal */}
{showMenuEditor && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-900">{editingMenu ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Menu Name</label>
          <input type="text" className="w-full p-2 border rounded-lg text-gray-900" value={menuForm.name} onChange={(e) => setMenuForm({...menuForm, name: e.target.value})} placeholder="e.g., Chocolate Chip Cookies" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Batch Size</label>
          <input type="number" min="1" className="w-full p-2 border rounded-lg text-gray-900" value={menuForm.minBatch} onChange={(e) => setMenuForm({...menuForm, minBatch: parseInt(e.target.value) || 1})} />
          <p className="text-xs text-gray-500 mt-1">Minimum quantity that can be baked at once</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes & Instructions</label>
          <textarea className="w-full p-2 border rounded-lg text-gray-900" rows="3" value={menuForm.notes} onChange={(e) => setMenuForm({...menuForm, notes: e.target.value})} placeholder="e.g., Temperature: 350°F, Baking time: 12-15 minutes, Special instructions..." />
          <p className="text-xs text-gray-500 mt-1">Temperature, time, or any special instructions</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Ingredients</label>
          <div className="space-y-2 mb-4">
            {menuForm.recipe.map((item, index) => {
              const ingredient = ingredients.find(i => i.id === item.ingredientId);
              return (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <div className="flex-1"><span className="font-medium text-gray-900">{ingredient?.name}</span><span className="ml-2 text-gray-600">{item.quantity} {ingredient?.unit}</span></div>
                  <button onClick={() => { const newRecipe = menuForm.recipe.filter((_, i) => i !== index); setMenuForm({...menuForm, recipe: newRecipe}); }} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              );
            })}
          </div>
          <div className="flex space-x-2">
            <select className="flex-1 p-2 border rounded-lg text-gray-900" value={selectedIngredient} onChange={(e) => setSelectedIngredient(e.target.value)}><option value="">Select ingredient...</option>{ingredients.map(i => (<option key={i.id} value={i.id}>{i.name} ({i.unit})</option>))}</select>
            <input type="number" step="0.01" className="w-24 p-2 border rounded-lg text-gray-900" value={recipeQuantity} onChange={(e) => setRecipeQuantity(e.target.value)} placeholder="Qty" />
            <button onClick={() => { if (!selectedIngredient || !recipeQuantity) { alert('Please select ingredient and enter quantity'); return; } const newRecipe = [...menuForm.recipe, { ingredientId: parseInt(selectedIngredient), quantity: parseFloat(recipeQuantity) }]; setMenuForm({...menuForm, recipe: newRecipe}); setSelectedIngredient(''); setRecipeQuantity(''); }} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">Add</button>
          </div>
        </div>
        <div className="flex space-x-2 pt-4 border-t">
          <button onClick={async () => { if (!menuForm.name || menuForm.recipe.length === 0) { alert('Please enter menu name and at least one ingredient'); return; } if (editingMenu) { const { error: menuError } = await supabase.from('menu_items').update({ name: menuForm.name, min_batch: menuForm.minBatch, notes: menuForm.notes }).eq('id', editingMenu.id); if (menuError) { console.error('Error updating menu:', menuError); alert('Failed to update menu'); return; } await supabase.from('recipes').delete().eq('menu_item_id', editingMenu.id); for (const recipe of menuForm.recipe) { await supabase.from('recipes').insert([{ menu_item_id: editingMenu.id, ingredient_id: recipe.ingredientId, quantity: recipe.quantity }]); } alert('Menu item updated!'); } else { const { data: menuData, error: menuError } = await supabase.from('menu_items').insert([{ name: menuForm.name, min_batch: menuForm.minBatch }]).select(); if (menuError) { console.error('Error adding menu:', menuError); alert('Failed to add menu'); return; } for (const recipe of menuForm.recipe) { await supabase.from('recipes').insert([{ menu_item_id: menuData[0].id, ingredient_id: recipe.ingredientId, quantity: recipe.quantity }]); } alert('Menu item added!'); } loadMenuItems(); setShowMenuEditor(false); }} className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600">{editingMenu ? 'Update Menu' : 'Save Menu'}</button>
          <button onClick={() => setShowMenuEditor(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* All your modal code remains exactly the same */}
      {/* ... (Cost Modal, Password Modal, Purchase Form, etc.) ... */}

    </div>
  );
}
