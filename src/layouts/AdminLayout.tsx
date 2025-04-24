import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Users,
  Briefcase,
  Settings,
  FileText,
  LogOut,
  User,
  BarChart,
  ChevronRight,
  Menu,
  X,
  Bell,
  Search,
} from 'lucide-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { adminSignOut } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/admin/dashboard', 
      icon: BarChart,
      description: 'Overview and analytics'
    },
    { 
      name: 'Employers', 
      href: '/admin/employers', 
      icon: Briefcase,
      description: 'Manage employer accounts'
    },
    { 
      name: 'Job Seekers', 
      href: '/admin/job-seekers', 
      icon: Users,
      description: 'Manage job seeker profiles'
    },
    { 
      name: 'Job Posts', 
      href: '/admin/job-posts', 
      icon: FileText,
      description: 'Review and manage job listings'
    },
    { 
      name: 'Reports', 
      href: '/admin/reports', 
      icon: BarChart,
      description: 'Analytics and statistics'
    },
    { 
      name: 'Profile', 
      href: '/admin/profile', 
      icon: User,
      description: 'Your admin profile'
    },
    { 
      name: 'Settings', 
      href: '/admin/settings', 
      icon: Settings,
      description: 'System configuration'
    },
  ];

  const handleSignOut = async () => {
    await adminSignOut();
    navigate('/admin/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <span className="text-lg font-bold text-white">A</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-800 dark:text-white">Admin</span>
          </div>
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700">
            <Bell className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-800 transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
        transition duration-300 ease-in-out
        border-r border-gray-200 dark:border-gray-700
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <span className="ml-3 text-xl font-semibold text-gray-800 dark:text-white">Admin Panel</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 space-y-1 overflow-y-auto">
          <nav className="mt-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg
                    transition-all duration-200 group relative
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 transition-colors duration-200
                    ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400'}
                  `} />
                  <div className="flex flex-col flex-1">
                    <span className="truncate">{item.name}</span>
                    <span className={`
                      text-xs truncate transition-colors duration-200
                      ${isActive ? 'text-blue-500 dark:text-blue-300' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400'}
                    `}>
                      {item.description}
                    </span>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sign Out Button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="flex items-center">
              <LogOut className="w-5 h-5 mr-3 text-gray-400" />
              <span>Sign Out</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 lg:pl-72">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700">
              <Bell className="h-6 w-6" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

