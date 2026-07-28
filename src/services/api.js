import { getApiBaseUrl } from './env';

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

    const token = localStorage.getItem('authToken') || '';
    if (token) {
        headers['Authorization'] = `Basic ${token}`;
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
    // response.url is always absolute — resolve the requested URL the same way,
    // otherwise relative paths would be flagged as "redirects" on every call.
    const requestedUrl = new URL(url, window.location.href).href;
    if (response.url && response.url !== requestedUrl) {
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
    
    // Verify credentials immediately
    await apiFetch(`${API_BASE_URL}/profile`, { method: 'GET', headers: getHeaders() });
    
    return true;
};

export const fetchProfile = async () => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/profile`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch { return null; }
};

export const fetchInventory = async () => {
    try {
        const response = await apiFetch(`${API_BASE_URL}/inventory`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch { return null; }
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
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
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
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
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
            } catch {
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
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch subordinate timesheets:', error);
        return null;
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
        console.error('Approve timesheet failed:', error);
        throw error;
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
        console.error('Reject timesheet failed:', error);
        throw error;
    }
};


// --- Salary Report ---

export const fetchSalaryReport = async (month, year, view = 'personal') => {
    const headers = getHeaders();

    try {
        const response = await apiFetch(`${API_BASE_URL}/reports/salary?month=${month}&year=${year}&view=${view}`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        if (!data || !data.columns || !data.groups) {
            throw new Error('Salary report API returned incomplete data');
        }
        return data;
    } catch (error) {
        console.error('Failed to fetch salary report:', error);
        return null;
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
        console.error('Failed to send question:', error);
        throw error;
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

// --- Supplier Orders Receiving (Прийом замовлень постачальнику на складі) ---
//
// ⚠️ Backend contracts below are ASSUMED — adjust endpoints/shapes once the
// real 1C/BPM API is available. To preview the UI before the backend exists,
// run in the browser console:  localStorage.setItem('mockSupplierOrders', '1')
//
// Expected list response shape (GET /SupplierOrders):
//   {
//     statuses: [{ Id, Name, Color?, Selectable? }], // available statuses for the workflow;
//                                                    // Selectable: true marks statuses the user may
//                                                    // pick when saving a receiving (omit everywhere = all allowed)
//     orders: [{
//       Id, Number, Date,
//       Supplier:  { Id, Name },
//       Warehouse: { Id, Name },
//       Status:    { Id, Name, Color? },
//       Sum, Currency,
//       NoDocuments: boolean,
//       Files:    [{ Id, Name, Type, Size }],
//       Products: [{ Id, Name, Unit, Count, Price, Sum }]
//     }]
//   }

// Demo mode: until the real backend endpoints exist, fall back to mock data so
// the UI is fully usable. Force-disable once the backend is ready by running:
//   localStorage.setItem('mockSupplierOrders', '0')
const SUPPLIER_ORDERS_MOCK_DEFAULT = true;
const supplierOrdersMockEnabled = () => {
    if (typeof window === 'undefined') return SUPPLIER_ORDERS_MOCK_DEFAULT;
    const flag = localStorage.getItem('mockSupplierOrders');
    if (flag === '1') return true;
    if (flag === '0') return false;
    return SUPPLIER_ORDERS_MOCK_DEFAULT;
};

const SUPPLIER_ORDER_STATUSES = [
    // Selectable — статуси, які комірник може обрати при збереженні прийому
    { Id: 'new',         Name: 'Новий',         Color: '#60a5fa', Selectable: false },
    { Id: 'inroute',     Name: 'В дорозі',      Color: '#fbbf24', Selectable: false },
    { Id: 'partial',     Name: 'Частково прийнято', Color: '#a78bfa', Selectable: true },
    { Id: 'received',    Name: 'Прийнято',      Color: '#34d399', Selectable: true },
    { Id: 'discrepancy', Name: 'Розбіжності',   Color: '#f87171', Selectable: true },
];

const MOCK_SUPPLIER_ORDERS = () => ({
    statuses: SUPPLIER_ORDER_STATUSES,
    orders: [
        {
            Id: 'ord-1001', Number: 'ЗП-0001', Date: '2026-06-05',
            Supplier: { Id: 's1', Name: 'ТОВ "Бджолопостач"' },
            Warehouse: { Id: 'w1', Name: 'Основний склад' },
            Status: { Id: 'inroute', Name: 'В дорозі', Color: '#fbbf24' },
            Sum: 15400, Currency: 'грн', NoDocuments: false, Files: [],
            Products: [
                { Id: 'p1', Name: 'Цукор білий кристалічний', Unit: 'кг', Count: 500, Price: 22, Sum: 11000 },
                { Id: 'p2', Name: 'Вощина натуральна', Unit: 'кг', Count: 40, Price: 110, Sum: 4400 },
            ],
        },
        {
            Id: 'ord-1002', Number: 'ЗП-0002', Date: '2026-06-07',
            Supplier: { Id: 's2', Name: 'ФОП Іваненко О.П.' },
            Warehouse: { Id: 'w2', Name: 'Склад тари' },
            Status: { Id: 'new', Name: 'Новий', Color: '#60a5fa' },
            Sum: 3600, Currency: 'грн', NoDocuments: false, Files: [],
            Products: [
                { Id: 'p3', Name: 'Банка скляна 0.5 л', Unit: 'шт', Count: 1200, Price: 3, Sum: 3600 },
                { Id: 'p4', Name: 'Кришка твіст-офф 66 мм', Unit: 'шт', Count: 1200, Price: 1.5, Sum: 1800 },
            ],
        },
        {
            Id: 'ord-1003', Number: 'ЗП-0003', Date: '2026-06-08',
            Supplier: { Id: 's3', Name: 'ТОВ "Пакувальні рішення"' },
            Warehouse: { Id: 'w1', Name: 'Основний склад' },
            Status: { Id: 'inroute', Name: 'В дорозі', Color: '#fbbf24' },
            Sum: 8250, Currency: 'грн', NoDocuments: false,
            Files: [{ Id: 'f1', Name: 'Накладна_ЗП-0003.pdf', Type: 'application/pdf', Size: 184320 }],
            Products: [
                { Id: 'p5', Name: 'Етикетка самоклейна (рулон)', Unit: 'рул', Count: 50, Price: 95, Sum: 4750 },
                { Id: 'p6', Name: 'Коробка картонна 4 банки', Unit: 'шт', Count: 350, Price: 10, Sum: 3500 },
            ],
        },
        {
            Id: 'ord-1004', Number: 'ЗП-0004', Date: '2026-06-09',
            Supplier: { Id: 's1', Name: 'ТОВ "Бджолопостач"' },
            Warehouse: { Id: 'w3', Name: 'Склад сировини' },
            Status: { Id: 'partial', Name: 'Частково прийнято', Color: '#a78bfa' },
            Sum: 27600, Currency: 'грн', NoDocuments: false,
            Files: [{ Id: 'f2', Name: 'Видаткова.jpg', Type: 'image/jpeg', Size: 532480 }],
            Products: [
                { Id: 'p7', Name: 'Мед натуральний квітковий', Unit: 'кг', Count: 300, Price: 80, Sum: 24000 },
                { Id: 'p8', Name: 'Прополіс', Unit: 'кг', Count: 12, Price: 300, Sum: 3600 },
            ],
        },
        {
            Id: 'ord-1005', Number: 'ЗП-0005', Date: '2026-06-09',
            Supplier: { Id: 's4', Name: 'ТОВ "АгроХімПостач"' },
            Warehouse: { Id: 'w3', Name: 'Склад сировини' },
            Status: { Id: 'new', Name: 'Новий', Color: '#60a5fa' },
            Sum: 5100, Currency: 'грн', NoDocuments: false, Files: [],
            Products: [
                { Id: 'p9', Name: 'Лимонна кислота', Unit: 'кг', Count: 60, Price: 85, Sum: 5100 },
            ],
        },
    ],
});

export const fetchSupplierOrders = async () => {
    const headers = getHeaders();
    const useMock = supplierOrdersMockEnabled();
    try {
        const response = await apiFetch(`${API_BASE_URL}/SupplierOrders`, { method: 'GET', headers });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        // Normalise: backend may return an array of orders OR { orders, statuses }
        if (Array.isArray(data)) return { orders: data, statuses: [] };
        return { orders: data.orders || [], statuses: data.statuses || [] };
    } catch (error) {
        if (useMock) {
            console.warn('[SupplierOrders] Using mock data (backend unavailable)');
            return MOCK_SUPPLIER_ORDERS();
        }
        console.error('Failed to fetch supplier orders:', error);
        return { orders: [], statuses: [] };
    }
};

export const saveSupplierOrderReceiving = async (payload) => {
    // payload: {
    //   id,                                          // order id
    //   status,                                      // selected status id
    //   noDocuments,                                 // boolean — "документів немає"
    //   files: [{ name, type, size, data }],         // data = base64 (without data: prefix)
    //   products: [{ id, count, received }]          // ordered + actually received qty
    // }
    const headers = getHeaders();
    const useMock = supplierOrdersMockEnabled();
    try {
        const response = await apiFetch(`${API_BASE_URL}/SupplierOrders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        if (useMock) {
            console.warn('[SupplierOrders] Mock save (backend unavailable):', payload);
            return { success: true };
        }
        console.error('Failed to save supplier order receiving:', error);
        throw error;
    }
};

// --- Remaining Items Report ---

export const fetchRemainingItems = async (filters = {}) => {
    // filters: { warehouses: [guid], folders: [guid], categories: [guid] }
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/RemainingItems`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                warehouses: filters.warehouses || [],
                folders: filters.folders || [],
                categories: filters.categories || []
            })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch remaining items:', error);
        throw error;
    }
};

// --- Games (Bee Invaders) ---

export const fetchBeeInvadersLeaderboard = async () => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/games/bee-invaders/leaderboard`, { method: 'GET', headers });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return [];
    }
};

export const saveBeeInvadersScore = async (scoreData) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/games/bee-invaders/score`, {
            method: 'POST',
            headers,
            body: JSON.stringify(scoreData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to save score:', error);
        return null;
    }
};

// --- Games (Drone Flight / Політ БПЛА) ---

export const fetchDroneFlightLeaderboard = async () => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/games/drone-flight/leaderboard`, { method: 'GET', headers });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return [];
    }
};

export const saveDroneFlightScore = async (scoreData) => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/games/drone-flight/score`, {
            method: 'POST',
            headers,
            body: JSON.stringify(scoreData)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        // The endpoint may return 200 with an empty body — tolerate that.
        const text = await response.text();
        return text ? JSON.parse(text) : { success: true };
    } catch (error) {
        console.error('Failed to save score:', error);
        return null;
    }
};

// --- Internal Orders Issuing (Внутрішні замовлення / заявки) ---

const INTERNAL_ORDER_STATUSES = [
    { Id: 'new',         Name: 'Нова',          Color: '#60a5fa' },
    { Id: 'inprogress',  Name: 'В процесі',     Color: '#fbbf24' },
    { Id: 'issued',      Name: 'Видана',        Color: '#34d399' },
    { Id: 'rejected',    Name: 'Відхилена',     Color: '#f87171' },
];

const MOCK_INTERNAL_ORDERS = () => ({
    statuses: INTERNAL_ORDER_STATUSES,
    orders: [
        {
            Id: 'int-1001', Number: 'ВЗ-0001', Date: '2026-06-08',
            Requester: { Id: 'emp1', Name: 'Петренко І.В.' },
            Warehouse: { Id: 'w1', Name: 'Основний склад' },
            Status: { Id: 'new', Name: 'Нова', Color: '#60a5fa' },
            ManagerApproved: true,
            Products: [
                { Id: 'p3', Name: 'Банка скляна 0.5 л', Unit: 'шт', CountRequested: 100, CountIssued: 0 },
            ],
        },
        {
            Id: 'int-1002', Number: 'ВЗ-0002', Date: '2026-06-09',
            Requester: { Id: 'emp2', Name: 'Коваленко М.О.' },
            Warehouse: { Id: 'w3', Name: 'Склад сировини' },
            Status: { Id: 'new', Name: 'Нова', Color: '#60a5fa' },
            ManagerApproved: false,
            Products: [
                { Id: 'p7', Name: 'Мед натуральний квітковий', Unit: 'кг', CountRequested: 20, CountIssued: 0 },
            ],
        },
    ]
});

export const fetchInternalOrders = async () => {
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/InternalOrders`, { method: 'GET', headers });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        return { orders: data.orders || [], statuses: data.statuses || [] };
    } catch {
        console.warn('[InternalOrders] Using mock data (backend unavailable)');
        return MOCK_INTERNAL_ORDERS();
    }
};

export const saveInternalOrderIssuing = async (payload) => {
    // payload: { id, status, products: [{ id, requested, issued }] }
    const headers = getHeaders();
    try {
        const response = await apiFetch(`${API_BASE_URL}/InternalOrders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch {
        console.warn('[InternalOrders] Mock save (backend unavailable):', payload);
        return { success: true };
    }
};

// --- Shipment Documents (Відправка зі складу) ---
//
// ⚠️ Backend contracts below are ASSUMED — adjust endpoints/shapes once the
// real 1C/BPM API is available. To preview the UI before the backend exists,
// run in the browser console:  localStorage.setItem('mockShipmentDocuments', '1')
//
// Expected list response shape (GET /ShipmentDocuments?month=YYYY-MM):
//   {
//     documents: [{
//       Id, Date,
//       status: 'posted' | 'draft',
//       departmentName, destination, workflow,
//       lines: [{ skuId, skuName, quantity }]
//     }]
//   }

const SHIPMENT_DOCUMENTS_MOCK_DEFAULT = true;
const shipmentDocumentsMockEnabled = () => {
    if (typeof window === 'undefined') return SHIPMENT_DOCUMENTS_MOCK_DEFAULT;
    const flag = localStorage.getItem('mockShipmentDocuments');
    if (flag === '1') return true;
    if (flag === '0') return false;
    return SHIPMENT_DOCUMENTS_MOCK_DEFAULT;
};

// Mock documents are generated inside the requested month so the period
// filter is testable without a backend.
const MOCK_SHIPMENT_DOCUMENTS = (monthStr) => ({
    documents: [
        {
            Id: `ship-${monthStr}-001`, Date: `${monthStr}-03`,
            status: 'posted',
            departmentName: 'Цех фасування',
            destination: 'НП №12, м. Вінниця',
            workflow: 'Відправка клієнту',
            lines: [
                { skuId: 'sku1', skuName: 'Мед акацієвий 0.5 л', quantity: 24 },
                { skuId: 'sku2', skuName: 'Мед гречаний 1 л', quantity: 12 },
            ],
        },
        {
            Id: `ship-${monthStr}-002`, Date: `${monthStr}-11`,
            status: 'posted',
            departmentName: 'Основний склад',
            destination: 'Філія Київ, вул. Медова 8',
            workflow: 'Внутрішнє переміщення',
            lines: [
                { skuId: 'sku3', skuName: 'Вощина натуральна', quantity: 40 },
                { skuId: 'sku4', skuName: 'Рамка вулика 470х300', quantity: 200 },
                { skuId: 'sku5', skuName: 'Димар пасічний', quantity: 5 },
            ],
        },
        {
            Id: `ship-${monthStr}-003`, Date: `${monthStr}-18`,
            status: 'draft',
            departmentName: 'Склад готової продукції',
            destination: 'ТОВ "Медова крамниця", м. Львів',
            workflow: 'Відправка клієнту',
            lines: [
                { skuId: 'sku6', skuName: 'Подарунковий набір "Пасіка"', quantity: 30 },
            ],
        },
    ],
});

export const fetchShipmentDocuments = async (monthStr) => {
    // monthStr: YYYY-MM — period (month) filter applied by the backend
    const headers = getHeaders();
    const useMock = shipmentDocumentsMockEnabled();
    try {
        const response = await apiFetch(`${API_BASE_URL}/ShipmentDocuments?month=${monthStr}`, { method: 'GET', headers });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        // Normalise: backend may return an array of documents OR { documents }
        if (Array.isArray(data)) return { documents: data };
        return { documents: data.documents || [] };
    } catch (error) {
        if (useMock) {
            console.warn('[ShipmentDocuments] Using mock data (backend unavailable)');
            return MOCK_SHIPMENT_DOCUMENTS(monthStr);
        }
        console.error('Failed to fetch shipment documents:', error);
        return { documents: [] };
    }
};

// --- Individual Expense Reports (Звіт по витратам) ---
//
// GET  /IndividualExpenseReports?StartDate=DD.MM.YYYY&EndDate=DD.MM.YYYY
//   → [{ UUID, Date, DeletionMark, Posted, Amount, Description, Article, File }]
//     File — base64 вкладення ('' якщо немає)
//
// ⚠️ POST contract is ASSUMED — adjust once confirmed by the 1C side:
//   POST /IndividualExpenseReports
//   { Article, Description, Amount, File: { name, type, size, data } | null }
//   data = base64 without the "data:" prefix

export const fetchIndividualExpenseReports = async (startDate, endDate) => {
    // startDate / endDate: 'DD.MM.YYYY'
    const headers = getHeaders();
    try {
        const response = await apiFetch(
            `${API_BASE_URL}/IndividualExpenseReports?StartDate=${startDate}&EndDate=${endDate}`,
            { method: 'GET', headers }
        );
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : (data.reports || []);
    } catch (error) {
        if (error instanceof UnauthorizedError) throw error;
        console.error('Failed to fetch expense reports:', error);
        return [];
    }
};

export const createIndividualExpenseReport = async (payload) => {
    // payload: { Article, Description, Amount, File: { name, type, size, data } | null }
    const headers = getHeaders();
    const response = await apiFetch(`${API_BASE_URL}/IndividualExpenseReports`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    try {
        return await response.json();
    } catch {
        // 1C may reply with an empty body on success
        return { success: true };
    }
};

export const markShipmentDocumentSent = async (payload) => {
    // payload: {
    //   id,                                  // document id
    //   files: [{ name, type, size, data }]  // data = base64 (without data: prefix)
    // }
    const headers = getHeaders();
    const useMock = shipmentDocumentsMockEnabled();
    try {
        const response = await apiFetch(`${API_BASE_URL}/ShipmentDocuments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        if (useMock) {
            console.warn('[ShipmentDocuments] Mock send (backend unavailable):', payload);
            return { success: true };
        }
        console.error('Failed to mark shipment as sent:', error);
        throw error;
    }
};
