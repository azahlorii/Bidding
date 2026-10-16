import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  ServiceItem,
  Bid,
  AdminOverview,
  ProjectSourceFile,
  PageView,
  UserRole,
} from './types';

const HERO_IMAGE_URL = '/src/assets/images/hero_service_marketplace_1791450570817.jpg';

const CATEGORY_SHOWCASE = [
  {
    name: 'Electrical & Repairs',
    description: 'Certified residential rewiring, MCB distribution boards, lighting & earthing.',
    image: '/src/assets/images/cat_electrical_repairs_1791450583508.jpg',
    providersText: 'Licensed Electricians',
  },
  {
    name: 'Carpentry & Plumbing',
    description: 'Modular kitchen cabinetry, furniture assembly, pipe fitting & leak repair.',
    image: '/src/assets/images/cat_carpentry_plumbing_1791450612617.jpg',
    providersText: 'Skilled Carpenters & Plumbers',
  },
  {
    name: 'Appliance Servicing',
    description: 'Split AC jet servicing, refrigerant refill, washing machine & RO maintenance.',
    image: '/src/assets/images/cat_appliance_cleaning_1791450630193.jpg',
    providersText: 'Verified HVAC & Appliance Techs',
  },
  {
    name: 'Web & Software',
    description: 'Retail billing portals, business websites, custom inventory & IT setup.',
    image: '/src/assets/images/cat_web_software_1791450644489.jpg',
    providersText: 'IT & Software Specialists',
  },
];

const SERVICE_CATEGORIES = [
  'Electrical & Repairs',
  'Carpentry & Plumbing',
  'Web & Software',
  'Appliance Servicing',
  'Painting & Cleaning',
  'Home Shifting & Logistics',
];

function getCategoryImage(category: string): string {
  if (category.includes('Electrical')) {
    return '/src/assets/images/cat_electrical_repairs_1791450583508.jpg';
  }
  if (category.includes('Carpentry') || category.includes('Plumbing')) {
    return '/src/assets/images/cat_carpentry_plumbing_1791450612617.jpg';
  }
  if (category.includes('Web') || category.includes('Software')) {
    return '/src/assets/images/cat_web_software_1791450644489.jpg';
  }
  return '/src/assets/images/cat_appliance_cleaning_1791450630193.jpg';
}

// Resilient Image Component with Zero-Broken-Image Fallback
function ServiceImage({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-4 text-center ${className}`}
      >
        <span className="text-xs font-semibold text-slate-600">{alt}</span>
        <span className="text-[11px] text-slate-400 mt-0.5">Verified Service Category</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('servicebid_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation State
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  // Data State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [providerBids, setProviderBids] = useState<Bid[]>([]);
  const [adminData, setAdminData] = useState<AdminOverview | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectSourceFile[]>([]);
  const [activeCodeFile, setActiveCodeFile] = useState<string>('backend/app.py');

  // Filter State for Available Services
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loading & Feedback State
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Post Service Form State
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState(SERVICE_CATEGORIES[0]);
  const [postBudget, setPostBudget] = useState('');
  const [postDeadline, setPostDeadline] = useState('2026-10-30');
  const [postDescription, setPostDescription] = useState('');

  // Submit Bid Form State
  const [bidAmount, setBidAmount] = useState('');
  const [bidDays, setBidDays] = useState('5');
  const [bidMessage, setBidMessage] = useState('');

  const showNotice = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
  };

  const saveSessionUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('servicebid_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('servicebid_user');
    }
  };

  // Generic REST API helper
  const apiCall = useCallback(
    async <T,>(path: string, method: string = 'GET', body?: unknown): Promise<T> => {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body !== undefined) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(path, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }
      return data as T;
    },
    []
  );

  // Data Loaders
  const loadServices = useCallback(
    async (customerId?: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (customerId) params.set('customer_id', String(customerId));
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await apiCall<{ services: ServiceItem[] }>(`/api/services${query}`);
        setServices(res.services || []);
      } catch (err) {
        showNotice('error', err instanceof Error ? err.message : 'Failed to load services');
      } finally {
        setLoading(false);
      }
    },
    [apiCall]
  );

  const loadServiceDetail = useCallback(
    async (serviceId: number) => {
      setLoading(true);
      try {
        const res = await apiCall<{ service: ServiceItem }>(`/api/services/${serviceId}`);
        setSelectedService(res.service);
        setBidAmount(String(res.service.budget));
      } catch (err) {
        showNotice('error', err instanceof Error ? err.message : 'Failed to load service details');
      } finally {
        setLoading(false);
      }
    },
    [apiCall]
  );

  const loadProviderBids = useCallback(
    async (providerId: number) => {
      setLoading(true);
      try {
        const res = await apiCall<{ bids: Bid[] }>(`/api/provider/${providerId}/bids`);
        setProviderBids(res.bids || []);
      } catch (err) {
        showNotice('error', err instanceof Error ? err.message : 'Failed to load submitted bids');
      } finally {
        setLoading(false);
      }
    },
    [apiCall]
  );

  const loadAdminOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<AdminOverview>('/api/admin/overview');
      setAdminData(res);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to load admin overview');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const loadProjectFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<{ files: ProjectSourceFile[] }>('/api/project-files');
      setProjectFiles(res.files || []);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to load project source files');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Trigger appropriate data fetch when page changes
  useEffect(() => {
    if (currentPage === 'home' || currentPage === 'available-services') {
      loadServices();
    } else if (currentPage === 'customer-dashboard' && currentUser) {
      loadServices(currentUser.id);
    } else if (
      (currentPage === 'customer-bids' || currentPage === 'submit-bid') &&
      selectedServiceId
    ) {
      loadServiceDetail(selectedServiceId);
    } else if (currentPage === 'provider-dashboard' && currentUser) {
      loadProviderBids(currentUser.id);
    } else if (
      currentPage === 'admin-dashboard' ||
      currentPage === 'admin-users' ||
      currentPage === 'admin-services-bids'
    ) {
      loadAdminOverview();
    } else if (currentPage === 'project-code') {
      loadProjectFiles();
    }
  }, [
    currentPage,
    currentUser,
    selectedServiceId,
    loadServices,
    loadServiceDetail,
    loadProviderBids,
    loadAdminOverview,
    loadProjectFiles,
  ]);

  // Navigation Handler
  const navigate = (page: PageView, serviceId?: number) => {
    setBannerMessage(null);
    if (serviceId !== undefined) {
      setSelectedServiceId(serviceId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to Available Services filtered by a specific category
  const handleSelectCategory = (categoryName: string) => {
    setCategoryFilter(categoryName);
    setStatusFilter('All');
    setSearchQuery('');
    navigate('available-services');
  };

  // Logout Handler (Feature #13)
  const handleLogout = () => {
    saveSessionUser(null);
    showNotice('success', 'You have been logged out safely.');
    setCurrentPage('home');
  };

  // Quick Demo Login for Viva Presentation
  const handleQuickDemoLogin = async (email: string, password: string, role: UserRole) => {
    setBannerMessage(null);
    try {
      const res = await apiCall<{ user: User; message: string }>('/api/login', 'POST', {
        email,
        password,
        role,
      });
      saveSessionUser(res.user);
      showNotice('success', `Logged in as ${res.user.name} (${res.user.role.toUpperCase()})`);
      if (res.user.role === 'customer') setCurrentPage('customer-dashboard');
      else if (res.user.role === 'provider') setCurrentPage('provider-dashboard');
      else setCurrentPage('admin-dashboard');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Demo login failed');
    }
  };

  // Login Submit
  const handleLoginSubmit = async (e: React.FormEvent, role: UserRole) => {
    e.preventDefault();
    setBannerMessage(null);
    try {
      const res = await apiCall<{ user: User; message: string }>('/api/login', 'POST', {
        email: loginEmail,
        password: loginPassword,
        role,
      });
      saveSessionUser(res.user);
      setLoginEmail('');
      setLoginPassword('');
      showNotice('success', `Welcome back, ${res.user.name}!`);
      if (res.user.role === 'customer') setCurrentPage('customer-dashboard');
      else if (res.user.role === 'provider') setCurrentPage('provider-dashboard');
      else setCurrentPage('admin-dashboard');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Login failed');
    }
  };

  // Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent, role: UserRole) => {
    e.preventDefault();
    setBannerMessage(null);
    try {
      const res = await apiCall<{ user: User; message: string }>('/api/register', 'POST', {
        name: regName,
        email: regEmail,
        phone: regPhone,
        specialty: role === 'provider' ? regSpecialty : '',
        password: regPassword,
        role,
      });
      saveSessionUser(res.user);
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegSpecialty('');
      setRegPassword('');
      showNotice('success', `Account registered! Welcome, ${res.user.name}.`);
      if (res.user.role === 'customer') setCurrentPage('customer-dashboard');
      else setCurrentPage('provider-dashboard');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Registration failed');
    }
  };

  // Post Service Submit (Feature #6)
  const handlePostServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('customer-auth');
      return;
    }
    setBannerMessage(null);
    try {
      await apiCall('/api/services', 'POST', {
        customer_id: currentUser.id,
        title: postTitle,
        category: postCategory,
        budget: Number(postBudget),
        deadline: postDeadline,
        description: postDescription,
      });
      setPostTitle('');
      setPostBudget('');
      setPostDescription('');
      showNotice('success', 'Service requirement posted! Service providers can now submit bids.');
      navigate('customer-dashboard');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Could not post service');
    }
  };

  // Submit Bid Handler (Feature #8)
  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'provider') {
      showNotice('error', 'Please log in as a Service Provider to submit a bid.');
      navigate('provider-auth');
      return;
    }
    if (!selectedService) return;
    setBannerMessage(null);
    try {
      const res = await apiCall<{ message: string }>('/api/bids', 'POST', {
        service_id: selectedService.id,
        provider_id: currentUser.id,
        bid_amount: Number(bidAmount),
        delivery_days: Number(bidDays),
        message: bidMessage,
      });
      setBidMessage('');
      showNotice('success', res.message);
      navigate('provider-dashboard');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to submit bid');
    }
  };

  // Select / Accept Bid Handler (Feature #9)
  const handleAcceptBid = async (bidId: number, serviceId: number) => {
    setBannerMessage(null);
    try {
      const res = await apiCall<{ message: string }>(`/api/bids/${bidId}/accept`, 'POST', {});
      showNotice('success', res.message);
      await loadServiceDetail(serviceId);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to accept bid');
    }
  };

  // Reject Bid Handler
  const handleRejectBid = async (bidId: number, serviceId: number) => {
    setBannerMessage(null);
    try {
      const res = await apiCall<{ message: string }>(`/api/bids/${bidId}/reject`, 'POST', {});
      showNotice('success', res.message);
      await loadServiceDetail(serviceId);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to reject bid');
    }
  };

  // Update Service Status Handler (e.g. Mark Completed)
  const handleUpdateServiceStatus = async (
    serviceId: number,
    status: 'Open' | 'Assigned' | 'Completed' | 'Cancelled'
  ) => {
    setBannerMessage(null);
    try {
      const res = await apiCall<{ message: string }>(`/api/services/${serviceId}/status`, 'PUT', {
        status,
      });
      showNotice('success', res.message);
      if (currentPage === 'customer-dashboard' && currentUser) {
        loadServices(currentUser.id);
      } else if (currentPage === 'customer-bids') {
        loadServiceDetail(serviceId);
      } else if (
        currentPage === 'admin-dashboard' ||
        currentPage === 'admin-services-bids'
      ) {
        loadAdminOverview();
      }
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Admin Actions (Features #11 & #12)
  const handleAdminDeleteUser = async (userId: number) => {
    try {
      const res = await apiCall<{ message: string }>(`/api/admin/users/${userId}`, 'DELETE');
      showNotice('success', res.message);
      loadAdminOverview();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleAdminDeleteService = async (serviceId: number) => {
    try {
      const res = await apiCall<{ message: string }>(`/api/admin/services/${serviceId}`, 'DELETE');
      showNotice('success', res.message);
      loadAdminOverview();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  const handleAdminDeleteBid = async (bidId: number) => {
    try {
      const res = await apiCall<{ message: string }>(`/api/admin/bids/${bidId}`, 'DELETE');
      showNotice('success', res.message);
      loadAdminOverview();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to delete bid');
    }
  };

  const handleResetDemoDatabase = async () => {
    try {
      const res = await apiCall<{ message: string }>('/api/admin/reset-demo', 'POST');
      showNotice('success', res.message);
      if (
        currentPage === 'admin-dashboard' ||
        currentPage === 'admin-users' ||
        currentPage === 'admin-services-bids'
      ) {
        loadAdminOverview();
      } else {
        loadServices();
      }
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to reset database');
    }
  };

  // Filtered Services for Available Services Page
  const filteredServices = services.filter((s) => {
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchCat = s.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* =====================================================================
          TOP NAVIGATION BAR (Strict 3-Zone Contract: Brand | Nav Links | Actions)
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            navigate('home');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          ServiceBid
        </a>

        {/* Zone 2: 4–6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => navigate('home')}
            className={`py-1 whitespace-nowrap transition-colors ${
              currentPage === 'home'
                ? 'text-blue-700 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => {
              setCategoryFilter('All');
              navigate('available-services');
            }}
            className={`py-1 whitespace-nowrap transition-colors ${
              currentPage === 'available-services' || currentPage === 'submit-bid'
                ? 'text-blue-700 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900'
            }`}
          >
            Available Services
          </button>

          {!currentUser && (
            <>
              <button
                onClick={() => {
                  setAuthMode('login');
                  navigate('customer-auth');
                }}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'customer-auth'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                Customer Portal
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  navigate('provider-auth');
                }}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'provider-auth'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                Provider Portal
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  navigate('admin-auth');
                }}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'admin-auth'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                Admin
              </button>
            </>
          )}

          {currentUser?.role === 'customer' && (
            <>
              <button
                onClick={() => navigate('customer-dashboard')}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'customer-dashboard' || currentPage === 'customer-bids'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                Customer Dashboard
              </button>
              <button
                onClick={() => navigate('post-service')}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'post-service'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                Post Service
              </button>
            </>
          )}

          {currentUser?.role === 'provider' && (
            <button
              onClick={() => navigate('provider-dashboard')}
              className={`py-1 whitespace-nowrap transition-colors ${
                currentPage === 'provider-dashboard'
                  ? 'text-blue-700 underline underline-offset-8 decoration-2'
                  : 'hover:text-slate-900'
              }`}
            >
              Provider Dashboard
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => navigate('admin-dashboard')}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'admin-dashboard'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                Admin Dashboard
              </button>
              <button
                onClick={() => navigate('admin-users')}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'admin-users'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => navigate('admin-services-bids')}
                className={`py-1 whitespace-nowrap transition-colors ${
                  currentPage === 'admin-services-bids'
                    ? 'text-blue-700 underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                Services & Bids
              </button>
            </>
          )}

          <button
            onClick={() => navigate('project-code')}
            className={`py-1 whitespace-nowrap transition-colors ${
              currentPage === 'project-code'
                ? 'text-blue-700 underline underline-offset-8 decoration-2'
                : 'hover:text-slate-900'
            }`}
          >
            Viva & Source Files
          </button>
        </nav>

        {/* Zone 3: 1–2 primary actions */}
        <div className="flex items-center gap-3">
          {!currentUser ? (
            <>
              <button
                onClick={() => {
                  setAuthMode('login');
                  navigate('customer-auth');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  navigate('customer-auth');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                Post a Service
              </button>
            </>
          ) : (
            <>
              <span className="hidden sm:inline text-xs text-slate-600 whitespace-nowrap">
                {currentUser.name} · <strong className="capitalize">{currentUser.role}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Secondary Navigation Strip */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
        <button onClick={() => navigate('home')} className="whitespace-nowrap">
          Home
        </button>
        <button
          onClick={() => {
            setCategoryFilter('All');
            navigate('available-services');
          }}
          className="whitespace-nowrap"
        >
          Available Services
        </button>
        {!currentUser && (
          <>
            <button onClick={() => navigate('customer-auth')} className="whitespace-nowrap">
              Customer Login
            </button>
            <button onClick={() => navigate('provider-auth')} className="whitespace-nowrap">
              Provider Login
            </button>
            <button onClick={() => navigate('admin-auth')} className="whitespace-nowrap">
              Admin
            </button>
          </>
        )}
        {currentUser?.role === 'customer' && (
          <>
            <button onClick={() => navigate('customer-dashboard')} className="whitespace-nowrap">
              Dashboard
            </button>
            <button onClick={() => navigate('post-service')} className="whitespace-nowrap">
              Post Service
            </button>
          </>
        )}
        {currentUser?.role === 'provider' && (
          <button onClick={() => navigate('provider-dashboard')} className="whitespace-nowrap">
            My Bids
          </button>
        )}
        {currentUser?.role === 'admin' && (
          <>
            <button onClick={() => navigate('admin-dashboard')} className="whitespace-nowrap">
              Admin
            </button>
            <button onClick={() => navigate('admin-users')} className="whitespace-nowrap">
              Users
            </button>
            <button onClick={() => navigate('admin-services-bids')} className="whitespace-nowrap">
              Services & Bids
            </button>
          </>
        )}
        <button onClick={() => navigate('project-code')} className="whitespace-nowrap">
          Viva & Files
        </button>
      </div>

      {/* =====================================================================
          MAIN WORKSPACE CONTENT CONTAINER
         ===================================================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Global Notification Banner */}
        {bannerMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-center justify-between text-sm ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <span>
              <strong>{bannerMessage.type === 'success' ? 'Success:' : 'Error:'}</strong>{' '}
              {bannerMessage.text}
            </span>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-xs underline ml-4 whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===================================================================
            1. HOME PAGE (With Hero Photography & Service Category Showcase)
           =================================================================== */}
        {currentPage === 'home' && (
          <div className="space-y-10">
            {/* Hero Section with 16:9 Editorial Image */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 md:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Hero Copy & Actions */}
                <div className="lg:col-span-7 space-y-4">
                  <p className="text-xs font-medium text-slate-500">
                    Online Service Bidding Marketplace · Verified Professionals
                  </p>
                  <h1
                    className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Post your service requirement, compare competitive bids, and hire trusted professionals.
                  </h1>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    ServiceBid connects homeowners and businesses with verified service providers across
                    electrical repairs, plumbing, carpentry, appliance servicing, and software setup.
                    Set your budget once, receive transparent quotes, and select the right specialist.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {currentUser?.role === 'customer' ? (
                      <button
                        onClick={() => navigate('post-service')}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
                      >
                        + Post a Service Requirement
                      </button>
                    ) : currentUser?.role === 'provider' ? (
                      <button
                        onClick={() => navigate('available-services')}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
                      >
                        Browse Available Services & Bid
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setAuthMode('login');
                            navigate('customer-auth');
                          }}
                          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
                        >
                          Customer Login / Register
                        </button>
                        <button
                          onClick={() => {
                            setAuthMode('login');
                            navigate('provider-auth');
                          }}
                          className="px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                        >
                          Service Provider Login / Register
                        </button>
                      </>
                    )}
                  </div>

                  {/* Unboxed Trust Metrics */}
                  <div className="pt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Verified Service Providers</span>
                    <span aria-hidden="true">·</span>
                    <span>Transparent Upfront Bidding</span>
                    <span aria-hidden="true">·</span>
                    <span>Direct Customer Selection</span>
                  </div>
                </div>

                {/* Right Column: Hero Image (16:9 Aspect Ratio Container) */}
                <div className="lg:col-span-5">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <div className="aspect-video w-full overflow-hidden">
                      <ServiceImage
                        src={HERO_IMAGE_URL}
                        alt="Verified service professional reviewing a digital service quote with a customer"
                        eager={true}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                      <span>Customer & Verified Technician Consultation</span>
                      <span className="font-mono tabular-nums text-slate-800 font-medium">
                        100% Upfront Quotes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Viva Role Switcher Bar */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-semibold text-slate-900">
                    One-Click Demo Logins (For College Viva & Testing)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Instantly sign in with pre-seeded SQLite accounts to demonstrate Customer, Provider, or Admin workflows:
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      handleQuickDemoLogin('aarav@customer.com', 'customer123', 'customer')
                    }
                    className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    Demo Customer (Aarav)
                  </button>
                  <button
                    onClick={() =>
                      handleQuickDemoLogin('meera@provider.com', 'provider123', 'provider')
                    }
                    className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    Demo Provider (Meera)
                  </button>
                  <button
                    onClick={() =>
                      handleQuickDemoLogin('admin@servicebid.com', 'admin123', 'admin')
                    }
                    className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    Demo Admin
                  </button>
                </div>
              </div>
            </section>

            {/* Service Categories Showcase with Relevant 4:3 Images */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Popular Service Categories
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select any category below to view open customer requirements and submit bids
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCategoryFilter('All');
                    navigate('available-services');
                  }}
                  className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                >
                  Browse All Categories →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {CATEGORY_SHOWCASE.map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => handleSelectCategory(cat.name)}
                    className="group cursor-pointer bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 transition-colors flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 border-b border-slate-200">
                      <ServiceImage
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1">{cat.providersText}</p>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>
                      <span className="inline-block text-xs font-semibold text-blue-700 mt-3">
                        View Requirements →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* How It Works (3-Step Editorial Numbering) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  01. Customer Posts Requirement
                </h3>
                <p className="text-sm text-slate-600">
                  Customers register and submit a service request specifying title, detailed scope,
                  category, target budget, and completion deadline.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  02. Professionals Submit Bids
                </h3>
                <p className="text-sm text-slate-600">
                  Verified service providers inspect open service requirements and submit competitive
                  bids with their quoted amount, delivery timeline, and message.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  03. Compare & Assign Provider
                </h3>
                <p className="text-sm text-slate-600">
                  Customers review all bids received on their requirement and select the most suitable
                  provider, automatically updating bid and service status in SQLite.
                </p>
              </div>
            </section>

            {/* Recent Open Services */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Latest Service Requirements
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live service posts fetched from SQLite database via GET /api/services
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCategoryFilter('All');
                    navigate('available-services');
                  }}
                  className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                >
                  View All Services ({services.length})
                </button>
              </div>

              {loading ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
                  Loading service requirements from SQLite...
                </div>
              ) : (
                <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
                  {services.slice(0, 4).map((service) => (
                    <div
                      key={service.id}
                      className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4 max-w-3xl">
                        <div className="w-full sm:w-28 aspect-[4/3] rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                          <ServiceImage
                            src={getCategoryImage(service.category)}
                            alt={service.category}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-base font-semibold text-slate-900">
                            {service.title}
                          </h3>
                          {/* Zero-Pill Unboxed Metadata */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{service.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>Posted by {service.customer_name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">Deadline: {service.deadline}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Status: <strong className="text-slate-700">{service.status}</strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {service.bid_count || 0} Bid(s) Received
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 pt-1">{service.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                        <div className="text-left md:text-right">
                          <span className="block text-xs text-slate-500">Customer Budget</span>
                          <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                            ₹{Number(service.budget).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {service.status === 'Open' ? (
                          <button
                            onClick={() => navigate('submit-bid', service.id)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
                          >
                            View & Submit Bid
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('submit-bid', service.id)}
                            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                          >
                            View Details ({service.status})
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================================================================
            2 & 3. CUSTOMER / SERVICE PROVIDER / ADMIN LOGIN & REGISTRATION
           =================================================================== */}
        {(currentPage === 'customer-auth' ||
          currentPage === 'provider-auth' ||
          currentPage === 'admin-auth') && (
          <div className="max-w-xl mx-auto">
            {/* Role Selector Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg mb-6">
              <button
                onClick={() => navigate('customer-auth')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  currentPage === 'customer-auth'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Customer Login / Register
              </button>
              <button
                onClick={() => navigate('provider-auth')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  currentPage === 'provider-auth'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Service Provider Login / Register
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  navigate('admin-auth');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  currentPage === 'admin-auth'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                10. Admin Login
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-8">
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {currentPage === 'customer-auth' &&
                      (authMode === 'login' ? 'Customer Login' : 'Customer Registration')}
                    {currentPage === 'provider-auth' &&
                      (authMode === 'login'
                        ? 'Service Provider Login'
                        : 'Service Provider Registration')}
                    {currentPage === 'admin-auth' && 'System Administrator Login'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentPage === 'customer-auth' &&
                      'Post service requirements, review provider bids, and assign professionals.'}
                    {currentPage === 'provider-auth' &&
                      'Browse open service requirements, submit competitive bids, and track bid status.'}
                    {currentPage === 'admin-auth' &&
                      'Manage registered users, service requirement posts, and submitted bids.'}
                  </p>
                </div>

                {currentPage !== 'admin-auth' && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                        authMode === 'login'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                        authMode === 'register'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>

              {/* LOGIN FORM */}
              {(authMode === 'login' || currentPage === 'admin-auth') && (
                <form
                  onSubmit={(e) =>
                    handleLoginSubmit(
                      e,
                      currentPage === 'customer-auth'
                        ? 'customer'
                        : currentPage === 'provider-auth'
                        ? 'provider'
                        : 'admin'
                    )
                  }
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={
                        currentPage === 'customer-auth'
                          ? 'aarav@customer.com'
                          : currentPage === 'provider-auth'
                          ? 'meera@provider.com'
                          : 'admin@servicebid.com'
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Sign In
                  </button>

                  {/* Pre-seeded Viva Account Fillers */}
                  <div className="pt-4 mt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">
                      Sample SQLite Database Credentials (Click to auto-login):
                    </p>
                    {currentPage === 'customer-auth' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickDemoLogin('aarav@customer.com', 'customer123', 'customer')
                          }
                          className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
                        >
                          aarav@customer.com / customer123
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickDemoLogin('priya@customer.com', 'customer123', 'customer')
                          }
                          className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
                        >
                          priya@customer.com / customer123
                        </button>
                      </div>
                    )}
                    {currentPage === 'provider-auth' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickDemoLogin('meera@provider.com', 'provider123', 'provider')
                          }
                          className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
                        >
                          meera@provider.com / provider123
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickDemoLogin('rohan@provider.com', 'provider123', 'provider')
                          }
                          className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
                        >
                          rohan@provider.com / provider123
                        </button>
                      </div>
                    )}
                    {currentPage === 'admin-auth' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickDemoLogin('admin@servicebid.com', 'admin123', 'admin')
                        }
                        className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
                      >
                        admin@servicebid.com / admin123
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* REGISTRATION FORM */}
              {authMode === 'register' && currentPage !== 'admin-auth' && (
                <form
                  onSubmit={(e) =>
                    handleRegisterSubmit(
                      e,
                      currentPage === 'customer-auth' ? 'customer' : 'provider'
                    )
                  }
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98200 12345"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {currentPage === 'provider-auth' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Primary Service Specialty / Skill *
                      </label>
                      <input
                        type="text"
                        required
                        value={regSpecialty}
                        onChange={(e) => setRegSpecialty(e.target.value)}
                        placeholder="e.g., Electrical & Repairs, Web Development, Plumbing"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Create Password (minimum 6 characters) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Create {currentPage === 'customer-auth' ? 'Customer' : 'Service Provider'}{' '}
                    Account
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            4. CUSTOMER DASHBOARD
           =================================================================== */}
        {currentPage === 'customer-dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-6">
              <div>
                <p className="text-xs text-slate-500">Customer Dashboard</p>
                <h1 className="text-xl font-bold text-slate-900">
                  Welcome, {currentUser?.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage your posted service requirements, compare bids received, and assign service
                  providers.
                </p>
              </div>
              <button
                onClick={() => navigate('post-service')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                + Post New Service Requirement
              </button>
            </div>

            {/* Customer Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Total Posted Services</span>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                  {services.length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Open for Bidding</span>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                  {services.filter((s) => s.status === 'Open').length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Assigned / Completed</span>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                  {services.filter((s) => s.status === 'Assigned' || s.status === 'Completed').length}
                </p>
              </div>
            </div>

            {/* Customer's Posted Services List */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  My Service Requirements
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {services.length} record(s)
                </span>
              </div>

              {services.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-600 mb-4">
                    You have not posted any service requirements yet.
                  </p>
                  <button
                    onClick={() => navigate('post-service')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                  >
                    Post Your First Service Requirement
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4 max-w-3xl">
                        <div className="w-full sm:w-28 aspect-[4/3] rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                          <ServiceImage
                            src={getCategoryImage(srv.category)}
                            alt={srv.category}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-base font-semibold text-slate-900">
                            {srv.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{srv.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">Deadline: {srv.deadline}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Status: <strong className="text-slate-800">{srv.status}</strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {srv.bid_count || 0} Bid(s) Received
                            </span>
                            {srv.lowest_bid && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums text-emerald-700 font-medium">
                                  Lowest Bid: ₹{Number(srv.lowest_bid).toLocaleString('en-IN')}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 pt-1">{srv.description}</p>
                          {srv.selected_provider_name && (
                            <p className="text-xs text-emerald-800 font-medium pt-1">
                              Assigned Service Provider: {srv.selected_provider_name} (
                              {srv.selected_provider_specialty || 'Verified Provider'})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <div className="mr-2">
                          <span className="block text-xs text-slate-500">Budget</span>
                          <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                            ₹{Number(srv.budget).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <button
                          onClick={() => navigate('customer-bids', srv.id)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
                        >
                          View Bids ({srv.bid_count || 0})
                        </button>

                        {srv.status === 'Assigned' && (
                          <button
                            onClick={() => handleUpdateServiceStatus(srv.id, 'Completed')}
                            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            6. POST SERVICE PAGE
           =================================================================== */}
        {currentPage === 'post-service' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-lg p-8">
            <div className="mb-6 pb-4 border-b border-slate-200">
              <p className="text-xs text-slate-500">Customer Action · POST /api/services</p>
              <h1 className="text-xl font-bold text-slate-900">
                Post a New Service Requirement
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Fill in your service requirement details. Registered service providers will be able
                to view this post and submit competitive bids.
              </p>
            </div>

            <form onSubmit={handlePostServiceSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Service Requirement Title *
                </label>
                <input
                  type="text"
                  required
                  minLength={5}
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g., Full Home Interior Painting for 2BHK Flat"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Estimated Budget (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step="1"
                    value={postBudget}
                    onChange={(e) => setPostBudget(e.target.value)}
                    placeholder="e.g., 15000"
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Completion Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={postDeadline}
                    onChange={(e) => setPostDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Detailed Scope & Service Description *
                </label>
                <textarea
                  rows={5}
                  required
                  minLength={15}
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Describe the exact work needed, materials expected, location details, and any specific requirements..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('customer-dashboard')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                >
                  Publish Service Requirement
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================================================================
            9. CUSTOMER BIDS PAGE (View Bids & Select Service Provider)
           =================================================================== */}
        {currentPage === 'customer-bids' && selectedService && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() =>
                  navigate(currentUser?.role === 'customer' ? 'customer-dashboard' : 'available-services')
                }
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                ← Back to Dashboard
              </button>
              <span className="text-xs text-slate-500 font-mono">
                Service ID #{selectedService.id}
              </span>
            </div>

            {/* Service Summary Header */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start gap-4 max-w-3xl">
                  <div className="w-full sm:w-32 aspect-[4/3] rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <ServiceImage
                      src={getCategoryImage(selectedService.category)}
                      alt={selectedService.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      {selectedService.category} · Posted by {selectedService.customer_name} ·
                      Deadline: {selectedService.deadline}
                    </p>
                    <h1 className="text-xl font-bold text-slate-900">
                      {selectedService.title}
                    </h1>
                    <p className="text-sm text-slate-600">{selectedService.description}</p>
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0">
                  <span className="block text-xs text-slate-500">Posted Budget</span>
                  <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    ₹{Number(selectedService.budget).toLocaleString('en-IN')}
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    Current Status: <strong>{selectedService.status}</strong>
                  </p>
                </div>
              </div>

              {selectedService.selected_provider_name && (
                <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
                  <div>
                    <strong>Selected Service Provider:</strong>{' '}
                    {selectedService.selected_provider_name} (
                    {selectedService.selected_provider_specialty}) · Phone:{' '}
                    {selectedService.selected_provider_phone || 'N/A'} · Email:{' '}
                    {selectedService.selected_provider_email || 'N/A'}
                  </div>
                  {selectedService.status === 'Assigned' && (
                    <button
                      onClick={() => handleUpdateServiceStatus(selectedService.id, 'Completed')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 whitespace-nowrap"
                    >
                      Mark Job as Completed
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bids Received Table / List */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    All Bids Received for This Service
                  </h2>
                  <p className="text-xs text-slate-500">
                    Compare bid amounts, delivery timelines, and provider experience before
                    selecting a provider.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  {(selectedService.bids || []).length} Bid(s)
                </span>
              </div>

              {!selectedService.bids || selectedService.bids.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No bids have been submitted for this service requirement yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {selectedService.bids.map((bid) => (
                    <div
                      key={bid.id}
                      className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {bid.provider_name}
                          </h3>
                          <span className="text-xs text-slate-500">
                            · {bid.provider_specialty || 'Verified Service Provider'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="tabular-nums">
                            Estimated Completion: {bid.delivery_days} Day(s)
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Phone: {bid.provider_phone || 'Not shared'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Email: {bid.provider_email}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Bid Status:{' '}
                            <strong
                              className={
                                bid.status === 'Accepted'
                                  ? 'text-emerald-700'
                                  : bid.status === 'Rejected'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }
                            >
                              {bid.status}
                            </strong>
                          </span>
                        </div>

                        <p className="text-sm text-slate-700 pt-1">{bid.message}</p>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                        <div className="text-left md:text-right">
                          <span className="block text-xs text-slate-500">Quoted Bid Amount</span>
                          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                            ₹{Number(bid.bid_amount).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {selectedService.status === 'Open' && bid.status === 'Pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptBid(bid.id, selectedService.id)}
                              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
                            >
                              Accept & Select Provider
                            </button>
                            <button
                              onClick={() => handleRejectBid(bid.id, selectedService.id)}
                              className="px-3 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            7. AVAILABLE SERVICES PAGE
           =================================================================== */}
        {currentPage === 'available-services' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500">Service Marketplace · GET /api/services</p>
                  <h1 className="text-xl font-bold text-slate-900">
                    Available Service Requirements
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Browse service requirements posted by customers and submit your competitive bid.
                  </p>
                </div>

                {currentUser?.role === 'customer' && (
                  <button
                    onClick={() => navigate('post-service')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
                  >
                    + Post New Service
                  </button>
                )}
              </div>

              {/* Filter & Search Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Search Keyword
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, category, description..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Filter
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="All">All Categories</option>
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open for Bidding</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Service Cards List */}
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
              {filteredServices.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No service requirements match your current filter criteria.
                </div>
              ) : (
                filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-4 max-w-3xl">
                      <div className="w-full sm:w-28 aspect-[4/3] rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                        <ServiceImage
                          src={getCategoryImage(service.category)}
                          alt={service.category}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-base font-semibold text-slate-900">
                          {service.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{service.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>Customer: {service.customer_name}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">Deadline: {service.deadline}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Status: <strong className="text-slate-800">{service.status}</strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{service.bid_count || 0} Bid(s)</span>
                        </div>
                        <p className="text-sm text-slate-600 pt-1">{service.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                      <div className="text-left md:text-right">
                        <span className="block text-xs text-slate-500">Customer Budget</span>
                        <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                          ₹{Number(service.budget).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentUser?.role === 'customer' &&
                        currentUser.id === service.customer_id ? (
                          <button
                            onClick={() => navigate('customer-bids', service.id)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
                          >
                            Manage Bids ({service.bid_count || 0})
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('submit-bid', service.id)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
                          >
                            {service.status === 'Open' ? 'Submit Bid' : 'View Requirement'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            8. SUBMIT BID PAGE
           =================================================================== */}
        {currentPage === 'submit-bid' && selectedService && (
          <div className="space-y-6">
            <button
              onClick={() => navigate('available-services')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to Available Services
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: Service Details & Existing Bids */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                    <div className="w-full sm:w-32 aspect-[4/3] rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      <ServiceImage
                        src={getCategoryImage(selectedService.category)}
                        alt={selectedService.category}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1 text-xs text-slate-500">
                        <span>
                          {selectedService.category} · Posted by {selectedService.customer_name}
                        </span>
                        <span className="font-mono tabular-nums">
                          Deadline: {selectedService.deadline}
                        </span>
                      </div>
                      <h1 className="text-xl font-bold text-slate-900 mb-2">
                        {selectedService.title}
                      </h1>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {selectedService.description}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                    <span>
                      Status: <strong>{selectedService.status}</strong>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      Customer Budget: ₹{Number(selectedService.budget).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Current Bids on this Requirement */}
                <div className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      Submitted Bids on This Requirement
                    </h2>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {(selectedService.bids || []).length} Bid(s)
                    </span>
                  </div>
                  {!selectedService.bids || selectedService.bids.length === 0 ? (
                    <div className="p-6 text-xs text-slate-500">
                      Be the first service provider to submit a bid on this requirement.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {selectedService.bids.map((b) => (
                        <div key={b.id} className="p-5 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {b.provider_name}{' '}
                              <span className="font-normal text-xs text-slate-500">
                                · {b.provider_specialty}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                              Delivery: {b.delivery_days} day(s) · Status: {b.status}
                            </p>
                            <p className="text-xs text-slate-600 mt-2">{b.message}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                              ₹{Number(b.bid_amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Submit Bid Form */}
              <div className="bg-white border border-slate-200 rounded-lg p-6 h-fit">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Submit Your Bid
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  POST /api/bids · Provide a competitive quote and clear proposal message.
                </p>

                {selectedService.status !== 'Open' ? (
                  <div className="p-4 bg-slate-100 rounded-lg text-xs text-slate-700">
                    Bidding is closed for this service requirement ({selectedService.status}).
                  </div>
                ) : !currentUser || currentUser.role !== 'provider' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You must be logged in as a <strong>Service Provider</strong> to submit a bid
                      on this requirement.
                    </p>
                    <button
                      onClick={() => navigate('provider-auth')}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                    >
                      Service Provider Login / Register
                    </button>
                    <button
                      onClick={() =>
                        handleQuickDemoLogin('meera@provider.com', 'provider123', 'provider')
                      }
                      className="w-full py-2 px-4 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Quick Demo Login as Meera (Provider)
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitBid} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Your Bid Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min={50}
                        step="1"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estimated Completion Days *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={365}
                        value={bidDays}
                        onChange={(e) => setBidDays(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Proposal Message to Customer *
                      </label>
                      <textarea
                        rows={4}
                        required
                        minLength={10}
                        value={bidMessage}
                        onChange={(e) => setBidMessage(e.target.value)}
                        placeholder="Explain your relevant experience, what is included in your quote, and how soon you can start..."
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
                    >
                      Submit Bid Proposal
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            5. SERVICE PROVIDER DASHBOARD (View Submitted Bids & Status)
           =================================================================== */}
        {currentPage === 'provider-dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-6">
              <div>
                <p className="text-xs text-slate-500">
                  Service Provider Dashboard · Specialty:{' '}
                  {currentUser?.specialty || 'General Services'}
                </p>
                <h1 className="text-xl font-bold text-slate-900">
                  Welcome, {currentUser?.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track all bids you have submitted and check whether customers have accepted your
                  proposals.
                </p>
              </div>
              <button
                onClick={() => navigate('available-services')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
              >
                Browse Available Services
              </button>
            </div>

            {/* Provider Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Total Submitted Bids</span>
                <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                  {providerBids.length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Pending Review</span>
                <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                  {providerBids.filter((b) => b.status === 'Pending').length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Accepted / Awarded Contracts</span>
                <p className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                  {providerBids.filter((b) => b.status === 'Accepted').length}
                </p>
              </div>
            </div>

            {/* Provider Bids Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  My Submitted Bids & Status
                </h2>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {providerBids.length} bid(s)
                </span>
              </div>

              {providerBids.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-600 mb-4">
                    You have not submitted any bids yet.
                  </p>
                  <button
                    onClick={() => navigate('available-services')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg"
                  >
                    Explore Open Service Requirements
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Service Requirement</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4 text-right">Customer Budget</th>
                        <th className="py-3 px-4 text-right">My Bid Amount</th>
                        <th className="py-3 px-4">Bid Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {providerBids.map((bid) => (
                        <tr key={bid.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{bid.service_title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {bid.service_category} · Deadline: {bid.service_deadline} · Delivery:{' '}
                              {bid.delivery_days}d
                            </p>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                              Proposal: "{bid.message}"
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-700">
                            <p className="font-medium text-slate-900">{bid.customer_name}</p>
                            {bid.status === 'Accepted' && (
                              <p className="text-emerald-700 font-mono mt-0.5">
                                {bid.customer_phone}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                            ₹{Number(bid.service_budget).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                            ₹{Number(bid.bid_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold">
                            <span
                              className={
                                bid.status === 'Accepted'
                                  ? 'text-emerald-700'
                                  : bid.status === 'Rejected'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }
                            >
                              {bid.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => navigate('submit-bid', bid.service_id)}
                              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                            >
                              View Service
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            10, 11, 12. ADMIN DASHBOARD, USER MANAGEMENT, SERVICE & BID MANAGEMENT
           =================================================================== */}
        {(currentPage === 'admin-dashboard' ||
          currentPage === 'admin-users' ||
          currentPage === 'admin-services-bids') &&
          adminData && (
            <div className="space-y-6">
              {/* Admin Top Header */}
              <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    System Administration Console · GET /api/admin/overview
                  </p>
                  <h1 className="text-xl font-bold text-slate-900">
                    Admin Control Panel
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitor platform activity and manage registered users, service requirement
                    posts, and provider bids.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleResetDemoDatabase}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Reset Viva Demo Database
                  </button>
                </div>
              </div>

              {/* Admin Sub-Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
                <button
                  onClick={() => navigate('admin-dashboard')}
                  className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    currentPage === 'admin-dashboard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  10. Admin Overview
                </button>
                <button
                  onClick={() => navigate('admin-users')}
                  className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    currentPage === 'admin-users'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  11. User Management ({adminData.users.length})
                </button>
                <button
                  onClick={() => navigate('admin-services-bids')}
                  className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    currentPage === 'admin-services-bids'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  12. Service & Bid Management ({adminData.services.length} /{' '}
                  {adminData.bids.length})
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">Total Registered Users</span>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {adminData.stats.total_users}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {adminData.stats.total_customers} Customers · {adminData.stats.total_providers}{' '}
                    Providers
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">Total Service Posts</span>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {adminData.stats.total_services}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {adminData.stats.open_services} Open · {adminData.stats.assigned_services}{' '}
                    Assigned
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">Total Submitted Bids</span>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {adminData.stats.total_bids}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {adminData.stats.accepted_bids} Accepted Bids
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">Database Engine</span>
                  <p className="text-lg font-bold text-slate-900 font-mono mt-1">
                    SQLite3
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    3 Relational Tables (FK ON)
                  </p>
                </div>
              </div>

              {/* 11. USER MANAGEMENT TABLE */}
              {(currentPage === 'admin-dashboard' || currentPage === 'admin-users') && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        User Management (Customers, Service Providers & Admins)
                      </h2>
                      <p className="text-xs text-slate-500">
                        SQLite Table: <code className="font-mono">users</code> · DELETE
                        /api/admin/users/&lt;id&gt;
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Phone / Specialty</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {adminData.users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                              #{u.id}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-600">
                              {u.email}
                            </td>
                            <td className="py-3 px-4 capitalize text-xs font-semibold text-slate-800">
                              {u.role}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">
                              {u.phone || '—'}
                              {u.specialty ? ` · ${u.specialty}` : ''}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {u.role !== 'admin' ? (
                                <button
                                  onClick={() => handleAdminDeleteUser(u.id)}
                                  className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 whitespace-nowrap"
                                >
                                  Delete User
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">System Admin</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 12. SERVICE & BID MANAGEMENT TABLES */}
              {(currentPage === 'admin-dashboard' || currentPage === 'admin-services-bids') && (
                <>
                  {/* Services Table */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Service Post Management
                        </h2>
                        <p className="text-xs text-slate-500">
                          SQLite Table: <code className="font-mono">services</code> · DELETE
                          /api/admin/services/&lt;id&gt;
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">ID</th>
                            <th className="py-3 px-4">Service Title & Category</th>
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4 text-right">Budget</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {adminData.services.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                                #{s.id}
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-900">{s.title}</p>
                                <p className="text-xs text-slate-500">
                                  {s.category} · Deadline: {s.deadline} · {s.bid_count || 0} Bid(s)
                                </p>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-700">
                                {s.customer_name}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                                ₹{Number(s.budget).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                                {s.status}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => navigate('customer-bids', s.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:underline"
                                >
                                  Inspect
                                </button>
                                <button
                                  onClick={() => handleAdminDeleteService(s.id)}
                                  className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bids Table */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Submitted Bids Management
                        </h2>
                        <p className="text-xs text-slate-500">
                          SQLite Table: <code className="font-mono">bids</code> · DELETE
                          /api/admin/bids/&lt;id&gt;
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">ID</th>
                            <th className="py-3 px-4">Service Requirement</th>
                            <th className="py-3 px-4">Service Provider</th>
                            <th className="py-3 px-4 text-right">Bid Amount</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {adminData.bids.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                                #{b.id}
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-medium text-slate-900">{b.service_title}</p>
                                <p className="text-xs text-slate-500 line-clamp-1">{b.message}</p>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-700">
                                {b.provider_name} ({b.provider_specialty})
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                                ₹{Number(b.bid_amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold">
                                <span
                                  className={
                                    b.status === 'Accepted'
                                      ? 'text-emerald-700'
                                      : b.status === 'Rejected'
                                      ? 'text-red-700'
                                      : 'text-amber-700'
                                  }
                                >
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleAdminDeleteBid(b.id)}
                                  className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 whitespace-nowrap"
                                >
                                  Delete Bid
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        {/* ===================================================================
            14, 15, 16. COLLEGE VIVA GUIDE & ORGANIZED SOURCE CODE VIEWER
           =================================================================== */}
        {currentPage === 'project-code' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                College Viva Guide & Project Architecture
              </h1>
              <p className="text-sm text-slate-600">
                This project is organized into three clear sections (<strong>frontend/</strong>,{' '}
                <strong>backend/</strong>, and <strong>database/</strong>) so you can easily explain
                the database schema, Flask REST APIs, and frontend Fetch logic during your viva.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">1. Database Layer (SQLite3)</h3>
                  <p className="text-slate-600">
                    <code className="font-mono">database/schema.sql</code> &{' '}
                    <code className="font-mono">database/init_db.py</code> create{' '}
                    <code className="font-mono">servicebid.db</code> with 3 relational tables:{' '}
                    <code className="font-mono">users</code>,{' '}
                    <code className="font-mono">services</code>, and{' '}
                    <code className="font-mono">bids</code> with Foreign Keys.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">2. Backend Layer (Python Flask)</h3>
                  <p className="text-slate-600">
                    <code className="font-mono">backend/app.py</code> exposes REST API endpoints
                    using Python <code className="font-mono">sqlite3</code> & Flask JSON responses,
                    handling authentication, service creation, bidding, and admin actions.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">
                    3. Frontend Layer (HTML/CSS/JS)
                  </h3>
                  <p className="text-slate-600">
                    <code className="font-mono">frontend/index.html</code>,{' '}
                    <code className="font-mono">style.css</code>, and{' '}
                    <code className="font-mono">script.js</code> use asynchronous{' '}
                    <code className="font-mono">fetch()</code> calls to communicate with the REST
                    endpoints.
                  </p>
                </div>
              </div>
            </div>

            {/* REST API Reference Table for Viva */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">
                  REST API Endpoints Reference (Feature #15)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                      <th className="py-2.5 px-4">HTTP Method</th>
                      <th className="py-2.5 px-4">Endpoint Path</th>
                      <th className="py-2.5 px-4">Controller Function</th>
                      <th className="py-2.5 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-blue-700">POST</td>
                      <td className="py-2.5 px-4">/api/register</td>
                      <td className="py-2.5 px-4">api_register_user()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Registers a new Customer or Service Provider in SQLite
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-blue-700">POST</td>
                      <td className="py-2.5 px-4">/api/login</td>
                      <td className="py-2.5 px-4">api_login_user()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Authenticates user credentials and role
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">GET</td>
                      <td className="py-2.5 px-4">/api/services</td>
                      <td className="py-2.5 px-4">api_get_services()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Lists service requirements with bid counts and filters
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-blue-700">POST</td>
                      <td className="py-2.5 px-4">/api/services</td>
                      <td className="py-2.5 px-4">api_create_service()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Allows a Customer to post a new service requirement
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">GET</td>
                      <td className="py-2.5 px-4">/api/services/&lt;id&gt;</td>
                      <td className="py-2.5 px-4">api_get_service_detail()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Fetches a service post and all bids submitted for it
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-blue-700">POST</td>
                      <td className="py-2.5 px-4">/api/bids</td>
                      <td className="py-2.5 px-4">api_submit_bid()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Allows a Service Provider to submit or update a bid
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-blue-700">POST</td>
                      <td className="py-2.5 px-4">/api/bids/&lt;id&gt;/accept</td>
                      <td className="py-2.5 px-4">api_select_bid()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Customer selects provider; marks service Assigned and bid Accepted
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">GET</td>
                      <td className="py-2.5 px-4">/api/provider/&lt;id&gt;/bids</td>
                      <td className="py-2.5 px-4">api_get_provider_bids()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Returns all bids submitted by a specific Service Provider
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">GET</td>
                      <td className="py-2.5 px-4">/api/admin/overview</td>
                      <td className="py-2.5 px-4">api_get_admin_overview()</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        Returns all users, services, bids, and platform stats for Admin
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Source Files Inspector */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
                {projectFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setActiveCodeFile(file.path)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                      activeCodeFile === file.path
                        ? 'bg-blue-700 text-white font-semibold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>

              {projectFiles
                .filter((f) => f.path === activeCodeFile)
                .map((file) => (
                  <div key={file.path}>
                    <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Section: <strong className="text-slate-800">{file.section}</strong> · File:{' '}
                        <code className="font-mono text-slate-900">{file.path}</code>
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(file.content);
                          showNotice('success', `Copied ${file.path} to clipboard!`);
                        }}
                        className="px-3 py-1 font-sans font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                      >
                        Copy Code
                      </button>
                    </div>
                    <pre className="p-6 text-xs font-mono text-slate-800 bg-slate-50/50 overflow-x-auto leading-relaxed max-h-[600px]">
                      {file.content}
                    </pre>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          QUIET FOOTER
         ===================================================================== */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>ServiceBid – Online Service Bidding System (Python Flask + SQLite3 + REST API)</span>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('home')} className="hover:text-slate-900">
              Home
            </button>
            <button
              onClick={() => {
                setCategoryFilter('All');
                navigate('available-services');
              }}
              className="hover:text-slate-900"
            >
              Available Services
            </button>
            <button onClick={() => navigate('project-code')} className="hover:text-slate-900">
              Viva & Source Code
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
