import { useState, useEffect } from 'react';
import HeroProfile from './components/HeroProfile';
import EquipmentModal from './components/EquipmentModal';
import EditProfileModal from './components/EditProfileModal';
import TransferModal from './components/TransferModal';
import InboxModal from './components/InboxModal';
import ShopModal from './components/ShopModal';
import CreateListingModal from './components/CreateListingModal';
import SendHoneyModal from './components/SendHoneyModal';
import OrgChartModal from './components/OrgChartModal';
import TimesheetModal from './components/TimesheetModal';
import ExpenseReportsModal from './components/ExpenseReportsModal';
import TimesheetApprovalModal from './components/TimesheetApprovalModal';
import RequestsModal from './components/RequestsModal';
import RewardReportModal from './components/RewardReportModal';
import WarehouseInventoryModal from './components/WarehouseInventoryModal';
import WarehouseOperationsModal from './components/WarehouseOperationsModal';
import RemainingItemsModal from './components/RemainingItemsModal';
import AuthPage from './components/AuthPage';
import GamesModal from './components/GamesModal';

import {
  fetchProfile, fetchInventory, updateProfile, sendAuditResult, transferHoney,
  transferItem, getMarketplaceItems, buyItem, createListing, fetchPendingTransfers,
  respondToTransfer, fetchColleagues, respondToRequest,
  saveWarehouseInventory, fetchRequests, createOrUpdateRequest, submitRequest
} from './services/api';

import './index.css';

// Fetch "my" and "subordinates" requests in parallel and merge them into one
// list deduplicated by id.
const loadAllRequests = async () => {
  const [myRequests, subRequests] = await Promise.all([
    fetchRequests('my'),
    fetchRequests('subordinates')
  ]);
  const allRequests = [
    ...(Array.isArray(myRequests) ? myRequests : []),
    ...(Array.isArray(subRequests) ? subRequests : [])
  ];
  return Array.from(new Map(allRequests.map(item => [item.id, item])).values());
};

const App = () => {
  // Check for saved Basic Auth token
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('authToken')
  );
  const [authNotice, setAuthNotice] = useState('');

  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [colleagues, setColleagues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [itemToTransfer, setItemToTransfer] = useState(null);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [incomingTransfers, setIncomingTransfers] = useState([]);

  // Marketplace State
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [marketplaceItems, setMarketplaceItems] = useState([]);

  // Honey Transfer State
  const [isSendHoneyOpen, setIsSendHoneyOpen] = useState(false);

  // Org Chart State
  const [isOrgChartOpen, setIsOrgChartOpen] = useState(false);

  // Profile Settings State
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Timesheet State
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [isExpenseReportsOpen, setIsExpenseReportsOpen] = useState(false);

  // Requests State
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [initialRequestsFilter, setInitialRequestsFilter] = useState('my');

  // Warehouse Inventory State
  const [isWarehouseInventoryOpen, setIsWarehouseInventoryOpen] = useState(false);

  // Warehouse Operations State
  const [isWarehouseOpsOpen, setIsWarehouseOpsOpen] = useState(false);

  // Stock Report State
  const [isStockReportOpen, setIsStockReportOpen] = useState(false);

  // Timesheet Approval State
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  // Reward Report State
  const [isRewardReportOpen, setIsRewardReportOpen] = useState(false);

  // Games State
  const [isGamesOpen, setIsGamesOpen] = useState(false);

  // Equipment (personal inventory) State
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false);

  // Helper to count pending requests (simulated for team members)
  const pendingRequestsCount = (requests || []).filter(r => {
    if (!r) return false;
    const isOwn = user ? (r.createdBy === user.id || r.createdBy === user.name) : r.createdBy === 999;
    return !isOwn && (r.status === 'new' || r.status === 'pending');
  }).length;

  // Global handler: any 401 from the API layer kicks the user back to AuthPage.
  // api.js already cleared the token and broadcast the event before throwing
  // UnauthorizedError, so individual catch blocks swallowing the error are fine.
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
      setAuthNotice('Сесія завершена або доступ заборонено. Увійдіть знову.');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Refresh requests when modal opens
  useEffect(() => {
    if (!isRequestsOpen) return;
    loadAllRequests()
      .then(uniqueRequests => {
        if (uniqueRequests.length > 0) {
          setRequests(uniqueRequests);
        }
      })
      .catch(e => console.error("Failed to refresh requests", e));
  }, [isRequestsOpen]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial data load: all sections are independent, so fetch them in
    // parallel — on slow mobile connections sequential requests add up fast.
    const loadData = async () => {
      setIsLoading(true);

      try {
        const [profileData, marketData, inventoryData, pendingTransfers, colleaguesData, uniqueRequests] =
          await Promise.all([
            fetchProfile().catch(e => { console.warn("Failed to fetch profile", e); return null; }),
            getMarketplaceItems().catch(e => { console.warn("Failed to load marketplace", e); return null; }),
            fetchInventory().catch(e => { console.warn("Failed to load inventory", e); return null; }),
            fetchPendingTransfers().catch(e => { console.warn("Failed to load pending transfers", e); return null; }),
            fetchColleagues().catch(e => { console.warn("Failed to load colleagues", e); return null; }),
            loadAllRequests().catch(e => { console.warn("Failed to load requests", e); return []; })
          ]);

        setMarketplaceItems(marketData || []);
        setInventory(inventoryData || []);
        setIncomingTransfers(pendingTransfers || []);
        if (colleaguesData) {
          setColleagues(colleaguesData);
        }
        setRequests(uniqueRequests);

        if (profileData) {
          // Normalize birthday to YYYY-MM-DD
          let normalizedBirthday = profileData.birthday;
          if (normalizedBirthday) {
            if (normalizedBirthday.includes('.')) {
              // Handle dd.MM.yyyy
              const [day, month, year] = normalizedBirthday.split('.');
              normalizedBirthday = `${year}-${month}-${day}`;
            } else if (normalizedBirthday.includes('T')) {
              // Handle ISO YYYY-MM-DDTHH:mm:ss
              normalizedBirthday = normalizedBirthday.split('T')[0];
            }
          }

          setUser(prev => ({
            ...prev,
            ...profileData,
            birthday: normalizedBirthday,
            children: typeof profileData.children !== 'undefined' ? Number(profileData.children) : (prev?.children || 0)
          }));
        }
      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // If not authenticated, render Auth Page
  if (!isAuthenticated) {
    return (
      <AuthPage
        notice={authNotice}
        onLoginSuccess={() => {
          setAuthNotice('');
          setIsAuthenticated(true);
        }}
      />
    );
  }

  if (isLoading) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Завантаження...</div>;
  }

  if (!user) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Не вдалося завантажити дані профілю.</div>;
  }

  const handleSaveProfile = async (updatedData) => {
    try {
      // Optimistic update (keep local state as YYYY-MM-DD for UI consistency)
      setUser(prev => ({ ...prev, ...updatedData }));

      // Prepare data for API (format birthday to dd.MM.yyyy)
      const apiData = { ...updatedData };
      if (apiData.birthday && apiData.birthday.includes('-')) {
        const [year, month, day] = apiData.birthday.split('-');
        apiData.birthday = `${day}.${month}.${year}`;
      }

      // Send to API
      await updateProfile(apiData);

      alert('Профіль успішно збережено! ✅');
    } catch (error) {
      console.error("Failed to save profile:", error);
      const errorMessage = error.message || 'Unknown error';
      alert(`Не вдалося зберегти профіль: ${errorMessage}`);
    }
  };

  // --- Transfer Logic ---

  const handleOpenTransfer = (item) => {
    setItemToTransfer(item);
    setIsTransferOpen(true);
  };

  const handleSendRequest = async (item, quantity, recipient) => {
    if (!recipient || !recipient.id) {
      console.error("Invalid recipient:", recipient);
      alert("Будь ласка, оберіть дійсного отримувача.");
      return;
    }

    // 1. Optimistic Update
    const prevInventory = inventory;
    const newInventory = inventory.map(invItem => {
      if (invItem.id === item.id) {
        return { ...invItem, quantity: invItem.quantity - quantity };
      }
      return invItem;
    }).filter(invItem => invItem.quantity > 0);

    setInventory(newInventory);

    // 2. API Call
    try {
      await transferItem(recipient.id, item.id, quantity);
    } catch (e) {
      console.error("Transfer failed", e);
      setInventory(prevInventory);
      alert("Передача не вдалася, спробуйте ще раз.");
      return;
    }

    // 3. Feedback
    const message = `Запит надіслано до ${recipient.name}!`;
    alert(message);
  };

  const handleAcceptTransfer = async (transfer) => {
    // 1. API Call
    try {
      await respondToTransfer(transfer.id, 'accept');
    } catch (e) {
      console.error("Accept transfer failed", e);
      alert("Не вдалося прийняти передачу.");
      return;
    }

    // 2. Add Item to Inventory (Optimistic)
    const existingItem = inventory.find(i => i.name === transfer.item.name);
    const newInventory = existingItem
      ? inventory.map(i => i === existingItem ? { ...i, quantity: i.quantity + transfer.quantity } : i)
      : [...inventory, { id: Date.now(), ...transfer.item, quantity: transfer.quantity }];
    setInventory(newInventory);

    // 3. Remove from Inbox
    setIncomingTransfers(prev => prev.filter(t => t.id !== transfer.id));

    // 4. Feedback
    console.log("Transfer accepted successfully.");
  };

  const handleRejectTransfer = async (transferId) => {
    // 1. API Call
    try {
      await respondToTransfer(transferId, 'reject');
    } catch (e) {
      console.error("Reject transfer failed", e);
      // Continue to remove locally even if API fails? Maybe safer to alert.
      alert("Не вдалося відхилити передачу.");
      return;
    }

    // 2. Remove from Inbox
    setIncomingTransfers(prev => prev.filter(t => t.id !== transferId));

    // 3. Feedback
    console.log("Transfer rejected.");
  };

  const handleValidateItem = async (item) => {
    // 1. Optimistic Update (UI responds immediately)
    const newInventory = inventory.map(i => {
      if (i.id === item.id) {
        const rest = { ...i };
        delete rest.auditRequired;
        return rest;
      }
      return i;
    });
    setInventory(newInventory);

    // 2. Send to Backend
    try {
      await sendAuditResult(item.id, true); // true = present
      console.log(`Audit confirmed for item ${item.id}`);
    } catch (e) {
      console.error("Failed to send audit result", e);
      // Optional: Revert UI state if critical
    }

    // 3. Feedback
    const message = `Підтверджено: ${item.name} успішно перевірено.`;
    alert(message);
  };

  const handleReportMissing = async (item) => {
    if (confirm(`Ви впевнені, що ${item.name} відсутній?`)) {
      processMissingItem(item);
    }
  };

  const processMissingItem = async (item) => {
    // 1. Optimistic Update
    const newInventory = inventory.map(i => {
      if (i.id === item.id) {
        return { ...i, auditRequired: false, status: 'missing' };
      }
      return i;
    });
    setInventory(newInventory);

    // 2. Send to Backend
    try {
      await sendAuditResult(item.id, false); // false = missing
    } catch (e) {
      console.error("Failed to report missing item", e);
    }

    // 3. Feedback
    const message = `Відмічено ${item.name} як ВІДСУТНІЙ. Адміністратора повідомлено.`;
    alert(message);
  };

  // --- Marketplace Logic ---

  const handleBuyItem = async (item) => {
    if (user.honey < item.price) {
      alert("Недостатньо Меду!");
      return;
    }

    // 1. Deduct Honey (Optimistic)
    setUser(prev => ({ ...prev, honey: prev.honey - item.price }));

    // 2. API Call
    try {
      await buyItem(item.id);
    } catch (e) {
      console.error("Buy failed", e);
      alert("Покупка не вдалася.");
      setUser(prev => ({ ...prev, honey: prev.honey + item.price })); // Revert
      return;
    }

    // 3. Add to Inventory (Optimistic)
    const newItem = {
      id: Date.now(),
      name: item.name,
      rarity: item.rarity || "Common",
      icon: item.icon || "box",
      type: item.type === 'equipment' || item.type === 'merch' ? 'equipment' : 'resource',
      quantity: 1
    };
    setInventory(prev => [...prev, newItem]);

    // 4. Remove from Marketplace (if P2P)
    if (item.seller !== 'system') {
      setMarketplaceItems(prev => prev.filter(i => i.id !== item.id));
    }

    // 5. Feedback
    alert(`Куплено ${item.name}!`);
  };

  const handleCreateListing = async (listingData) => {
    // 1. API Call
    try {
      const newItem = await createListing(listingData);
      // 2. Update UI
      setMarketplaceItems(prev => [newItem || {
        id: `u_${Date.now()}`,
        seller: user.name,
        ...listingData
      }, ...prev]);
      setIsSellModalOpen(false);

      console.log("Listing created successfully.");
    } catch (e) {
      console.error("Listing failed", e);
      alert("Не вдалося створити оголошення.");
    }
  };

  const handleSendHoney = async (recipient, amount) => {
    // 1. Deduct locally
    setUser(prev => ({ ...prev, honey: prev.honey - amount }));

    // 2. API Call
    try {
      await transferHoney(recipient.id, amount);
    } catch (e) {
      console.error(e);
      setUser(prev => ({ ...prev, honey: prev.honey + amount })); // Revert
      alert("Не вдалося надіслати Мед, спробуйте ще раз.");
      return;
    }

    // 3. Feedback
    const message = `Надіслано ${amount} Меду для ${recipient.name}!`;
    alert(message);
  };

  // --- Requests Logic ---

  const handleSaveRequest = async (req) => {
    try {
      const response = await createOrUpdateRequest(req);

      // Merge response with request data (assuming response might be partial or just contain ID)
      const savedReq = {
        ...req,
        id: response.requestId || response.id || req.id,
        status: response.status || req.status || 'draft'
      };

      setRequests(prev => {
        const index = prev.findIndex(r => r.id === req.id);
        if (index !== -1) {
          const newRequests = [...prev];
          newRequests[index] = savedReq;
          return newRequests;
        }
        return [savedReq, ...prev];
      });

      console.log("Request saved successfully.");
      return savedReq; // Return for chaining
    } catch (e) {
      console.error("Failed to save request", e);
      alert("Не вдалося зберегти запит.");
      throw e;
    }
  };

  const handleSubmitRequest = async (req) => {
    try {
      // First save/update the request
      let savedReq = req;
      let reqId = req.id;

      // If it's a new request or has a temp ID, save it first to get a real ID
      if (!reqId || String(reqId).startsWith('new_') || req.status === 'draft') {
        savedReq = await handleSaveRequest(req);
        reqId = savedReq.id;
      }

      // Then submit
      await submitRequest(reqId);

      // Optimistically update status to 'new' (pending approval)
      const submittedReq = { ...savedReq, status: 'new' };

      setRequests(prev => prev.map(r => r.id === reqId ? submittedReq : r));

      alert("Запит подано!");
    } catch (e) {
      console.error("Failed to submit request", e);
      alert("Не вдалося подати запит.");
    }
  };

  const handleApproveRequest = async (req) => {
    // 1. Optimistic Update
    const updatedReq = { ...req, status: 'approved' };
    setRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));

    // 2. API Call
    try {
      await respondToRequest(req.id, 'approve');
      console.log("Request approved.");
    } catch (e) {
      console.error("Failed to approve request", e);
      // Revert?
    }
  };

  const handleRejectRequest = async (req) => {
    // 1. Optimistic Update
    const updatedReq = { ...req, status: 'rejected' };
    setRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));

    // 2. API Call
    try {
      await respondToRequest(req.id, 'reject');
      console.log("Request rejected.");
    } catch (e) {
      console.error("Failed to reject request", e);
    }
  };

  const handleSaveWarehouseInventory = async (data) => {
    try {
      await saveWarehouseInventory(data);

      alert('Інвентаризацію подано! ✅');
    } catch (e) {
      console.error("Inventory save failed", e);
      alert("Не вдалося зберегти інвентаризацію.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
  };

  return (
    <div className="app-container">
      <div className="hero-section">
        <HeroProfile
          user={user}
          onInboxClick={() => setIsInboxOpen(true)}
          onShopClick={() => setIsShopOpen(true)}
          onSendHoneyClick={() => setIsSendHoneyOpen(true)}
          onOrgChartClick={() => setIsOrgChartOpen(true)}
          onRewardReportClick={() => setIsRewardReportOpen(true)}
          onTimesheetClick={() => setIsTimesheetOpen(true)}
          onApprovalClick={() => setIsApprovalOpen(true)}
          onExpenseReportsClick={() => setIsExpenseReportsOpen(true)}
          onRequestsClick={() => setIsRequestsOpen(true)}
          onInventoryClick={() => setIsWarehouseInventoryOpen(true)}
          onWarehouseOpsClick={() => setIsWarehouseOpsOpen(true)}
          onStockReportClick={() => setIsStockReportOpen(true)}
          onGamesClick={() => setIsGamesOpen(true)}
          onProfileClick={() => setIsProfileOpen(true)}
          onEquipmentClick={() => setIsEquipmentOpen(true)}
          onLogoutClick={handleLogout}
          incomingCount={incomingTransfers.length + pendingRequestsCount}
          auditCount={(inventory || []).filter(i => i.auditRequired).length}
        />
      </div>

      <EquipmentModal
        isOpen={isEquipmentOpen}
        onClose={() => setIsEquipmentOpen(false)}
        items={inventory}
        onTransferClick={handleOpenTransfer}
        onValidateClick={handleValidateItem}
        onReportMissing={handleReportMissing}
      />

      <EditProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onSave={handleSaveProfile}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        item={itemToTransfer}
        colleagues={colleagues}
        onSend={handleSendRequest}
      />

      <InboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        transfers={incomingTransfers}
        onAccept={handleAcceptTransfer}
        onReject={handleRejectTransfer}
        pendingRequestsCount={pendingRequestsCount}
        onOpenTeamRequests={() => {
          setIsInboxOpen(false);
          setInitialRequestsFilter('subordinates');
          setIsRequestsOpen(true);
        }}
      />

      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        items={marketplaceItems}
        userHoney={user ? user.honey : 0}
        onBuy={handleBuyItem}
        onSellClick={() => setIsSellModalOpen(true)}
      />

      <CreateListingModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onDetailSubmit={handleCreateListing}
      />

      <SendHoneyModal
        isOpen={isSendHoneyOpen}
        onClose={() => setIsSendHoneyOpen(false)}
        userBalance={user ? user.honey : 0}
        colleagues={colleagues}
        onSend={handleSendHoney}
      />

      <OrgChartModal
        isOpen={isOrgChartOpen}
        onClose={() => setIsOrgChartOpen(false)}
        colleagues={colleagues}
      />

      <RequestsModal
        isOpen={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        requests={requests}
        onSave={handleSaveRequest}
        onSubmit={handleSubmitRequest}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        currentUser={user}
        initialFilter={initialRequestsFilter}
        onViewChange={(view) => {
          // Fetch requests based on view
          const loadRequests = async () => {
            const data = await fetchRequests(view);
            if (data) setRequests(data);
          };
          loadRequests();
        }}
      />

      <TimesheetModal
        isOpen={isTimesheetOpen}
        onClose={() => setIsTimesheetOpen(false)}
      />

      <ExpenseReportsModal
        isOpen={isExpenseReportsOpen}
        onClose={() => setIsExpenseReportsOpen(false)}
      />

      <TimesheetApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
      />

      <WarehouseInventoryModal
        isOpen={isWarehouseInventoryOpen}
        onClose={() => setIsWarehouseInventoryOpen(false)}
        onSaveInventory={handleSaveWarehouseInventory}
      />

      <WarehouseOperationsModal
        isOpen={isWarehouseOpsOpen}
        onClose={() => setIsWarehouseOpsOpen(false)}
      />

      <RemainingItemsModal
        isOpen={isStockReportOpen}
        onClose={() => setIsStockReportOpen(false)}
      />

      <RewardReportModal
        isOpen={isRewardReportOpen}
        onClose={() => setIsRewardReportOpen(false)}
      />

      <GamesModal
        isOpen={isGamesOpen}
        onClose={() => setIsGamesOpen(false)}
      />

      <div style={{ textAlign: 'center', marginTop: 32, opacity: 0.5, fontSize: 10 }}>
        VinBees RPG v1.8
      </div>
    </div>
  );
}

export default App;
