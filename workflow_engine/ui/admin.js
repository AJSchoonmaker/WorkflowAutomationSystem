function updateAdminUI() {
    const adminControls = document.getElementById("admin-controls");
    const lockedMessage = document.getElementById("admin-locked-message");
    const loginBtn = document.getElementById("admin-login-btn");
    const logoutBtn = document.getElementById("admin-logout-btn");
    const adminStatus = document.getElementById("admin-status");
    const passwordInput = document.getElementById("admin-password");

    if (AppState.isAdmin) {
        adminControls.classList.remove("hidden");

        lockedMessage.style.display = "none";

        loginBtn.style.display = "none";
        passwordInput.style.display = "none";

        logoutBtn.style.display = "block";

        adminStatus.textContent = "Admin mode enabled.";
    } else {
        adminControls.classList.add("hidden");

        lockedMessage.style.display = "block";

        loginBtn.style.display = "block";
        passwordInput.style.display = "block";

        logoutBtn.style.display = "none";

        adminStatus.textContent = "Admin controls are locked.";
    }

    if (typeof renderComplaintList === "function") {
        renderComplaintList();
    }

    if (typeof renderSelectedZoneDetails === "function") {
        renderSelectedZoneDetails();
    }

    if (typeof renderSearchResults === "function") {
        renderSearchResults();
    }
}

function loginAdmin() {
    const passwordInput = document.getElementById("admin-password");
    const adminStatus = document.getElementById("admin-status");

    const enteredPassword = passwordInput.value;

    if (enteredPassword === ADMIN_PASSWORD) {
        AppState.isAdmin = true;

        saveAdminSession();

        passwordInput.value = "";

        updateAdminUI();
    } else {
        adminStatus.textContent = "Incorrect password.";

        passwordInput.value = "";
    }
}

function logoutAdmin() {
    AppState.isAdmin = false;

    clearAdminSession();

    updateAdminUI();
}

function setupAdminListeners() {
    const loginBtn = document.getElementById("admin-login-btn");
    const logoutBtn = document.getElementById("admin-logout-btn");
    const passwordInput = document.getElementById("admin-password");

    if (loginBtn) {
        loginBtn.addEventListener("click", loginAdmin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutAdmin);
    }

    if (passwordInput) {
        passwordInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                loginAdmin();
            }
        });
    }
}