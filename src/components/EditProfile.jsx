import React, { useState } from 'react';
import { Save, User, Heart, Gamepad2, Baby, Calendar } from 'lucide-react';
import './EditProfile.css';

const EditProfile = ({ user, onSave }) => {
    const [formData, setFormData] = useState({
        gender: user.gender || '',
        children: user.children || '',
        hobby: user.hobby || '',
        birthday: user.birthday || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'children' ? (parseInt(value) || 0) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const formatDateForDisplay = (isoDate) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}.${month}.${year}`;
    };

    return (
        <div className="edit-profile-container">
            <h2 className="section-title">Character Sheet</h2>
            <form onSubmit={handleSubmit} className="rpg-form">

                <div className="form-group">
                    <label className="form-label">
                        <User size={14} /> Gender
                    </label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="rpg-input"
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Droid">Droid</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <Calendar size={14} /> Birthday
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={formatDateForDisplay(formData.birthday)}
                            readOnly
                            className="rpg-input"
                            placeholder="dd.MM.yyyy"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        <input
                            type="date"
                            name="birthday"
                            value={formData.birthday}
                            onChange={handleChange}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                </div>



                <div className="form-group">
                    <label className="form-label">
                        <Baby size={14} /> Minions (Children)
                    </label>
                    <input
                        type="number"
                        name="children"
                        value={formData.children}
                        onChange={handleChange}
                        className="rpg-input"
                        placeholder="Count"
                    />
                </div>

                <div className="form-group full-width">
                    <label className="form-label">
                        <Gamepad2 size={14} /> Hobby / Side Quest
                    </label>
                    <input
                        type="text"
                        name="hobby"
                        value={formData.hobby}
                        onChange={handleChange}
                        className="rpg-input"
                        placeholder="e.g. Beekeeping, Coding"
                    />
                </div>

                <button type="submit" className="save-btn">
                    <Save size={18} /> Save Changes
                </button>
            </form>
        </div>
    );
};

export default EditProfile;
