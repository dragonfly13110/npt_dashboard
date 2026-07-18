ALTER TABLE personnel ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 999;
UPDATE personnel SET sort_order = 1 WHERE position = 'เกษตรจังหวัดนครปฐม';
UPDATE personnel SET sort_order = 2 WHERE position LIKE 'หัวหน้า%' OR position LIKE 'หน.%';
UPDATE personnel SET sort_order = 3 WHERE position LIKE 'เกษตรอำเภอ%';
UPDATE personnel SET sort_order = 10 WHERE sort_order = 999;
;
