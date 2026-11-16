"use client";

import { useState } from "react";
import { moveTask } from "@/server/task-actions";
import { TASK_STATUSES } from "@/lib/labels";

export type TaskCard = {
  id: string;
  title: string;
  details: string | null;
  market: string | null;
  owner: string | null;
  dueOn: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  overdue: boolean;
  sample: boolean;
};

export function TaskBoard({ tasks }: { tasks: TaskCard[] }) {
  const [dragging, setDragging] = useState<string | null>(null);
  return (
    <div className="kanban">
      {TASK_STATUSES.map((column) => (
        <section
          key={column.value}
          className="column"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData("text/plain") || dragging;
            if (id) void moveTask(id, column.value);
            setDragging(null);
          }}
        >
          <h2>
            {column.label}
            <span className="muted"> {tasks.filter((task) => task.status === column.value).length}</span>
          </h2>
          {tasks
            .filter((task) => task.status === column.value)
            .map((task) => (
              <article
                key={task.id}
                className={`task-card priority-${task.priority}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", task.id);
                  setDragging(task.id);
                }}
              >
                <h3>
                  {task.title}
                  {task.sample ? <span className="sample-tag">Sample</span> : null}
                </h3>
                <p>
                  {[task.market, task.owner, task.dueOn ? `Due ${task.dueOn}` : "No due date"].filter(Boolean).join(" · ")}
                  {task.overdue ? " · Overdue" : ""}
                </p>
                <p>{task.priority === "URGENT" ? "Urgent" : task.priority === "HIGH" ? "High" : task.priority === "LOW" ? "Low" : "Medium"}</p>
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
