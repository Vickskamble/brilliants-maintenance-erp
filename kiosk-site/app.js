/* Brilliants Maintenance Kiosk - static PWA (GitHub Pages) */
(function () {
  "use strict";

  const CFG = window.KIOSK_CONFIG;
  const supabase = window.supabase.createClient(
    CFG.SUPABASE_URL,
    CFG.SUPABASE_ANON_KEY
  );

  const state = {
    user: null,
    profile: null,
    view: null,
    hubId: null,
    scanner: null,
    scannerStarted: false,
    busy: null,
    deferredInstall: null,
    pollTimer: null,
  };

  /* ---------- tiny DOM helper (XSS-safe) ---------- */
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const key in props) {
        const val = props[key];
        if (key === "className") node.className = val;
        else if (key === "text") node.textContent = val;
        else if (key === "html") node.innerHTML = val;
        else if (key === "onclick") node.addEventListener("click", val);
        else if (key === "onsubmit") node.addEventListener("submit", val);
        else if (key === "onchange") node.addEventListener("change", val);
        else if (key.startsWith("on")) node.addEventListener(key.slice(2), val);
        else if (key === "disabled" && val) node.disabled = true;
        else if (val !== null && val !== undefined && val !== false) {
          node.setAttribute(key, val);
        }
      }
    }
    for (const child of children) {
      if (child === null || child === undefined) continue;
      node.appendChild(
        typeof child === "string" || typeof child === "number"
          ? document.createTextNode(String(child))
          : child
      );
    }
    return node;
  }

  const $ = (sel) => document.querySelector(sel);

  function showView(name, opts) {
    state.view = name;
    if (name === "hub") state.hubId = opts?.id || state.hubId;
    ["scan", "my-work", "pm-due", "hub"].forEach((v) => {
      $("#view-" + v).classList.toggle("hidden", v !== name);
    });
    $("#bottom-nav").classList.toggle("hidden", name === "hub");
    document
      .querySelectorAll("[data-tab]")
      .forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    clearInterval(state.pollTimer);
    if (name !== "scan") stopScanner();
    if (name === "scan") startScanner();
    if (name === "my-work") void loadMyWork();
    if (name === "pm-due") void loadPmDue();
    if (name === "hub") void loadHub();
    if (name !== "hub") schedulePoll();
  }

  function schedulePoll() {
    state.pollTimer = setInterval(() => {
      if (state.view === "my-work") void loadMyWork();
      else if (state.view === "pm-due") void loadPmDue();
    }, 30000);
  }

  function toast(text, kind) {
    const wrap = $("#toasts");
    wrap.textContent = "";
    wrap.appendChild(h("div", { className: "toast " + (kind || "ok"), text }));
    setTimeout(() => (wrap.textContent = ""), 3200);
  }

  /* ---------- auth ---------- */
  async function boot() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) await setUser(session.user);
    else showLogin();
  }

  async function setUser(user) {
    state.user = user;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    state.profile = data || null;
    const name = state.profile?.name || user.email || "";
    $("#header-user").textContent = name;
    $("#app-shell").classList.remove("hidden");
    $("#login-view").classList.add("hidden");
    showView("scan");
  }

  function showLogin() {
    state.user = null;
    state.profile = null;
    $("#app-shell").classList.add("hidden");
    $("#login-view").classList.remove("hidden");
    stopScanner();
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") showLogin();
    else if (event === "SIGNED_IN") {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) void setUser(data.user);
      });
    }
  });

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;
    const btn = $("#login-btn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    btn.textContent = "Sign In";
    if (error) {
      const msg = $("#login-msg");
      msg.textContent = error.message
        .replace(/\(.*?\)/g, "")
        .replace(/\s+/g, " ")
        .trim();
      msg.classList.remove("hidden");
    } else {
      $('#login-msg').classList.add('hidden');
    }
  });

  $("#btn-exit").addEventListener("click", () => void supabase.auth.signOut());

  /* ---------- scanner ---------- */
  async function startScanner() {
    if (!state.user) return;
    if (state.scannerStarted) return;
    if (typeof Html5Qrcode === "undefined") {
      $("#scan-empty").classList.remove("hidden");
      $("#scan-reader").classList.add("hidden");
      $("#scan-empty").textContent =
        "Scanner library not loaded (check internet). Use the code box below.";
      return;
    }
    const div = $("#scan-reader");
    div.classList.remove("hidden");
    $("#scan-empty").classList.add("hidden");
    const scanner = new Html5Qrcode("scan-reader");
    state.scanner = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          const parsed = parseQr(text);
          if (parsed) {
            void scanner.stop().catch(() => {});
            state.scannerStarted = false;
            showView("hub", { id: parsed.id });
          } else {
            toast("Scanned code is not an equipment QR.", "err");
          }
        },
        () => {}
      );
      state.scannerStarted = true;
    } catch (err) {
      state.scannerStarted = false;
      if (err?.name === "NotAllowedError") {
        toast("Camera permission denied.", "err");
      } else {
        toast("Camera unavailable. Use the code box.", "err");
      }
    }
  }

  function stopScanner() {
    if (state.scannerStarted && state.scanner) {
      void state.scanner.stop().catch(() => {});
      state.scannerStarted = false;
    }
  }

  function parseQr(text) {
    const t = (text || "").trim();
    if (!t.startsWith(CFG.QR_PREFIX)) return null;
    const id = t.slice(CFG.QR_PREFIX.length).trim();
    return id ? { id } : null;
  }

  $("#manual-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = $("#manual-code").value.trim();
    if (!raw) return;
    const parsed = parseQr(raw);
    if (parsed) {
      showView("hub", { id: parsed.id });
      return;
    }
    const box = $("#search-results");
    box.textContent = "";
    const needle = raw.replace(/[%_]/g, "");
    const { data } = await supabase
      .from("equipment")
      .select("id, equipment_code, equipment_name, plants:plant_id(name)")
      .or(
        `equipment_code.ilike.%${needle}%,equipment_name.ilike.%${needle}%`
      )
      .limit(8);
    const rows = data || [];
    if (!rows.length) {
      box.appendChild(h("p", { className: "muted", text: "No equipment found." }));
      return;
    }
    rows.forEach((r, i) => {
      box.appendChild(
        h(
          "button",
          { className: "row" + (i ? "" : ""), onclick: () => showView("hub", { id: r.id }) },
          h("div", { className: "row-head" },
            h("span", { className: "row-no", text: r.equipment_code }),
            r.plants?.name
              ? h("span", { className: "muted", text: r.plants.name })
              : null
          ),
          h("div", { className: "row-title", text: r.equipment_name })
        )
      );
    });
  });

  /* ---------- My Work ---------- */
  async function loadMyWork() {
    const box = $("#mywork-list");
    if (!state.user) return;
    const name = state.profile?.name;
    const email = state.user.email;
    const orParts = [];
    if (name) orParts.push(`assigned_to.ilike.%${name}%`);
    if (email) orParts.push(`assigned_to.ilike.%${email}%`);
    const base = () =>
      supabase
        .from("work_orders")
        .select(
          `id, work_order_no, title, type, priority, status, assigned_to,
           equipment_id, equipment:equipment_id(equipment_code, equipment_name)`
        )
        .is("deleted_at", null)
        .in("status", ["assigned", "in_progress", "on_hold"])
        .order("created_at", { ascending: false })
        .limit(50);
    const queries = [base().is("assigned_to", null)];
    if (orParts.length) queries.push(base().or(orParts.join(",")));
    const results = await Promise.all(queries);
    const rows = (results[0]?.data || []).concat(results[1]?.data || []);
    const seen = new Set();
    const merged = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    $("#mywork-count").textContent = String(merged.length);
    box.textContent = "";
    if (!merged.length) {
      box.appendChild(
        h("div", { className: "center-empty", text: "No active work orders assigned to you." })
      );
      return;
    }
    merged.forEach((wo) => {
      const prio = wo.priority || "medium";
      box.appendChild(
        h("button", { className: "row", onclick: () => wo.equipment_id && showView("hub", { id: wo.equipment_id }) },
          h("div", { className: "row-head" },
            h("span", { className: "row-no", text: wo.work_order_no }),
            h("span", { className: "badge " + wo.status, text: wo.status.replace(/_/g, " ") })
          ),
          h("div", { className: "row-title", text: wo.title }),
          h("div", { className: "row-meta" },
            h("span", { className: "badge " + prio, text: prio }),
            h("span", { text: wo.equipment?.equipment_code || "General" }),
            wo.assigned_to ? h("span", { text: "\u2192 " + wo.assigned_to }) : ""
          )
        )
      );
    });
  }

  /* ---------- PM Due ---------- */
  async function loadPmDue() {
    const box = $("#pmdue-list");
    if (!state.user) return;
    const name = state.profile?.name;
    const email = state.user.email;
    const orParts = [];
    if (name) orParts.push(`assigned_to.ilike.%${name}%`);
    if (email) orParts.push(`assigned_to.ilike.%${email}%`);
    const until = new Date(Date.now() + 7 * 86400000).toISOString();
    const base = () =>
      supabase
        .from("maintenance_schedules")
        .select(
          `id, schedule_no, task_type, interval_days, last_run_at, next_run_at,
           assigned_to, equipment_id, equipment:equipment_id(equipment_code, equipment_name),
           plants:plant_id(name)`
        )
        .eq("is_active", true)
        .lte("next_run_at", until)
        .order("next_run_at", { ascending: true })
        .limit(50);
    const queries = [base().is("assigned_to", null)];
    if (orParts.length) queries.push(base().or(orParts.join(",")));
    const results = await Promise.all(queries);
    const rows = (results[0]?.data || []).concat(results[1]?.data || []);
    const seen = new Set();
    const merged = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    $("#pmdue-count").textContent = String(merged.length);
    box.textContent = "";
    if (!merged.length) {
      box.appendChild(
        h("div", { className: "center-empty", text: "No preventive maintenance due right now." })
      );
      return;
    }
    merged.forEach((pm) => {
      const due = pm.next_run_at
        ? new Date(pm.next_run_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";
      box.appendChild(
        h("button", { className: "row", onclick: () => pm.equipment_id && showView("hub", { id: pm.equipment_id }) },
          h("div", { className: "row-head" },
            h("span", { className: "row-title", text: pm.task_type || "Preventive Maintenance" }),
            h("span", { className: "badge due", text: "Due" })
          ),
          h("div", { className: "row-no", text: pm.schedule_no || pm.id.slice(0, 8) }),
          h("div", { className: "row-meta" },
            h("span", { text: pm.equipment?.equipment_code || "General" }),
            h("span", { text: pm.plants?.name || "-" })
          ),
          h("div", { className: "row-foot muted", text: "Due " + due + (pm.assigned_to ? " \u00b7 " + pm.assigned_to : "") })
        )
      );
    });
  }

  /* ---------- Hub ---------- */
  async function loadHub() {
    const id = state.hubId;
    const box = $("#hub-slot");
    if (!id) return;
    box.textContent = "";
    box.appendChild(
      h(
        "div",
        { className: "card" },
        h("div", { className: "h-40 flex items-center justify-center", text: "Loading..." })
      )
    );
    const { data: eq } = await supabase
      .from("equipment")
      .select(
        "id, equipment_code, equipment_name, qr_code, photo_url, plants:plant_id(name)"
      )
      .eq("id", id)
      .single();
    if (!eq) {
      box.textContent = "";
      box.appendChild(
        h(
          "div",
          { className: "center-empty" },
          h("p", { text: "Equipment not found." })
        )
      );
      return;
    }
    layerHub(eq);
  }

  async function layerHub(eq) {
    const box = $("#hub-slot");
    const [woRes, pmRes] = await Promise.all([
      supabase
        .from("work_orders")
        .select(
          `id, work_order_no, title, type, priority, status, assigned_to,
           planned_end, created_at`
        )
        .eq("equipment_id", eq.id)
        .is("deleted_at", null)
        .in("status", ["assigned", "in_progress", "on_hold"])
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("maintenance_schedules")
        .select(
          "id, schedule_no, task_type, interval_days, last_run_at, next_run_at, assigned_to"
        )
        .eq("equipment_id", eq.id)
        .eq("is_active", true)
        .lte("next_run_at", new Date(Date.now() + 7 * 86400000).toISOString())
        .order("next_run_at", { ascending: true })
        .limit(100),
    ]);
    const wos = woRes.data || [];
    const pms = pmRes.data || [];
    box.textContent = "";

    const head = h(
      "div",
      { className: "card" },
      h("div", { className: "hub-head" },
        h("div", {},
          h("div", { className: "hub-name", text: eq.equipment_name }),
          h("div", { className: "hub-code", text: eq.equipment_code }),
          h("div", { className: "muted", text: eq.plants?.name || "-" })
        ),
        h("button",
          { className: "btn-ghost-sm", onclick: () => showView("scan") },
          h("span", { text: "\u2190 Scan" })
        )
      )
    );
    if (eq.photo_url) {
      head.appendChild(h("img", { src: eq.photo_url, className: "hub-photo" }));
    }
    box.appendChild(head);

    box.appendChild(
      h("div", { className: "section-title" },
        h("span", { text: "Active Work Orders" }),
        h("span", { className: "count", text: "\u00b7 " + wos.length })
      )
    );
    if (!wos.length) {
      box.appendChild(
        h("div", { className: "center-empty", text: "No active work orders for this equipment." })
      );
    } else {
      const list = h("div", { className: "row-list" });
      wos.forEach((wo) => {
        const canStart = wo.status === "assigned" || wo.status === "on_hold";
        const canComplete = wo.status === "in_progress";
        const card = h("div", { className: "card" },
          h("div", { className: "row-head" },
            h("span", { className: "row-no", text: wo.work_order_no }),
            h("span", { className: "badge " + wo.status, text: wo.status.replace(/_/g, " ") })
          ),
          h("div", { className: "wo-title", text: wo.title }),
          h("div", { className: "row-meta" },
            h("span", { className: "badge " + (wo.priority || "medium"), text: wo.priority || "medium" }),
            h("span", { text: wo.assigned_to ? "\u2192 " + wo.assigned_to : "" })
          )
        );
        if (canStart || canComplete) {
          const row = h("div", { className: "btn-row" });
          if (canStart) {
            row.appendChild(
              h("button", {
                className: "btn btn-primary",
                text: "Start",
                disabled: state.busy === wo.id,
                onclick: () => void changeStatus(wo, "in_progress"),
              })
            );
          }
          if (canComplete) {
            row.appendChild(
              h("button", {
                className: "btn btn-success",
                text: "Complete",
                disabled: state.busy === wo.id,
                onclick: () => void changeStatus(wo, "completed"),
              })
            );
          }
          card.appendChild(row);
        } else {
          card.appendChild(
            h("p", { className: "muted", text: "Waiting before you can start this order." })
          );
        }
        list.appendChild(card);
      });
      box.appendChild(list);
    }

    box.appendChild(
      h("div", { className: "section-title" },
        h("span", { text: "Due Maintenance" }),
        h("span", { className: "count", text: "\u00b7 " + pms.length })
      )
    );
    if (!pms.length) {
      box.appendChild(
        h("div", { className: "center-empty", text: "No preventive maintenance due for this equipment." })
      );
    } else {
      const list = h("div", { className: "row-list" });
      pms.forEach((pm) => {
        const due = pm.next_run_at
          ? new Date(pm.next_run_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "";
        list.appendChild(
          h("div", { className: "card" },
            h("div", { className: "row-head" },
              h("span", { className: "row-title", text: pm.task_type || "Preventive Maintenance" }),
              h("span", { className: "badge due", text: "Due" })
            ),
            h("div", { className: "row-no", text: pm.schedule_no || pm.id.slice(0, 8) }),
            h("div", { className: "row-meta" },
              h("span", { text: "Due " + due }),
              h("span", { text: pm.assigned_to ? "\u00b7 " + pm.assigned_to : "" })
            ),
            h("button", {
              className: "btn btn-warning",
              text: "Complete PM",
              disabled: state.busy === pm.id,
              onclick: () => void completePm(pm),
            })
          )
        );
      });
      box.appendChild(list);
    }
  }

  /* ---------- actions ---------- */
  async function changeStatus(wo, newStatus) {
    state.busy = wo.id;
    const { data: cur } = await supabase
      .from("work_orders")
      .select("status, actual_start, actual_end, closed_by")
      .eq("id", wo.id)
      .single();
    const now = new Date().toISOString();
    const patch = { status: newStatus };
    let closed = false;
    if (newStatus === "in_progress" && cur && !cur.actual_start) patch.actual_start = now;
    if (newStatus === "completed") {
      if (cur && !cur.actual_end) patch.actual_end = now;
      if (cur && !cur.closed_by) patch.closed_by = state.user.id;
      patch.closed_at = now;
      closed = true;
    }
    const upd = await supabase.from("work_orders").update(patch).eq("id", wo.id);
    if (upd.error) {
      toast("Could not update work order: " + upd.error.message, "err");
      state.busy = null;
      return;
    }
    if (cur && cur.status !== newStatus) {
      await supabase.from("work_order_status_history").insert({
        work_order_id: wo.id,
        old_status: cur.status,
        new_status: newStatus,
        remarks: null,
        changed_by: state.user.id,
      });
    }
    toast(
      closed
        ? "Work order marked complete."
        : "Work order started. Actual start recorded.",
      "ok"
    );
    state.busy = null;
    void loadHub();
  }

  async function completePm(pm) {
    const notes =
      window.prompt("Notes for " + (pm.task_type || "PM") + " (optional)", "") ||
      "";
    state.busy = pm.id;
    const now = new Date();
    const nowIso = now.toISOString();
    const { data: sched } = await supabase
      .from("maintenance_schedules")
      .select("interval_days, notes")
      .eq("id", pm.id)
      .single();
    let nextIso = nowIso;
    if (sched?.interval_days && sched.interval_days > 0) {
      nextIso = new Date(
        now.getTime() + sched.interval_days * 86400000
      ).toISOString();
    }
    const upd = await supabase
      .from("maintenance_schedules")
      .update({
        last_run_at: nowIso,
        next_run_at: nextIso,
        notes: notes?.trim() || sched?.notes || null,
      })
      .eq("id", pm.id);
    if (upd.error) {
      toast("Could not complete PM: " + upd.error.message, "err");
      state.busy = null;
      return;
    }
    await supabase.from("audit_logs").insert({
      organization_id: state.profile?.organization_id ?? undefined,
      plant_id: state.profile?.plant_id ?? null,
      user_id: state.user.id,
      user_name: state.profile?.name ?? state.user.email ?? null,
      action: "pm.completed",
      entity_type: "maintenance_schedule",
      entity_id: pm.id,
      entity_title: pm.task_type || null,
      summary: "PM completed via kiosk" + (notes?.trim() ? ": " + notes.trim() : ""),
      metadata: { last_run_at: nowIso, next_run_at: nextIso },
    });
    toast("PM completed. Next run scheduled automatically.", "ok");
    state.busy = null;
    void loadHub();
  }

  /* ---------- PWA install ---------- */
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredInstall = e;
    $("#btn-install").classList.remove("hidden");
  });
  $("#btn-install").addEventListener("click", () => {
    if (!state.deferredInstall) return;
    void state.deferredInstall.prompt();
    state.deferredInstall.userChoice.then(() => {
      state.deferredInstall = null;
      $("#btn-install").classList.add("hidden");
    });
  });
  window.addEventListener("appinstalled", () => {
    $("#btn-install").classList.add("hidden");
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  document.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => showView(b.dataset.tab))
  );

  boot();
})();