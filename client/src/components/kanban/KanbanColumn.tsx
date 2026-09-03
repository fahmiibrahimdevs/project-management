import React, { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Task, TaskStatus } from "../../types";
import { TaskCard } from "./TaskCard";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  tooltip?: string;
}

interface KanbanColumnProps {
  config: ColumnConfig;
  tasks: Task[];
  canDrag: boolean;
  canCreateTask: boolean;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

const INITIAL_LIMIT = 8;
const LOAD_MORE_STEP = 8;

export function KanbanColumn({
  config,
  tasks,
  canDrag,
  canCreateTask,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  const [visibleLimit, setVisibleLimit] = useState<number>(INITIAL_LIMIT);

  const visibleTasks = tasks.slice(0, visibleLimit);
  const hasMore = tasks.length > visibleLimit;
  const remainingCount = tasks.length - visibleLimit;

  const handleLoadMore = () => {
    setVisibleLimit((prev) => prev + LOAD_MORE_STEP);
  };

  const handleCollapse = () => {
    setVisibleLimit(INITIAL_LIMIT);
  };

  return (
    <div className="flex flex-col w-[285px] min-w-[285px] shrink-0 bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-card transition-all">
      {/* Column Header */}
      <div 
        className="flex items-center justify-between px-1 py-1 mb-2.5 cursor-default"
        title={config.tooltip || `Kolom status: ${config.title}`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight">
            {config.title}
          </h3>
          <span
            className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${config.badgeBg} ${config.badgeText}`}
            title={`Total ${tasks.length} tugas di kolom ${config.title}`}
          >
            {tasks.length}
          </span>
        </div>

        {canCreateTask && (
          <button
            type="button"
            onClick={() => onAddTask(config.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={`Tambah tugas baru di kolom ${config.title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Droppable Card List Area */}
      <Droppable droppableId={config.id} isDropDisabled={!canDrag}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 flex flex-col gap-2.5 min-h-[360px] kanban-col-scroll p-0.5 rounded-xl transition-all ${
              snapshot.isDraggingOver ? "bg-blue-50/60 ring-2 ring-blue-300 ring-dashed" : ""
            }`}
          >
            {visibleTasks.map((task, index) => (
              <Draggable
                key={task.id}
                draggableId={task.id}
                index={index}
                isDragDisabled={!canDrag}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => onTaskClick(task)}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-36 border border-dashed border-slate-200/90 bg-white/60 rounded-xl text-slate-400 text-xs font-medium">
                <span>Belum ada tugas</span>
                {canCreateTask && (
                  <button
                    type="button"
                    onClick={() => onAddTask(config.id)}
                    className="mt-1.5 text-blue-600 hover:underline text-[11px] font-semibold"
                    title={`Buat tugas baru di kolom ${config.title}`}
                  >
                    + Buat tugas di sini
                  </button>
                )}
              </div>
            )}

            {/* 🔄 LOAD MORE CONTROLS FOR KANBAN COLUMN */}
            {hasMore && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  title={`Tampilkan ${Math.min(remainingCount, LOAD_MORE_STEP)} tugas berikutnya`}
                  className="w-full py-2 px-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-600 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs group"
                >
                  <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform text-blue-500" />
                  <span>
                    Muat Lebih Banyak (+{Math.min(remainingCount, LOAD_MORE_STEP)})
                  </span>
                </button>
                <div className="text-center mt-1">
                  <span className="text-[10px] text-slate-400">
                    Menampilkan {visibleTasks.length} dari {tasks.length} tugas
                  </span>
                </div>
              </div>
            )}

            {/* Collapse option when expanded */}
            {visibleLimit > INITIAL_LIMIT && tasks.length > INITIAL_LIMIT && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleCollapse}
                  title={`Ciutkan kembali ke ${INITIAL_LIMIT} tugas pertama`}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sembunyikan ({INITIAL_LIMIT} pertama)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
