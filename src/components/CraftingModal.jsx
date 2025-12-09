import React, { useState } from 'react';
import { X, Hammer, Check, AlertTriangle, Coins } from 'lucide-react';
import './CraftingModal.css';

const CraftingModal = ({ isOpen, onClose, recipes, inventory, onCraft }) => {
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [additionalCost, setAdditionalCost] = useState('');
    const [craftQuantity, setCraftQuantity] = useState(1);
    const [consumedMaterials, setConsumedMaterials] = useState({});

    // Update consumed materials when recipe or quantity changes
    React.useEffect(() => {
        if (selectedRecipe) {
            const defaults = {};
            selectedRecipe.ingredients.forEach(ing => {
                defaults[ing.name] = ing.quantity * craftQuantity;
            });
            setConsumedMaterials(defaults);
        } else {
            setConsumedMaterials({});
        }
    }, [selectedRecipe, craftQuantity]);

    if (!isOpen) return null;

    const getInventoryQuantity = (itemName) => {
        const item = inventory.find(i => i.name === itemName);
        return item ? item.quantity : 0;
    };

    const handleMaterialChange = (name, value) => {
        setConsumedMaterials(prev => ({
            ...prev,
            [name]: parseInt(value) || 0
        }));
    };

    // Check if we have enough of the *custom* amounts
    const canCraft = selectedRecipe && Object.entries(consumedMaterials).every(
        ([name, amount]) => getInventoryQuantity(name) >= amount
    );

    const handleCraft = () => {
        if (!canCraft) return;
        onCraft(selectedRecipe, craftQuantity, consumedMaterials, additionalCost);
        onClose();
        setSelectedRecipe(null);
        setAdditionalCost('');
        setCraftQuantity(1);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <h2 className="modal-title">
                    <Hammer size={20} /> Crafting Station
                </h2>

                <div className="recipe-selector">
                    <label className="label">Select Blueprint</label>
                    <select
                        className="rpg-select"
                        onChange={(e) => setSelectedRecipe(recipes.find(r => r.id === e.target.value))}
                        value={selectedRecipe?.id || ''}
                    >
                        <option value="">-- Choose Recipe --</option>
                        {recipes.map(recipe => (
                            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                        ))}
                    </select>
                </div>

                {selectedRecipe && (
                    <div className="recipe-details">
                        <div className="output-preview">
                            <div className={`preview-icon rarity-${selectedRecipe.outputItem.rarity.toLowerCase()}`}>
                                <div className="preview-rarity">{selectedRecipe.outputItem.rarity}</div>
                                <div className="preview-name">{selectedRecipe.outputItem.name}</div>
                                <div className="preview-quantity">x{selectedRecipe.outputItem.quantity * craftQuantity}</div>
                            </div>
                        </div>

                        <div className="craft-settings">
                            <label className="label">Quantity to Craft</label>
                            <input
                                type="number"
                                min="1"
                                className="rpg-input"
                                value={craftQuantity}
                                onChange={(e) => setCraftQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                        </div>

                        <div className="ingredients-list">
                            <label className="label">Required Materials (Editable)</label>
                            {selectedRecipe.ingredients.map(ing => {
                                const available = getInventoryQuantity(ing.name);
                                const required = consumedMaterials[ing.name] || 0;
                                const isEnough = available >= required;

                                return (
                                    <div key={ing.name} className={`ingredient-row ${isEnough ? 'enough' : 'missing'}`}>
                                        <span className="ing-name">{ing.name} (Avail: {available})</span>
                                        <div className="ing-input-wrapper">
                                            <input
                                                type="number"
                                                className="ing-input"
                                                value={required}
                                                onChange={(e) => handleMaterialChange(ing.name, e.target.value)}
                                            />
                                            {isEnough ? <Check size={14} /> : <AlertTriangle size={14} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="additional-cost-section">
                            <label className="label">
                                <Coins size={14} /> Additional Cost (Honey)
                            </label>
                            <input
                                type="number"
                                className="rpg-input"
                                placeholder="0"
                                value={additionalCost}
                                onChange={(e) => setAdditionalCost(e.target.value)}
                            />
                        </div>

                        <button
                            className="craft-submit-btn"
                            disabled={!canCraft}
                            onClick={handleCraft}
                        >
                            Craft {craftQuantity} Item{craftQuantity > 1 ? 's' : ''}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CraftingModal;
