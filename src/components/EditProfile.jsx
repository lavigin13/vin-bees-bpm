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
            <h2 className="section-title">Лист Персонажа</h2>
            <form onSubmit={handleSubmit} className="rpg-form">
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">
                            <User size={14} /> Стать
                        </label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="rpg-input"
                        >
                            <option value="">Оберіть стать</option>
                            <option value="Male">Чоловіча</option>
                            <option value="Female">Жіноча</option>
                            <option value="Non-binary">Небінарна</option>
                            <option value="Droid">Дроїд</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Calendar size={14} /> Дата народження
                        </label>
                        <input
                            type="date"
                            name="birthday"
                            value={formData.birthday || ''}
                            onChange={handleChange}
                            className="rpg-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Baby size={14} /> Міньйони (Діти)
                        </label>
                        <input
                            type="number"
                            name="children"
                            value={formData.children}
                            onChange={handleChange}
                            className="rpg-input"
                            placeholder="Кількість"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Gamepad2 size={14} /> Хобі / Сайд-квест
                        </label>
                        <input
                            type="text"
                            name="hobby"
                            value={formData.hobby}
                            onChange={handleChange}
                            className="rpg-input"
                            placeholder="напр. Бджільництво, Кодинг"
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="save-btn">
                        <Save size={18} /> Зберегти зміни
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProfile;