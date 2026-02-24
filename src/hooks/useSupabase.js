import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { message } from 'antd';

export function useSupabaseCrud(tableName) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const { page = 1, pageSize = 10, search = '', searchField = '' } = params;
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase.from(tableName).select('*', { count: 'exact' });

            if (search && searchField) {
                query = query.ilike(searchField, `%${search}%`);
            }

            query = query.range(from, to).order('created_at', { ascending: false });

            const { data: rows, error, count } = await query;

            if (error) throw error;

            setData(rows || []);
            setTotal(count || 0);
        } catch (err) {
            message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [tableName]);

    const createRecord = useCallback(async (record) => {
        try {
            const { error } = await supabase.from(tableName).insert([record]);
            if (error) throw error;
            message.success('เพิ่มข้อมูลสำเร็จ');
            return true;
        } catch (err) {
            message.error('เพิ่มข้อมูลไม่สำเร็จ: ' + err.message);
            return false;
        }
    }, [tableName]);

    const updateRecord = useCallback(async (id, record) => {
        try {
            const { error } = await supabase.from(tableName).update(record).eq('id', id);
            if (error) throw error;
            message.success('แก้ไขข้อมูลสำเร็จ');
            return true;
        } catch (err) {
            message.error('แก้ไขข้อมูลไม่สำเร็จ: ' + err.message);
            return false;
        }
    }, [tableName]);

    const deleteRecord = useCallback(async (id) => {
        try {
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;
            message.success('ลบข้อมูลสำเร็จ');
            return true;
        } catch (err) {
            message.error('ลบข้อมูลไม่สำเร็จ: ' + err.message);
            return false;
        }
    }, [tableName]);

    const fetchAll = useCallback(async () => {
        try {
            const { data: rows, error } = await supabase
                .from(tableName)
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return rows || [];
        } catch (err) {
            message.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
            return [];
        }
    }, [tableName]);

    return { data, loading, total, fetchData, createRecord, updateRecord, deleteRecord, fetchAll };
}
