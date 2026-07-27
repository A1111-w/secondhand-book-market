"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, ExternalLink, LayoutDashboard, LogIn, LogOut, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { ReactNode } from "react";
import { useSession } from "./session-provider";

export function AppShell({ children, paperSiteUrl }: { children: ReactNode; paperSiteUrl: string }) {
  const pathname = usePathname();
  const { user, isLoading, openLogin, signOut } = useSession();

  if (pathname.startsWith("/admin")) return <>{children}</>;

  const navItems = [
    { href: "/", label: "逛市集", icon: Search },
    { href: "/sell", label: "发布管理", icon: Plus },
  ];

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="华立校园市集首页">
            <span className="brand-mark"><BookOpenText size={21} /></span>
            <span><strong>华立校园市集</strong><small>同校闲置流转</small></span>
          </Link>

          <nav className="main-nav" aria-label="主导航">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : ""}>
                <Icon size={16} /> {label}
              </Link>
            ))}
            {user?.role === "admin" ? (
              <Link href="/admin"><ShieldCheck size={16} /> 管理后台</Link>
            ) : null}
            <a href={paperSiteUrl} target="_blank" rel="noreferrer">
              <BookOpenText size={16} /> 论文写作 <ExternalLink size={13} />
            </a>
          </nav>

          <div className="session-area">
            {isLoading ? <span className="session-loading">同步账号中</span> : user ? (
              <div className="user-menu">
                <span className="user-avatar" aria-hidden>{user.username?.slice(0, 1) || <UserRound size={16} />}</span>
                <span className="user-copy"><strong>{user.username || "校园用户"}</strong><small>{user.isStudent === 2 ? "已认证" : "未认证"}</small></span>
                <button className="icon-button" type="button" onClick={signOut} aria-label="退出登录" title="退出登录"><LogOut size={17} /></button>
              </div>
            ) : (
              <button className="button secondary compact" type="button" onClick={openLogin}><LogIn size={16} /> 登录</button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div><strong>华立校园市集</strong><span>仅提供校内信息连接，请当面验货、确认后再交易。</span></div>
        <Link href="/sell"><LayoutDashboard size={15} /> 管理我的发布</Link>
      </footer>
    </div>
  );
}
