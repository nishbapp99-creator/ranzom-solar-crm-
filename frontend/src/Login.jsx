import { useState } from "react";
import "./Login.css";

export default function Login({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onLogin({ email: email.trim(), password });
  }

  return (
    <main className="login-page">
      <div className="login-background-glow login-glow-one" aria-hidden="true" />
      <div className="login-background-glow login-glow-two" aria-hidden="true" />

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand-mark" aria-hidden="true">R</div>

        <div className="login-heading">
          <p className="login-eyebrow">RANZOM SOLAR SOLUTIONS</p>
          <h1>Welcome back</h1>
          <p>Sign in to access your CRM workspace.</p>
        </div>

        <div className="login-form-fields">
          <div className="login-field">
            <label htmlFor="login-username">Email / Username</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="login-error" role="alert">
            <span aria-hidden="true">!</span>
            {error}
          </p>
        )}

        <button type="submit" className="login-button">
          <span>Sign in to workspace</span>
          <span className="login-button-arrow" aria-hidden="true">→</span>
        </button>

        <p className="login-footer">Secure access powered by Odoo</p>
      </form>

      <p className="login-copyright">© {new Date().getFullYear()} Ranzom Solar Solutions</p>
    </main>
  );
}
