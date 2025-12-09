// ... existing imports ...
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

// ... existing functions ...

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
        // Ensure status is explicitly converted to string if it's not already
        let statusStr = status;
        if (typeof status === 'boolean') {
             statusStr = status ? 'present' : 'missing';
        }

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

export const fetchPendingTransfers = async () => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/transfer`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            console.warn('Pending transfers API not ready');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch pending transfers:', error);
        return null;
    }
};

export const respondToTransfer = async (transferId, action) => {
    // action: 'accept' or 'reject'
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/transfer/respond`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ transferId, action })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Transfer response (${action}) failed:`, error);
        throw error;
    }
};

export const fetchColleagues = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/colleagues`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) {
            console.warn('Colleagues API not ready, using mock');
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error('Failed to fetch colleagues:', e);
        return null; 
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

// --- Business Trips ---

export const fetchTrips = async () => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/trips`, { method: 'GET', headers: headers });
        if (!response.ok) {
            console.warn('Trips API not ready');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch trips:', error);
        return null;
    }
};

export const createOrUpdateTrip = async (tripData) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/trips`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(tripData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Save trip failed:', error);
        throw error;
    }
};

export const submitTrip = async (tripId) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/trips/submit`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ tripId })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Submit trip failed:', error);
        throw error;
    }
};

// --- Requests ---

export const fetchRequests = async (view = 'my') => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/requests?view=${view}`, { method: 'GET', headers: headers });
        if (!response.ok) {
            console.warn('Requests API not ready');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch requests:', error);
        return null;
    }
};

export const createOrUpdateRequest = async (requestData) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/requests`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Save request failed:', error);
        throw error;
    }
};

export const submitRequest = async (requestId) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/requests/submit`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ requestId })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Submit request failed:', error);
        throw error;
    }
};

export const respondToRequest = async (requestId, action) => {
    // action: 'approve' or 'reject'
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/requests/respond`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ requestId, action })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Request response (${action}) failed:`, error);
        throw error;
    }
};

// --- Timesheet ---

export const fetchTimesheet = async (monthStr) => {
    // monthStr: YYYY-MM
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/timesheet?month=${monthStr}`, { method: 'GET', headers: headers });
        if (!response.ok) {
            console.warn('Timesheet API not ready');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch timesheet:', error);
        return null;
    }
};

export const saveDailyReport = async (dateStr, reportData) => {
    const headers = getHeaders();
    try {
        const response = await fetch(`${API_BASE_URL}/timesheet/day`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ date: dateStr, ...reportData })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Save daily report failed:', error);
        throw error;
    }
};
