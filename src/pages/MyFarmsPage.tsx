import React, { useState } from 'react';
import {
  Trees,
  Plus,
  MapPin,
  Activity,
  CloudSun,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Edit2,
  Trash2,
  Layers,
  Check,
  Eye,
  X,
  Save,
  Globe2,
} from 'lucide-react';
import { Farm, AppNavigationTab } from '../types';

interface MyFarmsPageProps {
  farms: Farm[];
  activeFarm: Farm;
  onSelectFarm: (farm: Farm) => void;
  onOpenAddFarm: () => void;
  onNavigate: (tab: AppNavigationTab) => void;
  onDeleteFarm?: (id: string) => void;
  onUpdateFarm?: (updatedFarm: Farm) => void;
}

export const MyFarmsPage: React.FC<MyFarmsPageProps> = ({
  farms,
  activeFarm,
  onSelectFarm,
  onOpenAddFarm,
  onNavigate,
  onDeleteFarm,
  onUpdateFarm,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  
  // Modals state
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [inspectingFarm, setInspectingFarm] = useState<Farm | null>(null);
  const [deletingFarmId, setDeletingFarmId] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSizeHa, setEditSizeHa] = useState<number>(5.2);
  const [editCrop, setEditCrop] = useState('');
  const [editGrowthStage, setEditGrowthStage] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editState, setEditState] = useState('');
  const [editEstimatedYield, setEditEstimatedYield] = useState<number>(3.8);
  const [editSoilPh, setEditSoilPh] = useState<number>(6.4);

  const openEditModal = (farm: Farm) => {
    setEditingFarm(farm);
    setEditName(farm.name);
    setEditSizeHa(farm.sizeHa);
    setEditCrop(farm.currentCrop);
    setEditGrowthStage(farm.growthStage);
    setEditLocation(farm.location);
    setEditState(farm.state);
    setEditEstimatedYield(farm.estimatedYieldTonsPerHa);
    setEditSoilPh(farm.soil.ph);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarm || !onUpdateFarm) return;

    const updated: Farm = {
      ...editingFarm,
      name: editName.trim() || editingFarm.name,
      sizeHa: Number(editSizeHa) || editingFarm.sizeHa,
      currentCrop: editCrop.trim() || editingFarm.currentCrop,
      growthStage: editGrowthStage.trim() || editingFarm.growthStage,
      location: editLocation.trim() || editingFarm.location,
      state: editState.trim() || editingFarm.state,
      estimatedYieldTonsPerHa: Number(editEstimatedYield) || editingFarm.estimatedYieldTonsPerHa,
      soil: {
        ...editingFarm.soil,
        ph: Number(editSoilPh) || editingFarm.soil.ph,
      },
    };

    onUpdateFarm(updated);
    setEditingFarm(null);
  };

  const filteredFarms = farms.filter(
    (f) =>
      f.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.location.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.currentCrop.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2.5">
            <Trees className="w-6 h-6 text-emerald-400" />
            <span>My Farms Portfolio</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Manage your agricultural holdings, satellite boundaries, soil classifications, and seasonal allocations.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddFarm}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Farm</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter by farm name, location, or crop..."
          className="w-full max-w-sm px-3.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
        />
        <span className="text-xs font-mono text-neutral-400">
          Showing {filteredFarms.length} of {farms.length} parcels
        </span>
      </div>

      {/* Farms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFarms.map((farm) => {
          const isCurrentActive = activeFarm.id === farm.id;
          const expectedTons = farm.sizeHa * farm.estimatedYieldTonsPerHa;
          const estimatedValue = expectedTons * 480000;

          return (
            <div
              key={farm.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative ${
                isCurrentActive
                  ? 'bg-neutral-900 border-emerald-500/50 shadow-xl shadow-emerald-950/30'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                      <span>{farm.name}</span>
                      {isCurrentActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{farm.location}, {farm.state}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                    {farm.sizeHa} ha
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <span className="text-[10px] font-semibold uppercase text-neutral-400 block">Crop &amp; Stage</span>
                    <strong className="text-neutral-100 mt-0.5 block">{farm.currentCrop}</strong>
                    <span className="text-[11px] text-neutral-400">{farm.growthStage}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <span className="text-[10px] font-semibold uppercase text-neutral-400 block">Health Score</span>
                    <strong className="text-emerald-400 mt-0.5 block">{farm.healthScore}/100</strong>
                    <span className="text-[11px] text-neutral-400">{farm.overallRisk} Risk Profile</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <span className="text-[10px] font-semibold uppercase text-neutral-400 block">Soil Profile</span>
                    <strong className="text-neutral-200 mt-0.5 block">pH {farm.soil.ph} &bull; {farm.soil.texture}</strong>
                    <span className="text-[10px] text-amber-300 capitalize">{farm.soil.source.replace('_', ' ')}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <span className="text-[10px] font-semibold uppercase text-neutral-400 block">Projected Value</span>
                    <strong className="text-emerald-400 mt-0.5 block font-mono">
                      ₦{(estimatedValue / 1000000).toFixed(2)}M
                    </strong>
                    <span className="text-[11px] text-neutral-400">@ {farm.estimatedYieldTonsPerHa} t/ha</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectFarm(farm);
                    onNavigate('overview');
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    isCurrentActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200'
                  }`}
                >
                  {isCurrentActive ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Viewing</span>
                    </>
                  ) : (
                    <span>Set Active &rarr;</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingFarm(farm)}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs border border-neutral-700/60 transition-colors"
                  title="View Parcel Details & Coordinates"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(farm)}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs border border-neutral-700/60 transition-colors"
                  title="Edit Farm Parameters"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {onDeleteFarm && farms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeletingFarmId(farm.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                    title="Remove farm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Farm Modal */}
      {editingFarm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Edit Farm: {editingFarm.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingFarm(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Farm Name:</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Parcel Size (ha):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="500"
                    value={editSizeHa}
                    onChange={(e) => setEditSizeHa(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Current Crop:</label>
                  <input
                    type="text"
                    value={editCrop}
                    onChange={(e) => setEditCrop(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Growth Stage:</label>
                  <input
                    type="text"
                    value={editGrowthStage}
                    onChange={(e) => setEditGrowthStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Location / Community:</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">State / Province:</label>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Target Yield (tons/ha):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editEstimatedYield}
                    onChange={(e) => setEditEstimatedYield(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Soil pH:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="4.0"
                    max="9.0"
                    value={editSoilPh}
                    onChange={(e) => setEditSoilPh(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingFarm(null)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Farm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parcel Detail Inspector Modal */}
      {inspectingFarm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-emerald-400" />
                  <span>{inspectingFarm.name} &mdash; GIS Dossier</span>
                </h3>
                <span className="text-xs text-neutral-400">{inspectingFarm.location}, {inspectingFarm.state}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingFarm(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] uppercase font-mono block">Coordinates</span>
                  <span className="font-mono text-neutral-200">
                    {inspectingFarm.coordinates.lat.toFixed(4)}°N, {inspectingFarm.coordinates.lng.toFixed(4)}°E
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] uppercase font-mono block">Irrigation System</span>
                  <span className="text-neutral-200 font-semibold">{inspectingFarm.irrigationType}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
                <span className="text-neutral-400 font-semibold block uppercase text-[10px]">
                  Boundary Polygon Points ({inspectingFarm.boundary.length} GPS Vertices):
                </span>
                <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-emerald-400">
                  {inspectingFarm.boundary.map((b, idx) => (
                    <div key={idx} className="bg-neutral-900 px-2 py-1 rounded">
                      P{idx + 1}: {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-neutral-400 font-semibold block uppercase text-[10px]">
                  Soil Chemistry Breakdown:
                </span>
                <p className="text-[11px] text-neutral-300">
                  pH {inspectingFarm.soil.ph} &bull; Nitrogen: {inspectingFarm.soil.nitrogenKgHa} kg/ha &bull; Moisture: {inspectingFarm.soil.moisturePercent}% &bull; Texture: {inspectingFarm.soil.texture}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectingFarm(null)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingFarmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Farm Removal</span>
            </div>
            <p className="text-xs text-neutral-300">
              Are you sure you want to remove this farm parcel? Its localized historical satellite records and soil profiles will be deleted from your active cache.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setDeletingFarmId(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteFarm) onDeleteFarm(deletingFarmId);
                  setDeletingFarmId(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Delete Farm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
