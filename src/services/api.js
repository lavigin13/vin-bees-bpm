import { MOCK_SUBORDINATE_DATA, MOCK_PERSONAL_SALARY, MOCK_TEAM_SALARY } from '../data/mockData';
import { isTelegram, getApiBaseUrl } from './env';

const API_BASE_URL = getApiBaseUrl();

export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
        this.status = 401;
    }
}

export class BlockedError extends Error {
    constructor(message = 'Operation blocked') {
        super(message);
        this.name = 'BlockedError';
    }
}

const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (isTelegram()) {
        headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
    } else {
        const token = localStorage.getItem('authToken') || '';
        if (token) {
            headers['Authorization'] = `Basic ${token}`;
        }
    }

    return headers;
};

/**
 * Centralised wrapper around fetch:
 * - follows redirects and warns when origin changes (browsers may drop the
 *   Authorization header on cross-origin redirects)
 * - on HTTP 401: clears the saved Basic-Auth token, broadcasts an
 *   `auth:unauthorized` event so App.jsx can return the user to AuthPage,
 *   and throws UnauthorizedError. The event fires even if a caller swallows
 *   the exception in a try/catch.
 */
const apiFetch = async (url, options = {}) => {
    const response = await fetch(url, { redirect: 'follow', ...options });
    if (response.url && response.url !== url) {
        console.warn(`[API] Redirected: ${url} → ${response.url}. Authorization header may have been dropped by the browser.`);
    }
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { url } }));
        }
        throw new UnauthorizedError('Authentication failed (401)');
    }
    return response;
};

export const loginUser = async (username, password) => {
    // Basic Auth: base64(username:password). encodeURIComponent handles UTF-8 (Cyrillic) before btoa.
    const credentials = `${username}:${password}`;
    const token = btoa(unescape(encodeURIComponent(credentials)));

    localStorage.setItem('authToken', token);
    return true;
};

// ... existing functions ...

export const fetchProfile = async () => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/profile`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (e) { return null; }
};

export const fetchInventory = async () => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/inventory`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (e) { return null; }
};

export const updateProfile = async (profileData) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/profile`, {
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

        const response = await apiFetch(`${API_BASE_URL}/inventory/audit`, {
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
        const response = await apiFetch(`${API_BASE_URL}/wallet/transfer`, {
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
        const response = await apiFetch(`${API_BASE_URL}/inventory/transfer`, {
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
        const response = await apiFetch(`${API_BASE_URL}/inventory/transfer`, {
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
        const response = await apiFetch(`${API_BASE_URL}/inventory/transfer/respond`, {
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
        const response = await apiFetch(`${API_BASE_URL}/colleagues`, { method: 'GET', headers: getHeaders() });
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
        const response = await apiFetch(`${API_BASE_URL}/marketplace`, {
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
        const response = await apiFetch(`${API_BASE_URL}/marketplace/buy`, {
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
        const response = await apiFetch(`${API_BASE_URL}/marketplace/sell`, {
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
        const response = await apiFetch(`${API_BASE_URL}/trips`, { method: 'GET', headers: headers });
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
        const response = await apiFetch(`${API_BASE_URL}/trips`, {
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
        const response = await apiFetch(`${API_BASE_URL}/trips/submit`, {
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
        const response = await apiFetch(`${API_BASE_URL}/requests?view=${view}`, { method: 'GET', headers: headers });
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

export const fetchRequestCategories = async () => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/requests/categories`, { method: 'GET', headers: headers });
        if (!response.ok) {
            console.warn('Request categories API not ready');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch request categories:', error);
        return null;
    }
};

export const createOrUpdateRequest = async (requestData) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/requests`, {
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
        const response = await apiFetch(`${API_BASE_URL}/requests/submit`, {
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
        const response = await apiFetch(`${API_BASE_URL}/requests/respond`, {
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
        const response = await apiFetch(`${API_BASE_URL}/timesheet?month=${monthStr}`, { method: 'GET', headers: headers });
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
        const response = await apiFetch(`${API_BASE_URL}/timesheet/day`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ date: dateStr, ...reportData })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        if (data && data.blocked) {
            throw new BlockedError(data.message || 'Операцію заблоковано');
        }
        return data;
    } catch (error) {
        if (error instanceof BlockedError) throw error;
        console.error('Save daily report failed:', error);
        throw error;
    }
};

export const deleteTimesheetReport = async (dateStr) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/timesheet/delete`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ date: dateStr })
        });
        if (!response.ok) {
            let errorMsg = `API Error: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.message) errorMsg = errorData.message;
            } catch (e) {
                // Ignore parse error
            }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        if (data && data.blocked) {
            throw new BlockedError(data.message || 'Операцію заблоковано');
        }
        return data;
    } catch (error) {
        if (error instanceof BlockedError) throw error;
        console.error('Delete daily report failed:', error);
        throw error;
    }
};

export const fetchSubordinateTimesheets = async (monthStr) => {
    // monthStr: YYYY-MM
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/timesheet/subordinates?month=${monthStr}`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            console.warn('Subordinate timesheet API not ready, using mock');
            // Mock delay
            await new Promise(resolve => setTimeout(resolve, 800));
            return MOCK_SUBORDINATE_DATA;
        }
        return await response.json();
    } catch (error) {
        console.warn('Failed to fetch subordinate timesheets (network error), using mock');
        await new Promise(resolve => setTimeout(resolve, 800));
        return MOCK_SUBORDINATE_DATA;
    }
};

export const approveTimesheetReports = async (reports) => {
    // reports: [{employeeId, date}, ...]
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/timesheet/approve`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ reports })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Approve timesheet failed (network error), using mock success');

        // Update mock data
        reports.forEach(({ employeeId, date }) => {
            if (MOCK_SUBORDINATE_DATA[employeeId] && MOCK_SUBORDINATE_DATA[employeeId].reports[date]) {
                MOCK_SUBORDINATE_DATA[employeeId].reports[date].status = 'approved';
            }
        });

        await new Promise(resolve => setTimeout(resolve, 600));
        return { success: true, approved: reports.length };
    }
};

export const rejectTimesheetReports = async (reports, reason = null) => {
    // reports: [{employeeId, date}, ...]
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/timesheet/reject`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ reports, reason })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Reject timesheet failed (network error), using mock success');

        // Update mock data
        reports.forEach(({ employeeId, date }) => {
            if (MOCK_SUBORDINATE_DATA[employeeId] && MOCK_SUBORDINATE_DATA[employeeId].reports[date]) {
                MOCK_SUBORDINATE_DATA[employeeId].reports[date].status = 'rejected';
            }
        });

        await new Promise(resolve => setTimeout(resolve, 600));
        return { success: true, rejected: reports.length };
    }
};


// --- Salary Report ---

export const fetchSalaryReport = async (month, year, view = 'personal') => {
    const headers = getHeaders();

    const mockData = view === 'personal' ? MOCK_PERSONAL_SALARY : MOCK_TEAM_SALARY;

    try {
        const response = await apiFetch(`${API_BASE_URL}/reports/salary?month=${month}&year=${year}&view=${view}`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            console.warn('Salary report API not ready, using mock');

            // Artificial delay to simulate network request
            await new Promise(resolve => setTimeout(resolve, 800));

            return mockData;
        }
        const data = await response.json();
        if (!data || !data.columns || !data.groups) {
            console.warn('Salary report API returned incomplete data, using mock');
            return mockData;
        }
        return data;
    } catch (error) {
        console.warn('Failed to fetch salary report (network error or invalid JSON), using mock');
        await new Promise(resolve => setTimeout(resolve, 800));
        return mockData;
    }
};

export const sendSalaryQuestion = async (questionData) => {
    // questionData: { question, month, year }
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/reports/salary/question`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(questionData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Failed to send question (network error), using mock');
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'Question sent (mock)' };
    }
};

// --- Warehouse Inventory ---

export const getInventoryDocuments = async () => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/inventory/documents`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch inventory documents:', error);
        throw error;
    }
};

export const getProductByBarcode = async (barcode) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/inventory/product?barcode=${barcode}`, {
            method: 'GET',
            headers: headers
        });

        if (response.status === 404) {
            return null; // Item not found
        }

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get product failed:', error);
        throw error;
    }
};

export const saveWarehouseInventory = async (inventoryData) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/inventory/warehouse-audit`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(inventoryData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Save inventory failed:', error);
        throw error;
    }
};

// --- Warehouse Operations ---

export const fetchWarehouses = async () => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/warehouses`, { method: 'GET', headers });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch warehouses:', error);
        return [];
    }
};

export const fetchWarehouseOperations = async (month) => {
    // month: 'YYYY-MM'
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/WarehouseOperations/list?month=${month}`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch warehouse operations:', error);
        return [];
    }
};

export const fetchNomenclature = async (warehouseId) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(
            `${API_BASE_URL}/nomenclature?warehouses=${warehouseId}`,
            { method: 'GET', headers }
        );
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch nomenclature:', error);
        return [];
    }
};

export const fetchNomenclatureSpec = async (warehouseId) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(
            `${API_BASE_URL}/nomenclature/specification?warehouses=${warehouseId}`,
            { method: 'GET', headers }
        );
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch nomenclature specification:', error);
        return [];
    }
};

export const saveWarehouseOperation = async (operationData) => {
    // operationData: { id: '', Warehouse: '', Operation: '', products: [{ id: '', count: 1 }] }
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/WarehouseOperations/update`, {
            method: 'POST',
            headers,
            body: JSON.stringify(operationData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to save warehouse operation:', error);
        throw error;
    }
};

