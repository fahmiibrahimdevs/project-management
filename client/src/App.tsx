import React, { useState, useEffect, useCallback } from "react";
import { useAuth, AuthProvider } from "./context/AuthContext";
import { useProjects, useProject, useMembers, useTasks } from "./api/client";
import { Project, Task, TaskStatus, ActiveTab } from "./types";
import { LoginPage } from "./components/auth/LoginPage";
import { AccountSecurityModal } from "./components/auth/AccountSecurityModal";
import { Navbar } from "./components/layout/Navbar";
import { ProjectHeader } from "./components/layout/ProjectHeader";
import { GlobalDashboard } from "./components/dashboard/GlobalDashboard";
import { TeamManagementPage } from "./components/team/TeamManagementPage";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { TaskListView } from "./components/kanban/TaskListView";
import { TaskDetailModal } from "./components/kanban/TaskDetailModal";
import { TaskCreateModal } from "./components/kanban/TaskCreateModal";
import { BOMView } from "./components/bom/BOMView";
import { BOMModal } from "./components/bom/BOMModal";
import { IssueLogView } from "./components/issues/IssueLogView";
import { ProjectModal } from "./components/project/ProjectModal";
import { ProjectPersonnelModal } from "./components/project/ProjectPersonnelModal";
import { ProjectTeamTab } from "./components/project/ProjectTeamTab";
import { ProjectAttachmentsTab } from "./components/attachments/ProjectAttachmentsTab";
import { BOMCategoryMasterPage } from "./components/bom/BOMCategoryMasterPage";
import { FolderKanban, Plus } from "lucide-react";

// Helper to initialize navigation from URL or LocalStorage
function getInitialNavState() {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlProject = params.get("project");
    const urlTab = params.get("tab") as ActiveTab | null;
    const urlView = params.get("view");

    if (urlView === "team") {
      return {
        isGlobalView: false,
        isTeamView: true,
        isCategoryMasterView: false,
        selectedProjectId: "",
        activeTab: "kanban" as const,
      };
    }

    if (urlView === "categories") {
      return {
        isGlobalView: false,
        isTeamView: false,
        isCategoryMasterView: true,
        selectedProjectId: "",
        activeTab: "kanban" as const,
      };
    }

    if (urlProject) {
      return {
        isGlobalView: false,
        isTeamView: false,
        isCategoryMasterView: false,
        selectedProjectId: urlProject,
        activeTab: urlTab || "kanban",
      };
    }

    if (urlView === "global") {
      return {
        isGlobalView: true,
        isTeamView: false,
        isCategoryMasterView: false,
        selectedProjectId: "",
        activeTab: "kanban" as const,
      };
    }

    const saved = localStorage.getItem("protrack_nav");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        isGlobalView: !!parsed.isGlobalView,
        isTeamView: !!parsed.isTeamView,
        isCategoryMasterView: !!parsed.isCategoryMasterView,
        selectedProjectId: parsed.selectedProjectId || "",
        activeTab: (parsed.activeTab as any) || "kanban",
      };
    }
  } catch {}

  return {
    isGlobalView: true,
    isTeamView: false,
    isCategoryMasterView: false,
    selectedProjectId: "",
    activeTab: "kanban" as const,
  };
}

function MainAppContent() {
  const { 
    user, 
    logout, 
    isLoading: isAuthLoading,
    canManageUsers,
    canCreateProject,
    canEditProject,
    canCrudTask,
    canEditContent,
    isSuperUser,
    isViewer
  } = useAuth();

  const { data: projects = [], isLoading: isLoadingProjects } = useProjects();
  const { data: rawMembers = [] } = useMembers();

  // Navigation state (Initialized from URL or LocalStorage)
  const initialNav = getInitialNavState();
  const [isGlobalView, setIsGlobalView] = useState<boolean>(initialNav.isGlobalView);
  const [isTeamView, setIsTeamView] = useState<boolean>(initialNav.isTeamView);
  const [isCategoryMasterView, setIsCategoryMasterView] = useState<boolean>(initialNav.isCategoryMasterView || false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialNav.selectedProjectId);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialNav.activeTab);

  // Modals state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskInitialStatus, setCreateTaskInitialStatus] = useState<TaskStatus>("backlog");

  const [isCreateBOMOpen, setIsCreateBOMOpen] = useState(false);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isAccountSecurityOpen, setIsAccountSecurityOpen] = useState(false);

  // Set default selected project ID if none selected and not explicitly in global, team, or category view
  useEffect(() => {
    if (projects.length > 0) {
      if (!selectedProjectId && !isGlobalView && !isTeamView && !isCategoryMasterView) {
        setSelectedProjectId(projects[0].id);
      } else if (selectedProjectId) {
        const exists = projects.some((p) => p.id === selectedProjectId);
        if (!exists) {
          setSelectedProjectId(projects[0].id);
        }
      }
    }
  }, [projects, selectedProjectId, isGlobalView, isTeamView, isCategoryMasterView]);

  // Sync state to URL and LocalStorage on change
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (isCategoryMasterView) {
        url.searchParams.set("view", "categories");
        url.searchParams.delete("project");
        url.searchParams.delete("tab");
      } else if (isTeamView) {
        url.searchParams.set("view", "team");
        url.searchParams.delete("project");
        url.searchParams.delete("tab");
      } else if (isGlobalView) {
        url.searchParams.set("view", "global");
        url.searchParams.delete("project");
        url.searchParams.delete("tab");
      } else if (selectedProjectId) {
        url.searchParams.delete("view");
        url.searchParams.set("project", selectedProjectId);
        url.searchParams.set("tab", activeTab);
      }
      window.history.replaceState(null, "", url.toString());

      localStorage.setItem(
        "protrack_nav",
        JSON.stringify({
          isGlobalView,
          isTeamView,
          isCategoryMasterView,
          selectedProjectId,
          activeTab,
        })
      );
    } catch {}
  }, [isGlobalView, isTeamView, isCategoryMasterView, selectedProjectId, activeTab]);

  const { data: activeProject } = useProject(selectedProjectId || undefined);
  const { data: tasks = [] } = useTasks(selectedProjectId || undefined);

  // Unified available members list
  const allMembers = rawMembers.length > 0 ? rawMembers : (activeProject?.members || []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSelectProjectFromGlobal = (
    projectId: string,
    targetTab: ActiveTab = "kanban"
  ) => {
    setSelectedProjectId(projectId);
    setActiveTab(targetTab);
    setIsGlobalView(false);
    setIsTeamView(false);
    setIsCategoryMasterView(false);
  };

  const handleSelectProjectFromNavbar = (p: Project) => {
    setSelectedProjectId(p.id);
    setIsGlobalView(false);
    setIsTeamView(false);
    setIsCategoryMasterView(false);
  };

  const handleOpenNewProject = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = () => {
    if (activeProject) {
      setProjectToEdit(activeProject);
      setIsProjectModalOpen(true);
    }
  };

  const handleOpenCreateTask = (status: TaskStatus = "backlog") => {
    setCreateTaskInitialStatus(status);
    setIsCreateTaskOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Main Navigation Bar */}
      <Navbar
        projects={projects}
        selectedProject={activeProject || null}
        isGlobalView={isGlobalView}
        isTeamView={isTeamView}
        isCategoryMasterView={isCategoryMasterView}
        currentUser={user}
        canManageUsers={canManageUsers}
        canCreateProject={canCreateProject}
        canCrudTask={canCrudTask}
        canEditContent={canEditContent}
        isViewer={isViewer}
        onSelectGlobalView={() => {
          setIsCategoryMasterView(false);
          setIsTeamView(false);
          setIsGlobalView(true);
        }}
        onSelectTeamView={() => {
          setIsCategoryMasterView(false);
          setIsTeamView(true);
          setIsGlobalView(false);
        }}
        onSelectCategoryMasterView={() => {
          setIsCategoryMasterView(true);
          setIsTeamView(false);
          setIsGlobalView(false);
        }}
        onSelectProject={handleSelectProjectFromNavbar}
        onOpenCreateProject={handleOpenNewProject}
        onOpenCreateTask={() => handleOpenCreateTask("backlog")}
        onOpenCreateBOM={() => setIsCreateBOMOpen(true)}
        onOpenCreateIssue={() => setIsCreateIssueOpen(true)}
        onOpenAccountSecurityModal={() => setIsAccountSecurityOpen(true)}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {isCategoryMasterView ? (
          /* 0a. Dedicated Master BOM Categories Page */
          <BOMCategoryMasterPage
            onBackToGlobal={() => {
              setIsCategoryMasterView(false);
              setIsGlobalView(true);
            }}
          />
        ) : isTeamView ? (
          /* 0b. Dedicated Team & Access Management Page */
          <TeamManagementPage
            onBackToGlobal={() => {
              setIsTeamView(false);
              setIsGlobalView(true);
            }}
          />
        ) : isLoadingProjects ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Memuat workspace...</p>
          </div>
        ) : projects.length === 0 && !isGlobalView ? (
          /* Empty Workspace State */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-card">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Selamat Datang di FSI (Fortunet Solusi Indonesia)!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-2 mb-6">
              Aplikasi pemantauan kerja multi-project dengan Dashboard Utama, Kanban Board, Bill of Materials (BOM), dan Log Permasalahan (Root Cause Analysis).
            </p>
            {canCreateProject && (
              <button
                type="button"
                onClick={handleOpenNewProject}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Proyek Pertama Anda</span>
              </button>
            )}
          </div>
        ) : isGlobalView ? (
          /* 1. Global Multi-Project Dashboard Overview */
          <GlobalDashboard
            projects={projects}
            members={allMembers}
            onSelectProject={handleSelectProjectFromGlobal}
            onOpenCreateProject={handleOpenNewProject}
            onOpenCreateTask={(pId) => {
              setSelectedProjectId(pId);
              setIsGlobalView(false);
              setIsTeamView(false);
              handleOpenCreateTask("backlog");
            }}
          />
        ) : activeProject ? (
          /* 2. Single Project Deep-Dive View */
          <div>
            {/* Project Header Banner & Nav Tabs */}
            <ProjectHeader
              project={activeProject}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onEditProject={handleOpenEditProject}
              onBackToGlobal={() => {
                setIsTeamView(false);
                setIsGlobalView(true);
              }}
            />

            {/* Tab Views */}
            {activeTab === "kanban" && (
              <KanbanBoard
                projectId={activeProject.id}
                tasks={tasks}
                members={allMembers}
                onTaskClick={(task) => setActiveTaskId(task.id)}
                onOpenCreateTask={handleOpenCreateTask}
              />
            )}

            {activeTab === "list" && (
              <TaskListView
                tasks={tasks}
                members={allMembers}
                onTaskClick={(task) => setActiveTaskId(task.id)}
                onOpenCreateTask={() => handleOpenCreateTask("backlog")}
              />
            )}

            {activeTab === "bom" && (
              <BOMView projectId={activeProject.id} />
            )}

            {activeTab === "issues" && (
              <IssueLogView
                projectId={activeProject.id}
                members={allMembers}
                tasks={tasks}
                isCreateModalOpen={isCreateIssueOpen}
                onCloseCreateModal={() => setIsCreateIssueOpen(false)}
              />
            )}

            {activeTab === "team" && (
              <ProjectTeamTab
                project={activeProject}
                onEditProject={handleOpenEditProject}
                onOpenPersonnelModal={() => setIsPersonnelModalOpen(true)}
                onProjectDeleted={() => {
                  setSelectedProjectId("");
                  setIsGlobalView(true);
                }}
              />
            )}

            {activeTab === "attachments" && (
              <ProjectAttachmentsTab
                projectId={activeProject.id}
                tasks={tasks}
              />
            )}
          </div>
        ) : (
          /* Fallback Empty Global Dashboard */
          <GlobalDashboard
            projects={projects}
            members={allMembers}
            onSelectProject={handleSelectProjectFromGlobal}
            onOpenCreateProject={handleOpenNewProject}
            onOpenCreateTask={(pId) => {
              setSelectedProjectId(pId);
              setIsGlobalView(false);
              setIsTeamView(false);
              handleOpenCreateTask("backlog");
            }}
          />
        )}
      </main>

      {/* Global Modals */}

      {/* Task Detail Modal */}
      {activeTaskId && activeProject && (
        <TaskDetailModal
          taskId={activeTaskId}
          projectId={activeProject.id}
          members={allMembers}
          onClose={() => setActiveTaskId(null)}
        />
      )}

      {/* Task Create Modal (PM / Owner only) */}
      {isCreateTaskOpen && activeProject && (
        <TaskCreateModal
          isOpen={isCreateTaskOpen}
          projectId={activeProject.id}
          initialStatus={createTaskInitialStatus}
          members={allMembers}
          onClose={() => setIsCreateTaskOpen(false)}
        />
      )}

      {/* BOM Create Modal */}
      {isCreateBOMOpen && activeProject && (
        <BOMModal
          isOpen={isCreateBOMOpen}
          projectId={activeProject.id}
          itemToEdit={null}
          onClose={() => setIsCreateBOMOpen(false)}
        />
      )}

      {/* Project Parameters Modal (Create/Edit) */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        projectToEdit={projectToEdit}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        onProjectCreated={(newProj) => {
          setSelectedProjectId(newProj.id);
          setIsGlobalView(false);
          setIsTeamView(false);
        }}
      />

      {/* Dedicated Project Personnel Modal */}
      {activeProject && (
        <ProjectPersonnelModal
          isOpen={isPersonnelModalOpen}
          project={activeProject}
          allMembers={allMembers}
          onClose={() => setIsPersonnelModalOpen(false)}
        />
      )}

      {/* Account Security & Profile Settings Modal */}
      <AccountSecurityModal
        isOpen={isAccountSecurityOpen}
        onClose={() => setIsAccountSecurityOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
