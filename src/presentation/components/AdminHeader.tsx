import React from 'react';

interface AdminHeaderProps {
  title: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title }) => {
  return (
    <header className="bg-white shadow-sm px-8 py-5 flex justify-between items-center z-10">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <div className="flex items-center gap-4 text-slate-500">
        <span className="text-sm font-medium">Data base: Abril / 2026</span>
        <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
          <i className="ph ph-bell text-xl"></i>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;