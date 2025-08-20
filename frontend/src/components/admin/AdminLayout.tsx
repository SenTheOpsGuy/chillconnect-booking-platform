import React, { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;