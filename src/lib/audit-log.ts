import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';
import type { AuditLog } from './types';

export type AuditChange = {
  field: string;
  previous: unknown;
  next: unknown;
};

type WriteAuditLogParams = {
  firestore: Firestore;
  storeId: string;
  userName: string;
  action: AuditLog['action'];
  targetId: string;
  targetType: AuditLog['details']['targetType'];
  description: string;
  changes?: AuditChange[];
  /** Optional batch — when provided, audit doc is queued on the batch instead of written immediately. */
  batch?: WriteBatch;
};

/** Persist an audit entry under stores/{storeId}/audit_logs. */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<string> {
  const {
    firestore,
    storeId,
    userName,
    action,
    targetId,
    targetType,
    description,
    changes,
    batch,
  } = params;

  const auditRef = doc(collection(firestore, `stores/${storeId}/audit_logs`));
  const payload: Omit<AuditLog, 'id'> = {
    storeId,
    userName,
    action,
    timestamp: serverTimestamp(),
    details: {
      targetId,
      targetType,
      description,
      ...(changes && changes.length > 0 ? { changes } : {}),
    },
  };

  if (batch) {
    batch.set(auditRef, payload);
  } else {
    await setDoc(auditRef, payload);
  }

  return auditRef.id;
}

/** Build a human-readable change summary for audit descriptions. */
export function formatAuditChangeSummary(changes: AuditChange[]): string {
  if (changes.length === 0) return 'No field changes';
  return changes
    .map((c) => `${c.field}: ${stringifyAuditValue(c.previous)} → ${stringifyAuditValue(c.next)}`)
    .join('; ');
}

function stringifyAuditValue(value: unknown): string {
  if (value === undefined) return '(unset)';
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' && value === '') return '(empty)';
  return String(value);
}
