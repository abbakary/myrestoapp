import React, { useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Utensils,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, KitchenStation } from '../../types/restaurant';

export const MenuManagementView: React.FC = () => {
  const {
    menuItems,
    recipes,
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
    if (!dishName.trim()) return;

    addMenuItem({
      name: dishName.trim(),
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

  const getBomLabel = (itemId: string) => {
    const linked = recipes.find((r) => r.menuItemId === itemId && !r.isSubRecipe);
    if (!linked) {
      return { text: 'Direct Stock 1:1', tone: 'text-neutral-500' };
    }
    const method =
      linked.productionMethod === 'semi_standardized'
        ? 'Semi-Std Batch'
        : linked.productionMethod === 'direct_stock'
        ? 'Direct Stock'
        : 'Standard BOM';
    return {
      text: `${method} · ${linked.code || `v${linked.version}`}`,
      tone: linked.status === 'approved' ? 'text-emerald-700' : 'text-amber-700',
    };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-neutral-900">
            <h2 className="text-base font-bold tracking-tight">
              Menu Creation &amp; Dish Catalog
            </h2>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              · {menuItems.length} Dishes
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Streamlined dish pricing, station routing, availability toggles, and BOM linkage visibility.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Dish</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-neutral-200/60 rounded-xl overflow-x-auto max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

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

      {/* Clean Menu Items Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Dish</th>
                <th className="py-3 px-3">Category / Station</th>
                <th className="py-3 px-3">BOM Method</th>
                <th className="py-3 px-3">Prep</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3">Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredItems.map((item) => {
                const isEditingThis = editingItemId === item.id;
                const isPendingDelete = pendingDeleteId === item.id;
                const bomMeta = getBomLabel(item.id);

                return (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-neutral-900 truncate">{item.name}</div>
                          {item.portions && item.portions.length > 0 && (
                            <div className="text-[11px] text-neutral-500">
                              {item.portions.map((p) => p.name).join(' / ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-neutral-600">
                      <span className="font-medium text-neutral-800">{item.category}</span>
                      <span className="mx-1.5 text-neutral-300">·</span>
                      <span className="capitalize">{item.station.replace('_', ' ')}</span>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      <span className={`font-semibold ${bomMeta.tone}`}>{bomMeta.text}</span>
                    </td>

                    <td className="py-3 px-3 font-mono tabular-nums text-neutral-600">
                      {item.preparationTimeMinutes} min
                    </td>

                    <td className="py-3 px-3 font-mono text-right tabular-nums">
                      {isEditingThis ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(Number(e.target.value))}
                            className="w-24 p-1 text-xs border border-orange-500 rounded font-mono font-bold text-right"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePriceEdit(item)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                            aria-label="Save price"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="p-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 cursor-pointer"
                            aria-label="Cancel price edit"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-bold text-sm text-neutral-900">
                            {formatMoney(item.price)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingPrice(item.price);
                            }}
                            className="p-1 text-neutral-400 hover:text-orange-600 rounded cursor-pointer"
                            title="Edit price"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleMenuItemAvailability(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          item.isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                        }`}
                      >
                        {item.isAvailable ? 'In Stock' : 'Sold Out'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isPendingDelete ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              deleteMenuItem(item.id);
                              setPendingDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 whitespace-nowrap cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="px-2 py-1 rounded bg-neutral-100 text-neutral-700 text-[11px] font-semibold hover:bg-neutral-200 whitespace-nowrap cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(item.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-500">
                    No menu dishes match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DISH MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateDish}
            className="bg-white rounded-2xl p-6 max-w-md w-full border border-neutral-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-sm text-neutral-900">Add Dish to Restaurant Menu</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Dish Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Chips Kuku Choma Special"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Category</label>
                <select
                  value={dishCategory}
                  onChange={(e) => setDishCategory(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
                >
                  <option value="Chips">Chips &amp; Fast Bites</option>
                  <option value="Special">Special Chef Selection</option>
                  <option value="Chickens">Chicken &amp; Grills</option>
                  <option value="Soups">Soups &amp; Bowls</option>
                  <option value="Desserts">Desserts &amp; Sweets</option>
                  <option value="Drinks">Drinks &amp; Bar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Selling Price (TZS)</label>
                <input
                  type="number"
                  required
                  value={dishPrice}
                  onChange={(e) => setDishPrice(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Preparation Station</label>
                <select
                  value={dishStation}
                  onChange={(e) => setDishStation(e.target.value as KitchenStation)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  <option value="hot_kitchen">Hot Kitchen / Fryer</option>
                  <option value="grill">Grill &amp; Charcoal</option>
                  <option value="drinks">Bar &amp; Drinks</option>
                  <option value="dessert">Pastry &amp; Dessert</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Prep Time (mins)</label>
                <input
                  type="number"
                  required
                  value={dishPrepTime}
                  onChange={(e) => setDishPrepTime(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Dish Photo</label>
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
                    className={`h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      dishImage === p.path ? 'border-orange-500' : 'border-neutral-200 opacity-75'
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
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl whitespace-nowrap cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Save &amp; Add Dish
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
