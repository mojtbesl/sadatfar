(function () {
  const ADMIN_PASSWORD = "MojiSaadat1366";
  const AUTH_KEY = "saadatfar_admin_auth";

  const authBox = document.getElementById("admin-auth-box");
  const authForm = document.getElementById("admin-auth-form");
  const passwordInput = document.getElementById("admin-password-input");
  const authMessage = document.getElementById("admin-auth-message");
  const adminApp = document.getElementById("admin-app");
  const logoutBtn = document.getElementById("admin-logout-btn");

  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === "ok";
  }

  function showAdminApp() {
    authBox.hidden = true;
    adminApp.hidden = false;
    window.dispatchEvent(new CustomEvent("admin-authenticated"));
  }

  if (isAuthenticated()) {
    showAdminApp();
  }

  authForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const entered = passwordInput.value;
    if (entered !== ADMIN_PASSWORD) {
      authMessage.textContent = "رمز عبور اشتباه است.";
      return;
    }

    sessionStorage.setItem(AUTH_KEY, "ok");
    authMessage.textContent = "";
    showAdminApp();
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  });
})();
