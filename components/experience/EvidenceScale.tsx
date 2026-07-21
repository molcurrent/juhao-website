import Link from "next/link";

import styles from "./EvidenceScale.module.css";

export type EvidenceScaleItem = {
  code: string;
  href?: string;
  status: "confirmed" | "context" | "pending" | "action";
  title: string;
  value: string;
};

type EvidenceScaleProps = {
  items: EvidenceScaleItem[];
  label: string;
};

function ScaleItem({ item }: { item: EvidenceScaleItem }) {
  const content = (
    <>
      <span className={styles.code}>{item.code}</span>
      <span className={styles.copy}>
        <small>{item.title}</small>
        <strong>{item.value}</strong>
      </span>
      <i aria-hidden="true" />
    </>
  );

  return (
    <li data-status={item.status}>
      {item.href ? <Link href={item.href}>{content}</Link> : <div>{content}</div>}
    </li>
  );
}

export function EvidenceScale({ items, label }: EvidenceScaleProps) {
  return (
    <aside className={styles.scale} aria-label={label} data-evidence-scale>
      <div className={styles.heading}>
        <small>JUHAO / EVIDENCE SCALE</small>
        <strong>{label}</strong>
      </div>
      <ol>
        {items.map((item) => <ScaleItem item={item} key={`${item.code}-${item.title}`} />)}
      </ol>
    </aside>
  );
}
