import { useMemo } from "react";
import { Project, Member } from "../types";
import { useAuth } from "../context/AuthContext";

export function useProjectPermissions(project?: Project | null, members?: Member[]) {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        isOwner: false,
        isProjectMember: false,
        isProjectPM: false,
        isReadOnly: true,
        canCreateTask: false,
        canDragTask: false,
        canEditProject: false,
        canDeleteProject: false,
        canManagePersonnel: false,
        canEditBOM: false,
        canEditIssues: false,
        canUploadAttachments: false,
        canEditTaskDetails: false,
      };
    }

    const isOwner = user.role === "owner";

    // Project members from project object or fallback to members list
    const projectMembers = project?.members || members || [];
    const isDirectMember = projectMembers.some((m) => m.id === user.id);

    // Global Owner has full access; others must be registered in the project
    const isProjectMember = isOwner || isDirectMember;
    const isProjectPM = isOwner || (user.role === "pm" && isProjectMember);

    return {
      isOwner,
      isProjectMember,
      isProjectPM,
      isReadOnly: !isProjectMember,
      canCreateTask: isProjectMember,
      canDragTask: isProjectMember,
      canEditProject: isProjectPM,
      canDeleteProject: isOwner,
      canManagePersonnel: isProjectPM,
      canEditBOM: isProjectMember,
      canEditIssues: isProjectMember,
      canUploadAttachments: isProjectMember,
      canEditTaskDetails: isProjectMember,
    };
  }, [user, project?.members, members]);
}
