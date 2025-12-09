import { getTelegramWebApp } from '../utils/telegram';
import { COLLEAGUES } from '../data/mockData';

const API_BASE_URL = 'https://bpm.bees.vin/VinBeesTelegram/hs/API';

const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/json'
    };

    const tg = getTelegramWebApp();
    const initData = tg ? tg.initData : '';
    headers['Authorization'] = `tma ${initData}`;
    return headers;
};

export const fetchProfile = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (e) { return null; }
};

export const fetchInventory = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (e) { return null; }
};

export const updateProfile = async (profileData) => {
    // ... existing updateProfile logic ...
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(profileData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
    }
};

export const sendAuditResult = async (itemId, status) => {
    // status: boolean (true=present, false=missing) or string ('present'/'missing')
    const headers = getHeaders();
    try {
        const statusStr = typeof status === 'boolean' ? (status ? 'present' : 'missing') : status;
        
        const response = await fetch(`${API_BASE_URL}/inventory/audit`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ itemId, status: statusStr })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Audit failed:', error);
        return null;
    }
};

export const transferHoney = async (recipientId, amount) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/wallet/transfer`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ recipientId, amount })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Transfer failed:', error);
        throw error;
    }
};

// --- Inventory Transfer ---

export const transferItem = async (recipientId, itemId, quantity) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/transfer`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ recipientId, itemId, quantity })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Item transfer failed:', error);
        throw error;
    }
};

// --- Marketplace ---

export const getMarketplaceItems = async () => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/marketplace`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            // Fallback for now if endpoint doesn't exist
            console.warn('Marketplace API not ready, using mock');
            return null; 
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch marketplace:', error);
        return null;
    }
};

export const buyItem = async (listingId) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/marketplace/buy`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ listingId })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Buy failed:', error);
        throw error;
    }
};

export const createListing = async (itemData) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/marketplace/sell`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(itemData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Listing failed:', error);
        throw error;
    }
};
