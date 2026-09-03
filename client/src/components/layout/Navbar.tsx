import React, { useState, useRef, useEffect } from "react";
import { Project, User } from "../../types";
import { Avatar } from "../common/Avatar";
import { 
  FolderKanban, 
  Plus, 
  ChevronDown, 
  Users, 
  LayoutDashboard, 
  KanbanSquare,
  LogOut,
  Shield,
  ShieldCheck,
  Crown,
  Tags,
  Menu,
  X,
} from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";

interface NavbarProps {
  projects: Project[];
  selectedProject: Project | null;
  isGlobalView: boolean;
  isTeamView?: boolean;
  isCategoryMasterView?: boolean;
  currentUser: User | null;
  canManageUsers: boolean;
  canCreateProject: boolean;
  canCrudTask?: boolean;
  canEditContent: boolean;
  isViewer: boolean;
  onSelectGlobalView: () => void;
  onSelectTeamView: () => void;
  onSelectCategoryMasterView: () => void;
  onSelectProject: (p: Project) => void;
  onSelectTask?: (projectId: string, taskId: string) => void;
  onOpenCreateProject: () => void;
  onOpenCreateTask: () => void;
  onOpenCreateBOM: () => void;
  onOpenCreateIssue: () => void;
  onOpenAccountSecurityModal: () => void;
  onLogout: () => void;
}

export function Navbar({
  projects,
  selectedProject,
  isGlobalView,
  isTeamView = false,
  isCategoryMasterView = false,
  currentUser,
  canManageUsers,
  canCreateProject,
  canCrudTask = false,
  canEditContent,
  isViewer,
  onSelectGlobalView,
  onSelectTeamView,
  onSelectCategoryMasterView,
  onSelectProject,
  onSelectTask,
  onOpenCreateProject,
  onOpenCreateTask,
  onOpenCreateBOM,
  onOpenCreateIssue,
  onOpenAccountSecurityModal,
  onLogout,
}: NavbarProps) {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "owner":
        return "Owner";
      case "pm":
      case "project_manager":
        return "Project Manager (PM)";
      case "karyawan":
      case "engineer":
        return "Karyawan";
      case "magang":
      case "viewer":
        return "Magang";
      default:
        return "Member";
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand Logo & Segmented Nav */}
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <div
              onClick={onSelectGlobalView}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              title="Dashboard Utama"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center shadow-xs font-bold transition-colors">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                  FSI
                </span>
                <span className="text-[10px] block text-slate-400 font-medium -mt-1 tracking-wider uppercase">
                  Fortunet Solusi Indonesia
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            {/* Desktop Navigation Segmented Pill */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {/* 1. Dashboard Utama */}
              <button
                type="button"
                onClick={onSelectGlobalView}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isGlobalView && !isTeamView && !isCategoryMasterView
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard Utama</span>
              </button>

              {/* 2. Project Dropdown */}
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    !isGlobalView && !isTeamView && !isCategoryMasterView && selectedProject
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <KanbanSquare className="w-3.5 h-3.5" />
                  <span className="max-w-[150px] truncate">
                    {!isGlobalView && !isTeamView && !isCategoryMasterView && selectedProject ? selectedProject.name : "Pilih Proyek"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {projectDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Daftar Proyek
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(p);
                            setProjectDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            !isGlobalView && !isTeamView && !isCategoryMasterView && selectedProject?.id === p.id ? "bg-blue-50/60 font-medium" : ""
                          }`}
                        >
                          <div className="truncate pr-2">
                            <p className="text-xs text-slate-800 font-medium truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.code}</p>
                          </div>
                          {!isGlobalView && !isTeamView && !isCategoryMasterView && selectedProject?.id === p.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    {canCreateProject && (
                      <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProjectDropdownOpen(false);
                            onOpenCreateProject();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Buat Proyek Baru
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Kelola Tim & Hak Akses Nav Pill */}
              <button
                type="button"
                onClick={onSelectTeamView}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isTeamView
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{canManageUsers ? "Kelola Tim & Hak Akses" : "Daftar Tim"}</span>
              </button>

              {/* 4. Master Kategori Nav Pill */}
              <button
                type="button"
                onClick={onSelectCategoryMasterView}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isCategoryMasterView
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Tags className="w-3.5 h-3.5" />
                <span>Master Kategori</span>
              </button>
            </div>
          </div>

          {/* Right Actions & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 🔔 Notification Bell Dropdown */}
            {currentUser && (
              <NotificationDropdown onSelectTask={onSelectTask || (() => {})} />
            )}

            {/* User Profile Dropdown */}
            {currentUser && (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <Avatar
                    name={currentUser.name}
                    color={currentUser.avatar_color}
                    size="sm"
                  />
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium capitalize leading-tight">
                      {getRoleLabel(currentUser.role)}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          {currentUser.role.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate">
                          {currentUser.job_title}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAccountSecurityModal();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Keamanan & Akun</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 py-3 space-y-3 animate-in fade-in">
            {/* View Switcher Mobile */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSelectGlobalView();
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  isGlobalView && !isTeamView && !isCategoryMasterView
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTeamView();
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  isTeamView
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tim</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectCategoryMasterView();
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  isCategoryMasterView
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Tags className="w-3.5 h-3.5" />
                <span>Kategori</span>
              </button>
            </div>

            {/* Mobile Project Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Pilih Proyek
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(p);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors ${
                      !isGlobalView && !isTeamView && selectedProject?.id === p.id
                        ? "bg-blue-50 text-blue-900 font-semibold border border-blue-200"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="truncate">
                      <span className="block font-medium">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.code}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {canCreateProject && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCreateProject();
                }}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Proyek Baru</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
