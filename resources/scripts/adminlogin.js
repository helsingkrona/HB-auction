document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const backBtn = document.getElementById("backbtn");

  if (backBtn) {
    backBtn.addEventListener("click", () => (window.location.href = "/"));
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = document.getElementById("password").value;

      try {
        const res = await fetch("/resources/api/login.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          credentials: "include",
        });
        const result = await res.json();
        if (result.success) location.reload();
        else alert("Incorrect password!");
      } catch (err) {
        console.error(err);
        alert("Login failed. Check console for details.");
      }
    });
  }
});

function logout() {
  fetch("/resources/api/logout.php", {
    method: "POST",
    credentials: "include",
  }).then(() => location.reload());
}
