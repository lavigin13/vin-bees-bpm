import { useState, useEffect } from 'react';
import HeroProfile from './components/HeroProfile';
import Inventory from './components/Inventory';
import EditProfile from './components/EditProfile';
import EditProfileModal from './components/EditProfileModal';
import CraftingModal from './components/CraftingModal';
import TransferModal from './components/TransferModal';
import InboxModal from './components/InboxModal';
import ShopModal from './components/ShopModal';
import CreateListingModal from './components/CreateListingModal';
import SendHoneyModal from './components/SendHoneyModal';
import OrgChartModal from './components/OrgChartModal';
import BusinessTripsModal from './components/BusinessTripsModal';
import TimesheetModal from './components/TimesheetModal';
import TimesheetApprovalModal from './components/TimesheetApprovalModal';
import RequestsModal from './components/RequestsModal';
import RewardReportModal from './components/RewardReportModal';
import WarehouseInventoryModal from './components/WarehouseInventoryModal';
import WarehouseOperationsModal from './components/WarehouseOperationsModal';
import AuthPage from './components/AuthPage';
import ComingSoonModal from './components/ComingSoonModal';

import {
  fetchProfile, fetchInventory, updateProfile, sendAuditResult, transferHoney,
  transferItem, getMarketplaceItems, buyItem, createListing, fetchPendingTransfers,
  respondToTransfer, fetchColleagues, fetchTrips, createOrUpdateTrip, submitTrip, respondToRequest,
  saveWarehouseInventory, fetchRequests, createOrUpdateRequest, submitRequest
} from './services/api';

import {
  INITIAL_USER, INVENTORY_ITEMS, RECIPES, MOCK_INCOMING_TRANSFERS,
  MARKETPLACE_ITEMS, COLLEAGUES as MOCK_COLLEAGUES, MOCK_TRIPS, MOCK_DAILY_REPORTS,
  MOCK_REQUESTS
} from './data/mockData';

import './index.css';
import { Coins, LogOut } from 'lucide-react';

import { isTelegram } from './services/env';

const App = () => {
  // In Telegram Mini App — auto-authenticated via initData
  // In standalone web — check for saved Basic Auth token
  const [isAuthenticated, setIsAuthenticated] = useState(
    isTelegram() || !!localStorage.getItem('authToken')
  );
  const [authNotice, setAuthNotice] = useState('');

  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [colleagues, setColleagues] = useState(MOCK_COLLEAGUES);
  const [isCraftingOpen, setIsCraftingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Transfer State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [itemToTransfer, setItemToTransfer] = useState(null);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [incomingTransfers, setIncomingTransfers] = useState(MOCK_INCOMING_TRANSFERS);

  // Marketplace State
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [marketplaceItems, setMarketplaceItems] = useState(MARKETPLACE_ITEMS);

  // Honey Transfer State
  const [isSendHoneyOpen, setIsSendHoneyOpen] = useState(false);

  // Org Chart State
  const [isOrgChartOpen, setIsOrgChartOpen] = useState(false);

  // Profile Settings State
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Business Trips State
  const [isTripsOpen, setIsTripsOpen] = useState(false);
  const [trips, setTrips] = useState(MOCK_TRIPS);

  // Timesheet State
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [dailyReports, setDailyReports] = useState(MOCK_DAILY_REPORTS);

  // Requests State
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [initialRequestsFilter, setInitialRequestsFilter] = useState('my');

  // Warehouse Inventory State
  const [isWarehouseInventoryOpen, setIsWarehouseInventoryOpen] = useState(false);

  // Warehouse Operations State
  const [isWarehouseOpsOpen, setIsWarehouseOpsOpen] = useState(false);

  // Timesheet Approval State
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  // Reward Report State
  const [isRewardReportOpen, setIsRewardReportOpen] = useState(false);

  // Coming Soon State
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');

  const handleComingSoon = (featureName) => {
    setComingSoonFeature(featureName);
    setIsComingSoonOpen(true);
  };

  // Helper to count pending requests (simulated for team members)
  const pendingRequestsCount = (requests || []).filter(r =>
    r && r.createdBy !== (user ? user.id : 999) &&
    (r.status === 'new' || r.status === 'pending')
  ).length;

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
    if (isRequestsOpen) {
      const refreshRequests = async () => {
        try {
          const myRequests = await fetchRequests('my');
          const subRequests = await fetchRequests('subordinates');
          const allRequests = [
            ...(myRequests || []),
            ...(subRequests || [])
          ];
          const uniqueRequests = Array.from(new Map(allRequests.map(item => [item.id, item])).values());
          if (uniqueRequests.length > 0) {
            setRequests(uniqueRequests);
          }
        } catch (e) {
          console.error("Failed to refresh requests", e);
        }
      };
      refreshRequests();
    }
  }, [isRequestsOpen]);

  useEffect(() => {
    // Fetch Data from API
    const loadData = async () => {
      setIsLoading(true);

      try {
        let profileData = null;
        try {
          profileData = await fetchProfile();
        } catch (e) {
          console.warn("Failed to fetch profile", e);
        }

        // Load Marketplace
        try {
          const marketData = await getMarketplaceItems();
          if (marketData) {
            setMarketplaceItems(marketData);
          }
        } catch (e) {
          console.warn("Failed to load marketplace", e);
        }

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
        } else {
          console.log('Using Mock Profile Data (Local Dev)');
          setUser(INITIAL_USER);
        }


        try {
          const inventoryData = await fetchInventory();
          if (inventoryData) {
            setInventory(inventoryData);
          } else {
            console.log('Using Mock Inventory Data (Local Dev)');
            setInventory(INVENTORY_ITEMS);
          }
        } catch (e) {
          console.warn("Failed to load inventory", e);
          setInventory(INVENTORY_ITEMS);
        }

        try {
          const pendingTransfers = await fetchPendingTransfers();
          if (pendingTransfers) {
            setIncomingTransfers(pendingTransfers);
          } else {
            setIncomingTransfers(MOCK_INCOMING_TRANSFERS);
          }
        } catch (e) {
          console.warn("Failed to load pending transfers", e);
          setIncomingTransfers([]);
        }

        try {
          const colleaguesData = await fetchColleagues();
          if (colleaguesData) {
            setColleagues(colleaguesData);
          }
        } catch (e) {
          console.warn("Failed to load colleagues", e);
        }

        // Load Trips
        try {
          const tripsData = await fetchTrips();
          if (tripsData) {
            setTrips(tripsData);
          } else {
            setTrips(MOCK_TRIPS);
          }
        } catch (e) {
          console.warn("Failed to load trips", e);
          setTrips([]);
        }

        // Load Requests
        let myRequests = [];
        let subRequests = [];
        try {
          const myReqRes = await fetchRequests('my');
          if (myReqRes) myRequests = myReqRes;

          const subReqRes = await fetchRequests('subordinates');
          if (subReqRes) subRequests = subReqRes;
        } catch (e) {
          console.warn("Failed to load requests", e);
        }

        const allRequests = [
          ...(Array.isArray(myRequests) ? myRequests : []),
          ...(Array.isArray(subRequests) ? subRequests : [])
        ];

        // Remove duplicates by ID just in case
        const uniqueRequests = Array.from(new Map(allRequests.map(item => [item.id, item])).values());

        if (uniqueRequests.length > 0) {
          setRequests(uniqueRequests);
        } else {
          setRequests(MOCK_REQUESTS);
        }

      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    }

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
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!user) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Failed to load profile data.</div>;
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

      alert('Profile Saved Successfully! ✅');
    } catch (error) {
      console.error("Failed to save profile:", error);
      const errorMessage = error.message || 'Unknown error';
      alert(`Failed to save profile: ${errorMessage}`);
    }
  };

  const handleCraft = (recipe, craftQuantity, consumedMaterials, additionalCost) => {
    // 1. Deduct Ingredients (using custom consumed amounts)
    const newInventory = inventory.map(item => {
      const consumedAmount = consumedMaterials[item.name];
      if (consumedAmount) {
        return { ...item, quantity: item.quantity - consumedAmount };
      }
      return item;
    }).filter(item => item.quantity > 0);

    // 2. Add Output Item (multiplied by quantity)
    const existingItemIndex = newInventory.findIndex(i => i.name === recipe.outputItem.name);
    if (existingItemIndex >= 0) {
      newInventory[existingItemIndex].quantity += (recipe.outputItem.quantity * craftQuantity);
    } else {
      newInventory.push({
        id: Date.now(),
        ...recipe.outputItem,
        quantity: recipe.outputItem.quantity * craftQuantity
      });
    }

    setInventory(newInventory);

    // 3. Mock Server Request
    console.log("Sending Craft Request to Server:", {
      recipeId: recipe.id,
      craftQuantity: craftQuantity,
      consumedMaterials: consumedMaterials,
      additionalCost: additionalCost,
      timestamp: new Date().toISOString()
    });

    const message = `Crafted ${craftQuantity}x ${recipe.outputItem.name}! Request sent.`;
    alert(message);
  };

  // --- Transfer Logic ---

  const handleOpenTransfer = (item) => {
    setItemToTransfer(item);
    setIsTransferOpen(true);
  };

  const handleSendRequest = async (item, quantity, recipient) => {
    if (!recipient || !recipient.id) {
      console.error("Invalid recipient:", recipient);
      alert("Please select a valid recipient.");
      return;
    }

    // 1. Optimistic Update
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
      // Optional: Revert state
      alert("Transfer failed, please try again.");
      return;
    }

    // 3. Feedback
    const message = `Request sent to ${recipient.name}!`;
    alert(message);
  };

  const handleAcceptTransfer = async (transfer) => {
    // 1. API Call
    try {
      await respondToTransfer(transfer.id, 'accept');
    } catch (e) {
      console.error("Accept transfer failed", e);
      alert("Failed to accept transfer.");
      return;
    }

    // 2. Add Item to Inventory (Optimistic)
    const newInventory = [...inventory];
    const existingItemIndex = newInventory.findIndex(i => i.name === transfer.item.name);

    if (existingItemIndex >= 0) {
      newInventory[existingItemIndex].quantity += transfer.quantity;
    } else {
      newInventory.push({
        id: Date.now(),
        ...transfer.item,
        quantity: transfer.quantity
      });
    }
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
      alert("Failed to reject transfer.");
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
        const { auditRequired, ...rest } = i; // Remove flag
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
    const message = `Confirmed: ${item.name} successfully audited.`;
    alert(message);
  };

  const handleReportMissing = async (item) => {
    if (confirm(`Are you sure ${item.name} is missing?`)) {
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
    const message = `Reported ${item.name} as MISSING. Admin notified.`;
    alert(message);
  };

  // --- Marketplace Logic ---

  const handleBuyItem = async (item) => {
    if (user.honey < item.price) {
      alert("Not enough Honey!");
      return;
    }

    // 1. Deduct Honey (Optimistic)
    setUser(prev => ({ ...prev, honey: prev.honey - item.price }));

    // 2. API Call
    try {
      await buyItem(item.id);
    } catch (e) {
      console.error("Buy failed", e);
      alert("Purchase failed.");
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
    alert(`Bought ${item.name}!`);
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
      alert("Failed to create listing.");
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
    }

    // 3. Feedback
    const message = `Sent ${amount} Honey to ${recipient.name}!`;
    alert(message);
  };

  // --- Trips Logic ---

  const handleSaveTrip = async (trip) => {
    // 1. Optimistic Update or Local State
    setTrips(prev => {
      const exists = prev.find(t => t.id === trip.id);
      if (exists) {
        return prev.map(t => t.id === trip.id ? trip : t);
      }
      return [...prev, trip];
    });

    // 2. API Call
    try {
      await createOrUpdateTrip(trip);
      console.log("Trip saved successfully.");
    } catch (e) {
      console.error("Failed to save trip", e);
      alert("Failed to save trip.");
    }
  };

  const handleSubmitTrip = async (trip) => {
    // 1. Update status locally
    const updatedTrip = { ...trip, status: 'pending' };
    setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));

    // 2. API Call
    try {
      // If it's a new trip, save it first? Assuming API handles update-then-submit or we just submit ID
      if (String(trip.id).startsWith('new_')) {
        // Usually backend replaces temp ID, but for now we just save content
        await createOrUpdateTrip(updatedTrip);
      } else {
        await createOrUpdateTrip(updatedTrip); // Ensure latest changes are saved
        await submitTrip(trip.id);
      }

      alert("Trip submitted for approval!");
    } catch (e) {
      console.error("Failed to submit trip", e);
      alert("Failed to submit trip.");
    }
  };

  // --- Timesheet Logic ---

  const handleSaveDailyReport = (dateStr, reportData) => {
    setDailyReports(prev => ({
      ...prev,
      [dateStr]: reportData
    }));

    // In a real app: await api.saveDailyReport(dateStr, reportData);

    console.log("Daily report saved.");
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
      alert("Failed to save request.");
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

      alert("Request submitted!");
    } catch (e) {
      console.error("Failed to submit request", e);
      alert("Failed to submit request.");
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

      alert('Inventory Submitted! ✅');
    } catch (e) {
      console.error("Inventory save failed", e);
      alert("Failed to save inventory.");
    }
  };

  const handleOpenRewardReportModal = () => {
    setIsRewardReportOpen(true);
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
          onRequestsClick={() => setIsRequestsOpen(true)}
          onInventoryClick={() => setIsWarehouseInventoryOpen(true)}
          onWarehouseOpsClick={() => setIsWarehouseOpsOpen(true)}
          onProfileClick={() => setIsProfileOpen(true)}
          onLogoutClick={handleLogout}
          incomingCount={incomingTransfers.length + pendingRequestsCount}
        />
      </div>
      <div className="main-content-section">
        <Inventory
          items={inventory}
          onCraftClick={() => setIsCraftingOpen(true)}
          onTransferClick={handleOpenTransfer}
          onValidateClick={handleValidateItem}
          onReportMissing={handleReportMissing}
        />
      </div>

      <EditProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
        onSave={handleSaveProfile} 
      />


      <CraftingModal
        isOpen={isCraftingOpen}
        onClose={() => setIsCraftingOpen(false)}
        recipes={RECIPES}
        inventory={inventory}
        onCraft={handleCraft}
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

      <BusinessTripsModal
        isOpen={isTripsOpen}
        onClose={() => setIsTripsOpen(false)}
        trips={trips}
        onSave={handleSaveTrip}
        onSubmit={handleSubmitTrip}
      />

      <RequestsModal
        isOpen={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        requests={requests}
        onSave={handleSaveRequest}
        onSubmit={handleSubmitRequest}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        currentUserId={user ? user.id : 999}
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
        dailyReports={dailyReports}
        onSaveReport={handleSaveDailyReport}
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

      <RewardReportModal
        isOpen={isRewardReportOpen}
        onClose={() => setIsRewardReportOpen(false)}
      />

      <ComingSoonModal
        isOpen={isComingSoonOpen}
        onClose={() => setIsComingSoonOpen(false)}
        featureName={comingSoonFeature}
      />

      <div style={{ textAlign: 'center', marginTop: 32, opacity: 0.5, fontSize: 10 }}>
        VinBees RPG v1.8
      </div>
    </div>
  );
}

export default App;
