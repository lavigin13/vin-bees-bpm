import { useState, useEffect } from 'react';
import HeroProfile from './components/HeroProfile';
import Inventory from './components/Inventory';
import EditProfile from './components/EditProfile';
import CraftingModal from './components/CraftingModal';
import TransferModal from './components/TransferModal';
import InboxModal from './components/InboxModal';
import ShopModal from './components/ShopModal';
import CreateListingModal from './components/CreateListingModal';
import SendHoneyModal from './components/SendHoneyModal';
import OrgChartModal from './components/OrgChartModal';
import BusinessTripsModal from './components/BusinessTripsModal';
import TimesheetModal from './components/TimesheetModal';
import RequestsModal from './components/RequestsModal';

import { 
  fetchProfile, fetchInventory, updateProfile, sendAuditResult, transferHoney, 
  transferItem, getMarketplaceItems, buyItem, createListing, fetchPendingTransfers, 
  respondToTransfer, fetchColleagues, fetchTrips, createOrUpdateTrip, submitTrip, respondToRequest
} from './services/api';

import { 
  INITIAL_USER, INVENTORY_ITEMS, RECIPES, MOCK_INCOMING_TRANSFERS, 
  MARKETPLACE_ITEMS, COLLEAGUES as MOCK_COLLEAGUES, MOCK_TRIPS, MOCK_DAILY_REPORTS,
  MOCK_REQUESTS
} from './data/mockData';

import './index.css';

function App() {
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

  // Helper to count pending requests (simulated for team members)
  // In a real app, backend would filter this. Here we just assume non-current-user requests are team requests.
  const pendingRequestsCount = requests.filter(r => 
      r.createdBy !== (user ? user.id : 999) && 
      (r.status === 'new' || r.status === 'pending')
  ).length;

  useEffect(() => {
    // Expand Telegram WebApp if available
    if (window.Telegram && window.Telegram.WebApp) {
      console.log('[App] Telegram WebApp detected:', window.Telegram.WebApp);
      console.log('[App] initData:', window.Telegram.WebApp.initData);
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    } else {
      console.log('[App] Telegram WebApp NOT detected');
    }

    // Fetch Data from API
    const loadData = async () => {
      setIsLoading(true);
      const isTelegramAuth = window.Telegram?.WebApp?.initData;

      try {
        const profileData = await fetchProfile();
        // ... (existing profile logic) ...
        
        // Load Marketplace
        const marketData = await getMarketplaceItems();
        if (marketData) {
            setMarketplaceItems(marketData);
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
        } else if (!isTelegramAuth) {
          console.log('Using Mock Profile Data (Local Dev)');
          setUser(INITIAL_USER);
        }

        const inventoryData = await fetchInventory();
        if (inventoryData) {
          setInventory(inventoryData);
        } else if (!isTelegramAuth) {
          console.log('Using Mock Inventory Data (Local Dev)');
          setInventory(INVENTORY_ITEMS);
        }

        const pendingTransfers = await fetchPendingTransfers();
        if (pendingTransfers) {
            setIncomingTransfers(pendingTransfers);
        } else if (!isTelegramAuth) {
             setIncomingTransfers(MOCK_INCOMING_TRANSFERS);
        } else {
             setIncomingTransfers([]);
        }
        
        const colleaguesData = await fetchColleagues();
        if (colleaguesData) {
            setColleagues(colleaguesData);
        }

        // Load Trips
        const tripsData = await fetchTrips();
        if (tripsData) {
            setTrips(tripsData);
        } else if (!isTelegramAuth) {
            setTrips(MOCK_TRIPS);
        } else {
            setTrips([]);
        }

        // Load Requests (API not ready yet, using mock)
        if (!isTelegramAuth) {
            setRequests(MOCK_REQUESTS);
        } else {
            // Placeholder: setRequests([]);
            setRequests(MOCK_REQUESTS); // Temporary fallback
        }

      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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

      // Show feedback (Telegram Haptic)
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        window.Telegram.WebApp.showAlert('Profile Saved Successfully! ✅');
      } else {
        alert('Profile Updated!');
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      const errorMessage = error.message || 'Unknown error';
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        window.Telegram.WebApp.showAlert(`Failed to save profile: ${errorMessage}`);
      } else {
        alert(`Failed to save profile: ${errorMessage}`);
      }
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

    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
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
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
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
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
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
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
    }
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
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const handleReportMissing = async (item) => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showConfirm(`Are you sure ${item.name} is missing?`, async (confirmed) => {
            if (confirmed) {
                processMissingItem(item);
            }
        });
    } else {
        if (confirm(`Are you sure ${item.name} is missing?`)) {
            processMissingItem(item);
        }
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
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        window.Telegram.WebApp.showAlert(message);
    } else {
        alert(message);
    }
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
      if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          window.Telegram.WebApp.showPopup({
              title: 'Purchase Successful! 🎉',
              message: `You bought ${item.name} for ${item.price} Honey.`,
              buttons: [{type: 'ok'}]
          });
      } else {
          alert(`Bought ${item.name}!`);
      }
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

          if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
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
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        window.Telegram.WebApp.showAlert(message);
    } else {
        alert(message);
    }
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
          if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
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
          
          if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
              window.Telegram.WebApp.showAlert("Trip submitted for approval!");
          } else {
              alert("Trip submitted!");
          }
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
      
      if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
  };

  // --- Requests Logic ---

  const handleSaveRequest = (req) => {
      setRequests(prev => {
          if (req.id) {
              return prev.map(r => r.id === req.id ? req : r);
          }
          const newReq = { ...req, id: `new_${Date.now()}` };
          return [newReq, ...prev];
      });
      if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
  };

  const handleSubmitRequest = (req) => {
      const updatedReq = { ...req, status: 'pending' };
      setRequests(prev => {
          if (req.id) {
              return prev.map(r => r.id === req.id ? updatedReq : r);
          }
          const newReq = { ...updatedReq, id: `new_${Date.now()}` };
          return [newReq, ...prev];
      });

      if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          window.Telegram.WebApp.showAlert("Request submitted!");
      }
  };

  const handleApproveRequest = async (req) => {
      // 1. Optimistic Update
      const updatedReq = { ...req, status: 'approved' };
      setRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));

      // 2. API Call
      try {
          await respondToRequest(req.id, 'approve');
          if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
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
          if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
          }
      } catch (e) {
          console.error("Failed to reject request", e);
      }
  };


  return (
    <div className="app-container">
      <HeroProfile 
        user={user} 
        onInboxClick={() => setIsInboxOpen(true)}
        onShopClick={() => setIsShopOpen(true)}
        onSendHoneyClick={() => setIsSendHoneyOpen(true)}
        onOrgChartClick={() => setIsOrgChartOpen(true)}
        onTripsClick={() => setIsTripsOpen(true)}
        onTimesheetClick={() => setIsTimesheetOpen(true)}
        onRequestsClick={() => { setInitialRequestsFilter('my'); setIsRequestsOpen(true); }}
        incomingCount={incomingTransfers.length + pendingRequestsCount}
      />
      <Inventory
        items={inventory}
        onCraftClick={() => setIsCraftingOpen(true)}
        onTransferClick={handleOpenTransfer}
        onValidateClick={handleValidateItem}
        onReportMissing={handleReportMissing}
      />
      <EditProfile user={user} onSave={handleSaveProfile} />

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
      />

      <TimesheetModal
        isOpen={isTimesheetOpen}
        onClose={() => setIsTimesheetOpen(false)}
        dailyReports={dailyReports}
        onSaveReport={handleSaveDailyReport}
      />

      <div style={{ textAlign: 'center', marginTop: 32, opacity: 0.5, fontSize: 10 }}>
        VinBees RPG v1.8
      </div>
    </div>
  );
}

export default App;
