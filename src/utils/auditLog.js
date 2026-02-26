import { supabase } from '../supabaseClient';

/**
 * บันทึก audit log สำหรับการ CRUD
 * @param {'CREATE'|'UPDATE'|'DELETE'} action
 * @param {string} tableName
 * @param {string} recordId
 * @param {object|null} oldData - ข้อมูลเดิม (สำหรับ UPDATE/DELETE)
 * @param {object|null} newData - ข้อมูลใหม่ (สำหรับ CREATE/UPDATE)
 */
export async function logAction(action, tableName, recordId, oldData = null, newData = null) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        await supabase.from('audit_logs').insert([{
            user_id: session.user.id,
            user_email: session.user.email,
            action,
            table_name: tableName,
            record_id: String(recordId || ''),
            old_data: oldData,
            new_data: newData,
        }]);
    } catch (err) {
        // ไม่ให้ audit log error กระทบ flow หลัก
        console.warn('Audit log error:', err.message);
    }
}
