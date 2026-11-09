import React, { useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  Edit2,
  Check,
  X,
  Sparkles,
  Utensils,
  ChefHat,
  Filter,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, KitchenStation } from '../../types/restaurant';

export const MenuManagementView: React.FC = () => {
  const {
    menuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    formatMoney,
  } = useRestaurant();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  // New Dish Form State
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState('Chips');
  const [dishPrice, setDishPrice] = useState<number>(15000);
  const [dishStation, setDishStation] = useState<KitchenStation>('hot_kitchen');
  const [dishPrepTime, setDishPrepTime] = useState<number>(12);
  const [dishImage, setDishImage] = useState('/src/assets/images/dish_chips_mayai_1794223268664.jpg');

  const categories = ['All', 'Chips', 'Special', 'Chickens', 'Soups', 'Desserts', 'Drinks'];

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCreateDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName) return;

    addMenuItem({
      name: dishName,
      category: dishCategory,
      price: Number(dishPrice),
      image: dishImage,
      preparationTimeMinutes: Number(dishPrepTime),
      isAvailable: true,
      station: dishStation,
    });

    setDishName('');
    setIsCreateModalOpen(false);
  };

  const handleSavePriceEdit = (item: MenuItem) => {
    updateMenuItem({
      ...item,
      price: Number(editingPrice),
    });
    setEditingItemId(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-100/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-neutral-900 tracking-tight">
              Menu Creation & Dish Catalog
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-mono font-bold">
              {menuItems.length} Dishes
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Simple, streamlined dish creator without cluttered descriptions. Live pricing & availability toggles.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Dish</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search dish name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Clean Menu Items Table (NO DESCRIPTIONS) */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
              <tr>
                <th className="py-3 px-3.5">Dish</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Prep Time</th>
                <th className="py-3 px-3">Selling Price</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredItems.map((item) => {
                const isEditingThis = editingItemId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* Dish Image + Name (Strictly No description) */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200 shadow-xs">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-bold text-sm text-neutral-900">{item.name}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </td>

                    {/* Station */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-[11px] text-neutral-500 capitalize">
                        {item.station.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Prep Time */}
                    <td className="py-3.5 px-3 font-mono text-neutral-600">
                      {item.preparationTimeMinutes} mins
                    </td>

                    {/* Price with inline edit */}
                    <td className="py-3.5 px-3 font-mono">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(Number(e.target.value))}
                            className="w-24 p-1 text-xs border border-orange-500 rounded font-mono font-bold"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePriceEdit(item)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="p-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-neutral-900">
                            {formatMoney(item.price)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingPrice(item.price);
                            }}
                            className="p-1 text-neutral-400 hover:text-orange-600 rounded"
                            title="Edit price"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* In Stock / Out of Stock Switch */}
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => toggleMenuItemAvailability(item.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {item.isAvailable ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>In Stock</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            <span>Sold Out</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${item.name} from restaurant menu?`)) {
                            deleteMenuItem(item.id);
                          }
                        }}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DISH MODAL (Simple & Easy, strictly no description input) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateDish}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-neutral-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-neutral-900">Add Dish to Restaurant Menu</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Dish Name:</label>
              <input
                type="text"
                required
                placeholder="e.g. Chips Kuku Choma Special"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Category:</label>
                <select
                  value={dishCategory}
                  onChange={(e) => setDishCategory(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
                >
                  <option value="Chips">Chips & Fast Bites</option>
                  <option value="Special">Special Chef Selection</option>
                  <option value="Chickens">Chicken & Grills</option>
                  <option value="Soups">Soups & Bowls</option>
                  <option value="Desserts">Desserts & Sweets</option>
                  <option value="Drinks">Drinks & Bar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Selling Price (TZS):</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={dishPrice}
                  onChange={(e) => setDishPrice(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Preparation Station:</label>
                <select
                  value={dishStation}
                  onChange={(e) => setDishStation(e.target.value as KitchenStation)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  <option value="hot_kitchen">Hot Kitchen / Fryer</option>
                  <option value="grill">Grill & Charcoal</option>
                  <option value="drinks">Bar & Drinks</option>
                  <option value="dessert">Pastry & Dessert</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Prep Time (mins):</label>
                <input
                  type="number"
                  required
                  value={dishPrepTime}
                  onChange={(e) => setDishPrepTime(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Dish Photo selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Select Dish Photo:</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Chips', path: '/src/assets/images/dish_chips_mayai_1794223268664.jpg' },
                  { label: 'Salmon', path: '/src/assets/images/dish_grilled_salmon_1794223268825.jpg' },
                  { label: 'Burger', path: '/src/assets/images/dish_burger_roastbeef_1794223269419.jpg' },
                  { label: 'Seafood', path: '/src/assets/images/dish_seafood_platter_1794223269678.jpg' },
                ].map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => setDishImage(p.path)}
                    className={`h-16 rounded-xl overflow-hidden border-2 transition-all relative ${
                      dishImage === p.path ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-neutral-200 opacity-70'
                    }`}
                  >
                    <img src={p.path} alt={p.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-xs"
              >
                Save & Add Dish
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
