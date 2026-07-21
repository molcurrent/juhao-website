"use client";

import { useState } from "react";
import styles from "./page.module.css";

export function CopyLeadButton({ value }: { value: string }) {
  const [message, setMessage] = useState("");

  async function copyLead() {
    if (!window.isSecureContext || !navigator.clipboard) {
      setMessage("浏览器不支持自动复制，请手动选择编号");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setMessage("线索编号已复制");
    } catch {
      setMessage("复制失败，请手动选择编号");
    }
  }

  return <div className={styles.copyAction}>
    <button type="button" onClick={copyLead}>{message === "线索编号已复制" ? "已复制" : "复制线索编号"}</button>
    <span role="status" aria-live="polite">{message}</span>
  </div>;
}
