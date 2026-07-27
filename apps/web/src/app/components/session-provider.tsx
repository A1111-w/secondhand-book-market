"use client";

import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Eye, EyeOff, LoaderCircle, LogIn, UserPlus, X } from "lucide-react";
import {
  apiFetch,
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  SessionUser,
  storeSession,
} from "./api-client";

type SessionContextValue = {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  openLogin: () => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) return;
    try {
      const freshUser = await apiFetch<SessionUser>("/api/user/me");
      setUser(freshUser);
      storeSession(currentToken, freshUser);
    } catch {
      clearStoredSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const storedToken = getStoredToken();
    setToken(storedToken);
    setUser(getStoredUser());
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const signOut = useCallback(() => {
    void fetch("/api/user/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        user,
        token,
        isLoading,
        openLogin: () => setIsLoginOpen(true),
        signOut,
        refreshUser,
      }}
    >
      {children}
      {isLoginOpen ? (
        <LoginDialog
          onClose={() => setIsLoginOpen(false)}
          onSignedIn={(nextToken, nextUser) => {
            storeSession(nextToken, nextUser);
            setToken(nextToken);
            setUser(nextUser);
            setIsLoginOpen(false);
          }}
        />
      ) : null}
    </SessionContext.Provider>
  );
}

function LoginDialog({
  onClose,
  onSignedIn,
}: {
  onClose: () => void;
  onSignedIn: (token: string, user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        await apiFetch<{ user: SessionUser }>("/api/user/register", {
          method: "POST",
          body: JSON.stringify({ phone, password, username }),
        });
      }
      const result = await apiFetch<{ user: SessionUser; token: string }>(
        "/api/user/login",
        {
          method: "POST",
          body: JSON.stringify({ phone, password }),
        },
      );
      onSignedIn(result.token, result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="login-title"
        aria-modal="true"
        className="login-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="关闭登录窗口" title="关闭">
          <X size={18} />
        </button>
        <div className="dialog-heading">
          <span className="brand-mark small"><LogIn size={18} /></span>
          <div>
            <h2 id="login-title">{mode === "login" ? "登录校园市集" : "创建校园账号"}</h2>
            <p>登录后可发布商品、解锁联系方式并管理交易。</p>
          </div>
        </div>

        <div className="segmented" aria-label="账号操作">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            <LogIn size={15} /> 登录
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            <UserPlus size={15} /> 注册
          </button>
        </div>

        <form className="login-form" onSubmit={submit}>
          {mode === "register" ? (
            <label>
              昵称
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="例如：计算机系小林" autoComplete="nickname" />
            </label>
          ) : null}
          <label>
            手机号
            <input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="请输入手机号" inputMode="tel" autoComplete="tel" />
          </label>
          <label>
            密码
            <span className="password-field">
              <input required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              <button type="button" className="icon-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隐藏密码" : "显示密码"} title={showPassword ? "隐藏密码" : "显示密码"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button primary full" type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={17} /> : mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
            {submitting ? "处理中" : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>
      </section>
    </div>
  );
}
