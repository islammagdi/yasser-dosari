import type { ImamateSlot, ListParams, Recording } from "@/types";

/**
 * كل الصفحات بتتكلم مع الـ interface ده بس.
 * لما الـ backend يجهز، بنكتب implementation جديد وخلاص — من غير ما نلمس أي component.
 */
export interface RecordingsRepository {
  list(params: ListParams): Promise<Recording[]>;
  get(id: string): Promise<Recording | null>;
  /** أحدث التسجيلات المضافة من كل الأقسام */
  recent(limit: number): Promise<Recording[]>;
  /** جدول الإمامة المعلن (المواعيد الجاية) */
  imamate(): Promise<ImamateSlot[]>;
}
