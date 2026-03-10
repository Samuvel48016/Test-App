"use client";

import { useState, useEffect, type FormEvent } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<"content" | "email" | "address">("content");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [editIds, setEditIds] = useState<string[]>([]); // Changed to support multiple edits
  const recordsPerPage = 10;

  const totalPages = Math.ceil(todos.length / recordsPerPage); // Calculate total pages
  const paginatedTodos = sortTodos(todos).slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  ); // Get records for the current page

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }

  function listTodos() {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }

  useEffect(() => {
    listTodos();
  }, []);

  function createTodoFromForm(e: FormEvent) {
    e.preventDefault();

    // For mass edit, fields can be partially empty (only update provided fields)
    const isMassEdit = editIds.length > 1;
    if (!isMassEdit && (!content.trim() || !email.trim() || !address.trim())) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);

    if (editIds.length > 0) {
      if (isMassEdit && !window.confirm(`Are you sure you want to mass edit ${editIds.length} records?`)) {
        return;
      }
      if (isMassEdit) {
        // Bulk update: only apply changes for fields that are filled out
        editIds.forEach(id => {
          const existingTodo = todos.find(t => t.id === id);
          if (existingTodo) {
            const [oldC = "", oldE = "", oldA = ""] = (existingTodo.content ?? "").split(" — ");
            const newC = content.trim() || oldC;
            const newE = email.trim() || oldE;
            const newA = address.trim() || oldA;
            client.models.Todo.update({ id, content: `${newC} — ${newE} — ${newA}` });
          }
        });
      } else {
        // Single update
        const payload = { content: `${content} — ${email} — ${address}` };
        client.models.Todo.update({ id: editIds[0], ...payload });
      }
    } else {
      // Create new
      const payload = { content: `${content} — ${email} — ${address}` };
      client.models.Todo.create(payload);
    }

    setContent(""); setEmail(""); setAddress(""); setShowForm(false); setEditIds([]); setSelectedTodoIds([]);
    setSuccessMessage(`Record(s) ${editIds.length > 0 ? "updated" : "added"} successfully!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  function deleteSelected() {
    if (window.confirm(`Are you sure you want to delete ${selectedTodoIds.length} record(s)? This action cannot be undone.`)) {
      selectedTodoIds.forEach(id => client.models.Todo.delete({ id }));
      setSelectedTodoIds([]);
      setSuccessMessage("Record(s) deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }

  function handleEdit() {
    if (selectedTodoIds.length === 0) return alert("Select at least one record to edit.");

    setEditIds([...selectedTodoIds]);

    if (selectedTodoIds.length === 1) {
      // Single edit - populate fields
      const todo = todos.find(t => t.id === selectedTodoIds[0]);
      if (todo) {
        const [c, e, a] = (todo.content ?? "").split(" — ");
        setContent(c); setEmail(e); setAddress(a); setShowForm(true);
      }
    } else {
      // Mass edit - leave fields blank
      setContent(""); setEmail(""); setAddress(""); setShowForm(true);
    }
  }

  function sortTodos(todos: Array<Schema["Todo"]["type"]>) {
    return [...todos].sort((a, b) => {
      const [aContent = "", aEmail = "", aAddress = ""] = (a.content ?? "").split(" — ");
      const [bContent = "", bEmail = "", bAddress = ""] = (b.content ?? "").split(" — ");
      if (sortBy === "content") return aContent.localeCompare(bContent);
      if (sortBy === "email") return aEmail.localeCompare(bEmail);
      if (sortBy === "address") return aAddress.localeCompare(bAddress);
      return 0;
    });
  }

  return (
    <main
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
        padding: "40px 24px",
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="shadcn-card-title" style={{ fontSize: "36px", marginBottom: "8px" }}>Tasks</h1>
            <p className="shadcn-card-description">Manage your tasks and to-dos efficiently.</p>
          </div>
          <button
            className="shadcn-btn shadcn-btn-primary"
            onClick={() => { setShowForm(true); setContent(""); setEmail(""); setAddress(""); setEditIds([]); setError(null); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Task
          </button>
        </div>

        {showForm && (
          <div className="shadcn-dialog-overlay">
            <div className="shadcn-dialog-content">
              <h2 className="shadcn-dialog-title">
                {editIds.length > 1 ? `Bulk Edit ${editIds.length} Records` : editIds.length === 1 ? "Edit Task" : "Create New Task"}
              </h2>
              <p className="shadcn-dialog-description">
                {editIds.length > 1 ? "Leave fields blank if you do not want to update them." : "Fill out the details below to save your task."}
              </p>
              <form onSubmit={createTodoFromForm} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
                {error && <div className="shadcn-error" style={{ padding: "12px", backgroundColor: "#fef2f2", borderRadius: "6px", border: "1px solid #fecaca" }}>{error}</div>}
                <div>
                  <label className="shadcn-label">
                    Content {editIds.length <= 1 && <span style={{ color: "var(--destructive)" }}>*</span>}
                  </label>
                  <input
                    className="shadcn-input"
                    placeholder={editIds.length > 1 ? "Enter new content (optional)..." : "Enter content..."}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required={editIds.length <= 1}
                  />
                </div>
                <div>
                  <label className="shadcn-label">
                    Email {editIds.length <= 1 && <span style={{ color: "var(--destructive)" }}>*</span>}
                  </label>
                  <input
                    type="email"
                    className="shadcn-input"
                    placeholder={editIds.length > 1 ? "Enter new email (optional)..." : "Enter email address..."}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={editIds.length <= 1}
                  />
                </div>
                <div>
                  <label className="shadcn-label">
                    Address {editIds.length <= 1 && <span style={{ color: "var(--destructive)" }}>*</span>}
                  </label>
                  <input
                    className="shadcn-input"
                    placeholder={editIds.length > 1 ? "Enter new address (optional)..." : "Enter address..."}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required={editIds.length <= 1}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                  <button type="button" className="shadcn-btn shadcn-btn-outline" onClick={() => { setShowForm(false); setEditIds([]); setContent(""); setEmail(""); setAddress(""); setError(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="shadcn-btn shadcn-btn-primary">
                    {editIds.length > 0 ? "Save Changes" : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast Notification */}
        {successMessage && (
          <div className="shadcn-toast shadcn-toast-success">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>Success</span>
                <span style={{ fontSize: "14px", opacity: 0.9 }}>{successMessage}</span>
              </div>
            </div>
          </div>
        )}

        <div className="shadcn-card">
          <div className="shadcn-card-header" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", padding: "16px 24px" }}>
            <div>
              <h2 className="shadcn-card-title" style={{ fontSize: "18px" }}>Task List</h2>
              <p className="shadcn-card-description">View and manage your tasks.</p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {selectedTodoIds.length > 0 && (
                <>
                  <button onClick={handleEdit} className="shadcn-btn shadcn-btn-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg>
                    Edit ({selectedTodoIds.length})
                  </button>
                  <button onClick={deleteSelected} className="shadcn-btn shadcn-btn-destructive">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete ({selectedTodoIds.length})
                  </button>
                </>
              )}
              <div style={{ width: "160px" }}>
                <select
                  id="sortBy"
                  className="shadcn-select"
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                >
                  <option value="content">Sort by Content</option>
                  <option value="email">Sort by Email</option>
                  <option value="address">Sort by Address</option>
                </select>
              </div>
            </div>
          </div>
          <div className="shadcn-card-content" style={{ padding: "0" }}>
            <div className="shadcn-table-container" style={{ border: "none", borderRadius: "0" }}>
              <table className="shadcn-table">
                <thead>
                  <tr>
                    <th style={{ width: "48px", textAlign: "center", padding: "0 16px" }}>
                      <input
                        type="checkbox"
                        className="shadcn-checkbox"
                        checked={paginatedTodos.length > 0 && paginatedTodos.every((t) => selectedTodoIds.includes(t.id))}
                        onChange={(e) => {
                          const ids = new Set(selectedTodoIds);
                          if (e.target.checked) paginatedTodos.forEach(t => ids.add(t.id));
                          else paginatedTodos.forEach(t => ids.delete(t.id));
                          setSelectedTodoIds(Array.from(ids));
                        }}
                      />
                    </th>
                    <th>Content</th>
                    <th>Email</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTodos.length > 0 ? (
                    paginatedTodos.map((todo) => {
                      const [content, email, address] = (todo.content ?? "").split(" — ");
                      const isSelected = selectedTodoIds.includes(todo.id);
                      return (
                        <tr key={todo.id} className={isSelected ? "selected" : ""}>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              className="shadcn-checkbox"
                              checked={isSelected}
                              onChange={(e) => setSelectedTodoIds(e.target.checked ? [...selectedTodoIds, todo.id] : selectedTodoIds.filter(id => id !== todo.id))}
                            />
                          </td>
                          <td style={{ fontWeight: 500 }}>{content}</td>
                          <td style={{ color: "var(--muted-foreground)" }}>{email}</td>
                          <td style={{ color: "var(--muted-foreground)" }}>{address}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", height: "300px", color: "var(--muted-foreground)" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px", opacity: 0.5 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          <span style={{ fontSize: "16px", fontWeight: 500 }}>No tasks found</span>
                          <span style={{ fontSize: "14px", marginTop: "4px" }}>Try adjusting your filters or create a new task.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="shadcn-card-footer" style={{ borderTop: "1px solid var(--border)", padding: "16px 24px", justifyContent: "space-between" }}>
            <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
              Showing page {totalPages > 0 ? currentPage : 0} of {totalPages}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="shadcn-btn shadcn-btn-outline"
                style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  onClick={() => goToPage(index + 1)}
                  className={`shadcn-btn ${currentPage === index + 1 ? 'shadcn-btn-primary' : 'shadcn-btn-outline'}`}
                  style={{ height: "32px", width: "32px", padding: "0", fontSize: "12px" }}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="shadcn-btn shadcn-btn-outline"
                style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          🥳 App successfully hosted. Try creating a new todo.
          <br />
          <a
            href="https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/"
            style={{ color: "var(--primary)", textDecoration: "underline", fontSize: "14px" }}
          >
            Review next steps of this tutorial.
          </a>
        </div>
      </div>
    </main>
  );
}