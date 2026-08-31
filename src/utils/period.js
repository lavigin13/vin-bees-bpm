// Date-period helpers shared by list screens that fetch data for a bounded
// period (requests, reports). UI state keeps ISO 'YYYY-MM-DD' (input[type=date]),
// the 1C API expects 'DD.MM.YYYY'.

export const toIsoDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// 'YYYY-MM-DD' → 'DD.MM.YYYY' ('' when the input is incomplete)
export const isoToApiDate = (isoDate) => {
    const [y, m, d] = (isoDate || '').split('-');
    return y && m && d ? `${d}.${m}.${y}` : '';
};

// Default list period: the current calendar month.
export const currentMonthPeriod = () => {
    const now = new Date();
    return {
        startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
};
