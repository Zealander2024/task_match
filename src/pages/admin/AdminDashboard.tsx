import React from 'react';
import { Card } from '../../components/ui/card';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Users, Briefcase, FileText, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Clock 
} from 'lucide-react';

export function AdminDashboard() {
  const { isDarkMode } = useTheme();

  const stats = [
    {
      title: 'Job Posts',
      value: '24',
      change: '+12%',
      trend: 'up',
      description: 'Active job posts',
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Employers',
      value: '12',
      change: '+5%',
      trend: 'up',
      description: 'Registered employers',
      icon: Briefcase,
      color: 'green'
    },
    {
      title: 'Applications',
      value: '48',
      change: '-3%',
      trend: 'down',
      description: 'Total applications',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Conversion Rate',
      value: '8.5%',
      change: '+2.1%',
      trend: 'up',
      description: 'Application success rate',
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  const recentActivity = [
    {
      action: 'New job post created',
      details: 'Senior Developer at Tech Corp',
      time: '2h ago',
      type: 'job'
    },
    {
      action: 'New employer registered',
      details: 'Innovation Labs Inc.',
      time: '3h ago',
      type: 'employer'
    },
    {
      action: 'Application submitted',
      details: 'Frontend Developer position',
      time: '4h ago',
      type: 'application'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track and manage your platform's performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select className="block w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                  </div>
                  <div className={`flex items-center text-sm ${
                    stat.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change}
                    {stat.trend === 'up' ? 
                      <ArrowUpRight className="h-4 w-4 ml-1" /> : 
                      <ArrowDownRight className="h-4 w-4 ml-1" />
                    }
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stat.title}
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {stat.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <div className="mt-6 space-y-4">
              {recentActivity.map((activity, index) => (
                <div 
                  key={index}
                  className="flex items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.details}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h3>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button className="flex flex-col items-start p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-150">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h4 className="mt-4 font-medium text-blue-700 dark:text-blue-400">
                  Create Job Post
                </h4>
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-300">
                  Post a new job listing
                </p>
              </button>
              <button className="flex flex-col items-start p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-150">
                <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h4 className="mt-4 font-medium text-green-700 dark:text-green-400">
                  Add Employer
                </h4>
                <p className="mt-1 text-sm text-green-600 dark:text-green-300">
                  Register new employer
                </p>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


