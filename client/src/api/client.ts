import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Project,
  Member,
  Task,
  BOMResponse,
  BOMItem,
  BOMCategory,
  IssueLogsResponse,
  IssueLog,
  ProjectAttachmentsResponse,
  ProjectAttachment,
} from "../types";

const BASE_URL = "";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = "Terjadi kesalahan pada server";
    try {
      const err = await res.json();
      errorMsg = err.error || err.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ================= PROJECTS =================
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchJson<Project[]>("/api/projects"),
  });
}

export function useProject(id?: string) {
  return useQuery<Project>({
    queryKey: ["projects", id],
    queryFn: () => fetchJson<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project> & { member_ids?: string[] }) =>
      fetchJson<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      fetchJson<Project>(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/projects/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ================= MEMBERS =================
export function useMembers() {
  return useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: () => fetchJson<Member[]>("/api/members"),
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Member>) =>
      fetchJson<Member>("/api/members", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

// ================= TASKS =================
export function useTasks(projectId?: string) {
  return useQuery<Task[]>({
    queryKey: ["tasks", { projectId }],
    queryFn: () =>
      fetchJson<Task[]>(projectId ? `/api/tasks?projectId=${projectId}` : "/api/tasks"),
    enabled: !!projectId,
  });
}

export function useTask(id?: string) {
  return useQuery<Task>({
    queryKey: ["tasks", "detail", id],
    queryFn: () => fetchJson<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<Partial<Task>, "acceptance_criteria"> & {
        acceptance_criteria?: string[];
      }
    ) =>
      fetchJson<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { projectId: variables.project_id }] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      fetchJson<Task>(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { projectId: updated.project_id }] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", updated.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items, projectId }: { items: Array<{ id: string; status: string; order_index: number }>; projectId: string }) =>
      fetchJson<{ success: boolean }>("/api/tasks/reorder", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      fetchJson<{ success: boolean }>(`/api/tasks/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// Criteria Mutations
export function useAddCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, text }: { taskId: string; text: string }) =>
      fetchJson(`/api/tasks/${taskId}/criteria`, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useToggleCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      criteriaId,
      is_completed,
      completed_by_id,
    }: {
      taskId: string;
      criteriaId: string;
      is_completed: boolean;
      completed_by_id?: string | null;
    }) =>
      fetchJson(`/api/tasks/${taskId}/criteria/${criteriaId}`, {
        method: "PUT",
        body: JSON.stringify({ is_completed, completed_by_id }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useUpdateCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      criteriaId,
      text,
    }: {
      taskId: string;
      criteriaId: string;
      text: string;
    }) =>
      fetchJson(`/api/tasks/${taskId}/criteria/${criteriaId}`, {
        method: "PUT",
        body: JSON.stringify({ text }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useDeleteCriteria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, criteriaId }: { taskId: string; criteriaId: string }) =>
      fetchJson(`/api/tasks/${taskId}/criteria/${criteriaId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

// Comments Mutations
export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, memberId, content }: { taskId: string; memberId: string; content: string }) =>
      fetchJson(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ member_id: memberId, content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      fetchJson(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// Attachments Mutations
export function useAddAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      file_name,
      file_url,
      file_size,
      file_type,
    }: {
      taskId: string;
      file_name: string;
      file_url: string;
      file_size: number;
      file_type?: string;
    }) =>
      fetchJson(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: JSON.stringify({ file_name, file_url, file_size, file_type }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      fetchJson(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// File Upload
export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Gagal mengupload file");
  }

  return res.json() as Promise<{
    file_name: string;
    file_url: string;
    file_size: number;
    file_type: string;
  }>;
}

// ================= BOM (BILL OF MATERIALS) =================
export function useBOM(projectId?: string, categoryId?: string) {
  return useQuery<BOMResponse>({
    queryKey: ["bom", { projectId, categoryId }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (categoryId && categoryId !== "all") params.append("categoryId", categoryId);
      const queryString = params.toString();
      return fetchJson<BOMResponse>(queryString ? `/api/bom?${queryString}` : "/api/bom");
    },
    enabled: !!projectId,
  });
}

// Master Categories Hooks
export function useBOMCategories(projectId?: string) {
  return useQuery<BOMCategory[]>({
    queryKey: ["bom-categories", { projectId }],
    queryFn: () =>
      fetchJson<BOMCategory[]>(projectId ? `/api/bom/categories?projectId=${projectId}` : "/api/bom/categories"),
  });
}

export function useCreateBOMCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BOMCategory>) =>
      fetchJson<BOMCategory>("/api/bom/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-categories"] });
      queryClient.invalidateQueries({ queryKey: ["bom"] });
    },
  });
}

export function useUpdateBOMCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BOMCategory> }) =>
      fetchJson<BOMCategory>(`/api/bom/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-categories"] });
      queryClient.invalidateQueries({ queryKey: ["bom"] });
    },
  });
}

export function useDeleteBOMCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/bom/categories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom-categories"] });
      queryClient.invalidateQueries({ queryKey: ["bom"] });
    },
  });
}

export function useCreateBOMItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BOMItem>) =>
      fetchJson<BOMItem>("/api/bom", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom", { projectId: variables.project_id }] });
      queryClient.invalidateQueries({ queryKey: ["bom-categories"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateBOMItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: string; projectId: string; data: Partial<BOMItem> }) =>
      fetchJson<BOMItem>(`/api/bom/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["bom-categories"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteBOMItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      fetchJson<{ success: boolean }>(`/api/bom/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bom", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["bom-categories"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ================= ISSUE LOGS =================
export function useIssueLogs(projectId?: string) {
  return useQuery<IssueLogsResponse>({
    queryKey: ["issue-logs", { projectId }],
    queryFn: () =>
      fetchJson<IssueLogsResponse>(projectId ? `/api/issue-logs?projectId=${projectId}` : "/api/issue-logs"),
    enabled: !!projectId,
  });
}

export function useIssueLog(id?: string) {
  return useQuery<IssueLog>({
    queryKey: ["issue-logs", "detail", id],
    queryFn: () => fetchJson<IssueLog>(`/api/issue-logs/${id}`),
    enabled: !!id,
  });
}

export function useCreateIssueLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IssueLog>) =>
      fetchJson<IssueLog>("/api/issue-logs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["issue-logs", { projectId: variables.project_id }] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateIssueLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: string; projectId: string; data: Partial<IssueLog> }) =>
      fetchJson<IssueLog>(`/api/issue-logs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["issue-logs", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["issue-logs", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteIssueLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      fetchJson<{ success: boolean }>(`/api/issue-logs/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["issue-logs", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// -------------------------------------------------------------
// Attachments Hooks
// -------------------------------------------------------------

export function useProjectAttachments(projectId: string) {
  return useQuery({
    queryKey: ["project-attachments", { projectId }],
    queryFn: () => fetchJson<ProjectAttachmentsResponse>(`/api/attachments/project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useUploadProjectAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      formData,
    }: {
      projectId: string;
      formData: FormData;
    }) => {
      const res = await fetch(`/api/attachments/project/${projectId}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal mengunggah berkas");
      }
      return res.json() as Promise<ProjectAttachment>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-attachments", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRenameAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      projectId,
      taskId,
      fileName,
    }: {
      id: string;
      projectId?: string;
      taskId?: string;
      fileName: string;
    }) =>
      fetchJson<{ success: boolean; file_name: string }>(`/api/attachments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ file_name: fileName }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-attachments"] });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-attachments", variables.projectId] });
        queryClient.invalidateQueries({ queryKey: ["project-attachments", { projectId: variables.projectId }] });
      }
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProjectAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      fetchJson<{ success: boolean }>(`/api/attachments/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-attachments", { projectId: variables.projectId }] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

