/* =========================================================
   BHAKTI
   Script Submission System
   Supabase Connected
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://ymhwgzgfbtjsgfghnwhf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_bq5ThJ4ebp2TOcZZm_L8ow_VdY6WFGl";

const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   STATE
========================================================= */

let currentMember = null;
let currentScript = null;


/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) =>
  document.querySelectorAll(selector);


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  initializeSplash();

  initializeNavigation();

  initializeMobileMenu();

  initializeMemberForm();

  initializeEditor();

  initializeRefresh();

  initializePetals();

  loadScripts();

  console.log(
    "%c BHAKTI ",
    "background:#7d2634;color:#fff;padding:8px 14px;font-size:16px;font-weight:bold;"
  );

  console.log(
    "%cWhere Education Meets Bhakti.",
    "color:#c9952e;font-size:13px;"
  );

});


/* =========================================================
   CINEMATIC SPLASH
========================================================= */

function initializeSplash() {

  const splash = $("#splashScreen");
  const app = $("#appShell");

  if (!splash || !app) return;

  setTimeout(() => {

    splash.classList.add("hide");

    setTimeout(() => {
      app.classList.add("visible");
    }, 350);

  }, 5200);
}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

  $$("[data-view]").forEach((button) => {

    button.addEventListener("click", () => {

      const view = button.dataset.view;

      showView(view);

    });

  });

}


function showView(viewName) {

  const views = {
    home: $("#homeView"),
    submit: $("#submitView"),
    scripts: $("#scriptsView")
  };

  Object.values(views).forEach((view) => {

    if (!view) return;

    view.classList.remove("active");

  });


  const target = views[viewName];

  if (target) {
    target.classList.add("active");
  }


  $$(".nav-link").forEach((link) => {

    link.classList.toggle(
      "active",
      link.dataset.view === viewName
    );

  });


  const navigation = $(".navigation");

  if (navigation) {
    navigation.classList.remove("open");
  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  if (viewName === "scripts") {
    loadScripts();
  }

}


/* =========================================================
   MOBILE MENU
========================================================= */

function initializeMobileMenu() {

  const menu = $("#mobileMenu");
  const navigation = $(".navigation");

  if (!menu || !navigation) return;

  menu.addEventListener("click", () => {

    navigation.classList.toggle("open");

  });

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(
  title,
  message,
  type = "normal"
) {

  const toast = $("#toast");
  const toastTitle = $("#toastTitle");
  const toastMessage = $("#toastMessage");
  const toastIcon = $(".toast-icon");

  if (!toast) return;

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  if (toastIcon) {

    toastIcon.textContent =
      type === "success"
        ? "✓"
        : type === "error"
        ? "!"
        : "✦";

  }

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {

    toast.classList.remove("show");

  }, 4000);

}


/* =========================================================
   MEMBER ID
========================================================= */

function normalizeMemberId(value) {

  return String(value || "")
    .trim()
    .toUpperCase();

}


async function findMember(memberCode) {

  const normalized = normalizeMemberId(memberCode);

  if (!normalized) {
    return null;
  }


  const { data, error } = await supabaseClient
    .from("members")
    .select("*")
    .eq("member_code", normalized)
    .maybeSingle();


  if (error) {

    console.error("Member lookup error:", error);

    throw error;

  }


  return data || null;
}


/* =========================================================
   MEMBER FORM
========================================================= */

function initializeMemberForm() {

  const form = $("#memberForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const input = $("#memberId");

    const memberId =
      normalizeMemberId(input?.value);


    if (!memberId) {

      showToast(
        "Member ID Required",
        "Please enter your assigned member ID.",
        "error"
      );

      return;
    }


    const button =
      form.querySelector("button[type='submit']");


    const originalText =
      button?.innerHTML;


    if (button) {

      button.disabled = true;

      button.innerHTML =
        "Verifying Member <span>...</span>";

    }


    try {

      const member =
        await findMember(memberId);


      if (!member) {

        showToast(
          "Member Not Found",
          "This ID does not exist in the BHAKTI workspace.",
          "error"
        );

        return;

      }


      currentMember = member;

      await loadMemberScript(member);


      renderMemberDetails(member);

      renderEditor(member);

      showToast(
        "Workspace Opened",
        `Welcome, ${member.name}.`,
        "success"
      );

    } catch (error) {

      console.error(error);

      showToast(
        "Connection Error",
        "Unable to connect with the shared workspace.",
        "error"
      );

    } finally {

      if (button) {

        button.disabled = false;

        button.innerHTML =
          originalText ||
          'Open My Workspace <span>→</span>';

      }

    }

  });

}


/* =========================================================
   MEMBER DETAILS
========================================================= */

function renderMemberDetails(member) {

  const container = $("#memberDetails");

  if (!container) return;


  container.classList.remove("hidden");

  container.innerHTML = `

    <div class="member-details-inner">

      <span class="section-kicker">
        VERIFIED MEMBER
      </span>

      <strong>
        ${escapeHtml(member.name || "Member")}
      </strong>

      <small>
        ${escapeHtml(member.member_code || "")}
        •
        Slides ${escapeHtml(member.assigned_slides || "—")}
      </small>

    </div>

  `;
}


/* =========================================================
   LOAD EXISTING SCRIPT
========================================================= */

async function loadMemberScript(member) {

  currentScript = null;


  const { data, error } =
    await supabaseClient
      .from("scripts")
      .select("*")
      .eq("member_id", member.id)
      .maybeSingle();


  if (error) {

    console.error(
      "Script loading error:",
      error
    );

    throw error;

  }


  currentScript = data || null;

}


/* =========================================================
   EDITOR
========================================================= */

function renderEditor(member) {

  const editorCard = $("#editorCard");
  const editorEmpty = $(".editor-empty");

  if (!editorCard) return;


  editorCard.classList.remove("hidden");


  if (editorEmpty) {
    editorEmpty.style.display = "none";
  }


  $("#editorMemberName").textContent =
    member.name || "Member";


  $("#editorSlides").textContent =
    `Slides ${member.assigned_slides || "—"}`;


  $("#editorSection").textContent =
    member.section_title || "Presentation Section";


  const editor = $("#scriptEditor");

  if (editor) {

    editor.value =
      currentScript?.script_content || "";

    updateCounters();

    setTimeout(() => {
      editor.focus();
    }, 250);

  }


  updateEditorStatus();

}


/* =========================================================
   EDITOR INPUT
========================================================= */

function initializeEditor() {

  const editor = $("#scriptEditor");

  if (!editor) return;

  editor.addEventListener(
    "input",
    updateCounters
  );

}


function updateCounters() {

  const editor = $("#scriptEditor");

  if (!editor) return;


  const text =
    editor.value.trim();


  const words =
    text
      ? text.split(/\s+/).length
      : 0;


  const chars =
    editor.value.length;


  const wordCount =
    $("#wordCount");

  const charCount =
    $("#charCount");


  if (wordCount) {
    wordCount.textContent = words;
  }


  if (charCount) {
    charCount.textContent = chars;
  }


  updateEditorStatus();

}


/* =========================================================
   STATUS
========================================================= */

function updateEditorStatus() {

  const status =
    $("#editorStatus");

  if (!status) return;


  if (!currentMember) {

    status.textContent = "READY";

    return;

  }


  const editor =
    $("#scriptEditor");

  const content =
    editor?.value.trim() || "";


  if (!content) {

    status.textContent = "DRAFT";

    return;

  }


  if (currentScript?.status === "SUBMITTED") {

    status.textContent = "SUBMITTED";

    return;

  }


  status.textContent = "EDITING";

}


/* =========================================================
   SAVE SCRIPT
========================================================= */

async function saveScript() {

  if (!currentMember) {

    showToast(
      "Member Required",
      "Open your workspace using your member ID first.",
      "error"
    );

    return;

  }


  const editor =
    $("#scriptEditor");


  const content =
    editor?.value.trim() || "";


  if (!content) {

    showToast(
      "Script Empty",
      "Please write your script before saving.",
      "error"
    );

    return;

  }


  const button =
    $("#saveScriptBtn");


  const originalText =
    button?.innerHTML;


  if (button) {

    button.disabled = true;

    button.innerHTML =
      "Saving <span>...</span>";

  }


  try {

    const now =
      new Date().toISOString();


    if (currentScript?.id) {

      const { data, error } =
        await supabaseClient
          .from("scripts")
          .update({
            script_content: content,
            status: "SUBMITTED",
            updated_at: now,
            submitted_at: now
          })
          .eq("id", currentScript.id)
          .select()
          .single();


      if (error) throw error;


      currentScript = data;

    } else {

      const { data, error } =
        await supabaseClient
          .from("scripts")
          .insert({
            member_id: currentMember.id,
            script_content: content,
            status: "SUBMITTED",
            created_at: now,
            updated_at: now,
            submitted_at: now
          })
          .select()
          .single();


      if (error) throw error;


      currentScript = data;

    }


    updateEditorStatus();


    showToast(
      "Script Saved",
      "Your script is now available in the shared archive.",
      "success"
    );


    await loadScripts();

  } catch (error) {

    console.error(
      "Save script error:",
      error
    );


    showToast(
      "Save Failed",
      "The script could not be saved. Check your Supabase policies.",
      "error"
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.innerHTML =
        originalText ||
        "<span>✦</span> Save Script";

    }

  }

}


/* =========================================================
   SAVE BUTTON
========================================================= */

document.addEventListener("click", (event) => {

  const button =
    event.target.closest("#saveScriptBtn");

  if (button) {
    saveScript();
  }

});


/* =========================================================
   LOAD ALL SCRIPTS
========================================================= */

async function loadScripts() {

  const grid =
    $("#scriptsGrid");

  if (!grid) return;


  grid.innerHTML = `

    <div class="loading-state">

      <div class="loading-spinner"></div>

      <span>
        Loading shared scripts...
      </span>

    </div>

  `;


  try {

    /*
      Two separate queries are intentionally used here.

      This avoids depending on Supabase's automatically
      generated nested relationship name.
    */


    const {
      data: members,
      error: membersError
    } = await supabaseClient
      .from("members")
      .select("*")
      .order("member_code");


    if (membersError) {
      throw membersError;
    }


    const {
      data: scripts,
      error: scriptsError
    } = await supabaseClient
      .from("scripts")
      .select("*");


    if (scriptsError) {
      throw scriptsError;
    }


    renderScripts(
      members || [],
      scripts || []
    );

  } catch (error) {

    console.error(
      "Load scripts error:",
      error
    );


    grid.innerHTML = `

      <div class="loading-state">

        <div class="empty-flower">
          !
        </div>

        <strong>
          Shared archive unavailable
        </strong>

        <span>
          Please check the Supabase connection and RLS policies.
        </span>

      </div>

    `;

  }

}


/* =========================================================
   RENDER SCRIPTS
========================================================= */

function renderScripts(
  members,
  scripts
) {

  const grid =
    $("#scriptsGrid");

  if (!grid) return;


  if (!members.length) {

    grid.innerHTML = `

      <div class="loading-state">

        <div class="empty-flower">
          ✿
        </div>

        <strong>
          No members found
        </strong>

        <span>
          Member records are required in the shared database.
        </span>

      </div>

    `;

    return;

  }


  const scriptMap =
    new Map();


  scripts.forEach((script) => {

    scriptMap.set(
      String(script.member_id),
      script
    );

  });


  grid.innerHTML =
    members
      .map((member, index) => {

        const script =
          scriptMap.get(
            String(member.id)
          );


        return createScriptCard(
          member,
          script,
          index
        );

      })
      .join("");

}


/* =========================================================
   SCRIPT CARD
========================================================= */

function createScriptCard(
  member,
  script,
  index
) {

  const hasScript =
    Boolean(
      script?.script_content?.trim()
    );


  const status =
    hasScript
      ? (script.status || "SUBMITTED")
      : "NOT SUBMITTED";


  const content =
    hasScript
      ? escapeHtml(script.script_content)
      : "This member has not submitted a script yet.";


  const contentClass =
    hasScript
      ? "script-content"
      : "script-content empty";


  return `

    <article class="script-card">

      <div class="script-card-top">

        <span class="script-number">
          ${String(index + 1).padStart(2, "0")}
        </span>

        <span class="script-status">
          ${escapeHtml(status)}
        </span>

      </div>


      <h3>
        ${escapeHtml(member.name || "Member")}
      </h3>


      <div class="script-slides">
        ${escapeHtml(member.member_code || "")}
        •
        SLIDES ${escapeHtml(member.assigned_slides || "—")}
      </div>


      <div class="script-section">
        ${escapeHtml(
          member.section_title ||
          "Presentation Section"
        )}
      </div>


      <div class="${contentClass}">
        ${content}
      </div>

    </article>

  `;

}


/* =========================================================
   REFRESH
========================================================= */

function initializeRefresh() {

  const button =
    $("#refreshScripts");

  if (!button) return;


  button.addEventListener(
    "click",
    async () => {

      button.disabled = true;

      const oldText =
        button.innerHTML;

      button.innerHTML =
        "↻ Refreshing...";


      await loadScripts();


      button.disabled = false;

      button.innerHTML =
        oldText;

    }
  );

}


/* =========================================================
   PETAL PARTICLES
========================================================= */

function initializePetals() {

  const layer =
    $("#petalLayer");

  if (!layer) return;


  /*
    These are tiny decorative petals.
    They do not represent database data.
  */


  for (let i = 0; i < 18; i++) {

    const petal =
      document.createElement("span");


    petal.className =
      "floating-petal";


    petal.style.left =
      `${Math.random() * 100}%`;


    petal.style.animationDelay =
      `${Math.random() * 10}s`;


    petal.style.animationDuration =
      `${7 + Math.random() * 8}s`;


    petal.style.transform =
      `scale(${0.5 + Math.random() * 0.7})`;


    layer.appendChild(petal);

  }

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}