"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type User = { id: number | string; name: string; email: string };
type Section = "Home" | "User Management" | "Information";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
const tabs: Section[] = ["Home", "User Management", "Information"];

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;

  const user = value as Record<string, unknown>;
  return (
    (typeof user.id === "number" || typeof user.id === "string") &&
    typeof user.name === "string" &&
    typeof user.email === "string"
  );
}

export default function Dashboard() {
  const [active, setActive] = useState<Section>("Home");
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [deletingId, setDeletingId] = useState<User["id"] | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) {
          throw new Error(`Could not load users (HTTP ${response.status}).`);
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isUser)) {
          throw new Error("The server returned an invalid user list.");
        }

        if (!cancelled) setUsers(data);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load users.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        String(user.id).toLowerCase().includes(query),
    );
  }, [search, users]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormMessage("");
    setFormError(false);

    try {
      const response = await fetch(
        editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users`,
        {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail }),
        },
      );

      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string"
            ? result.error
            : `Request failed (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setFormMessage(editingUser ? "User updated successfully." : "User created successfully.");
      setFormName("");
      setFormEmail("");
      setEditingUser(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(true);
      setFormMessage(error instanceof Error ? error.message : "Could not save user.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(user: User) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormMessage("");
    setFormError(false);
    setActive("Information");
  }

  function startAdding() {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormMessage("");
    setFormError(false);
    setActive("Information");
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;

    setDeletingId(user.id);
    setActionError("");
    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string"
            ? result.error
            : `Could not delete user (HTTP ${response.status}).`;
        throw new Error(message);
      }
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete user.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="flex flex-col gap-3 border-b bg-white px-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <div className="py-3">
          <span className="text-xl font-bold">User Manager</span>
        </div>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              aria-current={active === tab ? "page" : undefined}
              className={`whitespace-nowrap px-4 py-3 ${active === tab ? "border-b-2 border-blue-600 bg-slate-100 text-blue-600" : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-4 sm:p-6">
        {active === "Home" && (
          <>
            <div className="mb-5">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="mt-1 text-slate-600">Overview of your users and system activity.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <section className="h-fit rounded-xl border bg-white p-4">
                <h2 className="mb-2 border-b pb-2 text-lg font-bold">API Connection</h2>
                <p className="text-sm text-slate-600">Connected API</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-500">{API_URL}</p>
                <p className={`mt-3 font-semibold ${loadError ? "text-red-600" : loading ? "text-amber-600" : "text-green-600"}`}>
                  {loading ? "Checking connection…" : loadError ? "Connection unavailable" : "Connected"}
                </p>
              </section>

              <div className="flex flex-col gap-4">
                <section className="rounded-xl border bg-white p-4">
                  <h2 className="mb-2 border-b pb-2 text-lg font-bold">Quick Statistics</h2>
                  <p className="py-2">
                    Total Users: <b className="block text-2xl">{loading ? "…" : users.length}</b>
                  </p>
                  <p className="py-2">
                    System Status:
                    <b className={`block text-2xl ${loadError ? "text-red-600" : loading ? "text-amber-600" : "text-green-600"}`}>
                      {loading ? "Checking…" : loadError ? "Offline" : "Online"}
                    </b>
                  </p>
                  {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
                </section>
                <section className="rounded-xl border bg-white p-4">
                  <h2 className="mb-2 text-lg font-bold">User Management</h2>
                  <p className="text-sm text-slate-600">Search and review registered users.</p>
                  <button
                    type="button"
                    onClick={() => setActive("User Management")}
                    className="mt-3 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
                  >
                    Manage users
                  </button>
                </section>
              </div>

              <div className="flex flex-col gap-4">
                <section className="rounded-xl border bg-white p-4">
                  <h2 className="mb-2 text-lg font-bold">API Endpoints</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li><code className="font-semibold text-blue-700">GET</code> /users</li>
                    <li><code className="font-semibold text-green-700">POST</code> /users</li>
                    <li><code className="font-semibold text-amber-700">PUT</code> /users/:id</li>
                    <li><code className="font-semibold text-red-700">DELETE</code> /users/:id</li>
                  </ul>
                </section>
                <section className="rounded-xl border bg-white p-4">
                  <h2 className="mb-2 text-lg font-bold">Information</h2>
                  <p className="text-sm text-slate-600">Add a user to your system with their name and email address.</p>
                  <button
                    type="button"
                    onClick={startAdding}
                    className="mt-3 rounded-lg border border-blue-700 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Add user
                  </button>
                </section>
              </div>
            </div>
          </>
        )}

        {active === "User Management" && (
          <section className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {loading ? "Loading users…" : `${users.length} ${users.length === 1 ? "user" : "users"} registered`}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label>
                  <span className="sr-only">Search users</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email, or ID"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  disabled={loading}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={startAdding}
                  className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
                >
                  Add user
                </button>
              </div>
            </div>

            {actionError && <p role="alert" className="m-4 rounded-lg bg-red-50 p-4 text-red-700">{actionError}</p>}
            {loadError ? (
              <div role="alert" className="m-4 rounded-lg bg-red-50 p-4 text-red-700">
                <p className="font-medium">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  className="mt-2 text-sm font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <p role="status" className="p-6 text-slate-600">Loading users…</p>
            ) : filteredUsers.length === 0 ? (
              <p className="p-8 text-center font-medium">
                {users.length === 0 ? "No users have been added yet." : "No users match your search."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">ID</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{user.id}</td>
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => startEditing(user)}
                              className="font-medium text-blue-700 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteUser(user)}
                              disabled={deletingId === user.id}
                              className="font-medium text-red-700 hover:underline disabled:opacity-50"
                            >
                              {deletingId === user.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {active === "Information" && (
          <section className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold">{editingUser ? "Edit user" : "Add a user"}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {editingUser ? "Update the user’s details." : "Enter the user’s name and email address to add them to the system."}
            </p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Mr Jason"
                  required
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="john@example.com"
                  required
                  value={formEmail}
                  onChange={(event) => setFormEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {formMessage && (
                <p role={formError ? "alert" : "status"} className={formError ? "text-sm text-red-700" : "text-sm text-green-700"}>
                  {formMessage}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving…" : editingUser ? "Save changes" : "Add user"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMessage("");
                    if (editingUser) {
                      setEditingUser(null);
                      setFormName("");
                      setFormEmail("");
                      setActive("User Management");
                    } else {
                      setFormName("");
                      setFormEmail("");
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
                >
                  {editingUser ? "Cancel" : "Reset"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
