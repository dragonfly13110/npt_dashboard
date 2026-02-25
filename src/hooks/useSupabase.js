import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { notification } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';

const notify = {
    success: (title, desc) => {
        notification.success({
            message: title,
            description: desc,
            placement: 'topRight',
            duration: 3,
            style: { borderLeft: '4px solid #1a7f37' },
        });
    },
    error: (title, desc) => {
        notification.error({
            message: title,
            description: desc,
            placement: 'topRight',
            duration: 5,
            style: { borderLeft: '4px solid #cf222e' },
        });
    },
};

export function useSupabaseCrud(tableName) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const { page = 1, pageSize = 10, search = '', searchField = '', filters = {} } = params;
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase.from(tableName).select('*', { count: 'exact' });

            if (search && searchField) {
                query = query.ilike(searchField, `%${search}%`);
            }

            // Advanced filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    query = query.eq(key, value);
                }
            });

            query = query.range(from, to).order('created_at', { ascending: false });

            const { data: rows, error, count } = await query;

            if (error) throw error;

            setData(rows || []);
            setTotal(count || 0);
        } catch (err) {
            notify.error('โหลดข้อมูลไม่สำเร็จ', err.message);
        } finally {
            setLoading(false);
        }
    }, [tableName]);

    const createRecord = useCallback(async (record) => {
        try {
            const { error } = await supabase.from(tableName).insert([record]);
            if (error) throw error;
            notify.success('เพิ่มข้อมูลสำเร็จ', 'บันทึกข้อมูลใหม่เรียบร้อยแล้ว');
            return true;
        } catch (err) {
            notify.error('เพิ่มข้อมูลไม่สำเร็จ', err.message);
            return false;
        }
    }, [tableName]);

    const updateRecord = useCallback(async (id, record) => {
        try {
            const { error } = await supabase.from(tableName).update(record).eq('id', id);
            if (error) throw error;
            notify.success('แก้ไขข้อมูลสำเร็จ', 'อัปเดตข้อมูลเรียบร้อยแล้ว');
            return true;
        } catch (err) {
            notify.error('แก้ไขข้อมูลไม่สำเร็จ', err.message);
            return false;
        }
    }, [tableName]);

    const deleteRecord = useCallback(async (id) => {
        try {
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;
            notify.success('ลบข้อมูลสำเร็จ', 'ลบข้อมูลออกจากระบบเรียบร้อยแล้ว');
            return true;
        } catch (err) {
            notify.error('ลบข้อมูลไม่สำเร็จ', err.message);
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
            notify.error('โหลดข้อมูลไม่สำเร็จ', err.message);
            return [];
        }
    }, [tableName]);

    return { data, loading, total, fetchData, createRecord, updateRecord, deleteRecord, fetchAll };
}
