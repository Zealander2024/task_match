import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

interface TableSectionProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function Table({ children, className = '', ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-sm text-left ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }: TableSectionProps) {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-700 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }: TableSectionProps) {
  return (
    <tbody className={`bg-white dark:bg-gray-800 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', ...props }: TableRowProps) {
  return (
    <tr 
      className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${className}`} 
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }: TableCellProps) {
  return (
    <th 
      className={`px-6 py-3 font-medium text-gray-900 dark:text-white ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }: TableCellProps) {
  return (
    <td 
      className={`px-6 py-4 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
