"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  GraduationCap,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { apiFetch, formatDate, getStoredToken, PendingStudent } from "./api-client";
import { useSession } from "./session-provider";

export function AdminConsole() {
  const { user, isLoading, openLogin, signOut } = useSession();
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const loadPending = useCallback(async () => {
    if (user?.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<{ data: PendingStudent[] }>("/api/admin/pending");
      setStudents(result.data);
      setSelectedId((current) => current && result.data.some((item) => item.id === current) ? current : result.data[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "审核队列加载失败");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const selected = students.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    const source = selected?.studentCardImg;
    if (!source || user?.role !== "admin") {
      setProofUrl(null);
      return;
    }

    let active = true;
    let objectUrl = "";
    setProofLoading(true);
    const token = getStoredToken();
    fetch(source, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("学生证图片加载失败");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setProofUrl(objectUrl);
      })
      .catch(() => {
        if (active) setProofUrl(null);
      })
      .finally(() => {
        if (active) setProofLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected?.studentCardImg, user?.role]);

  async function audit(student: PendingStudent, action: "pass" | "reject") {
    const label = action === "pass" ? "通过" : "驳回";
    if (!window.confirm(`确认${label} ${student.realName || "该同学"} 的认证申请？`)) return;
    setWorkingId(student.id);
    setError("");
    try {
      await apiFetch("/api/admin/audit", {
        method: "POST",
        body: JSON.stringify({ userId: student.id, action }),
      });
      const next = students.filter((item) => item.id !== student.id);
      setStudents(next);
      setSelectedId(next[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "审核操作失败");
    } finally {
      setWorkingId(null);
    }
  }

  if (isLoading) return <div className="admin-gate"><LoaderCircle className="spin" size={29} /><span>正在校验管理员身份</span></div>;
  if (!user) return <AdminGate icon={<ShieldCheck size={38} />} title="管理员登录" description="使用管理员账号登录后查看待审核学生资料。" action={<button className="button primary" type="button" onClick={openLogin}>登录管理员账号</button>} />;
  if (user.role !== "admin") return <AdminGate icon={<CircleAlert size={38} />} title="没有后台访问权限" description="当前账号不是管理员，无法查看学生证件与审核资料。" action={<Link className="button secondary" href="/"><ArrowLeft size={17} /> 返回市集</Link>} />;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span><ShieldCheck size={21} /></span><div><strong>市集管理台</strong><small>Huali Market</small></div></Link>
        <nav aria-label="管理后台导航"><a className="active" href="#audit"><ClipboardCheck size={17} /> 学生认证审核 <span>{students.length}</span></a></nav>
        <div className="admin-sidebar-foot"><Link href="/"><ArrowLeft size={16} /> 返回前台</Link><button type="button" onClick={signOut}><LogOut size={16} /> 退出登录</button></div>
      </aside>
      <main className="admin-main" id="audit">
        <header className="admin-topbar"><div><h1>学生认证审核</h1><p>核对身份字段与学生证照片后给出审核结果。</p></div><div className="admin-user"><span>{user.username?.slice(0, 1) || "管"}</span><div><strong>{user.username || "管理员"}</strong><small>管理员</small></div></div></header>

        <section className="admin-stats" aria-label="审核概况">
          <div><Clock3 size={20} /><span><small>待审核</small><strong>{students.length}</strong></span></div>
          <div><UserRoundCheck size={20} /><span><small>当前任务</small><strong>{selected ? selected.realName || `用户 ${selected.id}` : "暂无"}</strong></span></div>
          <button className="button secondary compact" type="button" onClick={loadPending} disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} 刷新队列</button>
        </section>

        {error ? <div className="inline-alert admin-alert" role="alert"><CircleAlert size={17} />{error}</div> : null}
        <div className="audit-workspace">
          <section className="audit-queue" aria-labelledby="queue-title">
            <div className="audit-section-title"><div><h2 id="queue-title">待审核队列</h2><p>按提交时间从新到旧</p></div><span>{students.length} 条</span></div>
            {loading ? <div className="loading-state"><LoaderCircle className="spin" size={23} /> 加载审核队列</div> : students.length ? (
              <div className="audit-table" role="list">
                {students.map((student) => (
                  <button key={student.id} role="listitem" type="button" className={selectedId === student.id ? "active" : ""} onClick={() => setSelectedId(student.id)}>
                    <span className="student-avatar">{student.realName?.slice(-1) || "学"}</span>
                    <span><strong>{student.realName || "未填写姓名"}</strong><small>{student.studentId || "无学号"}</small></span>
                    <span><strong>{student.college || "学院未填"}</strong><small>{student.grade || "年级未填"}</small></span>
                    <time>{formatDate(student.createdAt)}</time>
                  </button>
                ))}
              </div>
            ) : <div className="empty-state compact"><Check size={35} /><h3>队列已清空</h3><p>当前没有等待处理的学生认证申请。</p></div>}
          </section>

          <section className="audit-detail" aria-labelledby="audit-detail-title">
            {selected ? (
              <>
                <div className="audit-section-title"><div><h2 id="audit-detail-title">申请详情</h2><p>申请编号 #{selected.id}</p></div><span className="pending-label">待审核</span></div>
                <dl className="student-fields">
                  <div><dt>姓名</dt><dd>{selected.realName || "未填写"}</dd></div>
                  <div><dt>学号</dt><dd>{selected.studentId || "未填写"}</dd></div>
                  <div><dt>学院</dt><dd>{selected.college || "未填写"}</dd></div>
                  <div><dt>专业</dt><dd>{selected.major || "未填写"}</dd></div>
                  <div><dt>年级 / 班级</dt><dd>{selected.grade || "-"} / {selected.className || "-"}</dd></div>
                  <div><dt>性别</dt><dd>{selected.gender || "未填写"}</dd></div>
                  <div><dt>提交时间</dt><dd>{formatDate(selected.createdAt)}</dd></div>
                </dl>
                <div className="credential-preview"><div><GraduationCap size={18} /><span><strong>学生证凭证</strong><small>点击图片可放大核对</small></span></div>{proofLoading ? <div className="missing-proof"><LoaderCircle className="spin" size={21} /> 正在安全加载证件</div> : proofUrl ? <button type="button" onClick={() => setPreview(proofUrl)}><img src={proofUrl} alt={`${selected.realName || "申请人"}的学生证`} /><span><ExternalLink size={15} /> 放大查看</span></button> : <div className="missing-proof">证件图片不可用</div>}</div>
                <div className="audit-actions"><button className="button danger-outline" type="button" disabled={workingId === selected.id} onClick={() => audit(selected, "reject")}><X size={17} /> 驳回申请</button><button className="button primary" type="button" disabled={workingId === selected.id} onClick={() => audit(selected, "pass")}>{workingId === selected.id ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} 通过认证</button></div>
              </>
            ) : <div className="empty-state compact"><ClipboardCheck size={35} /><h3>选择一条申请</h3><p>从左侧队列选择学生后查看详细资料。</p></div>}
          </section>
        </div>
      </main>

      {preview ? <div className="modal-backdrop image-preview" role="presentation" onMouseDown={() => setPreview(null)}><div role="dialog" aria-modal="true" aria-label="学生证预览" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button" type="button" onClick={() => setPreview(null)} aria-label="关闭图片预览" title="关闭"><X size={18} /></button><img src={preview} alt="学生证大图" /></div></div> : null}
    </div>
  );
}

function AdminGate({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action: React.ReactNode }) {
  return <div className="admin-gate">{icon}<h1>{title}</h1><p>{description}</p>{action}</div>;
}
